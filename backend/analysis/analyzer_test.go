package analysis

import (
	"jira-dashboard/jira"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewAnalyzer(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1"},
		{Key: "TEST-2"},
	}

	analyzer := NewAnalyzer(issues)

	assert.NotNil(t, analyzer)
	assert.Len(t, analyzer.issues, 2)
}

func TestCalculateSummary_Empty(t *testing.T) {
	analyzer := NewAnalyzer([]jira.Issue{})
	stats := analyzer.calculateSummary()

	assert.Equal(t, 0, stats.TotalIssues)
	assert.Equal(t, 0, stats.OpenIssues)
	assert.Equal(t, 0, stats.InProgressIssues)
	assert.Equal(t, 0, stats.ClosedIssues)
	assert.Equal(t, 0.0, stats.AvgResolutionDays)
	assert.Equal(t, 0.0, stats.TotalStoryPoints)
}

func TestCalculateSummary_BasicStats(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Status: "To Do", StoryPoints: 3.0},
		{Key: "TEST-2", Status: "In Progress", StoryPoints: 5.0},
		{Key: "TEST-3", Status: "Done", StoryPoints: 8.0},
		{Key: "TEST-4", Status: "Production Release", StoryPoints: 13.0},
	}

	analyzer := NewAnalyzer(issues)
	stats := analyzer.calculateSummary()

	assert.Equal(t, 4, stats.TotalIssues)
	assert.Equal(t, 2, stats.InProgressIssues, "To Do and In Progress should count")
	assert.Equal(t, 2, stats.ClosedIssues, "Done and Production Release should count")
	assert.Equal(t, 2, stats.OpenIssues, "To Do and In Progress are open")
	assert.Equal(t, 29.0, stats.TotalStoryPoints)
	assert.Equal(t, 8.0, stats.InProgressStoryPoints, "To Do (3) + In Progress (5)")
	assert.Equal(t, 21.0, stats.ClosedStoryPoints, "Done (8) + Production Release (13)")
}

func TestCalculateSummary_AvgResolutionDays(t *testing.T) {
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	issues := []jira.Issue{
		{
			Key:    "TEST-1",
			Status: "Done",
			StatusHistory: []jira.StatusHistory{
				{Status: "In Progress", Timestamp: baseTime},
				{Status: "QA Review", Timestamp: baseTime.Add(48 * time.Hour)}, // 2 days
			},
		},
		{
			Key:    "TEST-2",
			Status: "Production Release",
			StatusHistory: []jira.StatusHistory{
				{Status: "In Progress", Timestamp: baseTime},
				{Status: "QA Review", Timestamp: baseTime.Add(96 * time.Hour)}, // 4 days
			},
		},
	}

	analyzer := NewAnalyzer(issues)
	stats := analyzer.calculateSummary()

	// Average = (2 + 4) / 2 = 3 days
	assert.InDelta(t, 3.0, stats.AvgResolutionDays, 0.1)
}

func TestCalculateStatusBreakdown(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Status: "To Do"},
		{Key: "TEST-2", Status: "To Do"},
		{Key: "TEST-3", Status: "In Progress"},
		{Key: "TEST-4", Status: "Done"},
		{Key: "TEST-5", Status: "Done"},
		{Key: "TEST-6", Status: "Done"},
	}

	analyzer := NewAnalyzer(issues)
	breakdown := analyzer.calculateStatusBreakdown()

	assert.Equal(t, 2, breakdown["To Do"])
	assert.Equal(t, 1, breakdown["In Progress"])
	assert.Equal(t, 3, breakdown["Done"])
}

func TestCalculatePriorityBreakdown(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Priority: "High"},
		{Key: "TEST-2", Priority: "High"},
		{Key: "TEST-3", Priority: "Medium"},
		{Key: "TEST-4", Priority: "Low"},
	}

	analyzer := NewAnalyzer(issues)
	breakdown := analyzer.calculatePriorityBreakdown()

	assert.Equal(t, 2, breakdown["High"])
	assert.Equal(t, 1, breakdown["Medium"])
	assert.Equal(t, 1, breakdown["Low"])
}

func TestCalculateTypeBreakdown(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", IssueType: "Story"},
		{Key: "TEST-2", IssueType: "Story"},
		{Key: "TEST-3", IssueType: "Bug"},
		{Key: "TEST-4", IssueType: "Task"},
	}

	analyzer := NewAnalyzer(issues)
	breakdown := analyzer.calculateTypeBreakdown()

	assert.Equal(t, 2, breakdown["Story"])
	assert.Equal(t, 1, breakdown["Bug"])
	assert.Equal(t, 1, breakdown["Task"])
}

func TestCalculateAssigneeStats_Basic(t *testing.T) {
	resolvedTime := time.Date(2024, 1, 5, 10, 0, 0, 0, time.UTC)

	issues := []jira.Issue{
		{
			Key:              "TEST-1",
			Assignee:         "John Doe",
			Status:           "Production Release",
			StoryPoints:      5.0,
			Created:          time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
			Resolved:         &resolvedTime,
			DevelopmentTimeDays: 3.0,
			InProgressToQADays:  1.0,
		},
		{
			Key:              "TEST-2",
			Assignee:         "John Doe",
			Status:           "In Progress",
			StoryPoints:      8.0,
			DevelopmentTimeDays: 2.0,
			InProgressToQADays:  0.5,
		},
		{
			Key:              "TEST-3",
			Assignee:         "Jane Smith",
			Status:           "Done",
			StoryPoints:      3.0,
			DevelopmentTimeDays: 4.0,
			InProgressToQADays:  2.0,
		},
	}

	analyzer := NewAnalyzer(issues)
	stats := analyzer.calculateAssigneeStats()

	assert.Len(t, stats, 2)

	// John Doe should be first (2 issues > 1 issue)
	john := stats[0]
	assert.Equal(t, "John Doe", john.Name)
	assert.Equal(t, 2, john.TotalIssues)
	assert.Equal(t, 1, john.ClosedIssues)
	assert.Equal(t, 1, john.OpenIssues)
	assert.Equal(t, 13.0, john.TotalStoryPoints)
	assert.InDelta(t, 2.5, john.AvgDevelopmentTimeDays, 0.1) // (3.0 + 2.0) / 2
	assert.InDelta(t, 0.75, john.AvgInProgressToQADays, 0.1) // (1.0 + 0.5) / 2

	// Jane Smith
	jane := stats[1]
	assert.Equal(t, "Jane Smith", jane.Name)
	assert.Equal(t, 1, jane.TotalIssues)
	assert.Equal(t, 3.0, jane.TotalStoryPoints)
	assert.InDelta(t, 4.0, jane.AvgDevelopmentTimeDays, 0.1)
	assert.InDelta(t, 2.0, jane.AvgInProgressToQADays, 0.1)
}

func TestCalculateAssigneeStats_Unassigned(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Assignee: "", Status: "To Do", StoryPoints: 5.0},
		{Key: "TEST-2", Assignee: "", Status: "Done", StoryPoints: 3.0},
	}

	analyzer := NewAnalyzer(issues)
	stats := analyzer.calculateAssigneeStats()

	assert.Len(t, stats, 1)
	assert.Equal(t, "Unassigned", stats[0].Name)
	assert.Equal(t, 2, stats[0].TotalIssues)
	assert.Equal(t, 8.0, stats[0].TotalStoryPoints)
}

func TestCalculateAssigneeStats_StatusBreakdown(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Assignee: "John Doe", Status: "To Do"},
		{Key: "TEST-2", Assignee: "John Doe", Status: "To Do"},
		{Key: "TEST-3", Assignee: "John Doe", Status: "In Progress"},
		{Key: "TEST-4", Assignee: "John Doe", Status: "Done"},
	}

	analyzer := NewAnalyzer(issues)
	stats := analyzer.calculateAssigneeStats()

	assert.Len(t, stats, 1)
	assert.Equal(t, 2, stats[0].StatusBreakdown["To Do"])
	assert.Equal(t, 1, stats[0].StatusBreakdown["In Progress"])
	assert.Equal(t, 1, stats[0].StatusBreakdown["Done"])
}

func TestCalculateAssigneeStats_SortedByTotalIssues(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Assignee: "Alice", Status: "Done"},
		{Key: "TEST-2", Assignee: "Bob", Status: "Done"},
		{Key: "TEST-3", Assignee: "Bob", Status: "Done"},
		{Key: "TEST-4", Assignee: "Charlie", Status: "Done"},
		{Key: "TEST-5", Assignee: "Charlie", Status: "Done"},
		{Key: "TEST-6", Assignee: "Charlie", Status: "Done"},
	}

	analyzer := NewAnalyzer(issues)
	stats := analyzer.calculateAssigneeStats()

	assert.Len(t, stats, 3)
	assert.Equal(t, "Charlie", stats[0].Name) // 3 issues
	assert.Equal(t, "Bob", stats[1].Name)     // 2 issues
	assert.Equal(t, "Alice", stats[2].Name)   // 1 issue
}

func TestCalculateTimeline(t *testing.T) {
	date1 := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	date2 := time.Date(2024, 1, 2, 10, 0, 0, 0, time.UTC)
	date3 := time.Date(2024, 1, 3, 10, 0, 0, 0, time.UTC)
	resolvedDate1 := time.Date(2024, 1, 5, 10, 0, 0, 0, time.UTC)

	issues := []jira.Issue{
		{Key: "TEST-1", Created: date1, Resolved: &resolvedDate1},
		{Key: "TEST-2", Created: date1, Resolved: nil},
		{Key: "TEST-3", Created: date2, Resolved: nil},
		{Key: "TEST-4", Created: date3, Resolved: nil},
	}

	analyzer := NewAnalyzer(issues)
	timeline := analyzer.calculateTimeline()

	assert.Len(t, timeline, 4) // 3 created dates + 1 resolved date

	// Find the timeline point for date1 (2024-01-01)
	var day1 *TimelinePoint
	for i := range timeline {
		if timeline[i].Date == "2024-01-01" {
			day1 = &timeline[i]
			break
		}
	}
	assert.NotNil(t, day1)
	assert.Equal(t, 2, day1.Created, "Two issues created on day 1")

	// Find the timeline point for resolved date
	var day5 *TimelinePoint
	for i := range timeline {
		if timeline[i].Date == "2024-01-05" {
			day5 = &timeline[i]
			break
		}
	}
	assert.NotNil(t, day5)
	assert.Equal(t, 1, day5.Closed, "One issue resolved on day 5")

	// Verify timeline is sorted by date
	assert.Equal(t, "2024-01-01", timeline[0].Date)
	assert.Equal(t, "2024-01-05", timeline[len(timeline)-1].Date)
}

func TestCalculateSprintMetrics(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Status: "Done", StoryPoints: 5.0},
		{Key: "TEST-2", Status: "Closed", StoryPoints: 8.0},
		{Key: "TEST-3", Status: "In Progress", StoryPoints: 3.0},
		{Key: "TEST-4", Status: "To Do", StoryPoints: 13.0},
	}

	analyzer := NewAnalyzer(issues)
	metrics := analyzer.calculateSprintMetrics()

	assert.Equal(t, 29.0, metrics.TotalStoryPoints)
	assert.Equal(t, 13.0, metrics.CompletedStoryPoints) // Done (5) + Closed (8)
	assert.Equal(t, 13.0, metrics.Velocity)
}

func TestGetRecentIssues(t *testing.T) {
	date1 := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	date2 := time.Date(2024, 1, 2, 10, 0, 0, 0, time.UTC)
	date3 := time.Date(2024, 1, 3, 10, 0, 0, 0, time.UTC)

	issues := []jira.Issue{
		{Key: "TEST-1", Updated: date1},
		{Key: "TEST-2", Updated: date3},
		{Key: "TEST-3", Updated: date2},
	}

	analyzer := NewAnalyzer(issues)

	t.Run("Get all issues (limit 0)", func(t *testing.T) {
		recent := analyzer.getRecentIssues(0)
		assert.Len(t, recent, 3)
		assert.Equal(t, "TEST-2", recent[0].Key) // Most recent
		assert.Equal(t, "TEST-3", recent[1].Key)
		assert.Equal(t, "TEST-1", recent[2].Key) // Oldest
	})

	t.Run("Get limited issues", func(t *testing.T) {
		recent := analyzer.getRecentIssues(2)
		assert.Len(t, recent, 2)
		assert.Equal(t, "TEST-2", recent[0].Key)
		assert.Equal(t, "TEST-3", recent[1].Key)
	})
}

func TestFilterByDateRange(t *testing.T) {
	date1 := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	date2 := time.Date(2024, 1, 5, 10, 0, 0, 0, time.UTC)
	date3 := time.Date(2024, 1, 10, 10, 0, 0, 0, time.UTC)

	issues := []jira.Issue{
		{Key: "TEST-1", Created: date1},
		{Key: "TEST-2", Created: date2},
		{Key: "TEST-3", Created: date3},
	}

	analyzer := NewAnalyzer(issues)

	// Filter between Jan 2 and Jan 7 (After Jan 2 and Before Jan 7, so only TEST-2 at Jan 5 should match)
	start := time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC)
	end := time.Date(2024, 1, 7, 0, 0, 0, 0, time.UTC)

	filtered := analyzer.FilterByDateRange(start, end)

	assert.Len(t, filtered, 1)
	assert.Equal(t, "TEST-2", filtered[0].Key)
}

func TestFilterBySprint(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Sprint: "Sprint 1"},
		{Key: "TEST-2", Sprint: "Sprint 1"},
		{Key: "TEST-3", Sprint: "Sprint 2"},
		{Key: "TEST-4", Sprint: "Sprint 3"},
	}

	analyzer := NewAnalyzer(issues)
	filtered := analyzer.FilterBySprint("Sprint 1")

	assert.Len(t, filtered, 2)
	assert.Equal(t, "TEST-1", filtered[0].Key)
	assert.Equal(t, "TEST-2", filtered[1].Key)
}

func TestAnalyze_ComprehensiveIntegration(t *testing.T) {
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	resolvedTime := time.Date(2024, 1, 5, 10, 0, 0, 0, time.UTC)

	issues := []jira.Issue{
		{
			Key:         "TEST-1",
			Summary:     "Test Story 1",
			Status:      "Done",
			Priority:    "High",
			IssueType:   "Story",
			Assignee:    "John Doe",
			StoryPoints: 5.0,
			Created:     baseTime,
			Updated:     baseTime.Add(96 * time.Hour),
			Resolved:    &resolvedTime,
			Sprint:      "Sprint 1",
			StatusHistory: []jira.StatusHistory{
				{Status: "In Progress", Timestamp: baseTime},
				{Status: "QA Review", Timestamp: baseTime.Add(48 * time.Hour)},
			},
			DevelopmentTimeDays: 3.0,
			InProgressToQADays:  1.0,
		},
		{
			Key:         "TEST-2",
			Summary:     "Test Bug 1",
			Status:      "In Progress",
			Priority:    "Medium",
			IssueType:   "Bug",
			Assignee:    "Jane Smith",
			StoryPoints: 3.0,
			Created:     baseTime.Add(24 * time.Hour),
			Updated:     baseTime.Add(48 * time.Hour),
			Sprint:      "Sprint 1",
		},
	}

	analyzer := NewAnalyzer(issues)
	data := analyzer.Analyze()

	// Verify summary
	assert.Equal(t, 2, data.Summary.TotalIssues)
	assert.Equal(t, 1, data.Summary.InProgressIssues)
	assert.Equal(t, 1, data.Summary.ClosedIssues)
	assert.Equal(t, 8.0, data.Summary.TotalStoryPoints)

	// Verify breakdowns
	assert.Equal(t, 1, data.StatusBreakdown["Done"])
	assert.Equal(t, 1, data.StatusBreakdown["In Progress"])
	assert.Equal(t, 1, data.PriorityBreakdown["High"])
	assert.Equal(t, 1, data.PriorityBreakdown["Medium"])
	assert.Equal(t, 1, data.TypeBreakdown["Story"])
	assert.Equal(t, 1, data.TypeBreakdown["Bug"])

	// Verify assignee stats
	assert.Len(t, data.AssigneeStats, 2)
	assert.Equal(t, "John Doe", data.AssigneeStats[0].Name)
	assert.Equal(t, "Jane Smith", data.AssigneeStats[1].Name)

	// Verify timeline
	assert.NotEmpty(t, data.Timeline)

	// Verify sprint metrics
	assert.Equal(t, 8.0, data.SprintMetrics.TotalStoryPoints)
	assert.Equal(t, 5.0, data.SprintMetrics.CompletedStoryPoints)

	// Verify all issues are included
	assert.Len(t, data.AllIssues, 2)
	assert.Len(t, data.RecentIssues, 2)
}

func TestCalculateSummary_AllStatusCategories(t *testing.T) {
	issues := []jira.Issue{
		{Key: "TEST-1", Status: "To Do", StoryPoints: 1.0},
		{Key: "TEST-2", Status: "ToDo", StoryPoints: 1.0},
		{Key: "TEST-3", Status: "In Progress", StoryPoints: 2.0},
		{Key: "TEST-4", Status: "Failed", StoryPoints: 2.0},
		{Key: "TEST-5", Status: "Code Review", StoryPoints: 3.0},
		{Key: "TEST-6", Status: "QA Review", StoryPoints: 3.0},
		{Key: "TEST-7", Status: "Schedule Release", StoryPoints: 5.0},
		{Key: "TEST-8", Status: "Production Release", StoryPoints: 5.0},
		{Key: "TEST-9", Status: "Done", StoryPoints: 8.0},
		{Key: "TEST-10", Status: "Closed", StoryPoints: 8.0},
	}

	analyzer := NewAnalyzer(issues)
	stats := analyzer.calculateSummary()

	assert.Equal(t, 10, stats.TotalIssues)

	// In Progress: To Do, ToDo, In Progress, Failed, Code Review, QA Review (6 issues)
	assert.Equal(t, 6, stats.InProgressIssues)
	assert.Equal(t, 12.0, stats.InProgressStoryPoints) // 1+1+2+2+3+3

	// Closed: Schedule Release, Production Release, Done, Closed (4 issues)
	assert.Equal(t, 4, stats.ClosedIssues)
	assert.Equal(t, 26.0, stats.ClosedStoryPoints) // 5+5+8+8

	// Open: Everything except closed (6 issues)
	assert.Equal(t, 6, stats.OpenIssues)
	assert.Equal(t, 12.0, stats.OpenStoryPoints)
}
