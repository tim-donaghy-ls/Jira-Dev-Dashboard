package api

import (
	"encoding/json"
	"jira-dashboard/config"
	"jira-dashboard/jira"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestNewHandler tests the NewHandler constructor
func TestNewHandler(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)

	handler := NewHandler(cfg, clients)

	assert.NotNil(t, handler)
	assert.Equal(t, cfg, handler.config)
	assert.Equal(t, clients, handler.jiraClients)
}

// TestGetJiraClient_Primary tests getting the primary JIRA client
func TestGetJiraClient_Primary(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}

	handler := NewHandler(cfg, clients)

	// Test getting primary when no instance specified
	client, err := handler.getJiraClient("")
	assert.NoError(t, err)
	assert.Equal(t, mockClient, client)
}

// TestGetJiraClient_Specific tests getting a specific JIRA client
func TestGetJiraClient_Specific(t *testing.T) {
	cfg := &config.Config{}
	mockClient1 := &jira.Client{}
	mockClient2 := &jira.Client{}
	clients := map[string]*jira.Client{
		"instance1": mockClient1,
		"instance2": mockClient2,
	}

	handler := NewHandler(cfg, clients)

	// Test getting specific instance
	client, err := handler.getJiraClient("instance1")
	assert.NoError(t, err)
	assert.Equal(t, mockClient1, client)

	client, err = handler.getJiraClient("instance2")
	assert.NoError(t, err)
	assert.Equal(t, mockClient2, client)
}

// TestGetJiraClient_NotFound tests error when instance doesn't exist
func TestGetJiraClient_NotFound(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)

	handler := NewHandler(cfg, clients)

	// Test with no instances configured
	client, err := handler.getJiraClient("")
	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "no JIRA instances configured")

	// Test with non-existent instance
	clients["existing"] = &jira.Client{}
	handler = NewHandler(cfg, clients)

	client, err = handler.getJiraClient("nonexistent")
	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "instance 'nonexistent' not found")
}

// TestGetJiraClient_FirstAvailable tests getting first available client
func TestGetJiraClient_FirstAvailable(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"some-instance": mockClient,
	}

	handler := NewHandler(cfg, clients)

	// Test getting first available when no primary
	client, err := handler.getJiraClient("")
	assert.NoError(t, err)
	assert.NotNil(t, client)
}

// TestHandleInstances tests the handleInstances endpoint
func TestHandleInstances(t *testing.T) {
	cfg := &config.Config{
		Instances: map[string]*config.JiraInstance{
			"instance1": {Name: "Test Instance 1"},
			"instance2": {Name: "Test Instance 2"},
		},
	}
	clients := make(map[string]*jira.Client)

	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/instances", nil)
	w := httptest.NewRecorder()

	handler.handleInstances(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, float64(2), response["count"])

	instances := response["instances"].([]interface{})
	assert.Len(t, instances, 2)
}

// TestHandleInstances_Empty tests the handleInstances endpoint with no instances
func TestHandleInstances_Empty(t *testing.T) {
	cfg := &config.Config{
		Instances: make(map[string]*config.JiraInstance),
	}
	clients := make(map[string]*jira.Client)

	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/instances", nil)
	w := httptest.NewRecorder()

	handler.handleInstances(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, float64(0), response["count"])
}

// TestRegisterRoutes tests that routes are registered
func TestRegisterRoutes(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)

	handler := NewHandler(cfg, clients)
	mux := http.NewServeMux()

	// This should not panic
	handler.RegisterRoutes(mux)

	// Basic verification that routes are registered
	// We can't easily test the routes without making actual HTTP calls
	// but we can at least ensure RegisterRoutes completes without error
	assert.NotNil(t, mux)
}

// TestHandleInstances_MethodNotAllowed tests method validation
func TestHandleInstances_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{
		Instances: make(map[string]*config.JiraInstance),
	}
	clients := make(map[string]*jira.Client)

	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/instances", nil)
	w := httptest.NewRecorder()

	handler.handleInstances(w, req)

	// Should return method not allowed
	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleProjects_MethodNotAllowed tests method validation for projects endpoint
func TestHandleProjects_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/projects", nil)
	w := httptest.NewRecorder()

	handler.handleProjects(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleProjects_NoClients tests projects endpoint with no JIRA clients
func TestHandleProjects_NoClients(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	w := httptest.NewRecorder()

	handler.handleProjects(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleSprints_MethodNotAllowed tests method validation for sprints endpoint
func TestHandleSprints_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/sprints", nil)
	w := httptest.NewRecorder()

	handler.handleSprints(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleSprints_MissingProject tests sprints endpoint without project parameter
func TestHandleSprints_MissingProject(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/sprints", nil)
	w := httptest.NewRecorder()

	handler.handleSprints(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleTestConnection_MethodNotAllowed tests method validation for test connection endpoint
func TestHandleTestConnection_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/test-connection", nil)
	w := httptest.NewRecorder()

	handler.handleTestConnection(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleTestConnection_NoClients tests test connection endpoint with no clients
func TestHandleTestConnection_NoClients(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/test-connection", nil)
	w := httptest.NewRecorder()

	handler.handleTestConnection(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleDashboard_MethodNotAllowed tests method validation for dashboard endpoint
func TestHandleDashboard_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/dashboard", nil)
	w := httptest.NewRecorder()

	handler.handleDashboard(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleDashboard_MissingProject tests dashboard endpoint without project parameter
func TestHandleDashboard_MissingProject(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard", nil)
	w := httptest.NewRecorder()

	handler.handleDashboard(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleDashboard_InvalidSprintID tests dashboard endpoint with invalid sprint ID
func TestHandleDashboard_InvalidSprintID(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard?project=TEST&sprint=invalid", nil)
	w := httptest.NewRecorder()

	handler.handleDashboard(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleProject_MethodNotAllowed tests method validation for project endpoint
func TestHandleProject_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/project/TEST", nil)
	w := httptest.NewRecorder()

	handler.handleProject(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleProject_NoProjectKey tests project endpoint without project key
func TestHandleProject_NoProjectKey(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/project/", nil)
	w := httptest.NewRecorder()

	handler.handleProject(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleSprint_MethodNotAllowed tests method validation for sprint endpoint
func TestHandleSprint_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/sprint/123", nil)
	w := httptest.NewRecorder()

	handler.handleSprint(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleSprint_InvalidSprintID tests sprint endpoint with invalid sprint ID
func TestHandleSprint_InvalidSprintID(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/sprint/invalid", nil)
	w := httptest.NewRecorder()

	handler.handleSprint(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleIssueChangelog_MethodNotAllowed tests method validation for issue changelog endpoint
func TestHandleIssueChangelog_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	clients := make(map[string]*jira.Client)
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodPost, "/api/issue/TEST-123", nil)
	w := httptest.NewRecorder()

	handler.handleIssueChangelog(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// TestHandleIssueChangelog_NoIssueKey tests issue changelog endpoint without issue key
func TestHandleIssueChangelog_NoIssueKey(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/issue/", nil)
	w := httptest.NewRecorder()

	handler.handleIssueChangelog(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestHandleProjects_Success tests successful retrieval of projects
func TestHandleProjects_Success(t *testing.T) {
	mockProjectsResponse := jira.JiraProjectSearchResponse{
		Values: []jira.Project{
			{Key: "TEST1", Name: "Test Project 1"},
			{Key: "TEST2", Name: "Test Project 2"},
		},
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/api/3/project/search" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockProjectsResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	w := httptest.NewRecorder()

	handler.handleProjects(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	projects := response["projects"].([]interface{})
	assert.Len(t, projects, 2)
}

// TestHandleSprints_Success tests successful retrieval of sprints
func TestHandleSprints_Success(t *testing.T) {
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

	sprintResponse := jira.JiraSprintSearchResponse{
		MaxResults: 2,
		Total:      2,
		Values: []jira.Sprint{
			{ID: 100, Name: "Sprint 1", State: "active", BoardID: 1},
			{ID: 101, Name: "Sprint 2", State: "future", BoardID: 1},
		},
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/agile/1.0/board" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(boardResponse)
		} else if r.URL.Path == "/rest/agile/1.0/board/1/sprint" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(sprintResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/sprints?project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleSprints(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	sprints := response["sprints"].([]interface{})
	assert.Len(t, sprints, 2)
	assert.Equal(t, float64(2), response["count"])
}

// TestHandleTestConnection_Success tests successful connection test
func TestHandleTestConnection_Success(t *testing.T) {
	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/api/2/myself" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"displayName": "Test User",
			})
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/test-connection", nil)
	w := httptest.NewRecorder()

	handler.handleTestConnection(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, true, response["success"])
}

// TestHandleTestConnection_Failure tests failed connection test
func TestHandleTestConnection_Failure(t *testing.T) {
	// Create mock JIRA server that returns error
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "wrong-token")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/test-connection", nil)
	w := httptest.NewRecorder()

	handler.handleTestConnection(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, false, response["success"])
}

// TestHandleDashboard_ByProject tests dashboard endpoint for project-based query
func TestHandleDashboard_ByProject(t *testing.T) {
	mockSearchResponse := jira.JiraSearchResponse{
		Total: 1,
		Issues: []jira.JiraIssue{
			{
				Key: "TEST-1",
				Fields: jira.JiraFields{
					Summary:   "Test Issue",
					Status:    jira.JiraStatus{Name: "To Do"},
					Priority:  jira.JiraPriority{Name: "High"},
					IssueType: jira.JiraIssueType{Name: "Story"},
					Created:   "2024-01-01T10:00:00.000+0000",
					Updated:   "2024-01-02T10:00:00.000+0000",
					Reporter:  jira.JiraUser{DisplayName: "Reporter1"},
				},
			},
		},
	}

	changelogResponse := struct {
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
			MaxResults: 1,
			Total:      1,
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
							FromString: "",
							ToString:   "To Do",
						},
					},
				},
			},
		},
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/api/3/search/jql" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockSearchResponse)
		} else if r.URL.Path == "/rest/api/3/issue/TEST-1" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(changelogResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard?project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleDashboard(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	// Check that we got a valid dashboard response
	assert.NotNil(t, response)
	// Response should have some analytics data
	assert.True(t, len(response) > 0)
}

// TestHandleProject_Success tests successful project endpoint
func TestHandleProject_Success(t *testing.T) {
	mockSearchResponse := jira.JiraSearchResponse{
		Total: 1,
		Issues: []jira.JiraIssue{
			{
				Key: "TEST-1",
				Fields: jira.JiraFields{
					Summary:   "Test Issue",
					Status:    jira.JiraStatus{Name: "Done"},
					Priority:  jira.JiraPriority{Name: "High"},
					IssueType: jira.JiraIssueType{Name: "Story"},
					Created:   "2024-01-01T10:00:00.000+0000",
					Updated:   "2024-01-02T10:00:00.000+0000",
					Reporter:  jira.JiraUser{DisplayName: "Reporter1"},
				},
			},
		},
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/api/3/search/jql" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockSearchResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/project/TEST", nil)
	w := httptest.NewRecorder()

	handler.handleProject(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, "TEST", response["project"])
	assert.NotNil(t, response["issues"])
	assert.Equal(t, float64(1), response["count"])
}

// TestHandleSprint_Success tests successful sprint endpoint
func TestHandleSprint_Success(t *testing.T) {
	mockSearchResponse := jira.JiraSearchResponse{
		Total: 1,
		Issues: []jira.JiraIssue{
			{
				Key: "TEST-1",
				Fields: jira.JiraFields{
					Summary:   "Sprint issue",
					Status:    jira.JiraStatus{Name: "In Progress"},
					Priority:  jira.JiraPriority{Name: "High"},
					IssueType: jira.JiraIssueType{Name: "Story"},
					Created:   "2024-01-01T10:00:00.000+0000",
					Updated:   "2024-01-02T10:00:00.000+0000",
					Reporter:  jira.JiraUser{DisplayName: "Reporter1"},
				},
			},
		},
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/api/3/search/jql" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockSearchResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/sprint/100", nil)
	w := httptest.NewRecorder()

	handler.handleSprint(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, float64(100), response["sprintId"])
	assert.NotNil(t, response["issues"])
	assert.NotNil(t, response["analytics"])
}

// TestHandleIssueChangelog_Success tests successful issue changelog retrieval
func TestHandleIssueChangelog_Success(t *testing.T) {
	changelogResponse := struct {
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
			MaxResults: 1,
			Total:      1,
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
			},
		},
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/rest/api/3/issue/TEST-123" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(changelogResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/issue/TEST-123", nil)
	w := httptest.NewRecorder()

	handler.handleIssueChangelog(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, "TEST-123", response["issueKey"])
	assert.NotNil(t, response["statusHistory"])
	statusHistory := response["statusHistory"].([]interface{})
	assert.Len(t, statusHistory, 1)
}

// Error path tests to improve coverage

func TestHandleSprints_Error(t *testing.T) {
	// Create mock JIRA server that returns an error
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/sprints?project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleSprints(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Error fetching sprints")
}

func TestHandleProject_Error(t *testing.T) {
	// Create mock JIRA server that returns an error
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/project/TEST", nil)
	w := httptest.NewRecorder()

	handler.handleProject(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Error fetching project data")
}

func TestHandleSprint_Error(t *testing.T) {
	// Create mock JIRA server that returns an error
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/sprint/123", nil)
	w := httptest.NewRecorder()

	handler.handleSprint(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Error fetching sprint data")
}

func TestHandleIssueChangelog_Error(t *testing.T) {
	// Create mock JIRA server that returns an error
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/issue/TEST-999", nil)
	w := httptest.NewRecorder()

	handler.handleIssueChangelog(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Error fetching issue changelog")
}

func TestHandleDashboard_ProjectError(t *testing.T) {
	// Create mock JIRA server that returns an error for project issues
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/rest/api/3/search/jql") {
			w.WriteHeader(http.StatusInternalServerError)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard?project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleDashboard(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Error fetching JIRA data")
}

func TestHandleDashboard_SprintError(t *testing.T) {
	// Create mock JIRA server that returns an error for sprint issues
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/rest/api/3/search/jql") {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard?project=TEST&sprint=123", nil)
	w := httptest.NewRecorder()

	handler.handleDashboard(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Error fetching JIRA data")
}

// TestHandleJiraSearch_MethodNotAllowed tests that only GET is allowed
func TestHandleJiraSearch_MethodNotAllowed(t *testing.T) {
	cfg := &config.Config{}
	handler := NewHandler(cfg, make(map[string]*jira.Client))

	methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}
	for _, method := range methods {
		req := httptest.NewRequest(method, "/api/search?jql=project=TEST", nil)
		w := httptest.NewRecorder()

		handler.handleJiraSearch(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code, "Expected 405 for method %s", method)
		assert.Contains(t, w.Body.String(), "Method not allowed")
	}
}

// TestHandleJiraSearch_NoClients tests error when no JIRA clients configured
func TestHandleJiraSearch_NoClients(t *testing.T) {
	cfg := &config.Config{}
	handler := NewHandler(cfg, make(map[string]*jira.Client))

	req := httptest.NewRequest(http.MethodGet, "/api/search?jql=project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "no JIRA instances configured")
}

// TestHandleJiraSearch_InvalidInstance tests error with non-existent instance
func TestHandleJiraSearch_InvalidInstance(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/search?instance=nonexistent&jql=project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "instance 'nonexistent' not found")
}

// TestHandleJiraSearch_MissingJQL tests error when jql parameter is missing
func TestHandleJiraSearch_MissingJQL(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/search", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "jql parameter is required")
}

// TestHandleJiraSearch_EmptyJQL tests error when jql parameter is empty
func TestHandleJiraSearch_EmptyJQL(t *testing.T) {
	cfg := &config.Config{}
	mockClient := &jira.Client{}
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/search?jql=", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "jql parameter is required")
}

// TestHandleJiraSearch_Success tests successful JQL search
func TestHandleJiraSearch_Success(t *testing.T) {
	mockSearchResponse := map[string]interface{}{
		"issues": []map[string]interface{}{
			{
				"key": "TEST-1",
				"fields": map[string]interface{}{
					"summary":     "Test Issue 1",
					"status":      map[string]interface{}{"name": "In Progress"},
					"issuetype":   map[string]interface{}{"name": "Story"},
					"created":     "2024-01-01T10:00:00Z",
					"updated":     "2024-01-15T14:30:00Z",
					"assignee":    map[string]interface{}{"displayName": "John Doe"},
					"priority":    map[string]interface{}{"name": "High"},
					"description": "Test description",
				},
			},
			{
				"key": "TEST-2",
				"fields": map[string]interface{}{
					"summary":     "Test Issue 2",
					"status":      map[string]interface{}{"name": "Done"},
					"issuetype":   map[string]interface{}{"name": "Bug"},
					"created":     "2024-01-02T11:00:00Z",
					"updated":     "2024-01-16T15:30:00Z",
					"assignee":    map[string]interface{}{"displayName": "Jane Smith"},
					"priority":    map[string]interface{}{"name": "Medium"},
					"description": "Bug description",
				},
			},
		},
		"total": 2,
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/rest/api/3/search/jql") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockSearchResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/search?jql=project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)

	// Verify response structure
	assert.Equal(t, "project=TEST", response["jql"])
	assert.Equal(t, float64(2), response["count"])
	assert.NotNil(t, response["issues"])

	// Verify issues array
	issues, ok := response["issues"].([]interface{})
	assert.True(t, ok)
	assert.Len(t, issues, 2)

	// Verify first issue
	issue1 := issues[0].(map[string]interface{})
	assert.Equal(t, "TEST-1", issue1["key"])
	assert.Equal(t, "Test Issue 1", issue1["summary"])
}

// TestHandleJiraSearch_WithInstance tests search with specific instance
func TestHandleJiraSearch_WithInstance(t *testing.T) {
	mockSearchResponse := map[string]interface{}{
		"issues": []map[string]interface{}{
			{
				"key": "PROJ-1",
				"fields": map[string]interface{}{
					"summary": "Issue from specific instance",
				},
			},
		},
		"total": 1,
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/rest/api/3/search/jql") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockSearchResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient1 := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	mockClient2 := jira.NewClient(jiraServer.URL, "test2@example.com", "token456")
	clients := map[string]*jira.Client{
		"instance1": mockClient1,
		"instance2": mockClient2,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/search?instance=instance2&jql=assignee=currentUser()", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, "assignee=currentUser()", response["jql"])
	assert.Equal(t, float64(1), response["count"])
}

// TestHandleJiraSearch_ComplexJQL tests search with complex JQL query
func TestHandleJiraSearch_ComplexJQL(t *testing.T) {
	mockSearchResponse := map[string]interface{}{
		"issues": []map[string]interface{}{},
		"total":  0,
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/rest/api/3/search/jql") {
			// Verify JQL is passed correctly in request
			jql := r.URL.Query().Get("jql")
			assert.Contains(t, jql, "project")
			assert.Contains(t, jql, "status")
			assert.Contains(t, jql, "assignee")

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockSearchResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	complexJQL := "project=TEST AND status='In Progress' AND assignee=currentUser() ORDER BY created DESC"
	req := httptest.NewRequest(http.MethodGet, "/api/search?jql="+url.QueryEscape(complexJQL), nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Contains(t, response["jql"], "project")
	assert.Equal(t, float64(0), response["count"])
}

// TestHandleJiraSearch_Error tests error handling when JIRA API fails
func TestHandleJiraSearch_Error(t *testing.T) {
	// Create mock JIRA server that returns an error
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"errorMessages": []string{"Authentication failed"},
		})
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "invalid-token")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/search?jql=project=TEST", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Error searching JIRA")
}

// TestHandleJiraSearch_EmptyResults tests search with no matching issues
func TestHandleJiraSearch_EmptyResults(t *testing.T) {
	mockSearchResponse := map[string]interface{}{
		"issues": []map[string]interface{}{},
		"total":  0,
	}

	// Create mock JIRA server
	jiraServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/rest/api/3/search/jql") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(mockSearchResponse)
		}
	}))
	defer jiraServer.Close()

	cfg := &config.Config{}
	mockClient := jira.NewClient(jiraServer.URL, "test@example.com", "token123")
	clients := map[string]*jira.Client{
		"primary": mockClient,
	}
	handler := NewHandler(cfg, clients)

	req := httptest.NewRequest(http.MethodGet, "/api/search?jql=project=NONEXISTENT", nil)
	w := httptest.NewRecorder()

	handler.handleJiraSearch(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, "project=NONEXISTENT", response["jql"])
	assert.Equal(t, float64(0), response["count"])

	issues := response["issues"].([]interface{})
	assert.Len(t, issues, 0)
}
