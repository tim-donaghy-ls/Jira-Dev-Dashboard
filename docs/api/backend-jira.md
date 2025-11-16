# JIRA Package API Documentation

## Overview

The `jira` package provides a comprehensive client for interacting with the JIRA REST API, including issue searching, sprint management, and development metrics calculation.

**Package:** `jira-dashboard/jira`
**Location:** [backend/jira/](../../backend/jira/)

---

## Types

### Client

JIRA API client for making authenticated requests.

```go
type Client struct {
    BaseURL    string
    Email      string
    APIToken   string
    HTTPClient *http.Client
}
```

### Issue

Represents a simplified JIRA issue/ticket.

```go
type Issue struct {
    Key                    string
    Summary                string
    Status                 string
    Priority               string
    IssueType              string
    Created                time.Time
    Updated                time.Time
    Resolved               *time.Time
    Assignee               string
    Reporter               string
    StoryPoints            float64
    Sprint                 string
    Labels                 []string
    Description            string
    StatusHistory          []StatusHistory
    InProgressToQADays     float64
    DevelopmentTimeDays    float64
}
```

### StatusHistory

Represents a status change in an issue's history.

```go
type StatusHistory struct {
    Status     string
    Timestamp  time.Time
    FromStatus string
}
```

### Sprint

Represents a JIRA sprint.

```go
type Sprint struct {
    ID           int
    Name         string
    State        string
    StartDate    *time.Time
    EndDate      *time.Time
    CompleteDate *time.Time
    BoardID      int
}
```

### Project

Represents a JIRA project.

```go
type Project struct {
    ID   string
    Key  string
    Name string
}
```

---

## Constructor Functions

### NewClient

Creates a new JIRA API client.

```go
func NewClient(baseURL, email, apiToken string) *Client
```

**Parameters:**
- `baseURL` - JIRA instance base URL (e.g., "https://mycompany.atlassian.net")
- `email` - User email for Basic Authentication
- `apiToken` - JIRA API token

**Returns:**
- `*Client` - Configured JIRA client

**Example:**
```go
client := jira.NewClient(
    "https://mycompany.atlassian.net",
    "user@example.com",
    "your-api-token"
)
```

---

## Client Methods

### TestConnection

Tests the connection to JIRA API.

```go
func (c *Client) TestConnection() error
```

**Returns:**
- `error` - Nil if connection successful, error otherwise

**Example:**
```go
if err := client.TestConnection(); err != nil {
    log.Printf("Connection failed: %v", err)
}
```

### SearchIssues

Searches for JIRA issues using JQL (JIRA Query Language).

```go
func (c *Client) SearchIssues(jql string, maxResults int) ([]Issue, error)
```

**Parameters:**
- `jql` - JIRA Query Language query string
- `maxResults` - Maximum number of results to return

**Returns:**
- `[]Issue` - Array of matching issues
- `error` - Error if search fails

**Example:**
```go
issues, err := client.SearchIssues(
    "project = MYPROJ AND status = 'In Progress'",
    100
)
```

### SearchWithJQL

Simplified JQL search with a default limit of 100 results.

```go
func (c *Client) SearchWithJQL(jql string) ([]Issue, error)
```

**Parameters:**
- `jql` - JIRA Query Language query string

**Returns:**
- `[]Issue` - Array of matching issues (max 100)
- `error` - Error if search fails

### GetIssuesByProject

Retrieves all issues for a specific project.

```go
func (c *Client) GetIssuesByProject(projectKey string) ([]Issue, error)
```

**Parameters:**
- `projectKey` - Project key (e.g., "MYPROJ")

**Returns:**
- `[]Issue` - Array of issues in the project (max 1000)
- `error` - Error if retrieval fails

**Example:**
```go
issues, err := client.GetIssuesByProject("MYPROJ")
```

### GetIssuesBySprint

Retrieves all issues for a specific sprint.

```go
func (c *Client) GetIssuesBySprint(sprintID int) ([]Issue, error)
```

**Parameters:**
- `sprintID` - Sprint ID

**Returns:**
- `[]Issue` - Array of issues in the sprint (max 1000)
- `error` - Error if retrieval fails

**Example:**
```go
issues, err := client.GetIssuesBySprint(123)
```

### GetProjects

Retrieves all projects accessible to the user.

```go
func (c *Client) GetProjects() ([]Project, error)
```

**Returns:**
- `[]Project` - Array of accessible projects
- `error` - Error if retrieval fails

**Example:**
```go
projects, err := client.GetProjects()
for _, p := range projects {
    fmt.Printf("%s: %s\n", p.Key, p.Name)
}
```

### GetSprintsByProject

Retrieves all sprints for a project.

```go
func (c *Client) GetSprintsByProject(projectKey string) ([]Sprint, error)
```

**Parameters:**
- `projectKey` - Project key (e.g., "MYPROJ")

**Returns:**
- `[]Sprint` - Array of sprints in the project
- `error` - Error if retrieval fails

**Example:**
```go
sprints, err := client.GetSprintsByProject("MYPROJ")
```

### GetSprint

Fetches a single sprint by ID.

```go
func (c *Client) GetSprint(sprintID int) (Sprint, error)
```

**Parameters:**
- `sprintID` - Sprint ID

**Returns:**
- `Sprint` - Sprint information
- `error` - Error if retrieval fails

### GetIssueChangelog

Retrieves the changelog (status history) for a specific issue.

```go
func (c *Client) GetIssueChangelog(issueKey string) ([]StatusHistory, error)
```

**Parameters:**
- `issueKey` - Issue key (e.g., "MYPROJ-123")

**Returns:**
- `[]StatusHistory` - Array of status changes
- `error` - Error if retrieval fails

**Example:**
```go
history, err := client.GetIssueChangelog("MYPROJ-123")
for _, h := range history {
    fmt.Printf("%s -> %s at %v\n", h.FromStatus, h.Status, h.Timestamp)
}
```

---

## Package Functions

### CalculateDevelopmentMetrics

Calculates development time metrics from status history.

```go
func CalculateDevelopmentMetrics(statusHistory []StatusHistory) (totalQADays float64, developmentTimeDays float64)
```

**Parameters:**
- `statusHistory` - Array of status changes for an issue

**Returns:**
- `totalQADays` - Total time spent in QA/testing statuses (in days)
- `developmentTimeDays` - Time from "To Do" to "Code Review" or "QA Review" (in days)

**Status Categories:**
- **QA Statuses:** "QA Review", "QA", "Testing", "Ready for QA", "In Testing"
- **Development Start:** "To Do", "ToDo", "Open", "Backlog"
- **Development End:** "Code Review", "In Review", "Review"

**Example:**
```go
history, _ := client.GetIssueChangelog("MYPROJ-123")
qaDays, devDays := jira.CalculateDevelopmentMetrics(history)
fmt.Printf("QA Time: %.1f days, Dev Time: %.1f days\n", qaDays, devDays)
```

---

## Usage Example

```go
package main

import (
    "jira-dashboard/jira"
    "log"
)

func main() {
    // Create client
    client := jira.NewClient(
        "https://mycompany.atlassian.net",
        "user@example.com",
        "api-token"
    )

    // Test connection
    if err := client.TestConnection(); err != nil {
        log.Fatalf("Connection failed: %v", err)
    }

    // Get projects
    projects, err := client.GetProjects()
    if err != nil {
        log.Fatalf("Failed to get projects: %v", err)
    }

    // Get issues for first project
    if len(projects) > 0 {
        issues, err := client.GetIssuesByProject(projects[0].Key)
        if err != nil {
            log.Fatalf("Failed to get issues: %v", err)
        }

        log.Printf("Found %d issues in %s", len(issues), projects[0].Name)

        // Calculate metrics for each issue
        for _, issue := range issues {
            history, _ := client.GetIssueChangelog(issue.Key)
            qaDays, devDays := jira.CalculateDevelopmentMetrics(history)
            log.Printf("%s: QA=%.1fd, Dev=%.1fd", issue.Key, qaDays, devDays)
        }
    }
}
```

---

## Notes

- The client uses Basic Authentication with email + API token
- Story points are extracted from multiple possible custom fields
- Description field supports both plain text and Atlassian Document Format (ADF)
- Dates are parsed in RFC3339 format with fallback to alternative formats
- All requests have a 30-second timeout
- Maximum results are capped at 1000 issues per query for performance
