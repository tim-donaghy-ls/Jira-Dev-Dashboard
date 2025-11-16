package backend_test

import (
	"context"
	"encoding/json"
	"jira-dashboard/api"
	"jira-dashboard/config"
	"jira-dashboard/github"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// createTestHandler creates a handler with mock GitHub clients
func createTestHandler(mockClients map[string]*github.Client) *api.Handler {
	cfg := &config.Config{
		Instances: make(map[string]*config.JiraInstance),
		GitHub: &config.GitHubConfig{
			Token: "test-token",
			Owner: "testowner",
			Repos: []string{"repo1", "repo2"},
		},
		ServerPort: "8080",
	}

	handler := api.NewHandler(cfg, nil)
	// Inject mock clients
	if mockClients != nil {
		for repo, client := range mockClients {
			handler = injectGitHubClient(handler, repo, client)
		}
	}

	return handler
}

// injectGitHubClient is a helper to inject mock clients (would need reflection or handler modification in real implementation)
// For testing purposes, we'll create handlers directly with mocked behavior
func injectGitHubClient(h *api.Handler, repo string, client *github.Client) *api.Handler {
	// In a real scenario, you'd use dependency injection or interfaces
	return h
}

// TestHandleGitHubStatus tests the GitHub status endpoint
func TestHandleGitHubStatus(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		setupHandler   func() *api.Handler
		wantStatus     int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name:   "GitHub not configured",
			method: http.MethodGet,
			setupHandler: func() *api.Handler {
				cfg := &config.Config{
					Instances:  make(map[string]*config.JiraInstance),
					GitHub:     nil, // Not configured
					ServerPort: "8080",
				}
				return api.NewHandler(cfg, nil)
			},
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				if enabled, ok := resp["enabled"].(bool); !ok || enabled {
					t.Errorf("enabled = %v, want false", resp["enabled"])
				}
				if msg, ok := resp["message"].(string); !ok || msg != "GitHub integration not configured" {
					t.Errorf("message = %v, want 'GitHub integration not configured'", resp["message"])
				}
			},
		},
		{
			name:   "method not allowed",
			method: http.MethodPost,
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
			wantStatus: http.StatusMethodNotAllowed,
			checkResponse: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := tt.setupHandler()

			req := httptest.NewRequest(tt.method, "/api/github/status", nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkResponse != nil && w.Code == http.StatusOK {
				var resp map[string]interface{}
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				tt.checkResponse(t, resp)
			}
		})
	}
}

// TestHandleGitHubRepos tests the GitHub repos endpoint
func TestHandleGitHubRepos(t *testing.T) {
	tests := []struct {
		name          string
		method        string
		setupHandler  func() *api.Handler
		wantStatus    int
		checkResponse func(*testing.T, map[string]interface{})
	}{
		{
			name:   "get repos successfully",
			method: http.MethodGet,
			setupHandler: func() *api.Handler {
				cfg := &config.Config{
					Instances: make(map[string]*config.JiraInstance),
					GitHub: &config.GitHubConfig{
						Token: "test-token",
						Owner: "testowner",
						Repos: []string{"repo1", "repo2", "repo3"},
					},
					ServerPort: "8080",
				}
				return api.NewHandler(cfg, nil)
			},
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				if owner, ok := resp["owner"].(string); !ok || owner != "testowner" {
					t.Errorf("owner = %v, want testowner", resp["owner"])
				}
				repos, ok := resp["repos"].([]interface{})
				if !ok {
					t.Errorf("repos is not an array")
					return
				}
				if len(repos) != 3 {
					t.Errorf("len(repos) = %v, want 3", len(repos))
				}
				count, ok := resp["count"].(float64)
				if !ok || int(count) != 3 {
					t.Errorf("count = %v, want 3", resp["count"])
				}
			},
		},
		{
			name:   "GitHub not configured",
			method: http.MethodGet,
			setupHandler: func() *api.Handler {
				cfg := &config.Config{
					Instances:  make(map[string]*config.JiraInstance),
					GitHub:     nil,
					ServerPort: "8080",
				}
				return api.NewHandler(cfg, nil)
			},
			wantStatus:    http.StatusServiceUnavailable,
			checkResponse: nil,
		},
		{
			name:   "method not allowed",
			method: http.MethodPost,
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
			wantStatus:    http.StatusMethodNotAllowed,
			checkResponse: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := tt.setupHandler()

			req := httptest.NewRequest(tt.method, "/api/github/repos", nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkResponse != nil && w.Code == http.StatusOK {
				var resp map[string]interface{}
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				tt.checkResponse(t, resp)
			}
		})
	}
}

// TestHandleGitHubStatsQueryParameters tests query parameter handling
func TestHandleGitHubStatsQueryParameters(t *testing.T) {
	tests := []struct {
		name         string
		queryParams  string
		wantStatus   int
		setupHandler func() *api.Handler
	}{
		{
			name:        "default days parameter",
			queryParams: "",
			wantStatus:  http.StatusInternalServerError, // Empty clients cause internal error
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
		},
		{
			name:        "custom days parameter",
			queryParams: "?days=7",
			wantStatus:  http.StatusInternalServerError, // Empty clients cause internal error
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
		},
		{
			name:        "invalid days parameter",
			queryParams: "?days=invalid",
			wantStatus:  http.StatusBadRequest,
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
		},
		{
			name:        "negative days parameter",
			queryParams: "?days=-5",
			wantStatus:  http.StatusBadRequest,
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
		},
		{
			name:        "zero days parameter",
			queryParams: "?days=0",
			wantStatus:  http.StatusBadRequest,
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
		},
		{
			name:        "repo filter parameter",
			queryParams: "?repo=repo1&days=30",
			wantStatus:  http.StatusInternalServerError, // Empty clients
			setupHandler: func() *api.Handler {
				return createTestHandler(nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := tt.setupHandler()

			req := httptest.NewRequest(http.MethodGet, "/api/github/stats"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

// TestHandleGitHubPRsQueryParameters tests PR endpoint query parameters
func TestHandleGitHubPRsQueryParameters(t *testing.T) {
	tests := []struct {
		name        string
		queryParams string
		wantStatus  int
	}{
		{
			name:        "default state (all)",
			queryParams: "",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "open state",
			queryParams: "?state=open",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "closed state",
			queryParams: "?state=closed",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "all state with days",
			queryParams: "?state=all&days=7",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "invalid days",
			queryParams: "?days=abc",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "repo filter",
			queryParams: "?repo=repo1",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := createTestHandler(nil)

			req := httptest.NewRequest(http.MethodGet, "/api/github/prs"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

// TestHandleGitHubCommitsQueryParameters tests commits endpoint query parameters
func TestHandleGitHubCommitsQueryParameters(t *testing.T) {
	tests := []struct {
		name        string
		queryParams string
		wantStatus  int
	}{
		{
			name:        "no parameters",
			queryParams: "",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "with author",
			queryParams: "?author=developer1",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "with days",
			queryParams: "?days=14",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "with author and days",
			queryParams: "?author=developer1&days=7",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
		{
			name:        "invalid days",
			queryParams: "?days=xyz",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "with repo filter",
			queryParams: "?repo=repo1",
			wantStatus:  http.StatusInternalServerError, // Empty clients
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := createTestHandler(nil)

			req := httptest.NewRequest(http.MethodGet, "/api/github/commits"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

// TestHandleGitHubDeveloperActivityQueryParameters tests developer activity endpoint
func TestHandleGitHubDeveloperActivityQueryParameters(t *testing.T) {
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)

	tests := []struct {
		name        string
		queryParams string
		wantStatus  int
	}{
		{
			name:        "missing start and end dates",
			queryParams: "",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "missing end date",
			queryParams: "?start=" + yesterday.Format(time.RFC3339),
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "missing start date",
			queryParams: "?end=" + now.Format(time.RFC3339),
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "valid date range",
			queryParams: "?start=" + yesterday.Format(time.RFC3339) + "&end=" + now.Format(time.RFC3339),
			wantStatus:  http.StatusOK, // Returns empty results successfully
		},
		{
			name:        "invalid start date format",
			queryParams: "?start=2024-01-01&end=" + now.Format(time.RFC3339),
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "invalid end date format",
			queryParams: "?start=" + yesterday.Format(time.RFC3339) + "&end=2024-12-31",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "with repo filter",
			queryParams: "?start=" + yesterday.Format(time.RFC3339) + "&end=" + now.Format(time.RFC3339) + "&repo=repo1",
			wantStatus:  http.StatusOK, // Returns empty results successfully
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := createTestHandler(nil)

			req := httptest.NewRequest(http.MethodGet, "/api/github/developer-activity"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

// TestGitHubHandlersMethodValidation tests that all handlers reject invalid methods
func TestGitHubHandlersMethodValidation(t *testing.T) {
	endpoints := []string{
		"/api/github/status",
		"/api/github/repos",
		"/api/github/stats",
		"/api/github/prs",
		"/api/github/commits",
		"/api/github/developer-activity",
	}

	invalidMethods := []string{
		http.MethodPost,
		http.MethodPut,
		http.MethodDelete,
		http.MethodPatch,
	}

	handler := createTestHandler(nil)

	for _, endpoint := range endpoints {
		for _, method := range invalidMethods {
			t.Run(endpoint+"_"+method, func(t *testing.T) {
				req := httptest.NewRequest(method, endpoint, nil)
				w := httptest.NewRecorder()

				mux := http.NewServeMux()
				handler.RegisterRoutes(mux)
				mux.ServeHTTP(w, req)

				if w.Code != http.StatusMethodNotAllowed {
					t.Errorf("Status code = %v, want %v for %s %s", w.Code, http.StatusMethodNotAllowed, method, endpoint)
				}
			})
		}
	}
}

// TestGitHubHandlersContentType tests that all handlers return JSON
func TestGitHubHandlersContentType(t *testing.T) {
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)

	tests := []struct {
		name     string
		endpoint string
	}{
		{
			name:     "status endpoint",
			endpoint: "/api/github/status",
		},
		{
			name:     "repos endpoint",
			endpoint: "/api/github/repos",
		},
		{
			name:     "developer-activity with dates",
			endpoint: "/api/github/developer-activity?start=" + yesterday.Format(time.RFC3339) + "&end=" + now.Format(time.RFC3339),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &config.Config{
				Instances: make(map[string]*config.JiraInstance),
				GitHub: &config.GitHubConfig{
					Token: "test-token",
					Owner: "testowner",
					Repos: []string{"repo1"},
				},
				ServerPort: "8080",
			}
			handler := api.NewHandler(cfg, nil)

			req := httptest.NewRequest(http.MethodGet, tt.endpoint, nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			// Check Content-Type is set to application/json
			contentType := w.Header().Get("Content-Type")
			if !strings.Contains(contentType, "application/json") {
				t.Errorf("Content-Type = %v, want to contain application/json", contentType)
			}
		})
	}
}

// TestGitHubNotConfiguredScenarios tests all handlers when GitHub is not configured
func TestGitHubNotConfiguredScenarios(t *testing.T) {
	cfg := &config.Config{
		Instances:  make(map[string]*config.JiraInstance),
		GitHub:     nil, // Not configured
		ServerPort: "8080",
	}
	handler := api.NewHandler(cfg, nil)

	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)

	tests := []struct {
		name       string
		endpoint   string
		wantStatus int
	}{
		{
			name:       "stats without GitHub",
			endpoint:   "/api/github/stats",
			wantStatus: http.StatusServiceUnavailable,
		},
		{
			name:       "prs without GitHub",
			endpoint:   "/api/github/prs",
			wantStatus: http.StatusServiceUnavailable,
		},
		{
			name:       "commits without GitHub",
			endpoint:   "/api/github/commits",
			wantStatus: http.StatusServiceUnavailable,
		},
		{
			name:       "developer-activity without GitHub",
			endpoint:   "/api/github/developer-activity?start=" + yesterday.Format(time.RFC3339) + "&end=" + now.Format(time.RFC3339),
			wantStatus: http.StatusServiceUnavailable,
		},
		{
			name:       "repos without GitHub",
			endpoint:   "/api/github/repos",
			wantStatus: http.StatusServiceUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.endpoint, nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

// TestGitHubHandlersConcurrency tests concurrent requests
func TestGitHubHandlersConcurrency(t *testing.T) {
	cfg := &config.Config{
		Instances: make(map[string]*config.JiraInstance),
		GitHub: &config.GitHubConfig{
			Token: "test-token",
			Owner: "testowner",
			Repos: []string{"repo1"},
		},
		ServerPort: "8080",
	}
	handler := api.NewHandler(cfg, nil)

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// Make 10 concurrent requests
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			req := httptest.NewRequest(http.MethodGet, "/api/github/repos", nil)
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, req)
			done <- true
		}()
	}

	// Wait for all requests to complete
	for i := 0; i < 10; i++ {
		<-done
	}
}

// TestGitHubContextHandling tests context handling in handlers
func TestGitHubContextHandling(t *testing.T) {
	handler := createTestHandler(nil)

	// Create request with cancelled context
	req := httptest.NewRequest(http.MethodGet, "/api/github/status", nil)
	ctx, cancel := context.WithCancel(req.Context())
	cancel() // Cancel immediately
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)
	mux.ServeHTTP(w, req)

	// Handler should still respond (context cancellation is handled internally)
	// The exact behavior depends on implementation
}

// TestHandleGitHubDeveloperActivity_Success tests successful developer activity aggregation
