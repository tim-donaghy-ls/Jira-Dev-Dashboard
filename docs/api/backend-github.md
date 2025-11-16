# GitHub Package API Documentation

## Overview

The `github` package provides a client for interacting with the GitHub REST API to track developer activity, commits, pull requests, and calculate contribution statistics.

**Package:** `jira-dashboard/github`
**Location:** [backend/github/client.go](../../backend/github/client.go)

---

## Types

### Client

GitHub API client for making authenticated requests.

```go
type Client struct {
    BaseURL string
    Token   string
    Owner   string
    Repo    string
    client  *http.Client
}
```

### PullRequest

Represents a GitHub pull request.

```go
type PullRequest struct {
    Number       int
    Title        string
    State        string
    User         User
    CreatedAt    time.Time
    UpdatedAt    time.Time
    MergedAt     *time.Time
    ClosedAt     *time.Time
    HTMLURL      string
    Additions    int
    Deletions    int
    ChangedFiles int
}
```

### Commit

Represents a GitHub commit.

```go
type Commit struct {
    SHA     string
    Commit  CommitDetails
    Author  User
    HTMLURL string
}
```

### CommitWithFiles

Represents a commit with detailed file changes.

```go
type CommitWithFiles struct {
    SHA    string
    Commit CommitDetails
    Author User
    Files  []CommitFile
}
```

### CommitFile

Represents a file changed in a commit.

```go
type CommitFile struct {
    Filename  string
    Status    string
    Additions int
    Deletions int
    Changes   int
}
```

### DeveloperStats

Represents GitHub contribution statistics for a developer.

```go
type DeveloperStats struct {
    Username       string
    TotalCommits   int
    TotalPRs       int
    MergedPRs      int
    OpenPRs        int
    Additions      int
    Deletions      int
    LastCommitDate *time.Time
    TestCoverage   float64  // Estimated test coverage percentage
}
```

### User

Represents a GitHub user.

```go
type User struct {
    Login     string
    ID        int
    AvatarURL string
}
```

---

## Constructor Functions

### NewClient

Creates a new GitHub API client for a specific repository.

```go
func NewClient(token, owner, repo string) *Client
```

**Parameters:**
- `token` - GitHub personal access token
- `owner` - Repository owner or organization name
- `repo` - Repository name

**Returns:**
- `*Client` - Configured GitHub client

**Example:**
```go
client := github.NewClient(
    "ghp_your_token_here",
    "myorg",
    "myrepo"
)
```

---

## Client Methods

### TestConnection

Tests the connection to GitHub API.

```go
func (c *Client) TestConnection(ctx context.Context) error
```

**Parameters:**
- `ctx` - Context for request cancellation

**Returns:**
- `error` - Nil if connection successful, error otherwise

**Example:**
```go
ctx := context.Background()
if err := client.TestConnection(ctx); err != nil {
    log.Printf("Connection failed: %v", err)
}
```

### GetPullRequests

Fetches pull requests from the repository.

```go
func (c *Client) GetPullRequests(ctx context.Context, state string, since *time.Time) ([]PullRequest, error)
```

**Parameters:**
- `ctx` - Context for request cancellation
- `state` - PR state filter: "open", "closed", or "all"
- `since` - Optional time filter (PRs updated after this time)

**Returns:**
- `[]PullRequest` - Array of pull requests (max 100)
- `error` - Error if retrieval fails

**Example:**
```go
// Get all open PRs
prs, err := client.GetPullRequests(ctx, "open", nil)

// Get PRs updated in last 7 days
sevenDaysAgo := time.Now().AddDate(0, 0, -7)
recentPRs, err := client.GetPullRequests(ctx, "all", &sevenDaysAgo)
```

### GetCommits

Fetches commits from the repository.

```go
func (c *Client) GetCommits(ctx context.Context, since *time.Time, author string) ([]Commit, error)
```

**Parameters:**
- `ctx` - Context for request cancellation
- `since` - Optional time filter (commits after this time)
- `author` - Optional author filter (GitHub username)

**Returns:**
- `[]Commit` - Array of commits (max 100)
- `error` - Error if retrieval fails

**Example:**
```go
// Get all recent commits
commits, err := client.GetCommits(ctx, nil, "")

// Get commits by specific author in last 30 days
thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
userCommits, err := client.GetCommits(ctx, &thirtyDaysAgo, "johndoe")
```

### GetCommitDetails

Fetches detailed commit information including file changes.

```go
func (c *Client) GetCommitDetails(ctx context.Context, sha string) (*CommitWithFiles, error)
```

**Parameters:**
- `ctx` - Context for request cancellation
- `sha` - Commit SHA hash

**Returns:**
- `*CommitWithFiles` - Detailed commit information with file changes
- `error` - Error if retrieval fails

**Example:**
```go
commit, err := client.GetCommitDetails(ctx, "a1b2c3d4...")
if err == nil {
    for _, file := range commit.Files {
        fmt.Printf("%s: +%d -%d\n", file.Filename, file.Additions, file.Deletions)
    }
}
```

### GetPRFiles

Fetches files changed in a pull request.

```go
func (c *Client) GetPRFiles(ctx context.Context, prNumber int) ([]CommitFile, error)
```

**Parameters:**
- `ctx` - Context for request cancellation
- `prNumber` - Pull request number

**Returns:**
- `[]CommitFile` - Array of changed files
- `error` - Error if retrieval fails

**Example:**
```go
files, err := client.GetPRFiles(ctx, 42)
```

### GetDeveloperStats

Calculates comprehensive GitHub contribution statistics for developers.

```go
func (c *Client) GetDeveloperStats(ctx context.Context, since *time.Time) (map[string]*DeveloperStats, error)
```

**Parameters:**
- `ctx` - Context for request cancellation
- `since` - Optional time filter (activity after this time)

**Returns:**
- `map[string]*DeveloperStats` - Map of username to developer statistics
- `error` - Error if calculation fails

**Statistics Calculated:**
- Total commits count
- Total PRs (open + merged)
- Merged PRs count
- Open PRs count
- Code additions (lines)
- Code deletions (lines)
- Last commit date
- Test coverage estimate (based on ratio of test files to source files)

**Example:**
```go
thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
stats, err := client.GetDeveloperStats(ctx, &thirtyDaysAgo)

for username, s := range stats {
    fmt.Printf("%s: %d commits, %d PRs, %.1f%% test coverage\n",
        username, s.TotalCommits, s.TotalPRs, s.TestCoverage)
}
```

---

## Helper Functions

The package includes internal helper functions for test file detection:

- `isTestFile(filename string) bool` - Identifies test files based on common patterns across languages

**Test File Patterns:**
- `.test.`, `.spec.`, `_test.`, `.tests.`
- `/test/`, `/tests/`, `/__tests__/`
- `/spec/`, `/specs/`

---

## Usage Example

```go
package main

import (
    "context"
    "jira-dashboard/github"
    "log"
    "time"
)

func main() {
    ctx := context.Background()

    // Create client for a specific repository
    client := github.NewClient(
        "ghp_your_token",
        "myorg",
        "myrepo"
    )

    // Test connection
    if err := client.TestConnection(ctx); err != nil {
        log.Fatalf("Connection failed: %v", err)
    }

    // Get last 30 days of activity
    since := time.Now().AddDate(0, 0, -30)

    // Get developer statistics
    stats, err := client.GetDeveloperStats(ctx, &since)
    if err != nil {
        log.Fatalf("Failed to get stats: %v", err)
    }

    // Print statistics
    for username, s := range stats {
        log.Printf("Developer: %s", username)
        log.Printf("  Commits: %d", s.TotalCommits)
        log.Printf("  PRs: %d (merged: %d, open: %d)", s.TotalPRs, s.MergedPRs, s.OpenPRs)
        log.Printf("  Code: +%d -%d", s.Additions, s.Deletions)
        log.Printf("  Test Coverage: %.1f%%", s.TestCoverage)
        if s.LastCommitDate != nil {
            log.Printf("  Last Activity: %v", s.LastCommitDate)
        }
    }

    // Get recent pull requests
    prs, err := client.GetPullRequests(ctx, "all", &since)
    if err != nil {
        log.Fatalf("Failed to get PRs: %v", err)
    }

    log.Printf("\nFound %d pull requests:", len(prs))
    for _, pr := range prs {
        log.Printf("  #%d: %s by %s [%s]", pr.Number, pr.Title, pr.User.Login, pr.State)
    }
}
```

---

## Notes

- The client requires a GitHub personal access token with appropriate permissions
- All requests use Bearer token authentication
- HTTP client has a 45-second timeout
- Maximum 100 results per API call (GitHub API pagination)
- Test coverage is estimated based on the ratio of test files to source files in PR changes
- All methods accept a `context.Context` for request cancellation and timeout control
- The base URL defaults to "https://api.github.com"
