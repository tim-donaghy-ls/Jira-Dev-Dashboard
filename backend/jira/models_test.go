package jira

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCalculateDevelopmentMetrics_EmptyHistory(t *testing.T) {
	qaTime, devTime := CalculateDevelopmentMetrics([]StatusHistory{})

	assert.Equal(t, 0.0, qaTime)
	assert.Equal(t, 0.0, devTime)
}

func TestCalculateDevelopmentMetrics_SimpleFlow(t *testing.T) {
	// Simple flow: To Do -> In Progress -> Code Review -> Done
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "Code Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"},
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "Code Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime, "Should have no QA time")
	assert.InDelta(t, 3.0, devTime, 0.1, "Development time should be ~3 days (To Do to Code Review)")
}

func TestCalculateDevelopmentMetrics_WithQA(t *testing.T) {
	// Flow: To Do -> In Progress -> QA Review -> Done
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "QA Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"},
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "QA Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.InDelta(t, 1.0, qaTime, 0.1, "QA time should be ~1 day (QA Review to Done)")
	assert.InDelta(t, 3.0, devTime, 0.1, "Development time should be ~3 days (To Do to QA Review)")
}

func TestCalculateDevelopmentMetrics_MultipleQASessions(t *testing.T) {
	// Flow with multiple QA sessions: To Do -> In Progress -> QA -> In Progress -> QA -> Done
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "QA Review", Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "In Progress"}, // First QA session
		{Status: "In Progress", Timestamp: baseTime.Add(60 * time.Hour), FromStatus: "QA Review"}, // Back to dev (12 hours)
		{Status: "QA Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"}, // Second QA session
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "QA Review"},       // 24 hours in QA
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	// Total QA time = 12 hours (0.5 days) + 24 hours (1 day) = 1.5 days
	assert.InDelta(t, 1.5, qaTime, 0.1, "QA time should be ~1.5 days (cumulative)")
	// Development time = From To Do (0h) to last QA Review (72h) = 72 hours = 3 days
	assert.InDelta(t, 3.0, devTime, 0.1, "Development time should be ~3 days (To Do to last QA Review)")
}

func TestCalculateDevelopmentMetrics_CodeReviewAndQA(t *testing.T) {
	// Flow: To Do -> In Progress -> Code Review -> QA -> Done
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "Code Review", Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "In Progress"},
		{Status: "QA Review", Timestamp: baseTime.Add(60 * time.Hour), FromStatus: "Code Review"},
		{Status: "Done", Timestamp: baseTime.Add(84 * time.Hour), FromStatus: "QA Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.InDelta(t, 1.0, qaTime, 0.1, "QA time should be ~1 day")
	assert.InDelta(t, 2.5, devTime, 0.1, "Development time should be ~2.5 days (To Do to QA Review, which is later)")
}

func TestCalculateDevelopmentMetrics_CodeReviewAfterQA(t *testing.T) {
	// Flow where Code Review happens after QA (unusual but possible): To Do -> QA -> Code Review -> Done
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "QA Review", Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "In Progress"},
		{Status: "Code Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "QA Review"},
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "Code Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.InDelta(t, 1.0, qaTime, 0.1, "QA time should be ~1 day")
	assert.InDelta(t, 3.0, devTime, 0.1, "Development time should use the later timestamp (Code Review)")
}

func TestCalculateDevelopmentMetrics_FallbackStartStatus(t *testing.T) {
	// Flow starting with "Open" instead of "To Do"
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "Open", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "Open"},
		{Status: "Code Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"},
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "Code Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime)
	assert.InDelta(t, 3.0, devTime, 0.1, "Should use Open as start time when To Do is absent")
}

func TestCalculateDevelopmentMetrics_BacklogStartStatus(t *testing.T) {
	// Flow starting with "Backlog"
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "Backlog", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "Backlog"},
		{Status: "Code Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"},
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "Code Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime)
	assert.InDelta(t, 3.0, devTime, 0.1, "Should use Backlog as start time when To Do is absent")
}

func TestCalculateDevelopmentMetrics_ToDoPreferredOverFallback(t *testing.T) {
	// Flow with both Open and To Do - should prefer To Do
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "Open", Timestamp: baseTime, FromStatus: ""},
		{Status: "To Do", Timestamp: baseTime.Add(12 * time.Hour), FromStatus: "Open"},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "Code Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"},
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "Code Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime)
	assert.InDelta(t, 2.5, devTime, 0.1, "Should use To Do as start time (not Open)")
}

func TestCalculateDevelopmentMetrics_MultipleCodeReviews(t *testing.T) {
	// Flow with multiple code reviews - should use the LAST one
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "Code Review", Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "In Progress"},
		{Status: "In Progress", Timestamp: baseTime.Add(60 * time.Hour), FromStatus: "Code Review"},
		{Status: "Code Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"},
		{Status: "Done", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "Code Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime)
	assert.InDelta(t, 3.0, devTime, 0.1, "Should use the LAST Code Review timestamp")
}

func TestCalculateDevelopmentMetrics_CurrentlyInQA(t *testing.T) {
	// Flow where issue is currently in QA (no status after QA)
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
		{Status: "QA Review", Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "In Progress"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime, "Should be 0 since ticket is still in QA with no subsequent status")
	assert.InDelta(t, 2.0, devTime, 0.1, "Development time should be ~2 days")
}

func TestCalculateDevelopmentMetrics_AllQAStatusTypes(t *testing.T) {
	// Test all QA status variations
	qaStatuses := []string{"QA Review", "QA", "Testing", "Ready for QA", "In Testing"}

	for _, qaStatus := range qaStatuses {
		t.Run("QA_Status_"+qaStatus, func(t *testing.T) {
			baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

			history := []StatusHistory{
				{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
				{Status: qaStatus, Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "To Do"},
				{Status: "Done", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: qaStatus},
			}

			qaTime, devTime := CalculateDevelopmentMetrics(history)

			assert.InDelta(t, 1.0, qaTime, 0.1, "QA time should be ~1 day for status: "+qaStatus)
			assert.InDelta(t, 2.0, devTime, 0.1, "Development time should be ~2 days for status: "+qaStatus)
		})
	}
}

func TestCalculateDevelopmentMetrics_AllCodeReviewStatusTypes(t *testing.T) {
	// Test all Code Review status variations
	reviewStatuses := []string{"Code Review", "In Review", "Review"}

	for _, reviewStatus := range reviewStatuses {
		t.Run("CodeReview_Status_"+reviewStatus, func(t *testing.T) {
			baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

			history := []StatusHistory{
				{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
				{Status: reviewStatus, Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "To Do"},
				{Status: "Done", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: reviewStatus},
			}

			qaTime, devTime := CalculateDevelopmentMetrics(history)

			assert.Equal(t, 0.0, qaTime, "Should have no QA time for status: "+reviewStatus)
			assert.InDelta(t, 2.0, devTime, 0.1, "Development time should be ~2 days for status: "+reviewStatus)
		})
	}
}

func TestCalculateDevelopmentMetrics_NoStartStatus(t *testing.T) {
	// Flow without any start status (no To Do, Open, or Backlog)
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "In Progress", Timestamp: baseTime, FromStatus: ""},
		{Status: "Code Review", Timestamp: baseTime.Add(48 * time.Hour), FromStatus: "In Progress"},
		{Status: "Done", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "Code Review"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime)
	assert.Equal(t, 0.0, devTime, "Should have 0 development time without a start status")
}

func TestCalculateDevelopmentMetrics_NoEndStatus(t *testing.T) {
	// Flow with To Do but no Code Review or QA
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "To Do", Timestamp: baseTime, FromStatus: ""},
		{Status: "In Progress", Timestamp: baseTime.Add(24 * time.Hour), FromStatus: "To Do"},
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	assert.Equal(t, 0.0, qaTime)
	assert.Equal(t, 0.0, devTime, "Should have 0 development time without an end status")
}

func TestCalculateDevelopmentMetrics_ComplexRealWorldScenario(t *testing.T) {
	// Complex real-world flow with multiple transitions
	baseTime := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	history := []StatusHistory{
		{Status: "Backlog", Timestamp: baseTime, FromStatus: ""},
		{Status: "To Do", Timestamp: baseTime.Add(12 * time.Hour), FromStatus: "Backlog"},
		{Status: "In Progress", Timestamp: baseTime.Add(36 * time.Hour), FromStatus: "To Do"},
		{Status: "Code Review", Timestamp: baseTime.Add(60 * time.Hour), FromStatus: "In Progress"},
		{Status: "In Progress", Timestamp: baseTime.Add(66 * time.Hour), FromStatus: "Code Review"}, // Changes requested
		{Status: "Code Review", Timestamp: baseTime.Add(72 * time.Hour), FromStatus: "In Progress"}, // Re-submitted
		{Status: "QA Review", Timestamp: baseTime.Add(76 * time.Hour), FromStatus: "Code Review"},
		{Status: "In Progress", Timestamp: baseTime.Add(84 * time.Hour), FromStatus: "QA Review"}, // Bug found (8 hours in QA)
		{Status: "QA Review", Timestamp: baseTime.Add(96 * time.Hour), FromStatus: "In Progress"}, // Back to QA
		{Status: "Done", Timestamp: baseTime.Add(120 * time.Hour), FromStatus: "QA Review"},       // Passed (24 hours in QA)
	}

	qaTime, devTime := CalculateDevelopmentMetrics(history)

	// QA time = 8 hours (0.33 days) + 24 hours (1 day) = ~1.33 days
	assert.InDelta(t, 1.33, qaTime, 0.1, "QA time should be ~1.33 days (two QA sessions)")

	// Development time = From To Do (12h) to LAST QA Review (96h) = 84 hours = 3.5 days
	assert.InDelta(t, 3.5, devTime, 0.1, "Development time should be ~3.5 days")
}
