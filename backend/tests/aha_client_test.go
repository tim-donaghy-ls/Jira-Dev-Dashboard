package backend_test

import (
	"context"
	"encoding/json"
	"jira-dashboard/aha"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// TestNewClient tests the Aha client creation
func TestNewClient(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		domain   string
		wantURL  string
	}{
		{
			name:    "valid client creation",
			apiKey:  "test-api-key",
			domain:  "testcompany",
			wantURL: "https://testcompany.aha.io/api/v1",
		},
		{
			name:    "different domain",
			apiKey:  "another-key",
			domain:  "anothercompany",
			wantURL: "https://anothercompany.aha.io/api/v1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := aha.NewClient(tt.apiKey, tt.domain)
			if client.BaseURL != tt.wantURL {
				t.Errorf("NewClient() BaseURL = %v, want %v", client.BaseURL, tt.wantURL)
			}
			if client.APIKey != tt.apiKey {
				t.Errorf("NewClient() APIKey = %v, want %v", client.APIKey, tt.apiKey)
			}
		})
	}
}

// TestGetFeatureByReference tests fetching a feature by reference number
func TestGetFeatureByReference(t *testing.T) {
	tests := []struct {
		name          string
		referenceNum  string
		statusCode    int
		responseBody  interface{}
		wantErr       bool
		errContains   string
		checkFeature  func(*testing.T, *aha.Feature)
	}{
		{
			name:         "successful fetch",
			referenceNum: "APP-1234",
			statusCode:   http.StatusOK,
			responseBody: map[string]interface{}{
				"feature": map[string]interface{}{
					"id":            "FEAT-001",
					"reference_num": "APP-1234",
					"name":          "Test Feature",
					"description":   "Test Description",
					"created_at":    "2024-01-01T00:00:00Z",
					"updated_at":    "2024-01-02T00:00:00Z",
					"url":           "https://testcompany.aha.io/features/APP-1234",
					"workflow_status": map[string]interface{}{
						"id":       "STATUS-1",
						"name":     "In Development",
						"complete": false,
					},
					"integration_fields": []interface{}{
						map[string]interface{}{
							"id":             "FIELD-1",
							"name":           "key",
							"value":          "JIRA-123",
							"integration_id": "INT-1",
							"service_name":   "jira",
							"created_at":     "2024-01-01T00:00:00Z",
						},
					},
				},
			},
			wantErr: false,
			checkFeature: func(t *testing.T, f *aha.Feature) {
				if f.ID != "FEAT-001" {
					t.Errorf("Feature.ID = %v, want FEAT-001", f.ID)
				}
				if f.ReferenceNum != "APP-1234" {
					t.Errorf("Feature.ReferenceNum = %v, want APP-1234", f.ReferenceNum)
				}
				if f.Name != "Test Feature" {
					t.Errorf("Feature.Name = %v, want Test Feature", f.Name)
				}
				if f.WorkflowStatus.Name != "In Development" {
					t.Errorf("Feature.WorkflowStatus.Name = %v, want In Development", f.WorkflowStatus.Name)
				}
				if len(f.IntegrationFields) != 1 {
					t.Errorf("len(Feature.IntegrationFields) = %v, want 1", len(f.IntegrationFields))
				}
			},
		},
		{
			name:         "feature not found",
			referenceNum: "NOTFOUND-999",
			statusCode:   http.StatusNotFound,
			responseBody: map[string]interface{}{
				"error": "Feature not found",
			},
			wantErr:     true,
			errContains: "feature not found",
		},
		{
			name:         "unauthorized",
			referenceNum: "APP-1234",
			statusCode:   http.StatusUnauthorized,
			responseBody: map[string]interface{}{
				"error": "Invalid API key",
			},
			wantErr:     true,
			errContains: "returned status 401",
		},
		{
			name:         "internal server error",
			referenceNum: "APP-1234",
			statusCode:   http.StatusInternalServerError,
			responseBody: map[string]interface{}{
				"error": "Internal server error",
			},
			wantErr:     true,
			errContains: "returned status 500",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock server
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request headers
				if auth := r.Header.Get("Authorization"); auth != "Bearer test-api-key" {
					t.Errorf("Authorization header = %v, want Bearer test-api-key", auth)
				}
				if accept := r.Header.Get("Accept"); accept != "application/json" {
					t.Errorf("Accept header = %v, want application/json", accept)
				}

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tt.statusCode)
				json.NewEncoder(w).Encode(tt.responseBody)
			}))
			defer server.Close()

			// Create client with mock server URL
			client := aha.NewClient("test-api-key", "testcompany")
			client.BaseURL = server.URL

			// Execute test
			ctx := context.Background()
			feature, err := client.GetFeatureByReference(ctx, tt.referenceNum)

			// Verify error
			if (err != nil) != tt.wantErr {
				t.Errorf("GetFeatureByReference() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				if tt.errContains != "" && err != nil {
					if !contains(err.Error(), tt.errContains) {
						t.Errorf("GetFeatureByReference() error = %v, want error containing %v", err, tt.errContains)
					}
				}
				return
			}

			// Verify feature
			if tt.checkFeature != nil {
				tt.checkFeature(t, feature)
			}
		})
	}
}

// TestVerifyFeatures tests the VerifyFeatures method
func TestVerifyFeatures(t *testing.T) {
	tests := []struct {
		name            string
		jiraKeys        []string
		mockResponse    interface{}
		statusCode      int
		wantErr         bool
		checkResults    func(*testing.T, []aha.FeatureVerification)
	}{
		{
			name:     "all keys found",
			jiraKeys: []string{"JIRA-123", "JIRA-456"},
			mockResponse: map[string]interface{}{
				"features": []interface{}{
					map[string]interface{}{
						"id":            "FEAT-001",
						"reference_num": "APP-1",
						"name":          "Feature 1",
						"url":           "https://testcompany.aha.io/features/APP-1",
						"workflow_status": map[string]interface{}{
							"id":       "STATUS-1",
							"name":     "In Development",
							"complete": false,
						},
						"integration_fields": []interface{}{
							map[string]interface{}{
								"id":             "FIELD-1",
								"name":           "key",
								"value":          "JIRA-123",
								"service_name":   "jira",
							},
						},
					},
					map[string]interface{}{
						"id":            "FEAT-002",
						"reference_num": "APP-2",
						"name":          "Feature 2",
						"url":           "https://testcompany.aha.io/features/APP-2",
						"workflow_status": map[string]interface{}{
							"id":       "STATUS-2",
							"name":     "Ready for Development",
							"complete": false,
						},
						"integration_fields": []interface{}{
							map[string]interface{}{
								"id":             "FIELD-2",
								"name":           "key",
								"value":          "JIRA-456",
								"service_name":   "jira",
							},
						},
					},
				},
				"pagination": map[string]interface{}{
					"total_pages":  1,
					"current_page": 1,
				},
			},
			statusCode: http.StatusOK,
			wantErr:    false,
			checkResults: func(t *testing.T, results []aha.FeatureVerification) {
				if len(results) != 2 {
					t.Errorf("len(results) = %v, want 2", len(results))
					return
				}

				// Check first result
				if results[0].JiraKey != "JIRA-123" {
					t.Errorf("results[0].JiraKey = %v, want JIRA-123", results[0].JiraKey)
				}
				if !results[0].ExistsInAha {
					t.Errorf("results[0].ExistsInAha = false, want true")
				}
				if results[0].AhaReference != "APP-1" {
					t.Errorf("results[0].AhaReference = %v, want APP-1", results[0].AhaReference)
				}

				// Check second result
				if results[1].JiraKey != "JIRA-456" {
					t.Errorf("results[1].JiraKey = %v, want JIRA-456", results[1].JiraKey)
				}
				if !results[1].ExistsInAha {
					t.Errorf("results[1].ExistsInAha = false, want true")
				}
			},
		},
		{
			name:     "some keys not found",
			jiraKeys: []string{"JIRA-123", "JIRA-999"},
			mockResponse: map[string]interface{}{
				"features": []interface{}{
					map[string]interface{}{
						"id":            "FEAT-001",
						"reference_num": "APP-1",
						"name":          "Feature 1",
						"url":           "https://testcompany.aha.io/features/APP-1",
						"workflow_status": map[string]interface{}{
							"id":       "STATUS-1",
							"name":     "In Development",
							"complete": false,
						},
						"integration_fields": []interface{}{
							map[string]interface{}{
								"id":             "FIELD-1",
								"name":           "key",
								"value":          "JIRA-123",
								"service_name":   "jira",
							},
						},
					},
				},
				"pagination": map[string]interface{}{
					"total_pages":  1,
					"current_page": 1,
				},
			},
			statusCode: http.StatusOK,
			wantErr:    false,
			checkResults: func(t *testing.T, results []aha.FeatureVerification) {
				if len(results) != 2 {
					t.Errorf("len(results) = %v, want 2", len(results))
					return
				}

				// First key should be found
				if !results[0].ExistsInAha {
					t.Errorf("results[0].ExistsInAha = false, want true")
				}

				// Second key should not be found
				foundIndex := -1
				for i, r := range results {
					if r.JiraKey == "JIRA-999" {
						foundIndex = i
						break
					}
				}
				if foundIndex == -1 {
					t.Errorf("JIRA-999 not found in results")
					return
				}
				if results[foundIndex].ExistsInAha {
					t.Errorf("results[%d].ExistsInAha = true, want false", foundIndex)
				}
			},
		},
		{
			name:     "empty jira keys list",
			jiraKeys: []string{},
			mockResponse: map[string]interface{}{
				"features": []interface{}{},
				"pagination": map[string]interface{}{
					"total_pages":  1,
					"current_page": 1,
				},
			},
			statusCode: http.StatusOK,
			wantErr:    false,
			checkResults: func(t *testing.T, results []aha.FeatureVerification) {
				if len(results) != 0 {
					t.Errorf("len(results) = %v, want 0", len(results))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock server
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tt.statusCode)
				json.NewEncoder(w).Encode(tt.mockResponse)
			}))
			defer server.Close()

			// Create client
			client := aha.NewClient("test-api-key", "testcompany")
			client.BaseURL = server.URL

			// Execute test
			ctx := context.Background()
			results, err := client.VerifyFeatures(ctx, tt.jiraKeys)

			if (err != nil) != tt.wantErr {
				t.Errorf("VerifyFeatures() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.checkResults != nil {
				tt.checkResults(t, results)
			}
		})
	}
}

// TestTestConnection tests the Aha connection test
func TestTestConnection(t *testing.T) {
	tests := []struct {
		name        string
		statusCode  int
		response    interface{}
		wantErr     bool
		errContains string
	}{
		{
			name:       "successful connection",
			statusCode: http.StatusOK,
			response: map[string]interface{}{
				"features": []interface{}{},
			},
			wantErr: false,
		},
		{
			name:       "unauthorized - invalid API key",
			statusCode: http.StatusUnauthorized,
			response: map[string]interface{}{
				"error": "Invalid API key",
			},
			wantErr:     true,
			errContains: "authentication failed: invalid API key",
		},
		{
			name:       "forbidden",
			statusCode: http.StatusForbidden,
			response: map[string]interface{}{
				"error": "Forbidden",
			},
			wantErr:     true,
			errContains: "connection test failed with status: 403",
		},
		{
			name:       "internal server error",
			statusCode: http.StatusInternalServerError,
			response: map[string]interface{}{
				"error": "Internal server error",
			},
			wantErr:     true,
			errContains: "connection test failed with status: 500",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock server
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request headers
				if auth := r.Header.Get("Authorization"); auth != "Bearer test-api-key" {
					t.Errorf("Authorization header = %v, want Bearer test-api-key", auth)
				}

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tt.statusCode)
				json.NewEncoder(w).Encode(tt.response)
			}))
			defer server.Close()

			// Create client
			client := aha.NewClient("test-api-key", "testcompany")
			client.BaseURL = server.URL

			// Execute test
			ctx := context.Background()
			err := client.TestConnection(ctx)

			if (err != nil) != tt.wantErr {
				t.Errorf("TestConnection() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.errContains != "" {
				if !contains(err.Error(), tt.errContains) {
					t.Errorf("TestConnection() error = %v, want error containing %v", err, tt.errContains)
				}
			}
		})
	}
}

// TestContextCancellation tests context cancellation handling
func TestContextCancellation(t *testing.T) {
	// Create a server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"features": []interface{}{},
		})
	}))
	defer server.Close()

	client := aha.NewClient("test-api-key", "testcompany")
	client.BaseURL = server.URL

	// Create context that will be cancelled immediately
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	// This should fail due to context timeout
	err := client.TestConnection(ctx)
	if err == nil {
		t.Error("TestConnection() expected error due to context timeout, got nil")
	}
}

// TestMultiplePaginatedPages tests fetching features across multiple pages
func TestMultiplePaginatedPages(t *testing.T) {
	pageCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		pageCount++

		var response map[string]interface{}
		if pageCount == 1 {
			// First page
			response = map[string]interface{}{
				"features": []interface{}{
					map[string]interface{}{
						"id":            "FEAT-001",
						"reference_num": "APP-1",
						"name":          "Feature 1",
						"url":           "https://testcompany.aha.io/features/APP-1",
						"workflow_status": map[string]interface{}{
							"id":       "STATUS-1",
							"name":     "In Development",
							"complete": false,
						},
						"integration_fields": []interface{}{
							map[string]interface{}{
								"name":         "key",
								"value":        "JIRA-123",
								"service_name": "jira",
							},
						},
					},
				},
				"pagination": map[string]interface{}{
					"total_pages":  2,
					"current_page": 1,
				},
			}
		} else {
			// Second page
			response = map[string]interface{}{
				"features": []interface{}{
					map[string]interface{}{
						"id":            "FEAT-002",
						"reference_num": "APP-2",
						"name":          "Feature 2",
						"url":           "https://testcompany.aha.io/features/APP-2",
						"workflow_status": map[string]interface{}{
							"id":       "STATUS-2",
							"name":     "Ready for Development",
							"complete": false,
						},
						"integration_fields": []interface{}{
							map[string]interface{}{
								"name":         "key",
								"value":        "JIRA-456",
								"service_name": "jira",
							},
						},
					},
				},
				"pagination": map[string]interface{}{
					"total_pages":  2,
					"current_page": 2,
				},
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := aha.NewClient("test-api-key", "testcompany")
	client.BaseURL = server.URL

	ctx := context.Background()
	results, err := client.VerifyFeatures(ctx, []string{"JIRA-123", "JIRA-456"})

	if err != nil {
		t.Errorf("VerifyFeatures() error = %v, want nil", err)
		return
	}

	if len(results) != 2 {
		t.Errorf("len(results) = %v, want 2", len(results))
		return
	}

	// Both keys should be found
	for _, result := range results {
		if !result.ExistsInAha {
			t.Errorf("result for %s not found in Aha", result.JiraKey)
		}
	}

	// Verify server was called twice (pagination)
	if pageCount != 2 {
		t.Errorf("server called %d times, want 2 (pagination)", pageCount)
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && stringContains(s, substr)))
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
