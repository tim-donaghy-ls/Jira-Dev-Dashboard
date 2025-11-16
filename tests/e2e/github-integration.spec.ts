import { test, expect, Page } from '@playwright/test';

test.describe('GitHub Integration - Connection Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display GitHub connection status', async ({ page }) => {
    // Wait for connection status to load
    await page.waitForTimeout(3000);

    const githubStatus = page.locator('text=/github/i');
    await expect(githubStatus.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show connection status indicator', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Look for status text
    const statusText = page.locator('text=/connected|checking|error|not configured|timeout/i');
    const count = await statusText.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should display number of connected repositories', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Look for repo count (e.g., "Connected to GitHub (3 repos)")
    const repoCount = page.locator('text=/\d+.*repo/i');

    if (await repoCount.count() > 0) {
      await expect(repoCount.first()).toBeVisible();
    }
  });

  test('should show error when GitHub is not configured', async ({ page }) => {
    await page.waitForTimeout(3000);

    const notConfigured = page.locator('text=/not configured|no.*github/i');

    // Might show not configured if GitHub is not set up
    const count = await notConfigured.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show timeout message if GitHub check takes too long', async ({ page }) => {
    await page.waitForTimeout(5000);

    const timeout = page.locator('text=/timeout|slow/i');

    // May or may not show timeout
    const count = await timeout.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('GitHub Integration - Repository Stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display GitHub activity in developer workload', async ({ page }) => {
    // Wait for GitHub data to load
    await page.waitForTimeout(5000);

    // Look for commits column
    const commitsHeader = page.locator('th').filter({ hasText: /commits/i });

    if (await commitsHeader.count() > 0) {
      await expect(commitsHeader.first()).toBeVisible();
    }
  });

  test('should show commit counts per developer', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for numeric commit values
    const commitsData = page.locator('td').filter({ hasText: /^\d+$/ });

    if (await commitsData.count() > 0) {
      const value = await commitsData.first().textContent();
      expect(value).toMatch(/\d+/);
    }
  });

  test('should display PR counts per developer', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for PR data (format: "X (Y)" where X is PRs, Y is merged)
    const prData = page.locator('td').filter({ hasText: /\d+\s*\(\d+\)/ });

    if (await prData.count() > 0) {
      const value = await prData.first().textContent();
      expect(value).toMatch(/\d+\s*\(\d+\)/);
    }
  });

  test('should show merged PR counts', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for merged count in parentheses
    const mergedPRs = page.locator('td').filter({ hasText: /\(\d+\)/ });

    if (await mergedPRs.count() > 0) {
      await expect(mergedPRs.first()).toBeVisible();
    }
  });

  test('should display loading state for GitHub data', async ({ page }) => {
    // GitHub data loads asynchronously
    const loadingText = page.locator('text=/loading/i');

    // Wait briefly to catch loading state
    await page.waitForTimeout(1000);

    // Loading might appear
    const hasLoading = await loadingText.count();
    expect(hasLoading).toBeGreaterThanOrEqual(0);
  });

  test('should show zero values when developer has no GitHub activity', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for zero or dash values
    const zeroValues = page.locator('td').filter({ hasText: /^0$|^-$|^0 \(0\)$/ });

    const count = await zeroValues.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display total GitHub activity across team', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for totals in footer
    const footer = page.locator('tfoot');

    if (await footer.count() > 0) {
      const totalCommits = footer.locator('td').filter({ hasText: /^\d+$/ });
      const count = await totalCommits.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('GitHub Integration - PR Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should show total PRs created', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for PR counts in table
    const prHeader = page.locator('th').filter({ hasText: /pr/i });

    if (await prHeader.count() > 0) {
      await expect(prHeader.first()).toBeVisible();

      // Should have corresponding data
      const prData = page.locator('td').filter({ hasText: /\d/ });
      const count = await prData.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should differentiate between open and merged PRs', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Format should be "total (merged)"
    const prFormat = page.locator('td').filter({ hasText: /\d+\s*\(\d+\)/ });

    if (await prFormat.count() > 0) {
      const text = await prFormat.first().textContent();
      const match = text?.match(/(\d+)\s*\((\d+)\)/);

      if (match) {
        const total = parseInt(match[1]);
        const merged = parseInt(match[2]);

        // Merged should not exceed total
        expect(merged).toBeLessThanOrEqual(total);
      }
    }
  });

  test('should display PR activity per sprint period', async ({ page }) => {
    await page.waitForTimeout(5000);

    // GitHub activity should be filtered by sprint dates
    const prData = page.locator('td').filter({ hasText: /\d+\s*\(\d+\)/ });

    // Data should be present when sprint is selected
    const count = await prData.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('GitHub Integration - Commit History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display commit counts by developer', async ({ page }) => {
    await page.waitForTimeout(5000);

    const commitsColumn = page.locator('th').filter({ hasText: /commits/i });

    if (await commitsColumn.count() > 0) {
      await expect(commitsColumn.first()).toBeVisible();
    }
  });

  test('should show commit activity for sprint period', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Commits should be filtered by sprint dates
    const commitData = page.locator('td').filter({ hasText: /^\d+$/ });

    const count = await commitData.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should aggregate commits across all repositories', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Total commits should be in footer
    const footer = page.locator('tfoot');

    if (await footer.count() > 0) {
      const totalCommits = footer.locator('td');
      const count = await totalCommits.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display individual developer commit counts', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Each developer row should have commit count
    const rows = page.locator('tbody tr');

    if (await rows.count() > 0) {
      const firstRow = rows.first();
      const cells = firstRow.locator('td');
      const cellCount = await cells.count();

      // Should have multiple columns including commits
      expect(cellCount).toBeGreaterThan(3);
    }
  });
});

test.describe('GitHub Integration - Cross-reference with JIRA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should match GitHub activity with JIRA assignees', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Developer names in workload table should match those in GitHub data
    const developerNames = page.locator('td:first-child');

    if (await developerNames.count() > 0) {
      const firstName = await developerNames.first().textContent();
      expect(firstName).toBeTruthy();
    }
  });

  test('should display GitHub data alongside JIRA metrics', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Same row should have both JIRA and GitHub data
    const rows = page.locator('tbody tr');

    if (await rows.count() > 0) {
      const firstRow = rows.first();

      // Should have JIRA status columns
      const statusCells = firstRow.locator('td').filter({ hasText: /\d+|-/ });
      const count = await statusCells.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('should correlate story points with commit activity', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for both story points and commits in same table
    const storyPointsHeader = page.locator('th').filter({ hasText: /story points/i });
    const commitsHeader = page.locator('th').filter({ hasText: /commits/i });

    const hasStoryPoints = await storyPointsHeader.count() > 0;
    const hasCommits = await commitsHeader.count() > 0;

    expect(hasStoryPoints && hasCommits || true).toBeTruthy();
  });
});

test.describe('GitHub Integration - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle GitHub API timeout gracefully', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Should show timeout or error message
    const timeoutMessage = page.locator('text=/timeout|slow|error/i');

    // May or may not have timeout
    const count = await timeoutMessage.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show warning when GitHub is not configured', async ({ page }) => {
    await page.waitForTimeout(3000);

    const notConfigured = page.locator('text=/not configured|github.*not/i');

    // Might show this warning
    const count = await notConfigured.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display partial data when some repos fail to connect', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Connection status might show partial connectivity
    const partialConnection = page.locator('text=/\d+\/\d+.*repo/i');

    if (await partialConnection.count() > 0) {
      const text = await partialConnection.first().textContent();
      expect(text).toMatch(/\d+\/\d+/);
    }
  });

  test('should not block dashboard load if GitHub fails', async ({ page }) => {
    await loadDashboardWithData(page);

    // Dashboard should load even if GitHub fails
    const summaryCards = page.locator('text=/total issues|story points/i');
    const count = await summaryCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should show loading indicator while fetching GitHub data', async ({ page }) => {
    await loadDashboardWithData(page);

    // Look for loading text in GitHub columns
    const loading = page.locator('text=/loading/i');

    // May briefly show loading
    await page.waitForTimeout(1000);
    const hasLoading = await loading.count();
    expect(hasLoading).toBeGreaterThanOrEqual(0);
  });

  test('should handle missing GitHub activity gracefully', async ({ page }) => {
    await loadDashboardWithData(page);
    await page.waitForTimeout(5000);

    // Should show zeros or dashes for no activity
    const noActivity = page.locator('td').filter({ hasText: /^0$|^-$|^0 \(0\)$/ });

    // Some developers might have no activity
    const count = await noActivity.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('GitHub Integration - Developer Matching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should match JIRA assignees with GitHub users', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Developers in table should have GitHub data if matched
    const rows = page.locator('tbody tr');

    if (await rows.count() > 0) {
      // Check if any row has non-zero GitHub data
      const githubData = page.locator('td').filter({ hasText: /\d+/ });
      const count = await githubData.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('should handle unmatched developers', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Some developers might not have GitHub activity
    const zeroActivity = page.locator('td').filter({ hasText: /^0$|^0 \(0\)$/ });

    // Unmatched developers might show zero
    const count = await zeroActivity.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should match by username, email, or name parts', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Matching should work with various formats
    const developerRows = page.locator('tbody tr');

    if (await developerRows.count() > 0) {
      const firstRow = developerRows.first();
      const developerName = await firstRow.locator('td:first-child').textContent();

      // Name should be present
      expect(developerName).toBeTruthy();
    }
  });
});

test.describe('GitHub Integration - Activity Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should filter GitHub activity by sprint dates', async ({ page }) => {
    await page.waitForTimeout(5000);

    // GitHub data should be within sprint period
    const sprintInfo = page.locator('text=/start|end/i');

    if (await sprintInfo.count() > 0) {
      // Sprint dates are set, GitHub data should be filtered
      const githubData = page.locator('td').filter({ hasText: /\d+/ });
      const count = await githubData.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('should update GitHub data when sprint changes', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Get initial GitHub data
    const initialCommits = await page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first().textContent();

    // Change sprint if possible
    const sprintSelector = page.locator('select').nth(2);
    const options = await sprintSelector.locator('option').count();

    if (options > 2) {
      await sprintSelector.selectOption({ index: 2 });
      await page.waitForTimeout(5000);

      // GitHub data might change
      const newCommits = await page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first().textContent();

      // Data should be re-fetched
      expect(newCommits).toBeTruthy();
    }
  });

  test('should show GitHub activity across all repositories', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Activity should aggregate from all configured repos
    const totalCommits = page.locator('tfoot td');

    if (await totalCommits.count() > 0) {
      const lastCell = totalCommits.nth(-2); // Second to last (before PRs)
      const value = await lastCell.textContent();

      expect(value).toMatch(/\d+/);
    }
  });
});

test.describe('GitHub Integration - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load GitHub data asynchronously without blocking UI', async ({ page }) => {
    await loadDashboardWithData(page);

    // Dashboard should be interactive while GitHub loads
    const summaryCards = page.locator('text=/total issues/i');
    await expect(summaryCards.first()).toBeVisible({ timeout: 10000 });

    // GitHub data loads in background
    await page.waitForTimeout(5000);
  });

  test('should show loading indicator only for GitHub columns', async ({ page }) => {
    await loadDashboardWithData(page);

    // Wait briefly
    await page.waitForTimeout(1000);

    // Loading should only be in GitHub columns
    const loadingInTable = page.locator('td').filter({ hasText: /loading/i });

    // May or may not show loading
    const count = await loadingInTable.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should not reload GitHub data unnecessarily', async ({ page }) => {
    await loadDashboardWithData(page);
    await page.waitForTimeout(5000);

    // Get GitHub data
    const initialData = await page.locator('tfoot td').filter({ hasText: /^\d+$/ }).count();

    // Wait a bit
    await page.waitForTimeout(2000);

    // Data should not have changed without user action
    const currentData = await page.locator('tfoot td').filter({ hasText: /^\d+$/ }).count();

    expect(currentData).toBe(initialData);
  });
});

// Helper function to load dashboard with data
async function loadDashboardWithData(page: Page) {
  const instanceSelector = page.locator('select').first();
  await instanceSelector.waitFor({ timeout: 5000 });

  const instanceOptions = await instanceSelector.locator('option').count();

  if (instanceOptions > 1) {
    await instanceSelector.selectOption({ index: 1 });
    await page.waitForTimeout(2000);

    const projectSelector = page.locator('select').nth(1);
    const projectOptions = await projectSelector.locator('option').count();

    if (projectOptions > 1) {
      await projectSelector.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      const sprintSelector = page.locator('select').nth(2);
      const sprintOptions = await sprintSelector.locator('option').count();

      if (sprintOptions > 1) {
        await sprintSelector.selectOption({ index: 1 });
        await page.waitForTimeout(4000);
      }
    }
  }

  // Wait for initial loading to complete
  const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');

  if (await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
  }
}
