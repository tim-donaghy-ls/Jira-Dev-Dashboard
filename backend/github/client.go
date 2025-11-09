package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client represents a GitHub API client
type Client struct {
	BaseURL string
	Token   string
	Owner   string
	Repo    string
	client  *http.Client
}

// PullRequest represents a GitHub pull request
type PullRequest struct {
	Number       int        `json:"number"`
	Title        string     `json:"title"`
	State        string     `json:"state"`
	User         User       `json:"user"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	MergedAt     *time.Time `json:"merged_at"`
	ClosedAt     *time.Time `json:"closed_at"`
	HTMLURL      string     `json:"html_url"`
	Additions    int        `json:"additions"`
	Deletions    int        `json:"deletions"`
	ChangedFiles int        `json:"changed_files"`
}

// Commit represents a GitHub commit
type Commit struct {
	SHA    string    `json:"sha"`
	Commit CommitDetails `json:"commit"`
	Author User      `json:"author"`
	HTMLURL string   `json:"html_url"`
}

// CommitWithFiles represents a GitHub commit with file changes
type CommitWithFiles struct {
	SHA    string        `json:"sha"`
	Commit CommitDetails `json:"commit"`
	Author User          `json:"author"`
	Files  []CommitFile  `json:"files"`
}

// CommitFile represents a file changed in a commit
type CommitFile struct {
	Filename  string `json:"filename"`
	Status    string `json:"status"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
	Changes   int    `json:"changes"`
}

// CommitDetails contains commit metadata
type CommitDetails struct {
	Message string    `json:"message"`
	Author  CommitAuthor `json:"author"`
}

// CommitAuthor contains commit author info
type CommitAuthor struct {
	Name  string    `json:"name"`
	Email string    `json:"email"`
	Date  time.Time `json:"date"`
}

// User represents a GitHub user
type User struct {
	Login     string `json:"login"`
	ID        int    `json:"id"`
	AvatarURL string `json:"avatar_url"`
}

// DeveloperStats represents GitHub statistics for a developer
type DeveloperStats struct {
	Username       string     `json:"username"`
	TotalCommits   int        `json:"totalCommits"`
	TotalPRs       int        `json:"totalPRs"`
	MergedPRs      int        `json:"mergedPRs"`
	OpenPRs        int        `json:"openPRs"`
	Additions      int        `json:"additions"`
	Deletions      int        `json:"deletions"`
	LastCommitDate *time.Time `json:"lastCommitDate"`
	TestCoverage   float64    `json:"testCoverage"` // Estimated test coverage percentage
}

// NewClient creates a new GitHub API client
func NewClient(token, owner, repo string) *Client {
	return &Client{
		BaseURL: "https://api.github.com",
		Token:   token,
		Owner:   owner,
		Repo:    repo,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// makeRequest makes an authenticated request to the GitHub API
func (c *Client) makeRequest(ctx context.Context, endpoint string) (*http.Response, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/%s", c.BaseURL, c.Owner, c.Repo, endpoint)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("GitHub API returned status %d: %s", resp.StatusCode, string(body))
	}

	return resp, nil
}

// GetPullRequests fetches pull requests from the repository
func (c *Client) GetPullRequests(ctx context.Context, state string, since *time.Time) ([]PullRequest, error) {
	endpoint := fmt.Sprintf("pulls?state=%s&per_page=100", state)
	if since != nil {
		endpoint += fmt.Sprintf("&since=%s", since.Format(time.RFC3339))
	}

	resp, err := c.makeRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var prs []PullRequest
	if err := json.NewDecoder(resp.Body).Decode(&prs); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return prs, nil
}

// GetCommits fetches commits from the repository
func (c *Client) GetCommits(ctx context.Context, since *time.Time, author string) ([]Commit, error) {
	endpoint := "commits?per_page=100"
	if since != nil {
		endpoint += fmt.Sprintf("&since=%s", since.Format(time.RFC3339))
	}
	if author != "" {
		endpoint += fmt.Sprintf("&author=%s", author)
	}

	resp, err := c.makeRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var commits []Commit
	if err := json.NewDecoder(resp.Body).Decode(&commits); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return commits, nil
}

// GetCommitDetails fetches detailed commit information including file changes
func (c *Client) GetCommitDetails(ctx context.Context, sha string) (*CommitWithFiles, error) {
	endpoint := fmt.Sprintf("commits/%s", sha)
	resp, err := c.makeRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var commit CommitWithFiles
	if err := json.NewDecoder(resp.Body).Decode(&commit); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &commit, nil
}

// GetPRFiles fetches the files changed in a pull request
func (c *Client) GetPRFiles(ctx context.Context, prNumber int) ([]CommitFile, error) {
	endpoint := fmt.Sprintf("pulls/%d/files?per_page=100", prNumber)
	resp, err := c.makeRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var files []CommitFile
	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return files, nil
}

// isTestFile checks if a filename represents a test file
func isTestFile(filename string) bool {
	// Common test file patterns across languages
	patterns := []string{
		".test.", ".spec.", "_test.", ".tests.",
		"/test/", "/tests/", "/__tests__/",
		"/spec/", "/specs/",
	}
	lower := strings.ToLower(filename)
	for _, pattern := range patterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	return false
}

// GetDeveloperStats calculates statistics for developers based on GitHub activity
func (c *Client) GetDeveloperStats(ctx context.Context, since *time.Time) (map[string]*DeveloperStats, error) {
	// Fetch all commits
	commits, err := c.GetCommits(ctx, since, "")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch commits: %w", err)
	}

	// Fetch all PRs (open and closed)
	allPRs := make([]PullRequest, 0)

	openPRs, err := c.GetPullRequests(ctx, "open", since)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch open PRs: %w", err)
	}
	allPRs = append(allPRs, openPRs...)

	closedPRs, err := c.GetPullRequests(ctx, "closed", since)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch closed PRs: %w", err)
	}
	allPRs = append(allPRs, closedPRs...)

	// Calculate stats
	stats := make(map[string]*DeveloperStats)

	// Track file changes per developer for test coverage calculation
	type fileChanges struct {
		testFiles   int
		sourceFiles int
	}
	developerFiles := make(map[string]*fileChanges)

	// Process commits
	for _, commit := range commits {
		username := commit.Author.Login
		if username == "" {
			username = commit.Commit.Author.Email
		}

		if _, exists := stats[username]; !exists {
			stats[username] = &DeveloperStats{
				Username: username,
			}
		}

		stats[username].TotalCommits++

		if stats[username].LastCommitDate == nil || commit.Commit.Author.Date.After(*stats[username].LastCommitDate) {
			date := commit.Commit.Author.Date
			stats[username].LastCommitDate = &date
		}
	}

	// Process PRs and calculate test coverage from PR files
	for _, pr := range allPRs {
		username := pr.User.Login

		if _, exists := stats[username]; !exists {
			stats[username] = &DeveloperStats{
				Username: username,
			}
		}
		if _, exists := developerFiles[username]; !exists {
			developerFiles[username] = &fileChanges{}
		}

		stats[username].TotalPRs++
		stats[username].Additions += pr.Additions
		stats[username].Deletions += pr.Deletions

		if pr.State == "open" {
			stats[username].OpenPRs++
		} else if pr.MergedAt != nil {
			stats[username].MergedPRs++
		}

		// Fetch PR files for test coverage calculation (only for merged PRs)
		if pr.MergedAt != nil {
			prFiles, err := c.GetPRFiles(ctx, pr.Number)
			if err != nil {
				// Log error but continue processing other PRs
				fmt.Printf("Warning: failed to fetch PR #%d files: %v\n", pr.Number, err)
				continue
			}

			// Categorize files as test or source
			for _, file := range prFiles {
				if isTestFile(file.Filename) {
					developerFiles[username].testFiles++
				} else {
					developerFiles[username].sourceFiles++
				}
			}
		}
	}

	// Calculate test coverage percentage for each developer
	for username, files := range developerFiles {
		totalFiles := files.testFiles + files.sourceFiles
		if totalFiles > 0 {
			// Test coverage = (test file changes / total file changes) * 100
			stats[username].TestCoverage = (float64(files.testFiles) / float64(totalFiles)) * 100
		}
	}

	return stats, nil
}

// TestConnection tests the GitHub API connection
func (c *Client) TestConnection(ctx context.Context) error {
	url := fmt.Sprintf("%s/repos/%s/%s", c.BaseURL, c.Owner, c.Repo)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("connection test failed with status: %d", resp.StatusCode)
	}

	return nil
}
