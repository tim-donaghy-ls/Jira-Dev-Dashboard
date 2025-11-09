package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// TestResult represents the result of a single test or test suite
type TestResult struct {
	Name     string        `json:"name"`
	Status   string        `json:"status"` // "passed", "failed", "running", "skipped"
	Duration time.Duration `json:"duration"`
	Output   string        `json:"output,omitempty"`
	Error    string        `json:"error,omitempty"`
}

// TestSuiteResult represents results for a category of tests
type TestSuiteResult struct {
	Category       string       `json:"category"`       // "unit", "integration", "e2e"
	Type           string       `json:"type"`           // "backend", "frontend"
	TestType       string       `json:"testType"`       // "Unit Tests", "Frontend Tests", "E2E Tests"
	TotalTests     int          `json:"totalTests"`
	Passed         int          `json:"passed"`
	Failed         int          `json:"failed"`
	Duration       string       `json:"duration"`
	Coverage       string       `json:"coverage"`       // Coverage percentage
	CoverageFloat  float64      `json:"coverageFloat"`  // Coverage as float for sorting
	Tests          []TestResult `json:"tests"`
	Status         string       `json:"status"` // "passed", "failed", "running"
	StartedAt      time.Time    `json:"startedAt"`
	CompletedAt    *time.Time   `json:"completedAt,omitempty"`
}

// TestDashboardResponse represents the complete test dashboard data
type TestDashboardResponse struct {
	Suites       []TestSuiteResult `json:"suites"`
	OverallStats struct {
		TotalTests int    `json:"totalTests"`
		Passed     int    `json:"passed"`
		Failed     int    `json:"failed"`
		Status     string `json:"status"`
	} `json:"overallStats"`
	LastRun time.Time `json:"lastRun"`
}

// HandleTestDashboard returns the test dashboard data
func HandleTestDashboard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get test type from query parameter
	testType := r.URL.Query().Get("type")

	var response TestDashboardResponse
	response.LastRun = time.Now()

	// Run backend tests
	if testType == "" || testType == "backend" {
		backendSuite := runBackendTests()
		response.Suites = append(response.Suites, backendSuite)
	}

	// Run frontend tests
	if testType == "" || testType == "frontend" {
		frontendSuite := runFrontendTests()
		response.Suites = append(response.Suites, frontendSuite)
	}

	// Run E2E tests
	if testType == "" || testType == "e2e" {
		e2eSuite := runE2ETests()
		response.Suites = append(response.Suites, e2eSuite)
	}

	// Calculate overall stats
	for _, suite := range response.Suites {
		response.OverallStats.TotalTests += suite.TotalTests
		response.OverallStats.Passed += suite.Passed
		response.OverallStats.Failed += suite.Failed
	}

	if response.OverallStats.Failed > 0 {
		response.OverallStats.Status = "failed"
	} else if response.OverallStats.Passed > 0 {
		response.OverallStats.Status = "passed"
	} else {
		response.OverallStats.Status = "skipped"
	}

	json.NewEncoder(w).Encode(response)
}

func runBackendTests() TestSuiteResult {
	suite := TestSuiteResult{
		Category:  "unit",
		Type:      "backend",
		TestType:  "Backend Unit Tests",
		StartedAt: time.Now(),
		Status:    "running",
	}

	// Run go test with JSON output and coverage
	cmd := exec.Command("go", "test", "./...", "-json", "-v", "-cover")
	output, err := cmd.CombinedOutput()

	completedAt := time.Now()
	suite.CompletedAt = &completedAt
	suite.Duration = completedAt.Sub(suite.StartedAt).String()

	// Run coverage calculation
	coverageCmd := exec.Command("go", "test", "./...", "-cover")
	coverageOutput, _ := coverageCmd.CombinedOutput()
	suite.Coverage = extractCoverage(string(coverageOutput))

	if err != nil {
		suite.Status = "failed"
		suite.Tests = []TestResult{
			{
				Name:   "Backend Tests",
				Status: "failed",
				Error:  err.Error(),
				Output: string(output),
			},
		}
		return suite
	}

	// Parse JSON output
	lines := strings.Split(string(output), "\n")
	testMap := make(map[string]*TestResult)

	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}

		var testEvent struct {
			Time    time.Time `json:"Time"`
			Action  string    `json:"Action"`
			Package string    `json:"Package"`
			Test    string    `json:"Test"`
			Elapsed float64   `json:"Elapsed"`
			Output  string    `json:"Output"`
		}

		if err := json.Unmarshal([]byte(line), &testEvent); err != nil {
			continue
		}

		// Track test results
		if testEvent.Test != "" {
			key := testEvent.Package + "." + testEvent.Test

			if testMap[key] == nil {
				testMap[key] = &TestResult{
					Name: testEvent.Test,
				}
			}

			switch testEvent.Action {
			case "pass":
				testMap[key].Status = "passed"
				testMap[key].Duration = time.Duration(testEvent.Elapsed * float64(time.Second))
				suite.Passed++
				suite.TotalTests++
			case "fail":
				testMap[key].Status = "failed"
				testMap[key].Duration = time.Duration(testEvent.Elapsed * float64(time.Second))
				suite.Failed++
				suite.TotalTests++
			case "skip":
				testMap[key].Status = "skipped"
				suite.TotalTests++
			case "output":
				if testMap[key].Output == "" {
					testMap[key].Output = testEvent.Output
				} else {
					testMap[key].Output += testEvent.Output
				}
			}
		}
	}

	// Convert map to slice
	for _, test := range testMap {
		if test.Status != "" { // Only include tests with a final status
			suite.Tests = append(suite.Tests, *test)
		}
	}

	if suite.Failed > 0 {
		suite.Status = "failed"
	} else if suite.Passed > 0 {
		suite.Status = "passed"
	} else {
		suite.Status = "skipped"
	}

	return suite
}

func runFrontendTests() TestSuiteResult {
	suite := TestSuiteResult{
		Category:  "unit",
		Type:      "frontend",
		TestType:  "Frontend Unit Tests",
		StartedAt: time.Now(),
		Status:    "running",
	}

	// Run npm test with coverage from the frontend directory
	cmd := exec.Command("npm", "test", "--", "--run", "--reporter=json", "--coverage")
	cmd.Dir = "../frontend"
	rawOutput, err := cmd.CombinedOutput()

	completedAt := time.Now()
	suite.CompletedAt = &completedAt
	suite.Duration = completedAt.Sub(suite.StartedAt).String()

	// Extract coverage from coverage-summary.json
	suite.Coverage = extractVitestCoverage()

	// Parse coverage percentage to float for frontend display
	if suite.Coverage != "N/A" && suite.Coverage != "" {
		// Remove the % sign and parse to float
		coverageStr := strings.TrimSuffix(suite.Coverage, "%")
		if coverageFloat, parseErr := strconv.ParseFloat(coverageStr, 64); parseErr == nil {
			suite.CoverageFloat = coverageFloat
		}
	}

	if err != nil {
		suite.Status = "failed"
		suite.Tests = []TestResult{
			{
				Name:   "Frontend Tests",
				Status: "failed",
				Error:  err.Error(),
				Output: string(rawOutput),
			},
		}
		suite.TotalTests = 1
		suite.Failed = 1
		return suite
	}

	// Extract JSON from output (skip npm command echo and any trailing text)
	outputStr := string(rawOutput)
	jsonStart := strings.Index(outputStr, "{")
	var output []byte
	if jsonStart >= 0 {
		// Find the matching closing brace by counting braces
		braceCount := 0
		jsonEnd := -1
		for i := jsonStart; i < len(outputStr); i++ {
			if outputStr[i] == '{' {
				braceCount++
			} else if outputStr[i] == '}' {
				braceCount--
				if braceCount == 0 {
					jsonEnd = i + 1
					break
				}
			}
		}
		if jsonEnd > jsonStart {
			output = []byte(outputStr[jsonStart:jsonEnd])
		} else {
			output = []byte(outputStr[jsonStart:])
		}
	} else {
		output = rawOutput
	}

	// Parse Vitest JSON output
	var vitestResult struct {
		NumTotalTests   int  `json:"numTotalTests"`
		NumPassedTests  int  `json:"numPassedTests"`
		NumFailedTests  int  `json:"numFailedTests"`
		NumPendingTests int  `json:"numPendingTests"`
		Success         bool `json:"success"`
		TestResults     []struct {
			Name             string `json:"name"`
			Status           string `json:"status"`
			AssertionResults []struct {
				Title           string   `json:"title"`
				Status          string   `json:"status"`
				FullName        string   `json:"fullName"`
				FailureMessages []string `json:"failureMessages"`
			} `json:"assertionResults"`
		} `json:"testResults"`
	}

	// Try to parse JSON output
	if err := json.Unmarshal(output, &vitestResult); err != nil {
		log.Printf("Failed to parse Vitest JSON output: %v", err)
		log.Printf("JSON extraction - start: %d, length: %d", jsonStart, len(output))
		log.Printf("Output preview: %s", string(output[:min(len(output), 500)]))

		// If JSON parsing fails, try to parse line-by-line output
		lines := strings.Split(string(output), "\n")
		passed := 0
		failed := 0
		total := 0

		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.Contains(line, "✓") || strings.Contains(line, "PASS") {
				passed++
				total++
				suite.Tests = append(suite.Tests, TestResult{
					Name:   line,
					Status: "passed",
				})
			} else if strings.Contains(line, "✗") || strings.Contains(line, "FAIL") {
				failed++
				total++
				suite.Tests = append(suite.Tests, TestResult{
					Name:   line,
					Status: "failed",
				})
			}
		}

		suite.TotalTests = total
		suite.Passed = passed
		suite.Failed = failed

		if total == 0 {
			// No tests found, likely an error
			suite.Tests = []TestResult{
				{
					Name:   "Frontend Tests",
					Status: "skipped",
					Output: string(output),
				},
			}
			suite.Status = "skipped"
		} else if failed > 0 {
			suite.Status = "failed"
		} else {
			suite.Status = "passed"
		}

		return suite
	}

	// Use parsed JSON results
	suite.TotalTests = vitestResult.NumTotalTests
	suite.Passed = vitestResult.NumPassedTests
	suite.Failed = vitestResult.NumFailedTests

	for _, testFile := range vitestResult.TestResults {
		for _, assertion := range testFile.AssertionResults {
			result := TestResult{
				Name:   assertion.FullName,
				Status: assertion.Status,
			}

			if len(assertion.FailureMessages) > 0 {
				result.Error = strings.Join(assertion.FailureMessages, "\n")
			}

			suite.Tests = append(suite.Tests, result)
		}
	}

	if suite.Failed > 0 {
		suite.Status = "failed"
	} else if suite.Passed > 0 {
		suite.Status = "passed"
	} else {
		suite.Status = "skipped"
	}

	return suite
}

func runE2ETests() TestSuiteResult {
	suite := TestSuiteResult{
		Category:  "e2e",
		Type:      "frontend",
		TestType:  "Playwright E2E Tests",
		StartedAt: time.Now(),
		Status:    "running",
	}

	// Run Playwright tests from the frontend directory
	cmd := exec.Command("npx", "playwright", "test")
	cmd.Dir = "../frontend"
	cmdOutput, err := cmd.CombinedOutput()

	completedAt := time.Now()
	suite.CompletedAt = &completedAt
	suite.Duration = completedAt.Sub(suite.StartedAt).String()

	// E2E tests don't have built-in coverage
	suite.Coverage = "N/A"

	// Read the JSON results file
	jsonFile := "../frontend/test-results/results.json"
	output, jsonErr := os.ReadFile(jsonFile)
	if jsonErr != nil {
		log.Printf("Failed to read Playwright results file: %v", jsonErr)
		// Fall back to command output
		output = cmdOutput
	}

	if err != nil {
		suite.Status = "failed"
		suite.Tests = []TestResult{
			{
				Name:   "Playwright E2E Tests",
				Status: "failed",
				Error:  err.Error(),
				Output: string(output),
			},
		}
		suite.TotalTests = 1
		suite.Failed = 1
		return suite
	}

	// Parse Playwright JSON output
	var playwrightResult struct {
		Stats struct {
			Expected   int `json:"expected"`
			Unexpected int `json:"unexpected"`
			Skipped    int `json:"skipped"`
			Flaky      int `json:"flaky"`
		} `json:"stats"`
		Suites []struct {
			Title  string `json:"title"`
			Suites []struct {
				Title string `json:"title"`
				Specs []struct {
					Title string `json:"title"`
					Ok    bool   `json:"ok"`
					Tests []struct {
						Results []struct {
							Status   string `json:"status"`
							Duration int    `json:"duration"`
							Error    struct {
								Message string `json:"message"`
							} `json:"error,omitempty"`
						} `json:"results"`
					} `json:"tests"`
				} `json:"specs"`
			} `json:"suites"`
		} `json:"suites"`
	}

	if err := json.Unmarshal(output, &playwrightResult); err != nil {
		log.Printf("Failed to parse Playwright JSON output: %v", err)
		suite.Status = "skipped"
		suite.Tests = []TestResult{
			{
				Name:   "Playwright E2E Tests",
				Status: "skipped",
				Output: string(output),
			},
		}
		return suite
	}

	// Use stats from Playwright report
	suite.TotalTests = playwrightResult.Stats.Expected + playwrightResult.Stats.Unexpected
	suite.Passed = playwrightResult.Stats.Expected
	suite.Failed = playwrightResult.Stats.Unexpected

	// Process test results from nested structure
	for _, topSuite := range playwrightResult.Suites {
		for _, nestedSuite := range topSuite.Suites {
			for _, spec := range nestedSuite.Specs {
				for _, test := range spec.Tests {
					for _, result := range test.Results {
						testResult := TestResult{
							Name:     spec.Title,
							Duration: time.Duration(result.Duration) * time.Millisecond,
						}

						switch result.Status {
						case "passed":
							testResult.Status = "passed"
						case "failed":
							testResult.Status = "failed"
							testResult.Error = result.Error.Message
						case "skipped", "timedOut":
							testResult.Status = "skipped"
						default:
							testResult.Status = result.Status
						}

						suite.Tests = append(suite.Tests, testResult)
					}
				}
			}
		}
	}

	if suite.Failed > 0 {
		suite.Status = "failed"
	} else if suite.Passed > 0 {
		suite.Status = "passed"
	} else {
		suite.Status = "skipped"
	}

	return suite
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// extractCoverage extracts coverage percentage from go test output
func extractCoverage(output string) string {
	lines := strings.Split(output, "\n")
	var coverages []float64

	for _, line := range lines {
		if strings.Contains(line, "coverage:") {
			// Extract percentage from line like "coverage: 85.7% of statements"
			parts := strings.Split(line, "coverage:")
			if len(parts) > 1 {
				percentPart := strings.TrimSpace(parts[1])
				percentStr := strings.Split(percentPart, "%")[0]
				percentStr = strings.TrimSpace(percentStr)

				if percent, err := strconv.ParseFloat(percentStr, 64); err == nil {
					coverages = append(coverages, percent)
				}
			}
		}
	}

	if len(coverages) == 0 {
		return "N/A"
	}

	// Calculate average coverage
	var sum float64
	for _, cov := range coverages {
		sum += cov
	}
	avgCoverage := sum / float64(len(coverages))

	return fmt.Sprintf("%.1f%%", avgCoverage)
}

// extractVitestCoverage extracts coverage from Vitest coverage report
func extractVitestCoverage() string {
	// Read coverage-summary.json from frontend coverage directory
	coverageFile := "../frontend/coverage/coverage-summary.json"
	data, err := os.ReadFile(coverageFile)
	if err != nil {
		log.Printf("Failed to read coverage file: %v", err)
		return "N/A"
	}

	var coverageData struct {
		Total struct {
			Lines struct {
				Pct float64 `json:"pct"`
			} `json:"lines"`
			Statements struct {
				Pct float64 `json:"pct"`
			} `json:"statements"`
			Functions struct {
				Pct float64 `json:"pct"`
			} `json:"functions"`
			Branches struct {
				Pct float64 `json:"pct"`
			} `json:"branches"`
		} `json:"total"`
	}

	if err := json.Unmarshal(data, &coverageData); err != nil {
		log.Printf("Failed to parse coverage JSON: %v", err)
		return "N/A"
	}

	// Use statements coverage as the primary metric
	return fmt.Sprintf("%.1f%%", coverageData.Total.Statements.Pct)
}
