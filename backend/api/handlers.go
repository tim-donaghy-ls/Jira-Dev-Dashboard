package api

import (
	"encoding/json"
	"fmt"
	"jira-dashboard/analysis"
	"jira-dashboard/config"
	"jira-dashboard/jira"
	"log"
	"net/http"
	"strconv"
)

// Handler manages HTTP requests
type Handler struct {
	config      *config.Config
	jiraClients map[string]*jira.Client
}

// NewHandler creates a new API handler
func NewHandler(cfg *config.Config, jiraClients map[string]*jira.Client) *Handler {
	return &Handler{
		config:      cfg,
		jiraClients: jiraClients,
	}
}

// getJiraClient returns the JIRA client for the specified instance
func (h *Handler) getJiraClient(instanceID string) (*jira.Client, error) {
	// If no instance specified, use the primary or first available
	if instanceID == "" {
		if client, exists := h.jiraClients["primary"]; exists {
			return client, nil
		}
		// Get the first available instance
		for _, client := range h.jiraClients {
			return client, nil
		}
		return nil, fmt.Errorf("no JIRA instances configured")
	}

	client, exists := h.jiraClients[instanceID]
	if !exists {
		return nil, fmt.Errorf("instance '%s' not found", instanceID)
	}
	return client, nil
}

// RegisterRoutes registers all API routes
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// API routes
	mux.HandleFunc("/api/instances", h.handleInstances)
	mux.HandleFunc("/api/dashboard", h.handleDashboard)
	mux.HandleFunc("/api/projects", h.handleProjects)
	mux.HandleFunc("/api/sprints", h.handleSprints)
	mux.HandleFunc("/api/project/", h.handleProject)
	mux.HandleFunc("/api/sprint/", h.handleSprint)
	mux.HandleFunc("/api/test-connection", h.handleTestConnection)
	mux.HandleFunc("/api/issue/", h.handleIssueChangelog)
	mux.HandleFunc("/api/tests", HandleTestDashboard)

	// Serve static files
	fs := http.FileServer(http.Dir("./static"))
	mux.Handle("/", fs)
}

// handleInstances returns the list of available JIRA instances
func (h *Handler) handleInstances(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instances := make([]map[string]string, 0)
	for id, instance := range h.config.Instances {
		instances = append(instances, map[string]string{
			"id":   id,
			"name": instance.Name,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"instances": instances,
		"count":     len(instances),
	})
}

// handleDashboard returns dashboard data
func (h *Handler) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instanceID := r.URL.Query().Get("instance")
	projectKey := r.URL.Query().Get("project")
	if projectKey == "" {
		http.Error(w, "project parameter is required", http.StatusBadRequest)
		return
	}

	// Get the appropriate JIRA client
	jiraClient, err := h.getJiraClient(instanceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	sprintIDStr := r.URL.Query().Get("sprint")

	var issues []jira.Issue
	var sprintInfo *jira.Sprint

	// Fetch issues from JIRA - either by project or by sprint
	if sprintIDStr != "" && sprintIDStr != "all" {
		sprintID, parseErr := strconv.Atoi(sprintIDStr)
		if parseErr != nil {
			http.Error(w, "invalid sprint ID", http.StatusBadRequest)
			return
		}
		issues, err = jiraClient.GetIssuesBySprint(sprintID)

		// Fetch sprint details
		sprint, sprintErr := jiraClient.GetSprint(sprintID)
		if sprintErr != nil {
			log.Printf("Warning: Could not fetch sprint details: %v", sprintErr)
		} else {
			sprintInfo = &sprint
		}
	} else {
		issues, err = jiraClient.GetIssuesByProject(projectKey)
	}

	if err != nil {
		log.Printf("Error fetching issues: %v", err)
		http.Error(w, "Error fetching JIRA data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Enrich issues with status history and calculated metrics
	// Do this in parallel to improve performance
	type issueResult struct {
		index int
		issue jira.Issue
	}
	resultChan := make(chan issueResult, len(issues))
	semaphore := make(chan struct{}, 10) // Limit to 10 concurrent requests

	for i := range issues {
		go func(idx int) {
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			// Fetch status history for this issue
			statusHistory, err := jiraClient.GetIssueChangelog(issues[idx].Key)
			if err != nil {
				log.Printf("Error fetching changelog for %s: %v", issues[idx].Key, err)
				resultChan <- issueResult{index: idx, issue: issues[idx]}
				return
			}

			// Calculate metrics from status history
			totalQADays, developmentTimeDays := jira.CalculateDevelopmentMetrics(statusHistory)

			// Update the issue with calculated metrics
			issues[idx].StatusHistory = statusHistory
			issues[idx].InProgressToQADays = totalQADays
			issues[idx].DevelopmentTimeDays = developmentTimeDays

			resultChan <- issueResult{index: idx, issue: issues[idx]}
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < len(issues); i++ {
		result := <-resultChan
		issues[result.index] = result.issue
	}
	close(resultChan)

	// Analyze the data
	analyzer := analysis.NewAnalyzer(issues)
	dashboardData := analyzer.Analyze()

	// Add sprint info if available
	dashboardData.SprintInfo = sprintInfo

	// Add JIRA base URL for creating links
	dashboardData.JiraBaseURL = jiraClient.BaseURL

	// Return as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dashboardData)
}

// handleProject returns data for a specific project
func (h *Handler) handleProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instanceID := r.URL.Query().Get("instance")
	jiraClient, err := h.getJiraClient(instanceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Extract project key from URL
	projectKey := r.URL.Path[len("/api/project/"):]
	if projectKey == "" {
		http.Error(w, "project key is required", http.StatusBadRequest)
		return
	}

	issues, err := jiraClient.GetIssuesByProject(projectKey)
	if err != nil {
		log.Printf("Error fetching project issues: %v", err)
		http.Error(w, "Error fetching project data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"project": projectKey,
		"issues":  issues,
		"count":   len(issues),
	})
}

// handleSprint returns data for a specific sprint
func (h *Handler) handleSprint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instanceID := r.URL.Query().Get("instance")
	jiraClient, err := h.getJiraClient(instanceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Extract sprint ID from URL
	sprintIDStr := r.URL.Path[len("/api/sprint/"):]
	sprintID, err := strconv.Atoi(sprintIDStr)
	if err != nil {
		http.Error(w, "invalid sprint ID", http.StatusBadRequest)
		return
	}

	issues, err := jiraClient.GetIssuesBySprint(sprintID)
	if err != nil {
		log.Printf("Error fetching sprint issues: %v", err)
		http.Error(w, "Error fetching sprint data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Analyze sprint data
	analyzer := analysis.NewAnalyzer(issues)
	dashboardData := analyzer.Analyze()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sprintId":  sprintID,
		"issues":    issues,
		"analytics": dashboardData,
	})
}

// handleTestConnection tests the JIRA connection
func (h *Handler) handleTestConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instanceID := r.URL.Query().Get("instance")
	jiraClient, err := h.getJiraClient(instanceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = jiraClient.TestConnection()
	if err != nil {
		log.Printf("Connection test failed: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Successfully connected to JIRA",
	})
}

// handleProjects returns the list of all accessible projects
func (h *Handler) handleProjects(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instanceID := r.URL.Query().Get("instance")
	jiraClient, err := h.getJiraClient(instanceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	projects, err := jiraClient.GetProjects()
	if err != nil {
		log.Printf("Error fetching projects: %v", err)
		http.Error(w, "Error fetching projects: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"projects": projects,
		"count":    len(projects),
	})
}

// handleSprints returns the list of sprints for a project
func (h *Handler) handleSprints(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instanceID := r.URL.Query().Get("instance")
	jiraClient, err := h.getJiraClient(instanceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	projectKey := r.URL.Query().Get("project")
	if projectKey == "" {
		http.Error(w, "project parameter is required", http.StatusBadRequest)
		return
	}

	sprints, err := jiraClient.GetSprintsByProject(projectKey)
	if err != nil {
		log.Printf("Error fetching sprints: %v", err)
		http.Error(w, "Error fetching sprints: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sprints": sprints,
		"count":   len(sprints),
	})
}

// handleIssueChangelog returns the changelog (status history) for a specific issue
func (h *Handler) handleIssueChangelog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	instanceID := r.URL.Query().Get("instance")
	jiraClient, err := h.getJiraClient(instanceID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Extract issue key from URL path
	issueKey := r.URL.Path[len("/api/issue/"):]
	// Remove any trailing segments (e.g., "/changelog")
	if idx := len(issueKey); idx > 0 {
		if slashIdx := 0; slashIdx < idx {
			// Keep only the issue key part
			parts := r.URL.Path[len("/api/issue/"):]
			issueKey = parts
		}
	}

	if issueKey == "" {
		http.Error(w, "issue key is required", http.StatusBadRequest)
		return
	}

	statusHistory, err := jiraClient.GetIssueChangelog(issueKey)
	if err != nil {
		log.Printf("Error fetching issue changelog: %v", err)
		http.Error(w, "Error fetching issue changelog: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Calculate development metrics from status history
	inProgressToQADays, developmentTimeDays := jira.CalculateDevelopmentMetrics(statusHistory)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"issueKey":            issueKey,
		"statusHistory":       statusHistory,
		"inProgressToQADays":  inProgressToQADays,
		"developmentTimeDays": developmentTimeDays,
	})
}
