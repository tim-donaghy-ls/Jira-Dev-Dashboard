package backend_test

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// corsMiddleware adds CORS headers to allow cross-origin requests
// This is a copy of the middleware from main.go for testing
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from Next.js dev server
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// loggingMiddleware logs all HTTP requests
// This is a copy of the middleware from main.go for testing
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		next.ServeHTTP(w, r)
	})
}

// TestCORSMiddleware tests the CORS middleware functionality
func TestCORSMiddleware(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		path           string
		wantStatus     int
		checkHeaders   func(*testing.T, http.Header)
		shouldCallNext bool
	}{
		{
			name:       "GET request with CORS headers",
			method:     http.MethodGet,
			path:       "/api/test",
			wantStatus: http.StatusOK,
			checkHeaders: func(t *testing.T, h http.Header) {
				if origin := h.Get("Access-Control-Allow-Origin"); origin != "*" {
					t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
				}
				if methods := h.Get("Access-Control-Allow-Methods"); methods != "GET, POST, PUT, DELETE, OPTIONS" {
					t.Errorf("Access-Control-Allow-Methods = %v, want GET, POST, PUT, DELETE, OPTIONS", methods)
				}
				if headers := h.Get("Access-Control-Allow-Headers"); headers != "Content-Type, Authorization" {
					t.Errorf("Access-Control-Allow-Headers = %v, want Content-Type, Authorization", headers)
				}
			},
			shouldCallNext: true,
		},
		{
			name:       "POST request with CORS headers",
			method:     http.MethodPost,
			path:       "/api/data",
			wantStatus: http.StatusOK,
			checkHeaders: func(t *testing.T, h http.Header) {
				if origin := h.Get("Access-Control-Allow-Origin"); origin != "*" {
					t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
				}
			},
			shouldCallNext: true,
		},
		{
			name:       "OPTIONS preflight request",
			method:     http.MethodOptions,
			path:       "/api/test",
			wantStatus: http.StatusOK,
			checkHeaders: func(t *testing.T, h http.Header) {
				if origin := h.Get("Access-Control-Allow-Origin"); origin != "*" {
					t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
				}
				if methods := h.Get("Access-Control-Allow-Methods"); methods != "GET, POST, PUT, DELETE, OPTIONS" {
					t.Errorf("Access-Control-Allow-Methods = %v, want GET, POST, PUT, DELETE, OPTIONS", methods)
				}
				if headers := h.Get("Access-Control-Allow-Headers"); headers != "Content-Type, Authorization" {
					t.Errorf("Access-Control-Allow-Headers = %v, want Content-Type, Authorization", headers)
				}
			},
			shouldCallNext: false, // OPTIONS should not call next handler
		},
		{
			name:       "PUT request with CORS headers",
			method:     http.MethodPut,
			path:       "/api/update",
			wantStatus: http.StatusOK,
			checkHeaders: func(t *testing.T, h http.Header) {
				if origin := h.Get("Access-Control-Allow-Origin"); origin != "*" {
					t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
				}
			},
			shouldCallNext: true,
		},
		{
			name:       "DELETE request with CORS headers",
			method:     http.MethodDelete,
			path:       "/api/delete",
			wantStatus: http.StatusOK,
			checkHeaders: func(t *testing.T, h http.Header) {
				if origin := h.Get("Access-Control-Allow-Origin"); origin != "*" {
					t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
				}
			},
			shouldCallNext: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Track if next handler was called
			nextCalled := false
			nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			// Wrap handler with CORS middleware
			handler := corsMiddleware(nextHandler)

			// Create request and response recorder
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			// Execute handler
			handler.ServeHTTP(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("Status code = %v, want %v", w.Code, tt.wantStatus)
			}

			// Check headers
			if tt.checkHeaders != nil {
				tt.checkHeaders(t, w.Header())
			}

			// Check if next handler was called as expected
			if nextCalled != tt.shouldCallNext {
				t.Errorf("nextCalled = %v, want %v", nextCalled, tt.shouldCallNext)
			}
		})
	}
}

// TestLoggingMiddleware tests the logging middleware functionality
func TestLoggingMiddleware(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		path        string
		remoteAddr  string
		wantLog     string
	}{
		{
			name:       "log GET request",
			method:     http.MethodGet,
			path:       "/api/dashboard",
			remoteAddr: "192.168.1.1:12345",
			wantLog:    "GET /api/dashboard from 192.168.1.1:12345",
		},
		{
			name:       "log POST request",
			method:     http.MethodPost,
			path:       "/api/data",
			remoteAddr: "10.0.0.1:54321",
			wantLog:    "POST /api/data from 10.0.0.1:54321",
		},
		{
			name:       "log request with query parameters",
			method:     http.MethodGet,
			path:       "/api/search?q=test",
			remoteAddr: "127.0.0.1:8080",
			wantLog:    "GET /api/search from 127.0.0.1:8080", // r.URL.Path doesn't include query parameters
		},
		{
			name:       "log PUT request",
			method:     http.MethodPut,
			path:       "/api/update/123",
			remoteAddr: "172.16.0.1:9090",
			wantLog:    "PUT /api/update/123 from 172.16.0.1:9090",
		},
		{
			name:       "log DELETE request",
			method:     http.MethodDelete,
			path:       "/api/delete/456",
			remoteAddr: "192.168.0.100:3000",
			wantLog:    "DELETE /api/delete/456 from 192.168.0.100:3000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Capture log output
			var logBuf bytes.Buffer
			log.SetOutput(&logBuf)
			log.SetFlags(0) // Remove timestamp for easier testing
			defer func() {
				log.SetOutput(nil)
				log.SetFlags(log.LstdFlags)
			}()

			// Create next handler
			nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			// Wrap handler with logging middleware
			handler := loggingMiddleware(nextHandler)

			// Create request with specific remote address
			req := httptest.NewRequest(tt.method, tt.path, nil)
			req.RemoteAddr = tt.remoteAddr
			w := httptest.NewRecorder()

			// Execute handler
			handler.ServeHTTP(w, req)

			// Check log output
			logOutput := logBuf.String()
			if !strings.Contains(logOutput, tt.wantLog) {
				t.Errorf("Log output = %q, want to contain %q", logOutput, tt.wantLog)
			}

			// Verify next handler was called
			if w.Code != http.StatusOK {
				t.Errorf("Status code = %v, want %v", w.Code, http.StatusOK)
			}
		})
	}
}

// TestMiddlewareChaining tests that middlewares chain correctly
func TestMiddlewareChaining(t *testing.T) {
	// Capture log output
	var logBuf bytes.Buffer
	log.SetOutput(&logBuf)
	log.SetFlags(0)
	defer func() {
		log.SetOutput(nil)
		log.SetFlags(log.LstdFlags)
	}()

	// Track execution order
	executionOrder := []string{}

	// Create a simple handler
	finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		executionOrder = append(executionOrder, "handler")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Wrap with logging middleware
	withLogging := loggingMiddleware(finalHandler)

	// Wrap with CORS middleware (outer layer)
	handler := corsMiddleware(withLogging)

	// Create request
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	w := httptest.NewRecorder()

	// Execute handler chain
	handler.ServeHTTP(w, req)

	// Check that handler was called
	if len(executionOrder) != 1 || executionOrder[0] != "handler" {
		t.Errorf("executionOrder = %v, want [handler]", executionOrder)
	}

	// Check CORS headers were set
	if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
		t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
	}

	// Check response
	if w.Code != http.StatusOK {
		t.Errorf("Status code = %v, want %v", w.Code, http.StatusOK)
	}

	if body := w.Body.String(); body != "OK" {
		t.Errorf("Body = %v, want OK", body)
	}
}

// TestCORSPreflightDoesNotCallNext tests that OPTIONS requests don't call the next handler
func TestCORSPreflightDoesNotCallNext(t *testing.T) {
	// Track if handler was called
	handlerCalled := false

	// Create handler that should not be called
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	})

	// Wrap with CORS middleware
	corsHandler := corsMiddleware(handler)

	// Create OPTIONS request
	req := httptest.NewRequest(http.MethodOptions, "/api/test", nil)
	w := httptest.NewRecorder()

	// Execute handler
	corsHandler.ServeHTTP(w, req)

	// Handler should not have been called
	if handlerCalled {
		t.Error("Handler was called for OPTIONS request, but should not have been")
	}

	// Should return 200 OK
	if w.Code != http.StatusOK {
		t.Errorf("Status code = %v, want %v", w.Code, http.StatusOK)
	}

	// Should have CORS headers
	if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
		t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
	}
}

// TestMiddlewareWithDifferentPaths tests middleware with various paths
func TestMiddlewareWithDifferentPaths(t *testing.T) {
	paths := []string{
		"/",
		"/api/dashboard",
		"/api/projects",
		"/api/github/stats",
		"/api/aha/verify",
		"/static/index.html",
	}

	for _, path := range paths {
		t.Run("path_"+path, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			corsHandler := corsMiddleware(handler)

			req := httptest.NewRequest(http.MethodGet, path, nil)
			w := httptest.NewRecorder()

			corsHandler.ServeHTTP(w, req)

			// All paths should have CORS headers
			if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
				t.Errorf("Access-Control-Allow-Origin = %v, want * for path %s", origin, path)
			}
		})
	}
}

// TestLoggingMiddlewareDoesNotAffectResponse tests that logging doesn't modify the response
func TestLoggingMiddlewareDoesNotAffectResponse(t *testing.T) {
	// Capture log output but discard it
	var logBuf bytes.Buffer
	log.SetOutput(&logBuf)
	log.SetFlags(0)
	defer func() {
		log.SetOutput(nil)
		log.SetFlags(log.LstdFlags)
	}()

	expectedBody := `{"status":"success","data":"test"}`
	expectedStatus := http.StatusCreated

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(expectedStatus)
		w.Write([]byte(expectedBody))
	})

	loggingHandler := loggingMiddleware(handler)

	req := httptest.NewRequest(http.MethodPost, "/api/create", nil)
	w := httptest.NewRecorder()

	loggingHandler.ServeHTTP(w, req)

	// Check status code wasn't modified
	if w.Code != expectedStatus {
		t.Errorf("Status code = %v, want %v", w.Code, expectedStatus)
	}

	// Check body wasn't modified
	if body := w.Body.String(); body != expectedBody {
		t.Errorf("Body = %v, want %v", body, expectedBody)
	}

	// Check Content-Type wasn't modified
	if contentType := w.Header().Get("Content-Type"); contentType != "application/json" {
		t.Errorf("Content-Type = %v, want application/json", contentType)
	}
}

// TestCORSHeadersWithCustomOrigin tests CORS with specific headers
func TestCORSHeadersWithCustomOrigin(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	corsHandler := corsMiddleware(handler)

	// Test with Origin header in request
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	corsHandler.ServeHTTP(w, req)

	// Should still allow all origins
	if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
		t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
	}
}

// TestMiddlewareErrorPropagation tests that errors propagate through middleware
func TestMiddlewareErrorPropagation(t *testing.T) {
	// Capture log output
	var logBuf bytes.Buffer
	log.SetOutput(&logBuf)
	log.SetFlags(0)
	defer func() {
		log.SetOutput(nil)
		log.SetFlags(log.LstdFlags)
	}()

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	})

	corsHandler := corsMiddleware(loggingMiddleware(handler))

	req := httptest.NewRequest(http.MethodGet, "/api/error", nil)
	w := httptest.NewRecorder()

	corsHandler.ServeHTTP(w, req)

	// Error status should propagate
	if w.Code != http.StatusInternalServerError {
		t.Errorf("Status code = %v, want %v", w.Code, http.StatusInternalServerError)
	}

	// CORS headers should still be set
	if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
		t.Errorf("Access-Control-Allow-Origin = %v, want *", origin)
	}
}
