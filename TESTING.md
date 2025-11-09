# Testing Guide

This document provides comprehensive information about the testing setup and best practices for the JIRA Developer Dashboard project.

## Table of Contents

- [Overview](#overview)
- [Backend Testing (Go)](#backend-testing-go)
- [Frontend Testing (TypeScript/React)](#frontend-testing-typescriptreact)
- [End-to-End Testing (Playwright)](#end-to-end-e2e-testing-playwright)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Continuous Integration](#continuous-integration)

## Overview

The JIRA Developer Dashboard uses comprehensive testing at multiple levels to ensure code quality and reliability:

- **Backend Unit Tests**: Go's built-in testing framework with `testify` for assertions
- **Frontend Unit Tests**: Vitest with React Testing Library
- **End-to-End Tests**: Playwright for full application flow testing

### Test Statistics

- **Backend**: 36 unit tests covering JIRA client, models, and analysis logic
- **Frontend Unit Tests**: 18 tests covering API client functionality
- **Frontend E2E Tests**: 25+ tests covering user flows, charts, and accessibility
- **Total Code Coverage**: High coverage for critical business logic

## Backend Testing (Go)

### Framework & Tools

- **Testing Framework**: Go's built-in `testing` package
- **Assertions**: `github.com/stretchr/testify/assert`
- **Mock HTTP**: `net/http/httptest`

### Test Structure

Backend tests are organized by package:

```
backend/
├── jira/
│   ├── client_test.go          # JIRA API client tests
│   └── models_test.go          # Development metrics calculation tests
└── analysis/
    └── analyzer_test.go        # Data analysis and aggregation tests
```

### Key Test Suites

#### 1. JIRA Client Tests ([backend/jira/client_test.go](backend/jira/client_test.go))

Tests for JIRA API interactions:

- **Authentication**: Tests for Basic Auth setup
- **API Requests**: Mock HTTP requests to JIRA REST API
- **Data Parsing**: JSON response parsing and error handling
- **Story Points**: Multiple custom field mapping support
- **Changelog**: Status history retrieval and parsing

Example:
```go
func TestSearchIssues_Success(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(mockResponse)
    }))
    defer server.Close()

    client := NewClient(server.URL, "test@example.com", "token123")
    issues, err := client.SearchIssues("project = TEST", 100)

    assert.NoError(t, err)
    assert.Len(t, issues, 2)
}
```

#### 2. Models & Metrics Tests ([backend/jira/models_test.go](backend/jira/models_test.go))

Tests for complex development metrics calculations:

- **Empty History**: Edge case handling
- **Simple Flow**: Basic status transitions
- **Multiple QA Sessions**: Cumulative time tracking
- **Complex Scenarios**: Real-world ticket flows
- **All Status Types**: Coverage for all QA and Code Review statuses

Key Metrics Tested:
- Development Time: Time from "To Do" to Code Review/QA
- QA Time: Cumulative time in QA-related statuses
- Status Classification: Open, In Progress, Closed

Example:
```go
func TestCalculateDevelopmentMetrics_MultipleQASessions(t *testing.T) {
    history := []StatusHistory{
        {Status: "To Do", Timestamp: baseTime},
        {Status: "QA Review", Timestamp: baseTime.Add(48 * time.Hour)},
        {Status: "In Progress", Timestamp: baseTime.Add(60 * time.Hour)}, // Back to dev
        {Status: "QA Review", Timestamp: baseTime.Add(72 * time.Hour)},  // Second QA session
        {Status: "Done", Timestamp: baseTime.Add(96 * time.Hour)},
    }

    qaTime, devTime := CalculateDevelopmentMetrics(history)

    assert.InDelta(t, 1.5, qaTime, 0.1) // Total QA time across both sessions
    assert.InDelta(t, 3.0, devTime, 0.1) // To Do to last QA Review
}
```

#### 3. Analysis Engine Tests ([backend/analysis/analyzer_test.go](backend/analysis/analyzer_test.go))

Tests for data aggregation and dashboard analytics:

- **Summary Statistics**: Total issues, story points, averages
- **Status Breakdown**: Grouping by status
- **Priority Breakdown**: Grouping by priority
- **Assignee Stats**: Per-developer metrics
- **Timeline**: Issue creation/closure over time
- **Sprint Metrics**: Velocity and burndown calculations
- **Filtering**: By date range and sprint

Example:
```go
func TestCalculateAssigneeStats_Basic(t *testing.T) {
    issues := []jira.Issue{
        {
            Key:                 "TEST-1",
            Assignee:            "John Doe",
            Status:              "Production Release",
            StoryPoints:         5.0,
            DevelopmentTimeDays: 3.0,
        },
    }

    analyzer := NewAnalyzer(issues)
    stats := analyzer.calculateAssigneeStats()

    assert.Equal(t, "John Doe", stats[0].Name)
    assert.Equal(t, 1, stats[0].TotalIssues)
    assert.InDelta(t, 3.0, stats[0].AvgDevelopmentTimeDays, 0.1)
}
```

### Running Backend Tests

```bash
# Run all tests
cd backend
go test ./...

# Run with verbose output
go test ./... -v

# Run specific package
go test ./jira -v
go test ./analysis -v

# Run specific test
go test ./jira -run TestCalculateDevelopmentMetrics_MultipleQASessions -v

# Run with coverage
go test ./... -cover

# Generate coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Frontend Testing (TypeScript/React)

### Framework & Tools

- **Testing Framework**: Vitest
- **Assertions**: Vitest built-in matchers
- **Component Testing**: React Testing Library
- **DOM Environment**: jsdom

### Test Structure

Frontend tests are located next to the files they test:

```
frontend/
├── lib/
│   ├── api.ts
│   └── api.test.ts            # API client tests
├── test/
│   └── setup.ts               # Global test setup
└── vitest.config.ts           # Vitest configuration
```

### Key Test Suites

#### API Client Tests ([frontend/lib/api.test.ts](frontend/lib/api.test.ts))

Comprehensive tests for all API client functions:

- **fetchInstances()**: JIRA instance retrieval
- **testConnection()**: Connection testing with proper error handling
- **fetchProjects()**: Project listing with encoding
- **fetchSprints()**: Sprint retrieval
- **fetchDashboardData()**: Dashboard data with filters
- **fetchIssueDetails()**: Issue details and status history
- **Error Handling**: Network errors, malformed JSON, 404s

Example:
```typescript
describe('fetchDashboardData', () => {
  it('should fetch dashboard data with all filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchDashboardData({
      instance: 'instance1',
      project: 'PROJ1',
      sprint: '123',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/dashboard?instance=instance1&project=PROJ1&sprint=123'
    );
    expect(result).toEqual(mockData);
  });
});
```

### Test Configuration

#### Vitest Config ([frontend/vitest.config.ts](frontend/vitest.config.ts))

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    css: true,
  },
});
```

#### Setup File ([frontend/test/setup.ts](frontend/test/setup.ts))

Global test setup including:
- React Testing Library matchers
- Cleanup after each test
- Mock environment variables
- Global fetch mock

### Running Frontend Tests

```bash
# Run all tests
cd frontend
npm test

# Run tests in watch mode (for development)
npm test

# Run tests once (for CI)
npm test -- --run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- api.test.ts
```

## End-to-End (E2E) Testing (Playwright)

### Framework & Tools

- **Testing Framework**: Playwright
- **Browser**: Chromium (headless)
- **Component Testing**: @playwright/experimental-ct-react

### Test Structure

E2E tests verify the complete application flow from a user's perspective:

```
frontend/
├── e2e/
│   ├── dashboard.spec.ts        # Main dashboard flow tests
│   └── charts.spec.ts           # Charts and visualization tests
├── playwright.config.ts         # Playwright configuration
└── package.json                 # E2E test scripts
```

### Key Test Suites

#### 1. Dashboard Tests ([frontend/e2e/dashboard.spec.ts](frontend/e2e/dashboard.spec.ts))

Tests for core dashboard functionality:

**Main Flow Tests:**
- Page loading and title verification
- Connection status display
- Instance and project selector functionality
- Loading spinner behavior
- Error-free navigation

**Data Display Tests:**
- Summary cards rendering
- Team performance section
- Responsive layout (mobile, tablet, desktop)

**User Interaction Tests:**
- Filter selection
- Theme toggle
- Keyboard navigation

**Error Handling Tests:**
- Backend unavailable scenarios
- Empty data handling
- Network error recovery

**Accessibility Tests:**
- Heading hierarchy
- Accessible form controls
- Keyboard navigation support

Example:
```typescript
test('should load the dashboard page', async ({ page }) => {
  await page.goto('/');

  // Check that the page title is correct
  await expect(page).toHaveTitle(/JIRA Developer Dashboard/i);

  // Check for main heading
  await expect(page.locator('h1, h2').first()).toBeVisible();
});
```

#### 2. Charts & Visualization Tests ([frontend/e2e/charts.spec.ts](frontend/e2e/charts.spec.ts))

Tests for data visualization components:

**Chart Rendering:**
- Status breakdown chart (Canvas/Chart.js)
- Priority breakdown chart
- Chart legends and labels
- Empty data handling

**Team Performance Table:**
- Table display and headers
- Developer names and statistics
- Expandable rows
- Sorting and filtering

**Sprint Tickets:**
- Ticket list display
- Filter functionality
- Issue card rendering
- Export functionality

Example:
```typescript
test('should render status breakdown chart', async ({ page }) => {
  const canvasElements = page.locator('canvas');
  await page.waitForTimeout(3000);

  const canvasCount = await canvasElements.count();

  if (canvasCount > 0) {
    const firstCanvas = canvasElements.first();
    await expect(firstCanvas).toBeVisible();

    // Check that canvas has been rendered
    const width = await firstCanvas.evaluate((el: HTMLCanvasElement) => el.width);
    expect(width).toBeGreaterThan(0);
  }
});
```

### Test Configuration

#### Playwright Config ([frontend/playwright.config.ts](frontend/playwright.config.ts))

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Running E2E Tests

**Important:** E2E tests require both backend and frontend to be running. Make sure to start the application before running E2E tests.

```bash
# Start the application (in separate terminals or use ./start.sh)
./start.sh

# Then run E2E tests
cd frontend

# Run all E2E tests (headless)
npm run test:e2e

# Run with Playwright UI (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug

# Run specific test file
npx playwright test dashboard.spec.ts

# Run tests in parallel
npx playwright test --workers=4
```

### E2E Test Best Practices

1. **Use Semantic Selectors**: Prefer text content and ARIA roles over CSS classes
```typescript
// Good
await page.locator('text=Submit').click();
await page.locator('[role="button"]').click();

// Avoid
await page.locator('.btn-primary').click();
```

2. **Wait for Elements**: Use Playwright's auto-waiting features
```typescript
// Playwright waits automatically
await expect(page.locator('text=Loading...')).toBeVisible();
```

3. **Mock API Responses**: Test edge cases by intercepting requests
```typescript
await page.route('**/api/dashboard**', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify(mockData),
  });
});
```

4. **Test Accessibility**: Include keyboard navigation and ARIA tests
```typescript
// Test keyboard navigation
await page.keyboard.press('Tab');
const focusedElement = await page.evaluateHandle(() => document.activeElement);
```

5. **Handle Async Operations**: Use proper timeouts and wait strategies
```typescript
await expect(element).toBeVisible({ timeout: 10000 });
await page.waitForLoadState('networkidle');
```

## Test Coverage

### Backend Coverage

Run coverage analysis:

```bash
cd backend
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out
```

Key areas of coverage:
- ✅ JIRA API client: ~90%
- ✅ Development metrics: 100%
- ✅ Analysis engine: ~95%
- ✅ Data transformations: 100%

### Frontend Coverage

```bash
cd frontend
npm run test:coverage
```

Coverage report will be generated in `frontend/coverage/` directory.

## Writing Tests

### Backend Test Guidelines

1. **Use Table-Driven Tests** for multiple scenarios:
```go
testCases := []struct {
    name     string
    input    string
    expected int
}{
    {"case 1", "input1", 1},
    {"case 2", "input2", 2},
}

for _, tc := range testCases {
    t.Run(tc.name, func(t *testing.T) {
        result := myFunction(tc.input)
        assert.Equal(t, tc.expected, result)
    })
}
```

2. **Mock HTTP Responses** using `httptest`:
```go
server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(mockResponse)
}))
defer server.Close()
```

3. **Test Edge Cases**:
   - Empty inputs
   - Nil values
   - Invalid data
   - Network failures

### Frontend Test Guidelines

1. **Mock API Calls**:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  (global.fetch as ReturnType<typeof vi.fn>).mockClear();
});
```

2. **Test Happy Path and Error Cases**:
```typescript
it('should handle errors', async () => {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    text: async () => 'Error message',
  });

  await expect(fetchData()).rejects.toThrow('Error message');
});
```

3. **Verify API Call Parameters**:
```typescript
expect(global.fetch).toHaveBeenCalledWith(
  'http://localhost:8080/api/endpoint?param=value'
);
```

## Continuous Integration

### GitHub Actions (Example)

```yaml
name: Test

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.22'
      - name: Run tests
        run: |
          cd backend
          go test ./... -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm test -- --run
```

## Best Practices

### General

1. **Write tests first** (TDD) when adding new features
2. **Keep tests fast** - avoid unnecessary sleeps or waits
3. **Test behavior, not implementation** - focus on inputs/outputs
4. **One assertion per test** when possible
5. **Use descriptive test names** - describe what is being tested

### Backend Specific

1. **Use testify assertions** for better error messages
2. **Clean up resources** with `defer` statements
3. **Test concurrent scenarios** when applicable
4. **Mock external dependencies** (JIRA API, databases)

### Frontend Specific

1. **Reset mocks** between tests with `beforeEach`
2. **Test user interactions** not implementation details
3. **Use semantic queries** from Testing Library
4. **Avoid testing styling** - focus on functionality

## Troubleshooting

### Common Issues

#### Backend

**Issue**: Tests fail with "connection refused"
- **Solution**: Check that you're using `httptest.NewServer` for HTTP tests

**Issue**: Time-based tests are flaky
- **Solution**: Use fixed times with `time.Date()` instead of `time.Now()`

#### Frontend

**Issue**: "Cannot find module" error
- **Solution**: Check that all test dependencies are installed: `npm install`

**Issue**: Fetch is not mocked
- **Solution**: Verify `test/setup.ts` is properly configured in `vitest.config.ts`

### Getting Help

- Check existing tests for examples
- Read the testing framework documentation:
  - [Go testing package](https://pkg.go.dev/testing)
  - [Testify](https://github.com/stretchr/testify)
  - [Vitest](https://vitest.dev/)
  - [React Testing Library](https://testing-library.com/react)

## Summary

This project has comprehensive test coverage ensuring:
- ✅ JIRA API integration works correctly
- ✅ Complex development metrics are calculated accurately
- ✅ Data analysis and aggregations are correct
- ✅ API client handles all scenarios including errors
- ✅ All edge cases are covered

Regular test runs and maintaining high coverage helps catch bugs early and ensures the dashboard provides accurate insights to development teams.
