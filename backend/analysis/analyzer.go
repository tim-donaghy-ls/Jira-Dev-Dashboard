package analysis

import (
	"jira-dashboard/jira"
	"sort"
	"time"
)

// DashboardData contains all analyzed data for the dashboard
type DashboardData struct {
	Summary           SummaryStats      `json:"summary"`
	StatusBreakdown   map[string]int    `json:"statusBreakdown"`
	PriorityBreakdown map[string]int    `json:"priorityBreakdown"`
	TypeBreakdown     map[string]int    `json:"typeBreakdown"`
	AssigneeStats     []AssigneeStats   `json:"assigneeStats"`
	Timeline          []TimelinePoint   `json:"timeline"`
	SprintMetrics     SprintMetrics     `json:"sprintMetrics"`
	RecentIssues      []jira.Issue      `json:"recentIssues"`
	AllIssues         []jira.Issue      `json:"allIssues"`
	SprintInfo        *jira.Sprint      `json:"sprintInfo,omitempty"`
	JiraBaseURL       string            `json:"jiraBaseUrl"`
}

// SummaryStats contains high-level statistics
type SummaryStats struct {
	TotalIssues           int     `json:"totalIssues"`
	OpenIssues            int     `json:"openIssues"`
	InProgressIssues      int     `json:"inProgressIssues"`
	ClosedIssues          int     `json:"closedIssues"`
	AvgResolutionDays     float64 `json:"avgResolutionDays"`
	TotalStoryPoints      float64 `json:"totalStoryPoints"`
	OpenStoryPoints       float64 `json:"openStoryPoints"`
	InProgressStoryPoints float64 `json:"inProgressStoryPoints"`
	ClosedStoryPoints     float64 `json:"closedStoryPoints"`
}

// AssigneeStats contains statistics per assignee
type AssigneeStats struct {
	Name                  string         `json:"name"`
	TotalIssues           int            `json:"totalIssues"`
	OpenIssues            int            `json:"openIssues"`
	ClosedIssues          int            `json:"closedIssues"`
	AvgResolutionDays     float64        `json:"avgResolutionDays"`
	AvgDevelopmentTimeDays float64       `json:"avgDevelopmentTimeDays"`
	AvgInProgressToQADays float64       `json:"avgInProgressToQADays"`
	TotalStoryPoints      float64        `json:"totalStoryPoints"`
	StatusBreakdown       map[string]int `json:"statusBreakdown"`
}

// TimelinePoint represents a point on the timeline
type TimelinePoint struct {
	Date    string `json:"date"`
	Created int    `json:"created"`
	Closed  int    `json:"closed"`
}

// SprintMetrics contains sprint-specific metrics
type SprintMetrics struct {
	TotalStoryPoints     float64 `json:"totalStoryPoints"`
	CompletedStoryPoints float64 `json:"completedStoryPoints"`
	Velocity             float64 `json:"velocity"`
	BurndownRate         float64 `json:"burndownRate"`
}

// Analyzer performs analysis on JIRA issues
type Analyzer struct {
	issues []jira.Issue
}

// NewAnalyzer creates a new analyzer with the given issues
func NewAnalyzer(issues []jira.Issue) *Analyzer {
	return &Analyzer{
		issues: issues,
	}
}

// Analyze performs comprehensive analysis on the issues
func (a *Analyzer) Analyze() DashboardData {
	return DashboardData{
		Summary:           a.calculateSummary(),
		StatusBreakdown:   a.calculateStatusBreakdown(),
		PriorityBreakdown: a.calculatePriorityBreakdown(),
		TypeBreakdown:     a.calculateTypeBreakdown(),
		AssigneeStats:     a.calculateAssigneeStats(),
		Timeline:          a.calculateTimeline(),
		SprintMetrics:     a.calculateSprintMetrics(),
		RecentIssues:      a.getRecentIssues(0), // Return all issues sorted by updated date
		AllIssues:         a.issues,
	}
}

// calculateSummary calculates high-level summary statistics
func (a *Analyzer) calculateSummary() SummaryStats {
	stats := SummaryStats{
		TotalIssues: len(a.issues),
	}

	var totalResolutionDays float64
	var resolutionCount int

	// Define status categories
	inProgressStatuses := map[string]bool{
		"To Do":       true,
		"ToDo":        true,
		"In Progress": true,
		"Failed":      true,
		"Code Review": true,
		"QA Review":   true,
	}

	closedStatuses := map[string]bool{
		"Schedule Release":    true,
		"Scheduled Release":   true,
		"Production Release":  true,
		"Done":                true,
		"Closed":              true,
		"Resolved":            true,
	}

	for _, issue := range a.issues {
		// Sum up total story points
		stats.TotalStoryPoints += issue.StoryPoints

		// Open: Any ticket NOT in closed statuses
		if !closedStatuses[issue.Status] {
			stats.OpenIssues++
			stats.OpenStoryPoints += issue.StoryPoints
		}

		// In Progress: Tickets in active development statuses
		if inProgressStatuses[issue.Status] {
			stats.InProgressIssues++
			stats.InProgressStoryPoints += issue.StoryPoints
		}

		// Closed: Tickets in closed statuses
		if closedStatuses[issue.Status] {
			stats.ClosedIssues++
			stats.ClosedStoryPoints += issue.StoryPoints
		}

		// Calculate AVG Dev Time using the same calculation as in handlers
		// This is the time from "To Do" to "Code Review" or "QA Review"
		if issue.DevelopmentTimeDays > 0 {
			totalResolutionDays += issue.DevelopmentTimeDays
			resolutionCount++
		}
	}

	if resolutionCount > 0 {
		stats.AvgResolutionDays = totalResolutionDays / float64(resolutionCount)
	}

	return stats
}

// calculateStatusBreakdown breaks down issues by status
func (a *Analyzer) calculateStatusBreakdown() map[string]int {
	breakdown := make(map[string]int)
	for _, issue := range a.issues {
		breakdown[issue.Status]++
	}
	return breakdown
}

// calculatePriorityBreakdown breaks down issues by priority
func (a *Analyzer) calculatePriorityBreakdown() map[string]int {
	breakdown := make(map[string]int)
	for _, issue := range a.issues {
		breakdown[issue.Priority]++
	}
	return breakdown
}

// calculateTypeBreakdown breaks down issues by type
func (a *Analyzer) calculateTypeBreakdown() map[string]int {
	breakdown := make(map[string]int)
	for _, issue := range a.issues {
		breakdown[issue.IssueType]++
	}
	return breakdown
}

// calculateAssigneeStats calculates statistics per assignee
func (a *Analyzer) calculateAssigneeStats() []AssigneeStats {
	assigneeMap := make(map[string]*AssigneeStats)

	// Track development time and QA-related metrics per assignee
	type devMetrics struct {
		totalDevDays float64
		devCount     int
		totalQADays  float64
		qaCount      int
	}
	metricsMap := make(map[string]*devMetrics)

	for _, issue := range a.issues {
		assignee := issue.Assignee
		if assignee == "" {
			assignee = "Unassigned"
		}

		if _, exists := assigneeMap[assignee]; !exists {
			assigneeMap[assignee] = &AssigneeStats{
				Name:            assignee,
				StatusBreakdown: make(map[string]int),
			}
			metricsMap[assignee] = &devMetrics{}
		}

		stats := assigneeMap[assignee]
		stats.TotalIssues++

		// Track status breakdown for each assignee
		stats.StatusBreakdown[issue.Status]++

		// Sum story points for each assignee
		stats.TotalStoryPoints += issue.StoryPoints

		// Use calculated development time from status history if available
		if issue.DevelopmentTimeDays > 0 {
			metricsMap[assignee].totalDevDays += issue.DevelopmentTimeDays
			metricsMap[assignee].devCount++
		}

		// Use calculated In Progress to QA time from status history if available
		if issue.InProgressToQADays > 0 {
			metricsMap[assignee].totalQADays += issue.InProgressToQADays
			metricsMap[assignee].qaCount++
		}

		// Open: Any ticket NOT in Production Release
		// Closed: Ticket is in Production Release
		if issue.Status == "Production Release" {
			stats.ClosedIssues++
			if issue.Resolved != nil {
				duration := issue.Resolved.Sub(issue.Created)
				days := duration.Hours() / 24
				stats.AvgResolutionDays = (stats.AvgResolutionDays*float64(stats.ClosedIssues-1) + days) / float64(stats.ClosedIssues)
			}
		} else {
			stats.OpenIssues++
		}
	}

	// Calculate averages from metrics
	for assignee, metrics := range metricsMap {
		if metrics.devCount > 0 {
			assigneeMap[assignee].AvgDevelopmentTimeDays = metrics.totalDevDays / float64(metrics.devCount)
		}
		if metrics.qaCount > 0 {
			assigneeMap[assignee].AvgInProgressToQADays = metrics.totalQADays / float64(metrics.qaCount)
		}
	}

	result := make([]AssigneeStats, 0, len(assigneeMap))
	for _, stats := range assigneeMap {
		result = append(result, *stats)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalIssues > result[j].TotalIssues
	})

	return result
}

// calculateTimeline creates a timeline of issue creation and closure
func (a *Analyzer) calculateTimeline() []TimelinePoint {
	timelineMap := make(map[string]*TimelinePoint)

	for _, issue := range a.issues {
		dateStr := issue.Created.Format("2006-01-02")
		if _, exists := timelineMap[dateStr]; !exists {
			timelineMap[dateStr] = &TimelinePoint{Date: dateStr}
		}
		timelineMap[dateStr].Created++

		if issue.Resolved != nil {
			resolvedDateStr := issue.Resolved.Format("2006-01-02")
			if _, exists := timelineMap[resolvedDateStr]; !exists {
				timelineMap[resolvedDateStr] = &TimelinePoint{Date: resolvedDateStr}
			}
			timelineMap[resolvedDateStr].Closed++
		}
	}

	result := make([]TimelinePoint, 0, len(timelineMap))
	for _, point := range timelineMap {
		result = append(result, *point)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Date < result[j].Date
	})

	return result
}

// calculateSprintMetrics calculates sprint-specific metrics
func (a *Analyzer) calculateSprintMetrics() SprintMetrics {
	metrics := SprintMetrics{}

	for _, issue := range a.issues {
		metrics.TotalStoryPoints += issue.StoryPoints

		if issue.Status == "Done" || issue.Status == "Closed" || issue.Status == "Resolved" {
			metrics.CompletedStoryPoints += issue.StoryPoints
		}
	}

	if metrics.TotalStoryPoints > 0 {
		metrics.Velocity = metrics.CompletedStoryPoints
	}

	return metrics
}

// getRecentIssues returns the most recently updated issues
func (a *Analyzer) getRecentIssues(limit int) []jira.Issue {
	issues := make([]jira.Issue, len(a.issues))
	copy(issues, a.issues)

	sort.Slice(issues, func(i, j int) bool {
		return issues[i].Updated.After(issues[j].Updated)
	})

	// If limit is 0, return all issues
	if limit > 0 && len(issues) > limit {
		issues = issues[:limit]
	}

	return issues
}

// FilterByDateRange filters issues by date range
func (a *Analyzer) FilterByDateRange(start, end time.Time) []jira.Issue {
	var filtered []jira.Issue
	for _, issue := range a.issues {
		if issue.Created.After(start) && issue.Created.Before(end) {
			filtered = append(filtered, issue)
		}
	}
	return filtered
}

// FilterBySprint filters issues by sprint name
func (a *Analyzer) FilterBySprint(sprintName string) []jira.Issue {
	var filtered []jira.Issue
	for _, issue := range a.issues {
		if issue.Sprint == sprintName {
			filtered = append(filtered, issue)
		}
	}
	return filtered
}
