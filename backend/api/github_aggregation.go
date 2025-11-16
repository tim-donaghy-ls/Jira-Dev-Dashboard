package api

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"jira-dashboard/github"
)

// GitHubStatsProvider defines the interface for fetching developer statistics
// This interface allows for easy mocking in tests
type GitHubStatsProvider interface {
	GetDeveloperStats(ctx context.Context, since *time.Time) (map[string]*github.DeveloperStats, error)
}

// DeveloperActivityAggregator handles aggregation of developer activity across repositories
type DeveloperActivityAggregator struct {
	clients      map[string]GitHubStatsProvider
	maxConcurrent int
}

// NewDeveloperActivityAggregator creates a new aggregator with the given clients
func NewDeveloperActivityAggregator(clients map[string]GitHubStatsProvider, maxConcurrent int) *DeveloperActivityAggregator {
	if maxConcurrent <= 0 {
		maxConcurrent = 10 // default
	}
	return &DeveloperActivityAggregator{
		clients:      clients,
		maxConcurrent: maxConcurrent,
	}
}

// AggregateOptions contains configuration for aggregation
type AggregateOptions struct {
	StartDate  time.Time
	EndDate    time.Time
	RepoFilter string
	OnlyCLX    bool
}

// AggregateDeveloperActivity fetches and aggregates developer activity from multiple repositories
func (a *DeveloperActivityAggregator) AggregateDeveloperActivity(ctx context.Context, opts AggregateOptions) (map[string]map[string]interface{}, error) {
	developerActivity := make(map[string]map[string]interface{})
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Rate limiter for concurrent requests
	rateLimiter := make(chan struct{}, a.maxConcurrent)

	repoCount := 0
	for repoName, client := range a.clients {
		// Apply repo filter if specified
		if opts.RepoFilter != "" && repoName != opts.RepoFilter {
			continue
		}

		// Apply CLX filter if enabled
		if opts.OnlyCLX && !strings.Contains(strings.ToUpper(repoName), "CLX") {
			continue
		}

		repoCount++
		wg.Add(1)

		go func(repo string, ghClient GitHubStatsProvider) {
			defer wg.Done()

			// Acquire rate limiter token
			rateLimiter <- struct{}{}
			defer func() { <-rateLimiter }()

			// Fetch developer stats from this repository
			stats, err := ghClient.GetDeveloperStats(ctx, &opts.StartDate)
			if err != nil {
				log.Printf("Warning: Failed to fetch developer stats from %s: %v", repo, err)
				return
			}

			// Merge stats into aggregated activity
			mu.Lock()
			MergeDeveloperStats(developerActivity, stats, opts.StartDate, opts.EndDate)
			mu.Unlock()
		}(repoName, client)
	}

	log.Printf("Fetching GitHub activity from %d repos...", repoCount)
	wg.Wait()

	return developerActivity, nil
}

// MergeDeveloperStats merges developer statistics into the aggregated activity map
// This function is exported for testing purposes
func MergeDeveloperStats(
	developerActivity map[string]map[string]interface{},
	stats map[string]*github.DeveloperStats,
	startDate, endDate time.Time,
) {
	for username, devStats := range stats {
		// Filter by end date
		if devStats.LastCommitDate != nil && devStats.LastCommitDate.After(endDate) {
			continue
		}

		// Initialize developer entry if it doesn't exist
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

		// Aggregate stats
		activity := developerActivity[username]
		activity["commits"] = activity["commits"].(int) + devStats.TotalCommits
		activity["prs"] = activity["prs"].(int) + devStats.TotalPRs
		activity["prsMerged"] = activity["prsMerged"].(int) + devStats.MergedPRs
		activity["additions"] = activity["additions"].(int) + devStats.Additions
		activity["deletions"] = activity["deletions"].(int) + devStats.Deletions

		// Aggregate test coverage (weighted average by PRs merged)
		AggregateTestCoverage(activity, devStats)

		// Update last activity timestamp
		if devStats.LastCommitDate != nil && devStats.LastCommitDate.After(activity["lastActivity"].(time.Time)) {
			activity["lastActivity"] = *devStats.LastCommitDate
		}
	}
}

// AggregateTestCoverage calculates weighted average test coverage
// This function is exported for testing purposes
func AggregateTestCoverage(activity map[string]interface{}, newStats *github.DeveloperStats) {
	if newStats.MergedPRs <= 0 || newStats.TestCoverage <= 0 {
		return
	}

	existingCoverage := activity["testCoverage"].(float64)
	existingPRs := activity["prsMerged"].(int) - newStats.MergedPRs
	totalPRs := activity["prsMerged"].(int)

	if totalPRs > 0 {
		// Weighted average: (old_coverage * old_PRs + new_coverage * new_PRs) / total_PRs
		activity["testCoverage"] = (existingCoverage*float64(existingPRs) + newStats.TestCoverage*float64(newStats.MergedPRs)) / float64(totalPRs)
	}
}

// ShouldIncludeRepo determines if a repository should be included based on filters
func ShouldIncludeRepo(repoName, repoFilter string, onlyCLX bool) bool {
	// Check repo filter
	if repoFilter != "" && repoName != repoFilter {
		return false
	}

	// Check CLX filter
	if onlyCLX && !strings.Contains(strings.ToUpper(repoName), "CLX") {
		return false
	}

	return true
}
