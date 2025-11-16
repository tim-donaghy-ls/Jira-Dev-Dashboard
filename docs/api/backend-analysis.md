# Analysis Package API Documentation

## Overview

The `analysis` package performs comprehensive analysis on JIRA issues, calculating metrics, statistics, and generating dashboard data.

**Package:** `jira-dashboard/analysis`
**Location:** [backend/analysis/analyzer.go](../../backend/analysis/analyzer.go)

---

## Types

### Analyzer

Performs analysis on JIRA issues.

```go
type Analyzer struct {
    issues []jira.Issue
}
```

### DashboardData

Contains all analyzed data for the dashboard.

```go
type DashboardData struct {
    Summary           SummaryStats
    StatusBreakdown   map[string]int
    PriorityBreakdown map[string]int
    TypeBreakdown     map[string]int
    AssigneeStats     []AssigneeStats
    Timeline          []TimelinePoint
    SprintMetrics     SprintMetrics
    RecentIssues      []jira.Issue
    AllIssues         []jira.Issue
    SprintInfo        *jira.Sprint
    JiraBaseURL       string
}
```

### SummaryStats

High-level summary statistics.

```go
type SummaryStats struct {
    TotalIssues           int
    OpenIssues            int
    InProgressIssues      int
    ClosedIssues          int
    AvgResolutionDays     float64
    TotalStoryPoints      float64
    OpenStoryPoints       float64
    InProgressStoryPoints float64
    ClosedStoryPoints     float64
}
```

### AssigneeStats

Statistics per assignee/developer.

```go
type AssigneeStats struct {
    Name                   string
    TotalIssues            int
    OpenIssues             int
    ClosedIssues           int
    AvgResolutionDays      float64
    AvgDevelopmentTimeDays float64
    AvgInProgressToQADays  float64
    TotalStoryPoints       float64
    StatusBreakdown        map[string]int
}
```

### TimelinePoint

Represents a point on the timeline showing issue creation/closure trends.

```go
type TimelinePoint struct {
    Date    string
    Created int
    Closed  int
}
```

### SprintMetrics

Sprint-specific performance metrics.

```go
type SprintMetrics struct {
    TotalStoryPoints     float64
    CompletedStoryPoints float64
    Velocity             float64
    BurndownRate         float64
}
```

---

## Constructor Functions

### NewAnalyzer

Creates a new analyzer with the given issues.

```go
func NewAnalyzer(issues []jira.Issue) *Analyzer
```

**Parameters:**
- `issues` - Array of JIRA issues to analyze

**Returns:**
- `*Analyzer` - Configured analyzer instance

**Example:**
```go
analyzer := analysis.NewAnalyzer(issues)
```

---

## Analyzer Methods

### Analyze

Performs comprehensive analysis on the issues and returns dashboard data.

```go
func (a *Analyzer) Analyze() DashboardData
```

**Returns:**
- `DashboardData` - Complete analysis results

**Analysis Performed:**
- Summary statistics calculation
- Status breakdown by category
- Priority breakdown
- Issue type breakdown
- Per-assignee statistics and metrics
- Timeline of issue creation and closure
- Sprint-specific metrics
- Recent issues sorting

**Example:**
```go
analyzer := analysis.NewAnalyzer(issues)
dashboardData := analyzer.Analyze()

fmt.Printf("Total Issues: %d\n", dashboardData.Summary.TotalIssues)
fmt.Printf("Completion Rate: %.1f%%\n",
    float64(dashboardData.Summary.ClosedIssues) /
    float64(dashboardData.Summary.TotalIssues) * 100)
```

### FilterByDateRange

Filters issues by creation date range.

```go
func (a *Analyzer) FilterByDateRange(start, end time.Time) []jira.Issue
```

**Parameters:**
- `start` - Start date (inclusive)
- `end` - End date (inclusive)

**Returns:**
- `[]jira.Issue` - Filtered issues within the date range

**Example:**
```go
startDate := time.Now().AddDate(0, 0, -30)  // 30 days ago
endDate := time.Now()
recentIssues := analyzer.FilterByDateRange(startDate, endDate)
```

### FilterBySprint

Filters issues by sprint name.

```go
func (a *Analyzer) FilterBySprint(sprintName string) []jira.Issue
```

**Parameters:**
- `sprintName` - Sprint name to filter by

**Returns:**
- `[]jira.Issue` - Issues in the specified sprint

**Example:**
```go
sprintIssues := analyzer.FilterBySprint("Sprint 23")
```

---

## Status Categories

The analyzer uses the following status categories for metrics:

### In Progress Statuses
- "To Do", "ToDo"
- "In Progress"
- "Failed"
- "Code Review"
- "QA Review"

### Closed Statuses
- "Schedule Release", "Scheduled Release"
- "Production Release"
- "Done"
- "Closed"
- "Resolved"

---

## Metrics Calculation

### Summary Statistics

**Total Issues:** Count of all issues

**Open Issues:** Issues NOT in closed statuses

**In Progress Issues:** Issues in active development statuses

**Closed Issues:** Issues in closed statuses

**Avg Resolution Days:** Average development time from "To Do" to "Code Review/QA Review"

**Story Points:** Summed by category (total, open, in progress, closed)

### Assignee Statistics

For each developer/assignee, the analyzer calculates:

- **Total Issues:** All issues assigned to them
- **Open/Closed Issues:** Based on status categories
- **Avg Development Time:** Average time from "To Do" to "Code Review/QA"
- **Avg In Progress to QA Days:** Average time spent in QA-related statuses
- **Total Story Points:** Sum of story points for their issues
- **Status Breakdown:** Count of issues in each status

### Timeline Analysis

- Groups issues by creation and resolution dates
- Provides daily counts of created and closed issues
- Sorted chronologically for trend visualization

### Sprint Metrics

- **Total Story Points:** Sum of all story points in sprint
- **Completed Story Points:** Sum of story points for done/closed issues
- **Velocity:** Equals completed story points
- **Burndown Rate:** (Not currently calculated, placeholder)

---

## Usage Example

```go
package main

import (
    "jira-dashboard/analysis"
    "jira-dashboard/jira"
    "log"
    "time"
)

func main() {
    // Fetch issues from JIRA
    client := jira.NewClient(baseURL, email, token)
    issues, err := client.GetIssuesByProject("MYPROJ")
    if err != nil {
        log.Fatalf("Failed to fetch issues: %v", err)
    }

    // Create analyzer and perform analysis
    analyzer := analysis.NewAnalyzer(issues)
    dashboardData := analyzer.Analyze()

    // Print summary statistics
    log.Printf("=== Summary Statistics ===")
    log.Printf("Total Issues: %d", dashboardData.Summary.TotalIssues)
    log.Printf("Open: %d, Closed: %d", dashboardData.Summary.OpenIssues, dashboardData.Summary.ClosedIssues)
    log.Printf("Total Story Points: %.1f", dashboardData.Summary.TotalStoryPoints)
    log.Printf("Avg Dev Time: %.1f days", dashboardData.Summary.AvgResolutionDays)

    // Print status breakdown
    log.Printf("\n=== Status Breakdown ===")
    for status, count := range dashboardData.StatusBreakdown {
        log.Printf("%s: %d", status, count)
    }

    // Print top performers
    log.Printf("\n=== Team Performance ===")
    for i, dev := range dashboardData.AssigneeStats {
        if i >= 5 {
            break  // Top 5 only
        }
        completionRate := 0.0
        if dev.TotalIssues > 0 {
            completionRate = float64(dev.ClosedIssues) / float64(dev.TotalIssues) * 100
        }
        log.Printf("%s:", dev.Name)
        log.Printf("  Issues: %d (%.0f%% completion)", dev.TotalIssues, completionRate)
        log.Printf("  Story Points: %.1f", dev.TotalStoryPoints)
        log.Printf("  Avg Dev Time: %.1f days", dev.AvgDevelopmentTimeDays)
    }

    // Print sprint metrics
    log.Printf("\n=== Sprint Metrics ===")
    log.Printf("Total Story Points: %.1f", dashboardData.SprintMetrics.TotalStoryPoints)
    log.Printf("Completed: %.1f", dashboardData.SprintMetrics.CompletedStoryPoints)
    log.Printf("Velocity: %.1f", dashboardData.SprintMetrics.Velocity)

    // Filter by date range
    thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
    recentIssues := analyzer.FilterByDateRange(thirtyDaysAgo, time.Now())
    log.Printf("\nIssues in last 30 days: %d", len(recentIssues))

    // Timeline analysis
    log.Printf("\n=== Timeline (last 7 days) ===")
    timelineLen := len(dashboardData.Timeline)
    for i := max(0, timelineLen-7); i < timelineLen; i++ {
        point := dashboardData.Timeline[i]
        log.Printf("%s: Created=%d, Closed=%d", point.Date, point.Created, point.Closed)
    }
}
```

---

## Notes

- The analyzer operates on a snapshot of issues at analysis time
- All calculations are performed in-memory for fast response
- Status categorization can be customized by modifying the status maps
- Unassigned issues are grouped under "Unassigned" assignee
- Timeline data is sorted chronologically for easy visualization
- Recent issues are sorted by last updated date (descending)
- All floating-point calculations use 64-bit precision
- The analyzer is stateless and thread-safe for concurrent use
