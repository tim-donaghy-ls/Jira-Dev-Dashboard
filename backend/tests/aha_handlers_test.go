package backend_test

import (
	"bytes"
	"encoding/json"
	"jira-dashboard/aha"
	"jira-dashboard/api"
	"jira-dashboard/config"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// createTestHandlerWithAha creates a handler with Aha configuration
func createTestHandlerWithAha(ahaConfig *config.AhaConfig) *api.Handler {
	cfg := &config.Config{
		Instances:  make(map[string]*config.JiraInstance),
		Aha:        ahaConfig,
		ServerPort: "8080",
	}

	return api.NewHandler(cfg, nil)
}

// TestVerifyAhaFeaturesHandler tests the VerifyAhaFeaturesHandler
func TestVerifyAhaFeaturesHandler(t *testing.T) {
	tests := []struct {
		name          string
		method        string
		ahaConfig     *config.AhaConfig
		requestBody   interface{}
		wantStatus    int
		checkResponse func(*testing.T, []aha.FeatureVerification)
	}{
		{
			name:   "verify features successfully",
			method: http.MethodPost,
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			requestBody: map[string]interface{}{
				"jiraKeys": []string{"JIRA-123", "JIRA-456"},
			},
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, verifications []aha.FeatureVerification) {
				// The actual verification would require mocking the Aha client
				// This is just checking the structure
				if verifications == nil {
					t.Error("verifications is nil")
				}
			},
		},
		{
			name:   "Aha not configured",
			method: http.MethodPost,
			ahaConfig: nil,
			requestBody: map[string]interface{}{
				"jiraKeys": []string{"JIRA-123"},
			},
			wantStatus:    http.StatusServiceUnavailable,
			checkResponse: nil,
		},
		{
			name:   "empty JIRA keys",
			method: http.MethodPost,
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			requestBody: map[string]interface{}{
				"jiraKeys": []string{},
			},
			wantStatus:    http.StatusBadRequest,
			checkResponse: nil,
		},
		{
			name:   "missing JIRA keys field",
			method: http.MethodPost,
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			requestBody:   map[string]interface{}{},
			wantStatus:    http.StatusBadRequest,
			checkResponse: nil,
		},
		{
			name:   "invalid JSON body",
			method: http.MethodPost,
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			requestBody:   "invalid json",
			wantStatus:    http.StatusBadRequest,
			checkResponse: nil,
		},
		{
			name:   "OPTIONS preflight request",
			method: http.MethodOptions,
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			requestBody:   nil,
			wantStatus:    http.StatusOK,
			checkResponse: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := createTestHandlerWithAha(tt.ahaConfig)

			var body *bytes.Buffer
			if tt.requestBody != nil {
				if str, ok := tt.requestBody.(string); ok {
					body = bytes.NewBufferString(str)
				} else {
					jsonBody, _ := json.Marshal(tt.requestBody)
					body = bytes.NewBuffer(jsonBody)
				}
			} else {
				body = bytes.NewBuffer([]byte{})
			}

			req := httptest.NewRequest(tt.method, "/api/aha/verify", body)
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}

			// Check CORS headers
			if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
				t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
			}

			if tt.checkResponse != nil && w.Code == http.StatusOK {
				var verifications []aha.FeatureVerification
				if err := json.NewDecoder(w.Body).Decode(&verifications); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				tt.checkResponse(t, verifications)
			}
		})
	}
}

// TestTestAhaConnectionHandler tests the TestAhaConnectionHandler
func TestTestAhaConnectionHandler(t *testing.T) {
	tests := []struct {
		name          string
		method        string
		ahaConfig     *config.AhaConfig
		wantStatus    int
		checkResponse func(*testing.T, map[string]interface{})
	}{
		{
			name:   "Aha not configured",
			method: http.MethodGet,
			ahaConfig: nil,
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				if success, ok := resp["success"].(bool); !ok || success {
					t.Errorf("success = %v, want false", resp["success"])
				}
				if msg, ok := resp["message"].(string); !ok || msg != "Aha integration not configured" {
					t.Errorf("message = %v, want 'Aha integration not configured'", resp["message"])
				}
			},
		},
		{
			name:   "OPTIONS preflight request",
			method: http.MethodOptions,
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			wantStatus:    http.StatusOK,
			checkResponse: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := createTestHandlerWithAha(tt.ahaConfig)

			req := httptest.NewRequest(tt.method, "/api/aha/test-connection", nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}

			// Check CORS headers
			if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
				t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
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

// TestAhaHandlersCORSHeaders tests that both handlers set CORS headers
func TestAhaHandlersCORSHeaders(t *testing.T) {
	ahaConfig := &config.AhaConfig{
		APIKey: "test-api-key",
		Domain: "testcompany",
	}
	handler := createTestHandlerWithAha(ahaConfig)

	tests := []struct {
		name     string
		endpoint string
		method   string
	}{
		{
			name:     "verify endpoint",
			endpoint: "/api/aha/verify",
			method:   http.MethodOptions,
		},
		{
			name:     "test-connection endpoint",
			endpoint: "/api/aha/test-connection",
			method:   http.MethodOptions,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.endpoint, nil)
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			// Check all CORS headers
			if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
				t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
			}
			if methods := w.Header().Get("Access-Control-Allow-Methods"); methods == "" {
				t.Error("Access-Control-Allow-Methods not set")
			}
			if headers := w.Header().Get("Access-Control-Allow-Headers"); headers == "" {
				t.Error("Access-Control-Allow-Headers not set")
			}
		})
	}
}

// TestAhaHandlersContentType tests that handlers return JSON
func TestAhaHandlersContentType(t *testing.T) {
	ahaConfig := &config.AhaConfig{
		APIKey: "test-api-key",
		Domain: "testcompany",
	}
	handler := createTestHandlerWithAha(ahaConfig)

	tests := []struct {
		name     string
		endpoint string
		method   string
		body     interface{}
	}{
		{
			name:     "test-connection returns JSON",
			endpoint: "/api/aha/test-connection",
			method:   http.MethodGet,
			body:     nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body *bytes.Buffer
			if tt.body != nil {
				jsonBody, _ := json.Marshal(tt.body)
				body = bytes.NewBuffer(jsonBody)
			} else {
				body = bytes.NewBuffer([]byte{})
			}

			req := httptest.NewRequest(tt.method, tt.endpoint, body)
			if tt.body != nil {
				req.Header.Set("Content-Type", "application/json")
			}
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

// TestVerifyAhaFeaturesHandlerLargePayload tests handling of large JIRA key lists
func TestVerifyAhaFeaturesHandlerLargePayload(t *testing.T) {
	ahaConfig := &config.AhaConfig{
		APIKey: "test-api-key",
		Domain: "testcompany",
	}
	handler := createTestHandlerWithAha(ahaConfig)

	// Create a large list of JIRA keys
	jiraKeys := make([]string, 100)
	for i := 0; i < 100; i++ {
		jiraKeys[i] = "JIRA-" + string(rune('A'+i%26)) + string(rune('0'+i%10))
	}

	requestBody := map[string]interface{}{
		"jiraKeys": jiraKeys,
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/aha/verify", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)
	mux.ServeHTTP(w, req)

	// Should handle large payloads without error
	// Actual result depends on Aha API mock/availability
	if w.Code != http.StatusOK && w.Code != http.StatusInternalServerError {
		t.Errorf("Unexpected status code = %v", w.Code)
	}
}

// TestAhaHandlersConcurrency tests concurrent requests
func TestAhaHandlersConcurrency(t *testing.T) {
	ahaConfig := &config.AhaConfig{
		APIKey: "test-api-key",
		Domain: "testcompany",
	}
	handler := createTestHandlerWithAha(ahaConfig)

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// Make 10 concurrent requests to test-connection
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			req := httptest.NewRequest(http.MethodGet, "/api/aha/test-connection", nil)
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

// TestVerifyAhaFeaturesSpecialCharacters tests handling of special characters in JIRA keys
func TestVerifyAhaFeaturesSpecialCharacters(t *testing.T) {
	ahaConfig := &config.AhaConfig{
		APIKey: "test-api-key",
		Domain: "testcompany",
	}
	handler := createTestHandlerWithAha(ahaConfig)

	tests := []struct {
		name       string
		jiraKeys   []string
		wantStatus int
	}{
		{
			name:       "valid JIRA keys",
			jiraKeys:   []string{"ABC-123", "XYZ-999"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "JIRA keys with lowercase",
			jiraKeys:   []string{"abc-123", "xyz-999"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "JIRA keys with numbers only",
			jiraKeys:   []string{"123-456"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "single character project key",
			jiraKeys:   []string{"A-1"},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requestBody := map[string]interface{}{
				"jiraKeys": tt.jiraKeys,
			}

			jsonBody, _ := json.Marshal(requestBody)
			req := httptest.NewRequest(http.MethodPost, "/api/aha/verify", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			// The actual response depends on Aha API availability
			// We're just checking that the handler doesn't crash
			if w.Code != tt.wantStatus && w.Code != http.StatusInternalServerError {
				t.Errorf("Status code = %v, want %v or %v", w.Code, tt.wantStatus, http.StatusInternalServerError)
			}
		})
	}
}

// TestAhaHandlersErrorMessages tests error message clarity
func TestAhaHandlersErrorMessages(t *testing.T) {
	tests := []struct {
		name          string
		ahaConfig     *config.AhaConfig
		endpoint      string
		method        string
		body          interface{}
		wantStatus    int
		wantErrorMsg  string
	}{
		{
			name:         "Aha not configured - verify",
			ahaConfig:    nil,
			endpoint:     "/api/aha/verify",
			method:       http.MethodPost,
			body:         map[string]interface{}{"jiraKeys": []string{"JIRA-123"}},
			wantStatus:   http.StatusServiceUnavailable,
			wantErrorMsg: "Aha integration not configured",
		},
		{
			name: "Empty JIRA keys",
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			endpoint:     "/api/aha/verify",
			method:       http.MethodPost,
			body:         map[string]interface{}{"jiraKeys": []string{}},
			wantStatus:   http.StatusBadRequest,
			wantErrorMsg: "No JIRA keys provided",
		},
		{
			name: "Invalid request body",
			ahaConfig: &config.AhaConfig{
				APIKey: "test-api-key",
				Domain: "testcompany",
			},
			endpoint:     "/api/aha/verify",
			method:       http.MethodPost,
			body:         "invalid",
			wantStatus:   http.StatusBadRequest,
			wantErrorMsg: "Invalid request body",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := createTestHandlerWithAha(tt.ahaConfig)

			var body *bytes.Buffer
			if str, ok := tt.body.(string); ok {
				body = bytes.NewBufferString(str)
			} else {
				jsonBody, _ := json.Marshal(tt.body)
				body = bytes.NewBuffer(jsonBody)
			}

			req := httptest.NewRequest(tt.method, tt.endpoint, body)
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.wantErrorMsg != "" {
				bodyStr := w.Body.String()
				if !strings.Contains(bodyStr, tt.wantErrorMsg) {
					t.Errorf("Response body = %v, want to contain %v", bodyStr, tt.wantErrorMsg)
				}
			}
		})
	}
}

// TestAhaHandlersRequestTimeout tests handling of slow/timeout scenarios
func TestAhaHandlersRequestTimeout(t *testing.T) {
	ahaConfig := &config.AhaConfig{
		APIKey: "test-api-key",
		Domain: "testcompany",
	}
	handler := createTestHandlerWithAha(ahaConfig)

	// Create request with many JIRA keys which might take time
	jiraKeys := make([]string, 50)
	for i := 0; i < 50; i++ {
		jiraKeys[i] = "JIRA-" + string(rune('0'+i%10)) + string(rune('0'+(i/10)%10))
	}

	requestBody := map[string]interface{}{
		"jiraKeys": jiraKeys,
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/api/aha/verify", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// This should complete within reasonable time or timeout appropriately
	mux.ServeHTTP(w, req)

	// Just verify it doesn't hang indefinitely
	// The actual status depends on Aha API availability
}

// TestVerifyAhaFeaturesNullValues tests handling of null/nil values
func TestVerifyAhaFeaturesNullValues(t *testing.T) {
	ahaConfig := &config.AhaConfig{
		APIKey: "test-api-key",
		Domain: "testcompany",
	}
	handler := createTestHandlerWithAha(ahaConfig)

	tests := []struct {
		name       string
		bodyJSON   string
		wantStatus int
	}{
		{
			name:       "null jiraKeys",
			bodyJSON:   `{"jiraKeys": null}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing jiraKeys field",
			bodyJSON:   `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "jiraKeys with null element",
			bodyJSON:   `{"jiraKeys": ["JIRA-123", null, "JIRA-456"]}`,
			wantStatus: http.StatusOK, // Should handle gracefully
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/aha/verify", bytes.NewBufferString(tt.bodyJSON))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			mux := http.NewServeMux()
			handler.RegisterRoutes(mux)
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus && w.Code != http.StatusInternalServerError {
				t.Errorf("Status code = %v, want %v or %v", w.Code, tt.wantStatus, http.StatusInternalServerError)
			}
		})
	}
}
