package jira

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

// Client handles communication with JIRA API
type Client struct {
	BaseURL    string
	Email      string
	APIToken   string
	HTTPClient *http.Client
}

// NewClient creates a new JIRA client
func NewClient(baseURL, email, apiToken string) *Client {
	return &Client{
		BaseURL:  baseURL,
		Email:    email,
		APIToken: apiToken,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// makeRequest performs an authenticated HTTP request to JIRA
func (c *Client) makeRequest(endpoint string) ([]byte, error) {
	req, err := http.NewRequest("GET", c.BaseURL+endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Add Basic Auth
	auth := c.Email + ":" + c.APIToken
	encodedAuth := base64.StdEncoding.EncodeToString([]byte(auth))
	req.Header.Add("Authorization", "Basic "+encodedAuth)
	req.Header.Add("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("JIRA API error: %d - %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}

	return body, nil
}

// SearchIssues searches for JIRA issues using JQL
func (c *Client) SearchIssues(jql string, maxResults int) ([]Issue, error) {
	endpoint := fmt.Sprintf("/rest/api/3/search/jql?jql=%s&maxResults=%d&fields=*all",
		url.QueryEscape(jql), maxResults)

	body, err := c.makeRequest(endpoint)
	if err != nil {
		return nil, err
	}

	var searchResp JiraSearchResponse
	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("error parsing response: %w", err)
	}

	// Convert JIRA issues to our simplified format
	issues := make([]Issue, 0, len(searchResp.Issues))
	for _, jiraIssue := range searchResp.Issues {
		issue := convertJiraIssue(jiraIssue)
		issues = append(issues, issue)
	}

	return issues, nil
}

// GetIssuesByProject retrieves all issues for a specific project
func (c *Client) GetIssuesByProject(projectKey string) ([]Issue, error) {
	jql := fmt.Sprintf("project = \"%s\" ORDER BY created DESC", projectKey)
	return c.SearchIssues(jql, 1000)
}

// GetIssuesBySprint retrieves all issues for a specific sprint
func (c *Client) GetIssuesBySprint(sprintID int) ([]Issue, error) {
	jql := fmt.Sprintf("sprint = %d", sprintID)
	return c.SearchIssues(jql, 1000)
}

// convertJiraIssue converts a JIRA API issue to our simplified Issue struct
func convertJiraIssue(jiraIssue JiraIssue) Issue {
	// Handle description field which can be string or object
	var description string
	if jiraIssue.Fields.Description != nil {
		switch v := jiraIssue.Fields.Description.(type) {
		case string:
			description = v
		case map[string]interface{}:
			// It's an ADF (Atlassian Document Format) object, extract text content
			description = extractTextFromADF(v)
		default:
			description = ""
		}
	} else {
		// If description is nil, provide a default message
		description = ""
	}

	issue := Issue{
		Key:         jiraIssue.Key,
		Summary:     jiraIssue.Fields.Summary,
		Status:      jiraIssue.Fields.Status.Name,
		Priority:    jiraIssue.Fields.Priority.Name,
		IssueType:   jiraIssue.Fields.IssueType.Name,
		Labels:      jiraIssue.Fields.Labels,
		Description: description,
	}

	// Parse dates
	if created, err := time.Parse(time.RFC3339, jiraIssue.Fields.Created); err == nil {
		issue.Created = created
	}
	if updated, err := time.Parse(time.RFC3339, jiraIssue.Fields.Updated); err == nil {
		issue.Updated = updated
	}
	if jiraIssue.Fields.Resolutiondate != nil {
		if resolved, err := time.Parse(time.RFC3339, *jiraIssue.Fields.Resolutiondate); err == nil {
			issue.Resolved = &resolved
		}
	}

	// Extract assignee
	if jiraIssue.Fields.Assignee != nil {
		issue.Assignee = jiraIssue.Fields.Assignee.DisplayName
	}
	issue.Reporter = jiraIssue.Fields.Reporter.DisplayName

	// Extract sprint info
	if jiraIssue.Fields.Sprint != nil {
		issue.Sprint = jiraIssue.Fields.Sprint.Name
	}

	// Extract story points - try multiple possible fields
	issue.StoryPoints = extractStoryPoints(jiraIssue.Fields)

	return issue
}

// extractStoryPoints extracts story points from various possible custom fields
func extractStoryPoints(fields JiraFields) float64 {
	// Try each possible story points field
	storyPointsFields := []interface{}{
		fields.StoryPoints1,
		fields.StoryPoints2,
		fields.StoryPoints3,
		fields.StoryPoints4,
		fields.StoryPoints5,
		fields.StoryPoints6,
		fields.StoryPointsAlt,
		fields.StoryPointEstimate,
	}

	for _, spField := range storyPointsFields {
		if spField == nil {
			continue
		}

		// Skip empty arrays
		if arr, ok := spField.([]interface{}); ok && len(arr) == 0 {
			continue
		}

		// Handle different types that JIRA might return
		switch v := spField.(type) {
		case float64:
			return v
		case float32:
			return float64(v)
		case int:
			return float64(v)
		case int64:
			return float64(v)
		case string:
			// Try to parse string as float
			var f float64
			if _, err := fmt.Sscanf(v, "%f", &f); err == nil {
				return f
			}
		}
	}

	return 0
}

// TestConnection tests the connection to JIRA
func (c *Client) TestConnection() error {
	_, err := c.makeRequest("/rest/api/3/myself")
	return err
}

// GetProjects retrieves all projects accessible to the user
func (c *Client) GetProjects() ([]Project, error) {
	endpoint := "/rest/api/3/project/search?maxResults=1000"

	body, err := c.makeRequest(endpoint)
	if err != nil {
		return nil, err
	}

	var projectResp JiraProjectSearchResponse
	if err := json.Unmarshal(body, &projectResp); err != nil {
		return nil, fmt.Errorf("error parsing response: %w", err)
	}

	return projectResp.Values, nil
}

// extractTextFromADF extracts plain text from Atlassian Document Format
func extractTextFromADF(adf map[string]interface{}) string {
	var text string

	// If there's a direct text field, use it
	if textVal, ok := adf["text"].(string); ok {
		text += textVal
	}

	// Recursively extract text from content array
	if content, ok := adf["content"].([]interface{}); ok {
		for _, item := range content {
			if itemMap, ok := item.(map[string]interface{}); ok {
				// Recursively process this item
				extracted := extractTextFromADF(itemMap)
				if extracted != "" {
					// Add spacing based on node type
					nodeType, _ := itemMap["type"].(string)
					if nodeType == "paragraph" || nodeType == "heading" {
						text += extracted + "\n\n"
					} else {
						text += extracted
					}
				}
			}
		}
	}

	return text
}

// GetIssueChangelog retrieves the changelog for a specific issue
func (c *Client) GetIssueChangelog(issueKey string) ([]StatusHistory, error) {
	endpoint := fmt.Sprintf("/rest/api/3/issue/%s?expand=changelog", issueKey)

	body, err := c.makeRequest(endpoint)
	if err != nil {
		return nil, fmt.Errorf("error fetching changelog: %w", err)
	}

	// Parse the issue response which includes changelog
	var issueResp struct {
		Changelog struct {
			MaxResults int `json:"maxResults"`
			Total      int `json:"total"`
			Histories  []struct {
				Created string `json:"created"`
				Items   []struct {
					Field      string `json:"field"`
					FromString string `json:"fromString"`
					ToString   string `json:"toString"`
				} `json:"items"`
			} `json:"histories"`
		} `json:"changelog"`
	}

	if err := json.Unmarshal(body, &issueResp); err != nil {
		return nil, fmt.Errorf("error parsing changelog response: %w", err)
	}

	// Extract status changes from changelog
	var statusHistory []StatusHistory

	// If no changelog histories found, return empty array
	if len(issueResp.Changelog.Histories) == 0 {
		return []StatusHistory{}, nil
	}

	for _, history := range issueResp.Changelog.Histories {
		for _, item := range history.Items {
			if item.Field == "status" {
				// Try RFC3339 format first
				timestamp, err := time.Parse(time.RFC3339, history.Created)
				if err != nil {
					// Try alternative format with timezone without colon (e.g., -0500 instead of -05:00)
					timestamp, err = time.Parse("2006-01-02T15:04:05.999-0700", history.Created)
					if err != nil {
						// Skip this entry if we can't parse the timestamp
						continue
					}
				}

				statusHistory = append(statusHistory, StatusHistory{
					Status:     item.ToString,
					Timestamp:  timestamp,
					FromStatus: item.FromString,
				})
			}
		}
	}

	// Return empty array instead of nil if no status changes found
	if statusHistory == nil {
		return []StatusHistory{}, nil
	}

	return statusHistory, nil
}

// CalculateDevelopmentMetrics calculates development time metrics from status history
func CalculateDevelopmentMetrics(statusHistory []StatusHistory) (totalQADays float64, developmentTimeDays float64) {
	// Return early if no history
	if len(statusHistory) == 0 {
		return 0, 0
	}

	// QA statuses
	qaStatuses := map[string]bool{
		"QA Review":    true,
		"QA":           true,
		"Testing":      true,
		"Ready for QA": true,
		"In Testing":   true,
	}

	// Development start statuses - prioritize To Do over Open/Backlog
	todoStatuses := map[string]bool{
		"To Do": true,
		"ToDo":  true,
	}

	// Fallback start statuses (only use if no To Do found)
	fallbackStartStatuses := map[string]bool{
		"Open":    true,
		"Backlog": true,
	}

	// Code Review statuses (end of development phase)
	codeReviewStatuses := map[string]bool{
		"Code Review": true,
		"In Review":   true,
		"Review":      true,
	}

	// Track cumulative time in QA statuses
	var qaEnterTime *time.Time
	var toDoTime *time.Time
	var fallbackStartTime *time.Time
	var codeReviewTime *time.Time
	var lastQATime *time.Time

	// Iterate through status history
	for i := range statusHistory {
		status := statusHistory[i].Status
		timestamp := statusHistory[i].Timestamp

		// Find first "To Do" (highest priority)
		if toDoTime == nil && todoStatuses[status] {
			toDoTime = &timestamp
		}

		// Track fallback start time (Open/Backlog) in case no To Do is found
		if fallbackStartTime == nil && fallbackStartStatuses[status] {
			fallbackStartTime = &timestamp
		}

		// Find LAST "Code Review" (keep updating to get the latest one)
		if codeReviewStatuses[status] {
			codeReviewTime = &timestamp
		}

		// Track when ticket enters QA
		if qaStatuses[status] {
			if qaEnterTime == nil {
				// First time entering QA in this session
				qaEnterTime = &timestamp
			}
			lastQATime = &timestamp
		} else {
			// Ticket left QA status, calculate the duration
			if qaEnterTime != nil {
				duration := timestamp.Sub(*qaEnterTime)
				days := duration.Hours() / 24
				totalQADays += days
				qaEnterTime = nil // Reset for next QA session
			}
		}
	}

	// If ticket is currently in QA (qaEnterTime is set), count time up to the last status change
	if qaEnterTime != nil && lastQATime != nil {
		duration := lastQATime.Sub(*qaEnterTime)
		days := duration.Hours() / 24
		totalQADays += days
	}

	// Log if we calculated any QA time (temporary debug logging)
	if totalQADays > 0 {
		log.Printf("Calculated QA time: %.2f days (from %d status changes)", totalQADays, len(statusHistory))
	} else if len(statusHistory) > 0 {
		log.Printf("No QA time calculated despite %d status changes", len(statusHistory))
	}

	// Use fallback start time if no To Do was found
	if toDoTime == nil && fallbackStartTime != nil {
		toDoTime = fallbackStartTime
	}

	// Calculate Development Time (To Do to LAST Code Review or QA Review)
	// Use whichever is later: LAST Code Review or LAST QA Review
	if toDoTime != nil {
		var endTime *time.Time

		// Determine which timestamp is later
		if codeReviewTime != nil && lastQATime != nil {
			// Both exist, use the later one
			if codeReviewTime.After(*lastQATime) {
				endTime = codeReviewTime
			} else {
				endTime = lastQATime
			}
		} else if codeReviewTime != nil {
			// Only Code Review exists
			endTime = codeReviewTime
		} else if lastQATime != nil {
			// Only QA Review exists
			endTime = lastQATime
		}

		// Calculate duration from first To Do to the latest review status
		if endTime != nil && endTime.After(*toDoTime) {
			duration := endTime.Sub(*toDoTime)
			developmentTimeDays = duration.Hours() / 24
		}
	}

	return totalQADays, developmentTimeDays
}

// GetSprintsByProject retrieves all sprints for a project by searching through its boards
func (c *Client) GetSprintsByProject(projectKey string) ([]Sprint, error) {
	// First, get boards associated with this project
	boardEndpoint := fmt.Sprintf("/rest/agile/1.0/board?projectKeyOrId=%s&maxResults=100", projectKey)
	boardBody, err := c.makeRequest(boardEndpoint)
	if err != nil {
		return nil, fmt.Errorf("error fetching boards: %w", err)
	}

	var boardResp struct {
		Values []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		} `json:"values"`
	}
	if err := json.Unmarshal(boardBody, &boardResp); err != nil {
		return nil, fmt.Errorf("error parsing board response: %w", err)
	}

	// Collect all sprints from all boards
	allSprints := make([]Sprint, 0)
	seenSprints := make(map[int]bool) // To avoid duplicates

	for _, board := range boardResp.Values {
		sprintEndpoint := fmt.Sprintf("/rest/agile/1.0/board/%d/sprint?maxResults=100", board.ID)
		sprintBody, err := c.makeRequest(sprintEndpoint)
		if err != nil {
			// Continue to next board if this one fails
			continue
		}

		var sprintResp JiraSprintSearchResponse
		if err := json.Unmarshal(sprintBody, &sprintResp); err != nil {
			continue
		}

		for _, sprint := range sprintResp.Values {
			if !seenSprints[sprint.ID] {
				sprint.BoardID = board.ID
				allSprints = append(allSprints, sprint)
				seenSprints[sprint.ID] = true
			}
		}
	}

	return allSprints, nil
}

// GetSprint fetches a single sprint by ID
func (c *Client) GetSprint(sprintID int) (Sprint, error) {
	endpoint := fmt.Sprintf("/rest/agile/1.0/sprint/%d", sprintID)
	body, err := c.makeRequest(endpoint)
	if err != nil {
		return Sprint{}, fmt.Errorf("error fetching sprint: %w", err)
	}

	var sprint Sprint
	if err := json.Unmarshal(body, &sprint); err != nil {
		return Sprint{}, fmt.Errorf("error parsing sprint response: %w", err)
	}

	return sprint, nil
}
