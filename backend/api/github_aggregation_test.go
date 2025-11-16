package api

import (
	"context"
	"testing"
	"time"

	"jira-dashboard/github"

	"github.com/stretchr/testify/assert"
)

// MockGitHubStatsProvider implements GitHubStatsProvider for testing
type MockGitHubStatsProvider struct {
	stats map[string]*github.DeveloperStats
	err   error
}

func (m *MockGitHubStatsProvider) GetDeveloperStats(ctx context.Context, since *time.Time) (map[string]*github.DeveloperStats, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.stats, nil
}

// Test ShouldIncludeRepo function
func TestShouldIncludeRepo(t *testing.T) {
	tests := []struct {
		name       string
		repoName   string
		repoFilter string
		onlyCLX    bool
		expected   bool
	}{
		{
			name:       "No filters - include all",
			repoName:   "my-repo",
			repoFilter: "",
			onlyCLX:    false,
			expected:   true,
		},
		{
			name:       "CLX filter - CLX repo matches",
			repoName:   "CLX-Dashboard",
			repoFilter: "",
			onlyCLX:    true,
			expected:   true,
		},
		{
			name:       "CLX filter - lowercase clx matches",
			repoName:   "clx-api",
			repoFilter: "",
			onlyCLX:    true,
			expected:   true,
		},
		{
			name:       "CLX filter - non-CLX repo excluded",
			repoName:   "other-repo",
			repoFilter: "",
			onlyCLX:    true,
			expected:   false,
		},
		{
			name:       "Repo filter - exact match",
			repoName:   "my-repo",
			repoFilter: "my-repo",
			onlyCLX:    false,
			expected:   true,
		},
		{
			name:       "Repo filter - no match",
			repoName:   "my-repo",
			repoFilter: "other-repo",
			onlyCLX:    false,
			expected:   false,
		},
		{
			name:       "Both filters - CLX and specific repo",
			repoName:   "CLX-Dashboard",
			repoFilter: "CLX-Dashboard",
			onlyCLX:    true,
			expected:   true,
		},
		{
			name:       "Both filters - non-CLX filtered out",
			repoName:   "my-repo",
			repoFilter: "my-repo",
			onlyCLX:    true,
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldIncludeRepo(tt.repoName, tt.repoFilter, tt.onlyCLX)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Test MergeDeveloperStats function
func TestMergeDeveloperStats(t *testing.T) {
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)
	tomorrow := now.Add(24 * time.Hour)

	t.Run("Merge new developer", func(t *testing.T) {
		activity := make(map[string]map[string]interface{})
		stats := map[string]*github.DeveloperStats{
			"alice": {
				Username:       "alice",
				TotalCommits:   10,
				TotalPRs:       5,
				MergedPRs:      4,
				Additions:      100,
				Deletions:      50,
				TestCoverage:   85.5,
				LastCommitDate: &now,
			},
		}

		MergeDeveloperStats(activity, stats, yesterday, tomorrow)

		assert.Contains(t, activity, "alice")
		assert.Equal(t, "alice", activity["alice"]["username"])
		assert.Equal(t, 10, activity["alice"]["commits"])
		assert.Equal(t, 5, activity["alice"]["prs"])
		assert.Equal(t, 4, activity["alice"]["prsMerged"])
		assert.Equal(t, 100, activity["alice"]["additions"])
		assert.Equal(t, 50, activity["alice"]["deletions"])
		assert.Equal(t, 85.5, activity["alice"]["testCoverage"])
		assert.Equal(t, now, activity["alice"]["lastActivity"])
	})

	t.Run("Merge existing developer - aggregate stats", func(t *testing.T) {
		activity := map[string]map[string]interface{}{
			"bob": {
				"username":     "bob",
				"commits":      5,
				"prs":          2,
				"prsMerged":    2,
				"additions":    50,
				"deletions":    25,
				"testCoverage": 80.0,
				"lastActivity": yesterday,
			},
		}

		stats := map[string]*github.DeveloperStats{
			"bob": {
				Username:       "bob",
				TotalCommits:   3,
				TotalPRs:       1,
				MergedPRs:      1,
				Additions:      30,
				Deletions:      15,
				TestCoverage:   90.0,
				LastCommitDate: &now,
			},
		}

		MergeDeveloperStats(activity, stats, yesterday, tomorrow)

		// Should aggregate all counters
		assert.Equal(t, 8, activity["bob"]["commits"])        // 5 + 3
		assert.Equal(t, 3, activity["bob"]["prs"])            // 2 + 1
		assert.Equal(t, 3, activity["bob"]["prsMerged"])      // 2 + 1
		assert.Equal(t, 80, activity["bob"]["additions"])     // 50 + 30
		assert.Equal(t, 40, activity["bob"]["deletions"])     // 25 + 15
		assert.Equal(t, now, activity["bob"]["lastActivity"]) // Updated to newer date

		// Test coverage should be weighted average
		// (80.0 * 2 + 90.0 * 1) / 3 = 83.33...
		expectedCoverage := (80.0*2.0 + 90.0*1.0) / 3.0
		assert.InDelta(t, expectedCoverage, activity["bob"]["testCoverage"], 0.01)
	})

	t.Run("Filter out stats after end date", func(t *testing.T) {
		activity := make(map[string]map[string]interface{})
		stats := map[string]*github.DeveloperStats{
			"charlie": {
				Username:       "charlie",
				TotalCommits:   10,
				LastCommitDate: &tomorrow, // After end date
			},
		}

		MergeDeveloperStats(activity, stats, yesterday, now)

		// Should be filtered out
		assert.NotContains(t, activity, "charlie")
	})

	t.Run("Update last activity with newer date", func(t *testing.T) {
		activity := map[string]map[string]interface{}{
			"dave": {
				"username":     "dave",
				"commits":      1,
				"prs":          1,
				"prsMerged":    0,
				"additions":    10,
				"deletions":    5,
				"testCoverage": 0.0,
				"lastActivity": yesterday,
			},
		}

		stats := map[string]*github.DeveloperStats{
			"dave": {
				Username:       "dave",
				TotalCommits:   1,
				LastCommitDate: &now,
			},
		}

		MergeDeveloperStats(activity, stats, yesterday, tomorrow)

		assert.Equal(t, now, activity["dave"]["lastActivity"])
	})
}

// Test AggregateTestCoverage function
func TestAggregateTestCoverage(t *testing.T) {
	t.Run("First PR with test coverage", func(t *testing.T) {
		activity := map[string]interface{}{
			"testCoverage": 0.0,
			"prsMerged":    1,
		}

		stats := &github.DeveloperStats{
			MergedPRs:    1,
			TestCoverage: 85.5,
		}

		AggregateTestCoverage(activity, stats)

		assert.Equal(t, 85.5, activity["testCoverage"])
	})

	t.Run("Weighted average with multiple PRs", func(t *testing.T) {
		activity := map[string]interface{}{
			"testCoverage": 80.0,
			"prsMerged":    4, // 2 existing + 2 new
		}

		stats := &github.DeveloperStats{
			MergedPRs:    2,
			TestCoverage: 90.0,
		}

		AggregateTestCoverage(activity, stats)

		// (80.0 * 2 + 90.0 * 2) / 4 = 85.0
		assert.Equal(t, 85.0, activity["testCoverage"])
	})

	t.Run("No change when new stats have no coverage", func(t *testing.T) {
		activity := map[string]interface{}{
			"testCoverage": 75.0,
			"prsMerged":    3,
		}

		stats := &github.DeveloperStats{
			MergedPRs:    1,
			TestCoverage: 0.0, // No test coverage
		}

		AggregateTestCoverage(activity, stats)

		assert.Equal(t, 75.0, activity["testCoverage"]) // Unchanged
	})

	t.Run("No change when no merged PRs", func(t *testing.T) {
		activity := map[string]interface{}{
			"testCoverage": 75.0,
			"prsMerged":    2,
		}

		stats := &github.DeveloperStats{
			MergedPRs:    0, // No merged PRs
			TestCoverage: 90.0,
		}

		AggregateTestCoverage(activity, stats)

		assert.Equal(t, 75.0, activity["testCoverage"]) // Unchanged
	})
}

// Test DeveloperActivityAggregator
func TestDeveloperActivityAggregator_AggregateDeveloperActivity(t *testing.T) {
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)
	tomorrow := now.Add(24 * time.Hour)

	t.Run("Aggregate from single repo", func(t *testing.T) {
		mockClient := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"alice": {
					Username:       "alice",
					TotalCommits:   10,
					TotalPRs:       5,
					MergedPRs:      4,
					Additions:      100,
					Deletions:      50,
					TestCoverage:   85.0,
					LastCommitDate: &now,
				},
			},
		}

		clients := map[string]GitHubStatsProvider{
			"CLX-Repo": mockClient,
		}

		aggregator := NewDeveloperActivityAggregator(clients, 5)
		activity, err := aggregator.AggregateDeveloperActivity(context.Background(), AggregateOptions{
			StartDate: yesterday,
			EndDate:   tomorrow,
			OnlyCLX:   true,
		})

		assert.NoError(t, err)
		assert.Contains(t, activity, "alice")
		assert.Equal(t, 10, activity["alice"]["commits"])
		assert.Equal(t, 85.0, activity["alice"]["testCoverage"])
	})

	t.Run("Aggregate from multiple repos", func(t *testing.T) {
		mockClient1 := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"alice": {
					Username:     "alice",
					TotalCommits: 5,
					TotalPRs:     2,
					MergedPRs:    2,
					Additions:    50,
					Deletions:    25,
					TestCoverage: 80.0,
				},
			},
		}

		mockClient2 := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"alice": {
					Username:     "alice",
					TotalCommits: 3,
					TotalPRs:     1,
					MergedPRs:    1,
					Additions:    30,
					Deletions:    15,
					TestCoverage: 90.0,
				},
			},
		}

		clients := map[string]GitHubStatsProvider{
			"CLX-Repo1": mockClient1,
			"CLX-Repo2": mockClient2,
		}

		aggregator := NewDeveloperActivityAggregator(clients, 5)
		activity, err := aggregator.AggregateDeveloperActivity(context.Background(), AggregateOptions{
			StartDate: yesterday,
			EndDate:   tomorrow,
			OnlyCLX:   true,
		})

		assert.NoError(t, err)
		assert.Contains(t, activity, "alice")
		assert.Equal(t, 8, activity["alice"]["commits"]) // 5 + 3
		assert.Equal(t, 80, activity["alice"]["additions"]) // 50 + 30

		// Test coverage weighted average: (80 * 2 + 90 * 1) / 3 = 83.33
		expectedCoverage := (80.0*2.0 + 90.0*1.0) / 3.0
		assert.InDelta(t, expectedCoverage, activity["alice"]["testCoverage"], 0.01)
	})

	t.Run("Filter by repo", func(t *testing.T) {
		mockClient1 := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"alice": {Username: "alice", TotalCommits: 5},
			},
		}

		mockClient2 := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"bob": {Username: "bob", TotalCommits: 3},
			},
		}

		clients := map[string]GitHubStatsProvider{
			"CLX-Repo1": mockClient1,
			"CLX-Repo2": mockClient2,
		}

		aggregator := NewDeveloperActivityAggregator(clients, 5)
		activity, err := aggregator.AggregateDeveloperActivity(context.Background(), AggregateOptions{
			StartDate:  yesterday,
			EndDate:    tomorrow,
			RepoFilter: "CLX-Repo1",
			OnlyCLX:    false,
		})

		assert.NoError(t, err)
		assert.Contains(t, activity, "alice")
		assert.NotContains(t, activity, "bob") // Filtered out
	})

	t.Run("Filter by CLX only", func(t *testing.T) {
		mockCLXClient := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"alice": {Username: "alice", TotalCommits: 5},
			},
		}

		mockOtherClient := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"bob": {Username: "bob", TotalCommits: 3},
			},
		}

		clients := map[string]GitHubStatsProvider{
			"CLX-Dashboard": mockCLXClient,
			"Other-Repo":    mockOtherClient,
		}

		aggregator := NewDeveloperActivityAggregator(clients, 5)
		activity, err := aggregator.AggregateDeveloperActivity(context.Background(), AggregateOptions{
			StartDate: yesterday,
			EndDate:   tomorrow,
			OnlyCLX:   true,
		})

		assert.NoError(t, err)
		assert.Contains(t, activity, "alice")
		assert.NotContains(t, activity, "bob") // Non-CLX repo filtered out
	})

	t.Run("Handle empty results", func(t *testing.T) {
		mockClient := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{},
		}

		clients := map[string]GitHubStatsProvider{
			"CLX-Repo": mockClient,
		}

		aggregator := NewDeveloperActivityAggregator(clients, 5)
		activity, err := aggregator.AggregateDeveloperActivity(context.Background(), AggregateOptions{
			StartDate: yesterday,
			EndDate:   tomorrow,
			OnlyCLX:   true,
		})

		assert.NoError(t, err)
		assert.Empty(t, activity)
	})

	t.Run("Use default max concurrent if zero", func(t *testing.T) {
		mockClient := &MockGitHubStatsProvider{
			stats: map[string]*github.DeveloperStats{
				"alice": {Username: "alice", TotalCommits: 1},
			},
		}

		clients := map[string]GitHubStatsProvider{
			"CLX-Repo": mockClient,
		}

		aggregator := NewDeveloperActivityAggregator(clients, 0) // Should default to 10
		assert.Equal(t, 10, aggregator.maxConcurrent)

		activity, err := aggregator.AggregateDeveloperActivity(context.Background(), AggregateOptions{
			StartDate: yesterday,
			EndDate:   tomorrow,
			OnlyCLX:   true,
		})

		assert.NoError(t, err)
		assert.Contains(t, activity, "alice")
	})
}
