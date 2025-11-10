package api

import (
	"context"
	"encoding/json"
	"jira-dashboard/github"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// handleGitHubStats returns GitHub statistics for developers across all repositories
func (h *Handler) handleGitHubStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if len(h.githubClients) == 0 {
		http.Error(w, "GitHub integration not configured", http.StatusServiceUnavailable)
		return
	}

	// Get days parameter (default: 30 days)
	daysStr := r.URL.Query().Get("days")
	days := 30
	if daysStr != "" {
		var err error
		days, err = strconv.Atoi(daysStr)
		if err != nil || days < 1 {
			http.Error(w, "Invalid days parameter", http.StatusBadRequest)
			return
		}
	}

	// Get optional repo filter
	repoFilter := r.URL.Query().Get("repo")

	since := time.Now().AddDate(0, 0, -days)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Aggregate stats from all repositories (or filtered repo)
	aggregatedStats := make(map[string]*github.DeveloperStats)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(h.githubClients))

	for repoName, client := range h.githubClients {
		// Skip if repo filter is set and doesn't match
		if repoFilter != "" && repoName != repoFilter {
			continue
		}

		wg.Add(1)
		go func(repo string, ghClient *github.Client) {
			defer wg.Done()

			stats, err := ghClient.GetDeveloperStats(ctx, &since)
			if err != nil {
				errChan <- err
				return
			}

			// Merge stats into aggregated map
			mu.Lock()
			for username, userStats := range stats {
				if existing, exists := aggregatedStats[username]; exists {
					// Aggregate stats
					existing.TotalCommits += userStats.TotalCommits
					existing.TotalPRs += userStats.TotalPRs
					existing.MergedPRs += userStats.MergedPRs
					existing.OpenPRs += userStats.OpenPRs
					existing.Additions += userStats.Additions
					existing.Deletions += userStats.Deletions
					if userStats.LastCommitDate != nil {
						if existing.LastCommitDate == nil || userStats.LastCommitDate.After(*existing.LastCommitDate) {
							existing.LastCommitDate = userStats.LastCommitDate
						}
					}
				} else {
					aggregatedStats[username] = userStats
				}
			}
			mu.Unlock()
		}(repoName, client)
	}

	wg.Wait()
	close(errChan)

	// Check for errors
	if len(errChan) > 0 {
		err := <-errChan
		http.Error(w, "Failed to fetch GitHub stats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"stats":      aggregatedStats,
		"sinceDays":  days,
		"sinceDate":  since.Format("2006-01-02"),
		"repos":      h.getRepoList(repoFilter),
	})
}

// handleGitHubPRs returns pull requests from GitHub repositories
func (h *Handler) handleGitHubPRs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if len(h.githubClients) == 0 {
		http.Error(w, "GitHub integration not configured", http.StatusServiceUnavailable)
		return
	}

	state := r.URL.Query().Get("state")
	if state == "" {
		state = "all"
	}

	// Get days parameter (default: 30 days)
	daysStr := r.URL.Query().Get("days")
	days := 30
	if daysStr != "" {
		var err error
		days, err = strconv.Atoi(daysStr)
		if err != nil || days < 1 {
			http.Error(w, "Invalid days parameter", http.StatusBadRequest)
			return
		}
	}

	// Get optional repo filter
	repoFilter := r.URL.Query().Get("repo")

	since := time.Now().AddDate(0, 0, -days)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	var allPRs []map[string]interface{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(h.githubClients)*2)

	for repoName, client := range h.githubClients {
		// Skip if repo filter is set and doesn't match
		if repoFilter != "" && repoName != repoFilter {
			continue
		}

		if state == "all" || state == "open" {
			wg.Add(1)
			go func(repo string, ghClient *github.Client) {
				defer wg.Done()

				openPRs, err := ghClient.GetPullRequests(ctx, "open", &since)
				if err != nil {
					errChan <- err
					return
				}

				mu.Lock()
				for _, pr := range openPRs {
					allPRs = append(allPRs, map[string]interface{}{
						"repo":         repo,
						"number":       pr.Number,
						"title":        pr.Title,
						"state":        pr.State,
						"user":         pr.User,
						"createdAt":    pr.CreatedAt,
						"updatedAt":    pr.UpdatedAt,
						"mergedAt":     pr.MergedAt,
						"closedAt":     pr.ClosedAt,
						"htmlUrl":      pr.HTMLURL,
						"additions":    pr.Additions,
						"deletions":    pr.Deletions,
						"changedFiles": pr.ChangedFiles,
					})
				}
				mu.Unlock()
			}(repoName, client)
		}

		if state == "all" || state == "closed" {
			wg.Add(1)
			go func(repo string, ghClient *github.Client) {
				defer wg.Done()

				closedPRs, err := ghClient.GetPullRequests(ctx, "closed", &since)
				if err != nil {
					errChan <- err
					return
				}

				mu.Lock()
				for _, pr := range closedPRs {
					allPRs = append(allPRs, map[string]interface{}{
						"repo":         repo,
						"number":       pr.Number,
						"title":        pr.Title,
						"state":        pr.State,
						"user":         pr.User,
						"createdAt":    pr.CreatedAt,
						"updatedAt":    pr.UpdatedAt,
						"mergedAt":     pr.MergedAt,
						"closedAt":     pr.ClosedAt,
						"htmlUrl":      pr.HTMLURL,
						"additions":    pr.Additions,
						"deletions":    pr.Deletions,
						"changedFiles": pr.ChangedFiles,
					})
				}
				mu.Unlock()
			}(repoName, client)
		}
	}

	wg.Wait()
	close(errChan)

	// Check for errors
	if len(errChan) > 0 {
		err := <-errChan
		http.Error(w, "Failed to fetch PRs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"pullRequests": allPRs,
		"count":        len(allPRs),
		"state":        state,
		"repos":        h.getRepoList(repoFilter),
	})
}

// handleGitHubCommits returns commits from GitHub repositories
func (h *Handler) handleGitHubCommits(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if len(h.githubClients) == 0 {
		http.Error(w, "GitHub integration not configured", http.StatusServiceUnavailable)
		return
	}

	author := r.URL.Query().Get("author")

	// Get days parameter (default: 30 days)
	daysStr := r.URL.Query().Get("days")
	days := 30
	if daysStr != "" {
		var err error
		days, err = strconv.Atoi(daysStr)
		if err != nil || days < 1 {
			http.Error(w, "Invalid days parameter", http.StatusBadRequest)
			return
		}
	}

	// Get optional repo filter
	repoFilter := r.URL.Query().Get("repo")

	since := time.Now().AddDate(0, 0, -days)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	var allCommits []map[string]interface{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(h.githubClients))

	for repoName, client := range h.githubClients {
		// Skip if repo filter is set and doesn't match
		if repoFilter != "" && repoName != repoFilter {
			continue
		}

		wg.Add(1)
		go func(repo string, ghClient *github.Client) {
			defer wg.Done()

			commits, err := ghClient.GetCommits(ctx, &since, author)
			if err != nil {
				errChan <- err
				return
			}

			mu.Lock()
			for _, commit := range commits {
				allCommits = append(allCommits, map[string]interface{}{
					"repo":    repo,
					"sha":     commit.SHA,
					"commit":  commit.Commit,
					"author":  commit.Author,
					"htmlUrl": commit.HTMLURL,
				})
			}
			mu.Unlock()
		}(repoName, client)
	}

	wg.Wait()
	close(errChan)

	// Check for errors
	if len(errChan) > 0 {
		err := <-errChan
		http.Error(w, "Failed to fetch commits: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"commits": allCommits,
		"count":   len(allCommits),
		"author":  author,
		"repos":   h.getRepoList(repoFilter),
	})
}

// handleGitHubStatus returns GitHub integration status
func (h *Handler) handleGitHubStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if len(h.githubClients) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled": false,
			"message": "GitHub integration not configured",
		})
		return
	}

	// Increased timeout to 60s to handle many repos
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Test connection to repositories with rate limiting
	repoStatus := make(map[string]interface{})
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Limit concurrent connection tests to 5 at a time to avoid overwhelming the network
	rateLimiter := make(chan struct{}, 5)

	for repoName, client := range h.githubClients {
		wg.Add(1)
		go func(repo string, ghClient *github.Client) {
			defer wg.Done()

			// Acquire rate limiter token
			rateLimiter <- struct{}{}
			defer func() { <-rateLimiter }()

			// Use a shorter timeout per repo test (10s)
			testCtx, testCancel := context.WithTimeout(ctx, 10*time.Second)
			defer testCancel()

			err := ghClient.TestConnection(testCtx)
			mu.Lock()
			if err != nil {
				log.Printf("GitHub connection test failed for %s: %v", repo, err)
				repoStatus[repo] = map[string]interface{}{
					"connected": false,
					"error":     err.Error(),
				}
			} else {
				repoStatus[repo] = map[string]interface{}{
					"connected": true,
				}
			}
			mu.Unlock()
		}(repoName, client)
	}

	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled":    true,
		"owner":      h.config.GitHub.Owner,
		"repos":      h.config.GitHub.Repos,
		"repoStatus": repoStatus,
	})
}

// handleGitHubRepos returns the list of configured repositories
func (h *Handler) handleGitHubRepos(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if h.config.GitHub == nil {
		http.Error(w, "GitHub integration not configured", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"owner": h.config.GitHub.Owner,
		"repos": h.config.GitHub.Repos,
		"count": len(h.config.GitHub.Repos),
	})
}

// getRepoList returns the list of repos being queried
func (h *Handler) getRepoList(repoFilter string) []string {
	if repoFilter != "" {
		return []string{repoFilter}
	}
	return h.config.GitHub.Repos
}

// handleGitHubDeveloperActivity returns GitHub activity for developers within a specific date range
// This is designed to be used with sprint start/end dates for accurate activity metrics
func (h *Handler) handleGitHubDeveloperActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if len(h.githubClients) == 0 {
		http.Error(w, "GitHub integration not configured", http.StatusServiceUnavailable)
		return
	}

	// Get date range parameters (required)
	startDateStr := r.URL.Query().Get("start")
	endDateStr := r.URL.Query().Get("end")

	if startDateStr == "" || endDateStr == "" {
		http.Error(w, "start and end date parameters are required (format: 2006-01-02T15:04:05Z)", http.StatusBadRequest)
		return
	}

	// Parse dates
	startDate, err := time.Parse(time.RFC3339, startDateStr)
	if err != nil {
		http.Error(w, "Invalid start date format. Use RFC3339 format (2006-01-02T15:04:05Z)", http.StatusBadRequest)
		return
	}

	endDate, err := time.Parse(time.RFC3339, endDateStr)
	if err != nil {
		http.Error(w, "Invalid end date format. Use RFC3339 format (2006-01-02T15:04:05Z)", http.StatusBadRequest)
		return
	}

	// Get optional repo filter
	repoFilter := r.URL.Query().Get("repo")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Aggregate activity from all repositories using GetDeveloperStats
	developerActivity := make(map[string]map[string]interface{})
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Rate limiter: allow up to 10 concurrent requests for better performance
	// GitHub allows 5000 requests/hour for authenticated users, so this is safe
	rateLimiter := make(chan struct{}, 10)

	var repoIndex int

	for repoName, client := range h.githubClients {
		// Skip if repo filter is set and doesn't match
		if repoFilter != "" && repoName != repoFilter {
			continue
		}

		// Filter to only CLX repos to reduce API calls
		if !strings.Contains(strings.ToUpper(repoName), "CLX") {
			continue
		}

		repoIndex++

		// Use GetDeveloperStats which includes test coverage calculation
		wg.Add(1)
		go func(repo string, ghClient *github.Client) {
			defer wg.Done()

			// Acquire rate limiter token
			rateLimiter <- struct{}{}
			defer func() { <-rateLimiter }()

			// Use GetDeveloperStats which calculates test coverage from PRs
			stats, err := ghClient.GetDeveloperStats(ctx, &startDate)
			if err != nil {
				log.Printf("Warning: Failed to fetch developer stats from %s: %v", repo, err)
				return
			}

			// Merge stats into aggregated activity
			mu.Lock()
			for username, devStats := range stats {
				// Filter by end date
				if devStats.LastCommitDate != nil && devStats.LastCommitDate.After(endDate) {
					continue
				}

				if _, exists := developerActivity[username]; !exists {
					lastActivity := startDate
					if devStats.LastCommitDate != nil {
						lastActivity = *devStats.LastCommitDate
					}

					developerActivity[username] = map[string]interface{}{
						"username":     username,
						"commits":      0,
						"prs":          0,
						"prsMerged":    0,
						"additions":    0,
						"deletions":    0,
						"testCoverage": 0.0,
						"lastActivity": lastActivity,
					}
				}

				activity := developerActivity[username]
				activity["commits"] = activity["commits"].(int) + devStats.TotalCommits
				activity["prs"] = activity["prs"].(int) + devStats.TotalPRs
				activity["prsMerged"] = activity["prsMerged"].(int) + devStats.MergedPRs
				activity["additions"] = activity["additions"].(int) + devStats.Additions
				activity["deletions"] = activity["deletions"].(int) + devStats.Deletions

				// Aggregate test coverage (weighted average by PRs merged)
				existingCoverage := activity["testCoverage"].(float64)
				existingPRs := activity["prsMerged"].(int) - devStats.MergedPRs
				if devStats.MergedPRs > 0 && devStats.TestCoverage > 0 {
					totalPRs := activity["prsMerged"].(int)
					if totalPRs > 0 {
						activity["testCoverage"] = (existingCoverage*float64(existingPRs) + devStats.TestCoverage*float64(devStats.MergedPRs)) / float64(totalPRs)
					}
				}

				if devStats.LastCommitDate != nil && devStats.LastCommitDate.After(activity["lastActivity"].(time.Time)) {
					activity["lastActivity"] = *devStats.LastCommitDate
				}
			}
			mu.Unlock()
		}(repoName, client)
	}

	log.Printf("Fetching GitHub activity from %d CLX repos...", repoIndex)
	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"developerActivity": developerActivity,
		"startDate":         startDate.Format("2006-01-02"),
		"endDate":           endDate.Format("2006-01-02"),
		"repos":             h.getRepoList(repoFilter),
	})
}
