package main

import (
	"jira-dashboard/api"
	"jira-dashboard/config"
	"jira-dashboard/jira"
	"log"
	"net/http"
)

func main() {
	log.Println("Starting JIRA Dashboard Application...")

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Error loading configuration: %v", err)
	}

	log.Printf("Configuration loaded successfully")
	log.Printf("Configured JIRA instances: %d", len(cfg.Instances))
	for id, instance := range cfg.Instances {
		log.Printf("  - %s: %s (%s)", id, instance.Name, instance.BaseURL)
	}
	log.Printf("Server will run on port: %s", cfg.ServerPort)

	// Test connection to all instances
	log.Println("Testing JIRA connections...")
	jiraClients := make(map[string]*jira.Client)
	for id, instance := range cfg.Instances {
		client := jira.NewClient(instance.BaseURL, instance.Email, instance.Token)
		jiraClients[id] = client

		if err := client.TestConnection(); err != nil {
			log.Printf("  ✗ Warning: Could not connect to %s: %v", instance.Name, err)
		} else {
			log.Printf("  ✓ Successfully connected to %s", instance.Name)
		}
	}

	// Create API handler with config and clients
	handler := api.NewHandler(cfg, jiraClients)

	// Setup HTTP server
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// Add CORS and logging middleware
	corsAndLoggedMux := corsMiddleware(loggingMiddleware(mux))

	// Start server
	addr := ":" + cfg.ServerPort
	log.Printf("Server starting on http://localhost%s", addr)
	log.Printf("Open your browser and navigate to http://localhost%s", addr)

	if err := http.ListenAndServe(addr, corsAndLoggedMux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// loggingMiddleware logs all HTTP requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		next.ServeHTTP(w, r)
	})
}

// corsMiddleware adds CORS headers to allow cross-origin requests
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
