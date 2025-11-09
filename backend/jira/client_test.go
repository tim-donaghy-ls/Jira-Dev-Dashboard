package jira

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewClient(t *testing.T) {
	client := NewClient("https://test.atlassian.net", "test@example.com", "token123")

	assert.NotNil(t, client)
	assert.Equal(t, "https://test.atlassian.net", client.BaseURL)
	assert.Equal(t, "test@example.com", client.Email)
	assert.Equal(t, "token123", client.APIToken)
	assert.NotNil(t, client.HTTPClient)
	assert.Equal(t, 30*time.Second, client.HTTPClient.Timeout)
}

func TestMakeRequest_Success(t *testing.T) {
	// Create a test server that returns mock data
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify authentication header
		auth := r.Header.Get("Authorization")
		assert.Contains(t, auth, "Basic")

		// Verify content type
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		// Return mock response
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	data, err := client.makeRequest("/test")

	assert.NoError(t, err)
	assert.Contains(t, string(data), "success")
}

func TestMakeRequest_Unauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"errorMessages":["Invalid credentials"]}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "wrong-token")
	_, err := client.makeRequest("/test")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "401")
}

func TestSearchIssues_Success(t *testing.T) {
	mockResponse := JiraSearchResponse{
		Total: 2,
		Issues: []JiraIssue{
			{
				Key: "TEST-1",
				Fields: JiraFields{
					Summary:     "Test Issue 1",
					Description: nil,
					Status:      JiraStatus{Name: "To Do"},
					Priority:    JiraPriority{Name: "High"},
					IssueType:   JiraIssueType{Name: "Story"},
					Created:     "2024-01-01T10:00:00.000+0000",
					Updated:     "2024-01-02T10:00:00.000+0000",
					Reporter:    JiraUser{DisplayName: "Reporter1"},
				},
			},
			{
				Key: "TEST-2",
				Fields: JiraFields{
					Summary:        "Test Issue 2",
					Status:         JiraStatus{Name: "Done"},
					Priority:       JiraPriority{Name: "Medium"},
					IssueType:      JiraIssueType{Name: "Bug"},
					Created:        "2024-01-01T11:00:00.000+0000",
					Updated:        "2024-01-03T10:00:00.000+0000",
					Resolutiondate: stringPtr("2024-01-03T10:00:00.000+0000"),
					Reporter:       JiraUser{DisplayName: "Reporter2"},
				},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/rest/api/3/search/jql")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	issues, err := client.SearchIssues("project = TEST", 100)

	assert.NoError(t, err)
	assert.Len(t, issues, 2)
	assert.Equal(t, "TEST-1", issues[0].Key)
	assert.Equal(t, "Test Issue 1", issues[0].Summary)
	assert.Equal(t, "To Do", issues[0].Status)
	assert.Equal(t, "High", issues[0].Priority)
	assert.Equal(t, "Story", issues[0].IssueType)

	assert.Equal(t, "TEST-2", issues[1].Key)
	assert.Equal(t, "Done", issues[1].Status)
}

func TestSearchIssues_WithStoryPoints(t *testing.T) {
	mockResponse := JiraSearchResponse{
		Total: 1,
		Issues: []JiraIssue{
			{
				Key: "TEST-1",
				Fields: JiraFields{
					Summary:      "Story with points",
					Status:       JiraStatus{Name: "In Progress"},
					IssueType:    JiraIssueType{Name: "Story"},
					Created:      "2024-01-01T10:00:00.000+0000",
					Updated:      "2024-01-02T10:00:00.000+0000",
					StoryPoints1: float64(5.0),
					Reporter:     JiraUser{DisplayName: "Reporter1"},
				},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	issues, err := client.SearchIssues("project = TEST", 100)

	assert.NoError(t, err)
	assert.Len(t, issues, 1)
	assert.Equal(t, 5.0, issues[0].StoryPoints)
}

func TestSearchIssues_MultipleStoryPointsFields(t *testing.T) {
	testCases := []struct {
		name           string
		field10016     interface{}
		field10026     interface{}
		fieldAlt       interface{}
		expectedPoints float64
	}{
		{
			name:           "Story points in field 10016",
			field10016:     float64(3.0),
			field10026:     nil,
			fieldAlt:       nil,
			expectedPoints: 3.0,
		},
		{
			name:           "Story points in field 10026",
			field10016:     nil,
			field10026:     float64(8.0),
			fieldAlt:       nil,
			expectedPoints: 8.0,
		},
		{
			name:           "Story points in alt field",
			field10016:     nil,
			field10026:     nil,
			fieldAlt:       float64(13.0),
			expectedPoints: 13.0,
		},
		{
			name:           "No story points",
			field10016:     nil,
			field10026:     nil,
			fieldAlt:       nil,
			expectedPoints: 0.0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockResponse := JiraSearchResponse{
				Total: 1,
				Issues: []JiraIssue{
					{
						Key: "TEST-1",
						Fields: JiraFields{
							Summary:       "Test issue",
							Status:        JiraStatus{Name: "To Do"},
							IssueType:     JiraIssueType{Name: "Story"},
							Created:       "2024-01-01T10:00:00.000+0000",
							Updated:       "2024-01-02T10:00:00.000+0000",
							StoryPoints1:  tc.field10016,
							StoryPoints2:  tc.field10026,
							StoryPointsAlt: tc.fieldAlt,
							Reporter:      JiraUser{DisplayName: "Reporter1"},
						},
					},
				},
			}

			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(mockResponse)
			}))
			defer server.Close()

			client := NewClient(server.URL, "test@example.com", "token123")
			issues, err := client.SearchIssues("project = TEST", 100)

			assert.NoError(t, err)
			assert.Len(t, issues, 1)
			assert.Equal(t, tc.expectedPoints, issues[0].StoryPoints)
		})
	}
}

func TestGetIssueChangelog_Success(t *testing.T) {
	mockResponse := struct {
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
	}{
		Changelog: struct {
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
		}{
			MaxResults: 2,
			Total:      2,
			Histories: []struct {
				Created string `json:"created"`
				Items   []struct {
					Field      string `json:"field"`
					FromString string `json:"fromString"`
					ToString   string `json:"toString"`
				} `json:"items"`
			}{
				{
					Created: "2024-01-01T10:00:00.000+0000",
					Items: []struct {
						Field      string `json:"field"`
						FromString string `json:"fromString"`
						ToString   string `json:"toString"`
					}{
						{
							Field:      "status",
							FromString: "To Do",
							ToString:   "In Progress",
						},
					},
				},
				{
					Created: "2024-01-02T10:00:00.000+0000",
					Items: []struct {
						Field      string `json:"field"`
						FromString string `json:"fromString"`
						ToString   string `json:"toString"`
					}{
						{
							Field:      "status",
							FromString: "In Progress",
							ToString:   "Done",
						},
					},
				},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/rest/api/3/issue/TEST-1")
		assert.Contains(t, r.URL.Query().Get("expand"), "changelog")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	history, err := client.GetIssueChangelog("TEST-1")

	assert.NoError(t, err)
	assert.Len(t, history, 2)
	assert.Equal(t, "In Progress", history[0].Status)
	assert.Equal(t, "To Do", history[0].FromStatus)
	assert.Equal(t, "Done", history[1].Status)
	assert.Equal(t, "In Progress", history[1].FromStatus)
}

func TestGetProjects_Success(t *testing.T) {
	mockResponse := JiraProjectSearchResponse{
		MaxResults: 2,
		Total:      2,
		Values: []Project{
			{ID: "10001", Key: "TEST", Name: "Test Project"},
			{ID: "10002", Key: "DEMO", Name: "Demo Project"},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/rest/api/3/project/search")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	projects, err := client.GetProjects()

	assert.NoError(t, err)
	assert.Len(t, projects, 2)
	assert.Equal(t, "TEST", projects[0].Key)
	assert.Equal(t, "Test Project", projects[0].Name)
}

func TestTestConnection_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"version": "9.0.0",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	err := client.TestConnection()

	assert.NoError(t, err)
}

func TestTestConnection_Failed(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "wrong-token")
	err := client.TestConnection()

	assert.Error(t, err)
}

func TestGetIssuesByProject_Success(t *testing.T) {
	mockResponse := JiraSearchResponse{
		Total: 1,
		Issues: []JiraIssue{
			{
				Key: "TEST-1",
				Fields: JiraFields{
					Summary:   "Project issue",
					Status:    JiraStatus{Name: "To Do"},
					Priority:  JiraPriority{Name: "High"},
					IssueType: JiraIssueType{Name: "Story"},
					Created:   "2024-01-01T10:00:00.000+0000",
					Updated:   "2024-01-02T10:00:00.000+0000",
					Reporter:  JiraUser{DisplayName: "Reporter1"},
				},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Query().Get("jql"), "project = \"TEST\"")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	issues, err := client.GetIssuesByProject("TEST")

	assert.NoError(t, err)
	assert.Len(t, issues, 1)
	assert.Equal(t, "TEST-1", issues[0].Key)
}

func TestGetIssuesBySprint_Success(t *testing.T) {
	mockResponse := JiraSearchResponse{
		Total: 1,
		Issues: []JiraIssue{
			{
				Key: "TEST-1",
				Fields: JiraFields{
					Summary:   "Sprint issue",
					Status:    JiraStatus{Name: "In Progress"},
					Priority:  JiraPriority{Name: "Medium"},
					IssueType: JiraIssueType{Name: "Bug"},
					Created:   "2024-01-01T10:00:00.000+0000",
					Updated:   "2024-01-02T10:00:00.000+0000",
					Reporter:  JiraUser{DisplayName: "Reporter1"},
				},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Query().Get("jql"), "sprint = 123")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	issues, err := client.GetIssuesBySprint(123)

	assert.NoError(t, err)
	assert.Len(t, issues, 1)
	assert.Equal(t, "TEST-1", issues[0].Key)
}

func TestConvertJiraIssue_WithAssignee(t *testing.T) {
	jiraIssue := JiraIssue{
		Key: "TEST-1",
		Fields: JiraFields{
			Summary:   "Test with assignee",
			Status:    JiraStatus{Name: "To Do"},
			Priority:  JiraPriority{Name: "High"},
			IssueType: JiraIssueType{Name: "Story"},
			Created:   "2024-01-01T10:00:00.000+0000",
			Updated:   "2024-01-02T10:00:00.000+0000",
			Assignee:  &JiraUser{DisplayName: "John Doe"},
			Reporter:  JiraUser{DisplayName: "Jane Doe"},
		},
	}

	issue := convertJiraIssue(jiraIssue)

	assert.Equal(t, "John Doe", issue.Assignee)
	assert.Equal(t, "Jane Doe", issue.Reporter)
}

func TestConvertJiraIssue_WithoutAssignee(t *testing.T) {
	jiraIssue := JiraIssue{
		Key: "TEST-1",
		Fields: JiraFields{
			Summary:   "Test without assignee",
			Status:    JiraStatus{Name: "To Do"},
			Priority:  JiraPriority{Name: "High"},
			IssueType: JiraIssueType{Name: "Story"},
			Created:   "2024-01-01T10:00:00.000+0000",
			Updated:   "2024-01-02T10:00:00.000+0000",
			Assignee:  nil,
			Reporter:  JiraUser{DisplayName: "Jane Doe"},
		},
	}

	issue := convertJiraIssue(jiraIssue)

	assert.Equal(t, "", issue.Assignee)
}

func TestConvertJiraIssue_WithSprint(t *testing.T) {
	jiraIssue := JiraIssue{
		Key: "TEST-1",
		Fields: JiraFields{
			Summary:   "Test with sprint",
			Status:    JiraStatus{Name: "To Do"},
			Priority:  JiraPriority{Name: "High"},
			IssueType: JiraIssueType{Name: "Story"},
			Created:   "2024-01-01T10:00:00.000+0000",
			Updated:   "2024-01-02T10:00:00.000+0000",
			Reporter:  JiraUser{DisplayName: "Jane Doe"},
			Sprint:    &JiraSprint{ID: 1, Name: "Sprint 1"},
		},
	}

	issue := convertJiraIssue(jiraIssue)

	assert.Equal(t, "Sprint 1", issue.Sprint)
}

func TestConvertJiraIssue_StringDescription(t *testing.T) {
	desc := "Simple string description"
	jiraIssue := JiraIssue{
		Key: "TEST-1",
		Fields: JiraFields{
			Summary:     "Test",
			Description: desc,
			Status:      JiraStatus{Name: "To Do"},
			Priority:    JiraPriority{Name: "High"},
			IssueType:   JiraIssueType{Name: "Story"},
			Created:     "2024-01-01T10:00:00.000+0000",
			Updated:     "2024-01-02T10:00:00.000+0000",
			Reporter:    JiraUser{DisplayName: "Jane Doe"},
		},
	}

	issue := convertJiraIssue(jiraIssue)

	assert.Equal(t, "Simple string description", issue.Description)
}

func TestConvertJiraIssue_ADFDescription(t *testing.T) {
	adfDesc := map[string]interface{}{
		"type": "doc",
		"content": []interface{}{
			map[string]interface{}{
				"type": "paragraph",
				"content": []interface{}{
					map[string]interface{}{
						"type": "text",
						"text": "First paragraph",
					},
				},
			},
			map[string]interface{}{
				"type": "paragraph",
				"content": []interface{}{
					map[string]interface{}{
						"type": "text",
						"text": "Second paragraph",
					},
				},
			},
		},
	}

	jiraIssue := JiraIssue{
		Key: "TEST-1",
		Fields: JiraFields{
			Summary:     "Test",
			Description: adfDesc,
			Status:      JiraStatus{Name: "To Do"},
			Priority:    JiraPriority{Name: "High"},
			IssueType:   JiraIssueType{Name: "Story"},
			Created:     "2024-01-01T10:00:00.000+0000",
			Updated:     "2024-01-02T10:00:00.000+0000",
			Reporter:    JiraUser{DisplayName: "Jane Doe"},
		},
	}

	issue := convertJiraIssue(jiraIssue)

	assert.Contains(t, issue.Description, "First paragraph")
	assert.Contains(t, issue.Description, "Second paragraph")
}

func TestExtractStoryPoints_DifferentTypes(t *testing.T) {
	testCases := []struct {
		name           string
		fields         JiraFields
		expectedPoints float64
	}{
		{
			name:           "float64",
			fields:         JiraFields{StoryPoints1: float64(5.0)},
			expectedPoints: 5.0,
		},
		{
			name:           "float32",
			fields:         JiraFields{StoryPoints2: float32(3.5)},
			expectedPoints: 3.5,
		},
		{
			name:           "int",
			fields:         JiraFields{StoryPoints3: int(8)},
			expectedPoints: 8.0,
		},
		{
			name:           "int64",
			fields:         JiraFields{StoryPoints4: int64(13)},
			expectedPoints: 13.0,
		},
		{
			name:           "string",
			fields:         JiraFields{StoryPoints5: "2.5"},
			expectedPoints: 2.5,
		},
		{
			name:           "empty array",
			fields:         JiraFields{StoryPoints1: []interface{}{}},
			expectedPoints: 0.0,
		},
		{
			name:           "nil values",
			fields:         JiraFields{},
			expectedPoints: 0.0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			points := extractStoryPoints(tc.fields)
			assert.Equal(t, tc.expectedPoints, points)
		})
	}
}

func TestGetIssueChangelog_EmptyHistory(t *testing.T) {
	mockResponse := struct {
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
	}{
		Changelog: struct {
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
		}{
			MaxResults: 0,
			Total:      0,
			Histories:  []struct {
				Created string `json:"created"`
				Items   []struct {
					Field      string `json:"field"`
					FromString string `json:"fromString"`
					ToString   string `json:"toString"`
				} `json:"items"`
			}{},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	history, err := client.GetIssueChangelog("TEST-1")

	assert.NoError(t, err)
	assert.Len(t, history, 0)
	assert.NotNil(t, history) // Should be empty array, not nil
}

func TestGetSprintsByProject_Success(t *testing.T) {
	boardResponse := struct {
		Values []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		} `json:"values"`
	}{
		Values: []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}{
			{ID: 1, Name: "Board 1"},
		},
	}

	sprintResponse := JiraSprintSearchResponse{
		MaxResults: 2,
		Total:      2,
		Values: []Sprint{
			{ID: 100, Name: "Sprint 1", State: "active"},
			{ID: 101, Name: "Sprint 2", State: "future"},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/agile/1.0/board" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(boardResponse)
		} else if r.URL.Path == "/rest/agile/1.0/board/1/sprint" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(sprintResponse)
		}
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	sprints, err := client.GetSprintsByProject("TEST")

	assert.NoError(t, err)
	assert.Len(t, sprints, 2)
	assert.Equal(t, "Sprint 1", sprints[0].Name)
	assert.Equal(t, 1, sprints[0].BoardID)
}

func TestGetSprintsByProject_NoBoardsFound(t *testing.T) {
	boardResponse := struct {
		Values []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		} `json:"values"`
	}{
		Values: []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}{},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(boardResponse)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	sprints, err := client.GetSprintsByProject("TEST")

	assert.NoError(t, err)
	assert.Len(t, sprints, 0)
}

func TestGetSprint_Success(t *testing.T) {
	mockSprint := Sprint{
		ID:    100,
		Name:  "Sprint 1",
		State: "active",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/rest/agile/1.0/sprint/100")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockSprint)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	sprint, err := client.GetSprint(100)

	assert.NoError(t, err)
	assert.Equal(t, 100, sprint.ID)
	assert.Equal(t, "Sprint 1", sprint.Name)
	assert.Equal(t, "active", sprint.State)
}

func TestExtractTextFromADF_Simple(t *testing.T) {
	adf := map[string]interface{}{
		"type": "text",
		"text": "Simple text",
	}

	result := extractTextFromADF(adf)

	assert.Equal(t, "Simple text", result)
}

func TestExtractTextFromADF_Nested(t *testing.T) {
	adf := map[string]interface{}{
		"type": "doc",
		"content": []interface{}{
			map[string]interface{}{
				"type": "paragraph",
				"content": []interface{}{
					map[string]interface{}{
						"type": "text",
						"text": "Line 1",
					},
				},
			},
			map[string]interface{}{
				"type": "heading",
				"content": []interface{}{
					map[string]interface{}{
						"type": "text",
						"text": "Heading",
					},
				},
			},
		},
	}

	result := extractTextFromADF(adf)

	assert.Contains(t, result, "Line 1")
	assert.Contains(t, result, "Heading")
}

// Error handling tests to improve coverage

func TestGetProjects_ParseError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{invalid json`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.GetProjects()

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error parsing response")
}

func TestGetSprint_Error(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.GetSprint(999)

	assert.Error(t, err)
}

func TestGetSprint_ParseError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{invalid json`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.GetSprint(100)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error parsing sprint response")
}

func TestGetIssueChangelog_Error(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.GetIssueChangelog("TEST-999")

	assert.Error(t, err)
}

func TestGetIssueChangelog_ParseError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{invalid json`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.GetIssueChangelog("TEST-1")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error parsing changelog response")
}

func TestSearchIssues_ParseError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{invalid json`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.SearchIssues("project = TEST", 10)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error parsing response")
}

func TestGetSprintsByProject_Error(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.GetSprintsByProject("TEST")

	assert.Error(t, err)
}

func TestGetSprintsByProject_BoardParseError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/agile/1.0/board" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{invalid json`))
		}
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	_, err := client.GetSprintsByProject("TEST")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error parsing board response")
}

// Edge case tests for convertJiraIssue to improve coverage

func TestSearchIssues_InvalidDates(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"issues": []map[string]interface{}{
				{
					"key": "TEST-1",
					"fields": map[string]interface{}{
						"summary":     "Test Issue",
						"description": "Test description",
						"created":     "invalid-date-format",
						"updated":     "also-invalid",
						"status":      map[string]interface{}{"name": "To Do"},
						"priority":    map[string]interface{}{"name": "Medium"},
						"issuetype":   map[string]interface{}{"name": "Task"},
						"reporter":    map[string]interface{}{"displayName": "Reporter"},
						"labels":      []string{},
					},
				},
			},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	issues, err := client.SearchIssues("project = TEST", 10)

	assert.NoError(t, err)
	assert.Len(t, issues, 1)
	// Issue should be created despite invalid dates (dates will be zero values)
	assert.Equal(t, "TEST-1", issues[0].Key)
}

func TestSearchIssues_InvalidResolutionDate(t *testing.T) {
	resolutionDate := "invalid-date"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"issues": []map[string]interface{}{
				{
					"key": "TEST-1",
					"fields": map[string]interface{}{
						"summary":        "Test Issue",
						"description":    "Test description",
						"created":        "2024-01-01T10:00:00Z",
						"updated":        "2024-01-02T10:00:00Z",
						"resolutiondate": resolutionDate,
						"status":         map[string]interface{}{"name": "Done"},
						"priority":       map[string]interface{}{"name": "High"},
						"issuetype":      map[string]interface{}{"name": "Bug"},
						"reporter":       map[string]interface{}{"displayName": "Reporter"},
						"labels":         []string{},
					},
				},
			},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	issues, err := client.SearchIssues("project = TEST", 10)

	assert.NoError(t, err)
	assert.Len(t, issues, 1)
	// Resolution date should be nil due to parse error
	assert.Nil(t, issues[0].Resolved)
}

func TestSearchIssues_NonStandardDescriptionType(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"issues": []map[string]interface{}{
				{
					"key": "TEST-1",
					"fields": map[string]interface{}{
						"summary":     "Test Issue",
						"description": 12345, // Integer instead of string or object
						"created":     "2024-01-01T10:00:00Z",
						"updated":     "2024-01-02T10:00:00Z",
						"status":      map[string]interface{}{"name": "To Do"},
						"priority":    map[string]interface{}{"name": "Medium"},
						"issuetype":   map[string]interface{}{"name": "Task"},
						"reporter":    map[string]interface{}{"displayName": "Reporter"},
						"labels":      []string{},
					},
				},
			},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test@example.com", "token123")
	issues, err := client.SearchIssues("project = TEST", 10)

	assert.NoError(t, err)
	assert.Len(t, issues, 1)
	// Description should be empty string for non-standard types
	assert.Equal(t, "", issues[0].Description)
}

// Note: extractTextFromADF and parseJiraTime are internal functions
// They are tested indirectly through the public API methods like SearchIssues

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func floatPtr(f float64) *float64 {
	return &f
}
