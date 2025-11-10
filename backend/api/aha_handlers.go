package api

import (
	"context"
	"encoding/json"
	"jira-dashboard/aha"
	"log"
	"net/http"
	"time"
)

// VerifyAhaFeaturesHandler verifies if JIRA tickets exist in Aha
func (h *Handler) VerifyAhaFeaturesHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Check if Aha is configured
	if h.config.Aha == nil {
		http.Error(w, "Aha integration not configured", http.StatusServiceUnavailable)
		return
	}

	// Parse request body to get JIRA keys
	var requestBody struct {
		JiraKeys []string `json:"jiraKeys"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(requestBody.JiraKeys) == 0 {
		http.Error(w, "No JIRA keys provided", http.StatusBadRequest)
		return
	}

	// Create Aha client
	ahaClient := aha.NewClient(h.config.Aha.APIKey, h.config.Aha.Domain)

	// Set timeout for the request
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Verify features
	log.Printf("Verifying %d JIRA tickets in Aha...", len(requestBody.JiraKeys))
	verifications, err := ahaClient.VerifyFeatures(ctx, requestBody.JiraKeys)
	if err != nil {
		log.Printf("Error verifying Aha features: %v", err)
		http.Error(w, "Failed to verify Aha features", http.StatusInternalServerError)
		return
	}

	// Return results
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(verifications); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully verified %d JIRA tickets in Aha", len(verifications))
}

// TestAhaConnectionHandler tests the Aha API connection
func (h *Handler) TestAhaConnectionHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Check if Aha is configured
	if h.config.Aha == nil {
		response := map[string]interface{}{
			"success": false,
			"message": "Aha integration not configured",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Create Aha client
	ahaClient := aha.NewClient(h.config.Aha.APIKey, h.config.Aha.Domain)

	// Test connection
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	err := ahaClient.TestConnection(ctx)

	response := map[string]interface{}{
		"success": err == nil,
	}

	if err != nil {
		response["message"] = err.Error()
		log.Printf("Aha connection test failed: %v", err)
	} else {
		response["message"] = "Aha connection successful"
		log.Println("Aha connection test successful")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
