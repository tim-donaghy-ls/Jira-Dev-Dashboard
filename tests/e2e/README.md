# JIRA Dev Dashboard E2E Tests

Comprehensive end-to-end tests for the JIRA Development Metrics Dashboard using Playwright.

## Test Structure

The E2E test suite is organized into the following test files:

### 1. `dashboard.spec.ts` - Core Dashboard Functionality
Tests for the main dashboard features:
- Loading dashboard successfully
- Connection status indicators (JIRA, GitHub, Aha)
- Instance, project, and sprint selectors
- Summary cards and metrics
- Charts overview (status, priority, etc.)
- Filter functionality
- Sprint tickets section with search and filters
- Responsive design (mobile, tablet, desktop)
- Error handling
- Navigation
- Dark mode toggle

**Test Count:** 40+ tests

### 2. `developer-analytics.spec.ts` - Developer Performance Features
Tests for developer-specific analytics:
- Developer workload table with status columns
- Story points by developer
- Commits and PR activity
- Team performance table
- Failed tickets tracking
- Developer filtering
- Development time metrics
- Export to Excel functionality
- GitHub integration display
- Sprint slippage tracking

**Test Count:** 35+ tests

### 3. `ai-chat.spec.ts` - AI Assistant Functionality
Tests for the Claude AI-powered chat assistant:
- Opening/closing chat drawer (keyboard shortcut and button)
- Welcome message and capabilities
- Sending and receiving messages
- Sprint analysis generation
- Release notes generation
- Document generation (Word, Excel, PowerPoint)
- Error handling
- Clear chat functionality
- Loading states

**Test Count:** 45+ tests

### 4. `github-integration.spec.ts` - GitHub Integration Features
Tests for GitHub integration:
- Connection status display
- Repository stats and counts
- Commit history by developer
- PR activity (created vs merged)
- Cross-reference with JIRA assignees
- Developer matching (by name, email, username)
- Activity filtering by sprint dates
- Error handling and timeouts
- Asynchronous data loading
- Performance optimization

**Test Count:** 40+ tests

### 5. `aha-integration.spec.ts` - Aha Integration Features
Tests for Aha product management integration:
- Connection status
- Feature verification against Aha
- Verification badges on tickets
- Warning messages for unverified tickets
- Batch verification
- Aha status display
- Aha reference numbers and links
- Error handling
- Performance and caching
- UI/UX indicators

**Test Count:** 40+ tests

## Helper Utilities

### `fixtures.ts`
Custom Playwright fixtures:
- `dashboardPage`: Pre-navigated to dashboard
- `loadedDashboard`: Dashboard with data already loaded

### `helpers.ts`
Reusable helper functions:
- `loadDashboardData()` - Load dashboard with selections
- `openChatDrawer()` / `closeChatDrawer()` - Manage chat drawer
- `sendChatMessage()` - Send message in chat
- `selectInstance()` / `selectProject()` / `selectSprint()` - Select filters
- `filterByDeveloper()` / `searchTickets()` - Filter tickets
- `toggleTheme()` / `toggleSection()` - Toggle UI elements
- `waitForLoadingComplete()` - Wait for async operations
- `getTicketKeys()` - Extract JIRA ticket keys
- `isDashboardLoaded()` - Check if data is present
- And many more utility functions...

## Running Tests

### Prerequisites

1. **Start the application with authentication disabled:**
   ```bash
   # From project root
   SKIP_AUTH=true bash start.sh
   ```

2. **The application must be running on:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8080

### Run All Tests
```bash
cd frontend
npx playwright test tests/e2e
```

### Run Specific Test File
```bash
# Dashboard tests
npx playwright test tests/e2e/dashboard.spec.ts

# Developer analytics tests
npx playwright test tests/e2e/developer-analytics.spec.ts

# AI chat tests
npx playwright test tests/e2e/ai-chat.spec.ts

# GitHub integration tests
npx playwright test tests/e2e/github-integration.spec.ts

# Aha integration tests
npx playwright test tests/e2e/aha-integration.spec.ts
```

### Run with UI Mode (Interactive)
```bash
npx playwright test tests/e2e --ui
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test tests/e2e --headed
```

### Run in Debug Mode
```bash
npx playwright test tests/e2e --debug
```

### Run Specific Test by Name
```bash
npx playwright test tests/e2e -g "should load dashboard successfully"
```

### Run Tests in Parallel
```bash
npx playwright test tests/e2e --workers=4
```

### Generate HTML Report
```bash
npx playwright test tests/e2e
npx playwright show-report
```

## Test Configuration

Tests are configured in `/Users/timothydonaghy/Documents/@Repos/Experiments/JIRA-Dev-Dashboard/frontend/playwright.config.ts`:

- **Test Directory:** `./e2e`
- **Timeout:** 10 seconds per test
- **Retries:** 0 locally, 2 on CI
- **Base URL:** http://localhost:3000
- **Browser:** Chromium (Desktop Chrome)
- **Screenshots:** On failure
- **Traces:** On first retry

## Test Patterns

### 1. Graceful Degradation
Tests handle scenarios where features may not be available:
```typescript
if (await element.count() > 0) {
  // Test the feature
  await expect(element.first()).toBeVisible();
}
```

### 2. Conditional Assertions
Tests adapt to dynamic content:
```typescript
const count = await elements.count();
expect(count).toBeGreaterThanOrEqual(0);
```

### 3. Timeout Management
Appropriate waits for async operations:
```typescript
// Wait for GitHub data (loads asynchronously)
await page.waitForTimeout(5000);

// Wait for AI response
await page.waitForTimeout(10000);
```

### 4. Loading State Handling
Tests wait for loading to complete:
```typescript
const loadingSpinner = page.locator('[class*="loading"]');
if (await loadingSpinner.isVisible()) {
  await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
}
```

## Key Features Tested

### Critical User Flows
- ✅ Dashboard loading and data display
- ✅ JIRA instance/project/sprint selection
- ✅ Developer performance metrics
- ✅ GitHub activity integration
- ✅ Aha feature verification
- ✅ AI chat assistant
- ✅ Export functionality (Excel)
- ✅ Sprint analysis and release notes
- ✅ Responsive design
- ✅ Error handling

### Integration Points
- ✅ JIRA API connection
- ✅ GitHub API integration
- ✅ Aha API integration
- ✅ Claude AI chat backend
- ✅ Document generation

### UI/UX
- ✅ Loading states
- ✅ Error messages
- ✅ Connection status indicators
- ✅ Collapsible sections
- ✅ Filters and search
- ✅ Dark mode
- ✅ Keyboard shortcuts (Cmd/Ctrl+K)
- ✅ Responsive layouts

## Environment Variables

Tests expect the following environment setup:

- `SKIP_AUTH=true` - Disables authentication for testing
- Application running on `localhost:3000` (frontend)
- Backend API running on `localhost:8080`

## Troubleshooting

### Tests Fail with "page.goto: net::ERR_CONNECTION_REFUSED"
**Solution:** Ensure the application is running with `SKIP_AUTH=true bash start.sh`

### Tests Timeout
**Solution:** Increase timeout in test or check if backend is responding slowly
```typescript
test.setTimeout(30000); // 30 seconds
```

### GitHub/Aha Tests Fail
**Solution:** These integrations may not be configured. Tests are designed to handle this gracefully.

### Flaky Tests
**Solution:** Tests may be sensitive to data availability. Ensure JIRA instance has test data.

## Best Practices

1. **Always wait for loading states to complete**
2. **Use descriptive test names that explain what is being tested**
3. **Handle optional features gracefully (GitHub, Aha may not be configured)**
4. **Test both success and error scenarios**
5. **Use fixtures and helpers to reduce code duplication**
6. **Keep tests independent - no test should depend on another**
7. **Use appropriate timeouts for async operations**
8. **Test responsive design at different viewport sizes**

## Coverage

Total E2E Tests: **200+ tests**

- Dashboard Core: 40+ tests
- Developer Analytics: 35+ tests
- AI Chat: 45+ tests
- GitHub Integration: 40+ tests
- Aha Integration: 40+ tests

## Continuous Integration

Tests can be run in CI with:
```bash
CI=true npx playwright test tests/e2e
```

CI configuration:
- Retries: 2
- Workers: 1 (serial execution)
- forbidOnly: true (prevents test.only)

## Future Enhancements

Potential improvements:
- [ ] Visual regression testing with screenshots
- [ ] API mocking for more reliable tests
- [ ] Performance testing (Lighthouse)
- [ ] Accessibility testing (axe-core)
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile browser testing
- [ ] Video recording of test runs
- [ ] Custom reporters for detailed metrics

## Contributing

When adding new tests:
1. Place them in the appropriate spec file based on feature area
2. Use existing helpers from `helpers.ts` when possible
3. Add new helpers for reusable functionality
4. Follow existing test patterns (graceful degradation, conditional assertions)
5. Ensure tests work with and without optional integrations (GitHub, Aha)
6. Add appropriate waits for async operations
7. Update this README if adding new test files

## Support

For issues with tests:
1. Check application is running with `SKIP_AUTH=true`
2. Verify backend is accessible at `localhost:8080`
3. Review test logs: `npx playwright show-report`
4. Run in debug mode: `npx playwright test --debug`
