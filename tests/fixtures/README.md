# Test Fixtures

This directory contains realistic test data for E2E tests.

## Files

### `dashboard-data.json`
Complete JIRA dashboard data including:
- 45 total issues across 8 sample tickets
- 4 developers with realistic workload distribution
- Sprint information (Sprint 24)
- Status, priority, and type breakdowns
- Timeline data for charts
- Story points and resolution metrics

### `aha-features.json`
Aha integration data including:
- 4 verified features linked to JIRA tickets
- 4 unverified tickets (not in Aha)
- Verification results mapping
- Feature workflow statuses

### `github-activity.json`
GitHub developer activity including:
- Commit counts per developer
- Pull request statistics
- Code change metrics (lines added/deleted)
- Recent commits history

## Usage

### Basic Setup

```typescript
import { setupTestFixtures } from '../helpers/fixtures';

test.beforeEach(async ({ page }) => {
  await setupTestFixtures(page);
  await page.goto('/');
});
```

### With Simulated Latency

```typescript
import { setupTestFixturesWithDelay } from '../helpers/fixtures';

test.beforeEach(async ({ page }) => {
  await setupTestFixturesWithDelay(page, 500); // 500ms delay
  await page.goto('/');
});
```

### Testing Error Handling

```typescript
import { setupTestFixturesWithErrors } from '../helpers/fixtures';

test('should handle API errors', async ({ page }) => {
  await setupTestFixturesWithErrors(page);
  await page.goto('/');
  // Test error UI
});
```

## Benefits

1. **Consistent Data**: All tests use the same realistic dataset
2. **Fast Tests**: No actual API calls, tests run instantly
3. **Predictable**: Known data makes assertions easier
4. **Isolated**: Tests don't depend on external services
5. **Flexible**: Easy to customize for specific test scenarios

## Customization

To add more data or scenarios:

1. Edit the JSON files directly
2. Create new fixture files for specific test cases
3. Extend the `fixtures.ts` helper with new mocking logic

## Example: Custom Test Data

```typescript
test('should handle large dataset', async ({ page }) => {
  // Override with custom data
  await page.route('**/api/dashboard**', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        ...customLargeDataset
      })
    });
  });

  await page.goto('/');
});
```
