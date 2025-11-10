package aha

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client represents an Aha API client
type Client struct {
	BaseURL string
	APIKey  string
	client  *http.Client
}

// Feature represents an Aha feature
type Feature struct {
	ID                string             `json:"id"`
	ReferenceNum      string             `json:"reference_num"`
	Name              string             `json:"name"`
	Description       string             `json:"description"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
	WorkflowStatus    WorkflowStatus     `json:"workflow_status"`
	URL               string             `json:"url"`
	IntegrationFields []IntegrationField `json:"integration_fields"`
}

// IntegrationField represents an Aha integration field (e.g., JIRA integration)
type IntegrationField struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Value         string `json:"value"`
	IntegrationID string `json:"integration_id"`
	ServiceName   string `json:"service_name"`
	CreatedAt     string `json:"created_at"`
}

// WorkflowStatus represents the workflow status of a feature
type WorkflowStatus struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Complete bool   `json:"complete"`
}

// FeatureVerification represents the verification status of a JIRA ticket in Aha
type FeatureVerification struct {
	JiraKey      string  `json:"jiraKey"`
	ExistsInAha  bool    `json:"existsInAha"`
	AhaReference string  `json:"ahaReference,omitempty"`
	AhaURL       string  `json:"ahaUrl,omitempty"`
	AhaStatus    string  `json:"ahaStatus,omitempty"`
	Error        string  `json:"error,omitempty"`
}

// NewClient creates a new Aha API client
func NewClient(apiKey, domain string) *Client {
	return &Client{
		BaseURL: fmt.Sprintf("https://%s.aha.io/api/v1", domain),
		APIKey:  apiKey,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// makeRequest makes an authenticated request to the Aha API
func (c *Client) makeRequest(ctx context.Context, endpoint string) (*http.Response, error) {
	url := fmt.Sprintf("%s/%s", c.BaseURL, endpoint)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp.StatusCode == http.StatusNotFound {
		resp.Body.Close()
		return nil, fmt.Errorf("feature not found")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("Aha API returned status %d: %s", resp.StatusCode, string(body))
	}

	return resp, nil
}

// GetFeatureByReference fetches a feature by its reference number (e.g., "APP-1234")
func (c *Client) GetFeatureByReference(ctx context.Context, referenceNum string) (*Feature, error) {
	endpoint := fmt.Sprintf("features/%s", referenceNum)

	resp, err := c.makeRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var featureResponse struct {
		Feature Feature `json:"feature"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&featureResponse); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &featureResponse.Feature, nil
}

// fetchAllFeatures fetches all features with integration fields
func (c *Client) fetchAllFeatures(ctx context.Context) (map[string]*Feature, error) {
	jiraKeyToFeature := make(map[string]*Feature)
	page := 1
	perPage := 100

	// Rate limiter: 20 requests per second max
	rateLimiter := time.NewTicker(50 * time.Millisecond)
	defer rateLimiter.Stop()

	for {
		<-rateLimiter.C

		endpoint := fmt.Sprintf("features?fields=id,reference_num,name,url,workflow_status,integration_fields&page=%d&per_page=%d", page, perPage)
		resp, err := c.makeRequest(ctx, endpoint)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch features page %d: %w", page, err)
		}
		defer resp.Body.Close()

		var result struct {
			Features []Feature `json:"features"`
			Pagination struct {
				TotalPages  int `json:"total_pages"`
				CurrentPage int `json:"current_page"`
			} `json:"pagination"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode features response: %w", err)
		}

		// Process features and extract JIRA keys from integration fields
		for i := range result.Features {
			feature := &result.Features[i]
			for _, field := range feature.IntegrationFields {
				if field.ServiceName == "jira" && field.Name == "key" {
					jiraKeyToFeature[field.Value] = feature
					break
				}
			}
		}

		// Check if we've fetched all pages
		if page >= result.Pagination.TotalPages {
			break
		}
		page++
	}

	return jiraKeyToFeature, nil
}

// VerifyFeatures verifies if JIRA tickets exist in Aha by searching through integration fields
func (c *Client) VerifyFeatures(ctx context.Context, jiraKeys []string) ([]FeatureVerification, error) {
	verifications := make([]FeatureVerification, 0, len(jiraKeys))

	// Fetch all features with JIRA integration
	jiraKeyToFeature, err := c.fetchAllFeatures(ctx)
	if err != nil {
		// If we can't fetch features, return error for all
		for _, jiraKey := range jiraKeys {
			verifications = append(verifications, FeatureVerification{
				JiraKey:     jiraKey,
				ExistsInAha: false,
				Error:       fmt.Sprintf("Failed to fetch Aha features: %v", err),
			})
		}
		return verifications, nil
	}

	// Check each JIRA key against the cache
	for _, jiraKey := range jiraKeys {
		verification := FeatureVerification{
			JiraKey: jiraKey,
		}

		if feature, exists := jiraKeyToFeature[jiraKey]; exists {
			verification.ExistsInAha = true
			verification.AhaReference = feature.ReferenceNum
			verification.AhaURL = feature.URL
			verification.AhaStatus = feature.WorkflowStatus.Name
		} else {
			verification.ExistsInAha = false
		}

		verifications = append(verifications, verification)
	}

	return verifications, nil
}

// TestConnection tests the Aha API connection
func (c *Client) TestConnection(ctx context.Context) error {
	// Try to fetch any feature to test connection
	url := fmt.Sprintf("%s/features", c.BaseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("authentication failed: invalid API key")
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("connection test failed with status: %d", resp.StatusCode)
	}

	return nil
}
