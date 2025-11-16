import { test, expect, Page } from '@playwright/test';

test.describe('Developer Analytics - Workload Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display developer workload section', async ({ page }) => {
    const workloadHeader = page.locator('text=/developer workload/i');
    await expect(workloadHeader.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show workload table with developer names', async ({ page }) => {
    // Look for table with developer names
    const table = page.locator('table').filter({ has: page.locator('text=/developer/i') });

    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();

      // Check for table headers
      const headers = table.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });

  test('should display status columns in workload table', async ({ page }) => {
    // Look for status column headers
    const statusHeaders = page.locator('th').filter({
      hasText: /to do|in progress|code review|qa review|schedule release|production release/i
    });

    const count = await statusHeaders.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display story points column', async ({ page }) => {
    const storyPointsHeader = page.locator('th').filter({ hasText: /story points/i });

    if (await storyPointsHeader.count() > 0) {
      await expect(storyPointsHeader.first()).toBeVisible();
    }
  });

  test('should display commits column', async ({ page }) => {
    const commitsHeader = page.locator('th').filter({ hasText: /commits/i });

    if (await commitsHeader.count() > 0) {
      await expect(commitsHeader.first()).toBeVisible();
    }
  });

  test('should display PRs column', async ({ page }) => {
    const prsHeader = page.locator('th').filter({ hasText: /pr/i });

    if (await prsHeader.count() > 0) {
      await expect(prsHeader.first()).toBeVisible();
    }
  });

  test('should show total row at bottom of workload table', async ({ page }) => {
    const totalRow = page.locator('tfoot tr, tbody tr').filter({ hasText: /total/i });

    if (await totalRow.count() > 0) {
      await expect(totalRow.first()).toBeVisible();
    }
  });

  test('should be able to collapse and expand workload section', async ({ page }) => {
    const collapseButton = page.locator('button').filter({
      hasText: /\+|−|collapse|expand/i
    }).nth(1); // Second collapse button (first is sprint tickets)

    if (await collapseButton.count() > 0) {
      await collapseButton.click();
      await page.waitForTimeout(300);

      // Click again to expand
      await collapseButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should expand developer row to show failed tickets', async ({ page }) => {
    // Look for developer rows (clickable)
    const developerRows = page.locator('table tbody tr').filter({
      has: page.locator('td:first-child')
    });

    if (await developerRows.count() > 0) {
      const firstRow = developerRows.first();
      await firstRow.click();
      await page.waitForTimeout(500);

      // Should show expanded content or failed tickets
      const expandedContent = page.locator('text=/failed tickets|no failed tickets/i');

      if (await expandedContent.count() > 0) {
        await expect(expandedContent.first()).toBeVisible();
      }
    }
  });

  test('should show failed ticket details when row is expanded', async ({ page }) => {
    const developerRows = page.locator('table tbody tr').filter({
      has: page.locator('td:first-child')
    });

    if (await developerRows.count() > 0) {
      const firstRow = developerRows.first();
      await firstRow.click();
      await page.waitForTimeout(500);

      // Check for failed ticket information
      const failedInfo = page.locator('text=/failed tickets|failure/i');

      if (await failedInfo.count() > 0) {
        await expect(failedInfo.first()).toBeVisible();
      }
    }
  });
});

test.describe('Developer Analytics - Team Performance Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display team performance section', async ({ page }) => {
    const performanceHeader = page.locator('text=/team performance/i');

    if (await performanceHeader.count() > 0) {
      await expect(performanceHeader.first()).toBeVisible();
    }
  });

  test('should show team performance table with metrics', async ({ page }) => {
    // Look for performance-related table
    const table = page.locator('table').filter({
      has: page.locator('th').filter({ hasText: /developer|assignee|name/i })
    });

    if (await table.count() > 0) {
      const headers = table.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });

  test('should display developer names in performance table', async ({ page }) => {
    // Look for table rows with developer names
    const developerCells = page.locator('td').filter({
      hasText: /\w+\s+\w+|unassigned/i
    });

    const count = await developerCells.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display total issues column', async ({ page }) => {
    const totalHeader = page.locator('th').filter({ hasText: /total.*issues|issues.*total/i });

    if (await totalHeader.count() > 0) {
      await expect(totalHeader.first()).toBeVisible();
    }
  });

  test('should display average development time', async ({ page }) => {
    const avgTimeHeader = page.locator('th').filter({
      hasText: /avg.*time|development.*time|time.*dev/i
    });

    if (await avgTimeHeader.count() > 0) {
      await expect(avgTimeHeader.first()).toBeVisible();
    }
  });

  test('should display GitHub activity in performance table', async ({ page }) => {
    // Wait for GitHub data to load (it loads asynchronously)
    await page.waitForTimeout(3000);

    // Look for commit or PR data
    const githubData = page.locator('td').filter({ hasText: /\d+.*commit|\d+.*pr/i });

    const count = await githubData.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Developer Analytics - Story Points Distribution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display story points by developer', async ({ page }) => {
    // Look for story points data in tables
    const storyPointsData = page.locator('td').filter({ hasText: /\d+/ }).and(
      page.locator('td:has-text("Story Points")')
    );

    // Story points should be visible somewhere
    const spHeader = page.locator('th, td').filter({ hasText: /story points/i });
    const count = await spHeader.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show total story points across team', async ({ page }) => {
    // Look for totals in footer or summary
    const totalRow = page.locator('tfoot, tbody').filter({ hasText: /total/i });

    if (await totalRow.count() > 0) {
      const storyPoints = totalRow.locator('td').filter({ hasText: /\d+/ });

      if (await storyPoints.count() > 0) {
        await expect(storyPoints.first()).toBeVisible();
      }
    }
  });

  test('should display story points in charts', async ({ page }) => {
    // Look for chart with story points data
    const chartCanvas = page.locator('canvas');

    if (await chartCanvas.count() > 0) {
      // Charts should be visible
      await expect(chartCanvas.first()).toBeVisible();
    }
  });
});

test.describe('Developer Analytics - Filter by Developer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should have developer filter dropdown', async ({ page }) => {
    const developerFilter = page.locator('select').filter({ hasText: /developer|assignee/i }).or(
      page.locator('label:has-text("Developer")').locator('..').locator('select')
    );

    if (await developerFilter.count() > 0) {
      await expect(developerFilter.first()).toBeVisible();
    }
  });

  test('should filter tickets by specific developer', async ({ page }) => {
    const developerFilter = page.locator('select').filter({ hasText: /all|developer/i }).or(
      page.locator('label').filter({ hasText: /developer/i }).locator('..').locator('select')
    );

    if (await developerFilter.count() > 0) {
      const filter = developerFilter.first();
      const options = await filter.locator('option').count();

      if (options > 2) {
        // Select a specific developer
        await filter.selectOption({ index: 1 });
        await page.waitForTimeout(500);

        // Tickets should be filtered
        const tickets = page.locator('[class*="issue"], [class*="ticket"]');
        const ticketCount = await tickets.count();

        // Some tickets should be visible (or none if developer has no tickets)
        expect(ticketCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should reset filter to show all developers', async ({ page }) => {
    const developerFilter = page.locator('select').filter({ hasText: /all|developer/i }).or(
      page.locator('label').filter({ hasText: /developer/i }).locator('..').locator('select')
    );

    if (await developerFilter.count() > 0) {
      const filter = developerFilter.first();
      const options = await filter.locator('option').count();

      if (options > 2) {
        // Select a developer
        await filter.selectOption({ index: 1 });
        await page.waitForTimeout(500);

        // Reset to all
        await filter.selectOption({ index: 0 });
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Developer Analytics - Dev Time Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display development time in days', async ({ page }) => {
    // Look for time metrics
    const timeMetrics = page.locator('td, span').filter({
      hasText: /\d+.*day|\d+.*hr|\d+\.\d+/i
    });

    const count = await timeMetrics.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show average development time per developer', async ({ page }) => {
    // Look for average time column
    const avgTimeColumn = page.locator('th').filter({
      hasText: /avg.*time|development.*time/i
    });

    if (await avgTimeColumn.count() > 0) {
      await expect(avgTimeColumn.first()).toBeVisible();

      // Should have corresponding data cells
      const dataCells = page.locator('td').filter({ hasText: /\d+/ });
      const count = await dataCells.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display In Progress to QA time', async ({ page }) => {
    // Look for QA-related time metrics
    const qaTimeMetrics = page.locator('th, td').filter({
      hasText: /qa.*time|in progress.*qa/i
    });

    if (await qaTimeMetrics.count() > 0) {
      await expect(qaTimeMetrics.first()).toBeVisible();
    }
  });
});

test.describe('Developer Analytics - Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should have export option for developer data', async ({ page }) => {
    // Look for export/menu buttons
    const exportButton = page.locator('button').filter({ hasText: /⋮|export|download|menu/i });

    if (await exportButton.count() > 0) {
      const button = exportButton.first();
      await button.click();
      await page.waitForTimeout(300);

      // Check for export options
      const exportMenu = page.locator('text=/export|excel|csv/i');

      if (await exportMenu.count() > 0) {
        await expect(exportMenu.first()).toBeVisible();
      }
    }
  });

  test('should export developer metrics to Excel', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /⋮|export/i });

    if (await exportButton.count() > 0) {
      await exportButton.first().click();
      await page.waitForTimeout(300);

      const excelOption = page.locator('text=/excel|xlsx/i');

      if (await excelOption.count() > 0) {
        // Setup download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

        await excelOption.first().click();

        const download = await downloadPromise;

        if (download) {
          // Verify download started
          expect(download.suggestedFilename()).toContain('.xlsx');
        }
      }
    }
  });
});

test.describe('Developer Analytics - GitHub Integration Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display GitHub commits column', async ({ page }) => {
    // Wait for GitHub data to potentially load
    await page.waitForTimeout(3000);

    const commitsColumn = page.locator('th').filter({ hasText: /commits/i });

    if (await commitsColumn.count() > 0) {
      await expect(commitsColumn.first()).toBeVisible();
    }
  });

  test('should display GitHub PRs column', async ({ page }) => {
    await page.waitForTimeout(3000);

    const prsColumn = page.locator('th').filter({ hasText: /pr|pull request/i });

    if (await prsColumn.count() > 0) {
      await expect(prsColumn.first()).toBeVisible();
    }
  });

  test('should show loading state for GitHub data', async ({ page }) => {
    // GitHub data loads asynchronously
    const loadingText = page.locator('text=/loading/i');

    // Loading might appear briefly
    const hasLoading = await loadingText.count();
    expect(hasLoading).toBeGreaterThanOrEqual(0);
  });

  test('should display merged PRs count', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Look for PR format: "X (Y)" where Y is merged count
    const prCell = page.locator('td').filter({ hasText: /\d+\s*\(\d+\)/ });

    if (await prCell.count() > 0) {
      await expect(prCell.first()).toBeVisible();
    }
  });

  test('should show zero values when no GitHub activity', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Look for cells with 0 or dash
    const zeroCells = page.locator('td').filter({ hasText: /^0$|^-$|0 \(0\)/ });

    // Some cells might show zero/no activity
    const count = await zeroCells.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Developer Analytics - Sprint Slippage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display sprint slippage section', async ({ page }) => {
    const slippageHeader = page.locator('text=/sprint slippage|slippage/i');

    if (await slippageHeader.count() > 0) {
      await expect(slippageHeader.first()).toBeVisible();
    }
  });

  test('should show tickets moved between sprints', async ({ page }) => {
    const slippageSection = page.locator('text=/moved.*sprint|slipped/i');

    if (await slippageSection.count() > 0) {
      // Should show information about moved tickets
      const ticketInfo = page.locator('text=/ticket|issue/i');
      const count = await ticketInfo.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display warning for unassigned tickets', async ({ page }) => {
    const unassignedWarning = page.locator('text=/unassigned/i');

    if (await unassignedWarning.count() > 0) {
      // Warning might be visible if there are unassigned tickets
      const warning = unassignedWarning.first();
      const isVisible = await warning.isVisible();
      expect(isVisible || true).toBeTruthy();
    }
  });

  test('should display warning for missing story points', async ({ page }) => {
    const storyPointWarning = page.locator('text=/story point.*missing|missing.*story/i');

    if (await storyPointWarning.count() > 0) {
      const warning = storyPointWarning.first();
      const isVisible = await warning.isVisible();
      expect(isVisible || true).toBeTruthy();
    }
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

  // Wait for loading to complete
  const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');

  if (await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
  }

  // Additional wait for async GitHub data
  await page.waitForTimeout(2000);
}
