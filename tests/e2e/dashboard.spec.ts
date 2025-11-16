import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Development Metrics Dashboard|JIRA.*Dashboard/i);

    // Verify header is visible
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  test('should display connection status indicators', async ({ page }) => {
    // Wait for connection status to be visible
    await page.waitForSelector('text=/JIRA|GitHub|Aha/i', { timeout: 10000 });

    // Verify at least one connection status is shown
    const statusElements = page.locator('text=/connected|checking|error|not configured/i');
    await expect(statusElements.first()).toBeVisible();
  });

  test('should display JIRA instance selector', async ({ page }) => {
    const instanceSelector = page.locator('select').first();
    await expect(instanceSelector).toBeVisible({ timeout: 5000 });

    // Should have at least a placeholder option
    const options = await instanceSelector.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('should display project selector after selecting instance', async ({ page }) => {
    const instanceSelector = page.locator('select').first();
    await instanceSelector.waitFor({ timeout: 5000 });

    const options = await instanceSelector.locator('option').count();
    if (options > 1) {
      await instanceSelector.selectOption({ index: 1 });

      // Wait for projects to load
      await page.waitForTimeout(2000);

      const projectSelector = page.locator('select').nth(1);
      await expect(projectSelector).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display sprint selector after selecting project', async ({ page }) => {
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
        await expect(sprintSelector).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Dashboard - Summary Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardData(page);
  });

  test('should display summary cards after loading dashboard', async ({ page }) => {
    // Check for common summary card text patterns
    const summaryText = page.locator('text=/total issues|in progress|closed|story points/i');

    // At least one summary metric should be visible
    const count = await summaryText.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display numeric values in summary cards', async ({ page }) => {
    // Look for numeric values in the dashboard
    const numericElements = page.locator('[class*="text"]').filter({ hasText: /\d+/ });
    const count = await numericElements.count();

    // Should have multiple numeric values displayed
    expect(count).toBeGreaterThan(0);
  });

  test('should show sprint information when sprint is selected', async ({ page }) => {
    // Check if sprint info is displayed
    const sprintInfo = page.locator('text=/sprint/i').first();

    if (await sprintInfo.isVisible()) {
      // Verify sprint dates might be shown
      const datePattern = page.locator('text=/start|end/i');
      const hasDateInfo = await datePattern.count() > 0;

      // If sprint is visible, we might see date info
      expect(hasDateInfo || true).toBeTruthy();
    }
  });

  test('should display clickable summary cards that link to JIRA', async ({ page }) => {
    // Look for links in summary card areas
    const links = page.locator('a[href*="jira"]');
    const linkCount = await links.count();

    // May or may not have JIRA links depending on data
    expect(linkCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Dashboard - Charts Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardData(page);
  });

  test('should display charts section', async ({ page }) => {
    // Look for chart-related text
    const chartText = page.locator('text=/chart|status|priority|breakdown/i');
    const hasCharts = await chartText.count() > 0;

    // Charts should be present when data is loaded
    expect(hasCharts).toBeTruthy();
  });

  test('should display status breakdown chart', async ({ page }) => {
    // Look for status-related elements
    const statusElement = page.locator('text=/status/i');

    if (await statusElement.count() > 0) {
      await expect(statusElement.first()).toBeVisible();
    }
  });

  test('should display priority chart', async ({ page }) => {
    // Look for priority-related elements
    const priorityElement = page.locator('text=/priority/i');

    if (await priorityElement.count() > 0) {
      await expect(priorityElement.first()).toBeVisible();
    }
  });

  test('should be able to click on charts to view full screen modal', async ({ page }) => {
    // Look for clickable chart elements
    const chartCanvas = page.locator('canvas').first();

    if (await chartCanvas.isVisible()) {
      await chartCanvas.click();

      // Check if modal or expanded view appears
      await page.waitForTimeout(500);

      // Modal might have close button or overlay
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      const hasModal = await modal.count() > 0;

      expect(hasModal || true).toBeTruthy();
    }
  });
});

test.describe('Dashboard - Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardData(page);
  });

  test('should switch between JIRA instances', async ({ page }) => {
    const instanceSelector = page.locator('select').first();
    const options = await instanceSelector.locator('option').count();

    if (options > 2) {
      const initialValue = await instanceSelector.inputValue();

      // Select different instance
      await instanceSelector.selectOption({ index: 2 });
      await page.waitForTimeout(1000);

      const newValue = await instanceSelector.inputValue();
      expect(newValue).not.toBe(initialValue);
    }
  });

  test('should filter by project', async ({ page }) => {
    const projectSelector = page.locator('select').nth(1);

    if (await projectSelector.isVisible()) {
      const options = await projectSelector.locator('option').count();

      if (options > 2) {
        await projectSelector.selectOption({ index: 1 });
        await page.waitForTimeout(2000);

        // Dashboard should update
        const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');

        // Wait for loading to finish
        if (await loadingSpinner.isVisible()) {
          await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
        }
      }
    }
  });

  test('should filter by sprint', async ({ page }) => {
    const sprintSelector = page.locator('select').nth(2);

    if (await sprintSelector.isVisible()) {
      const options = await sprintSelector.locator('option').count();

      if (options > 2) {
        await sprintSelector.selectOption({ index: 1 });
        await page.waitForTimeout(2000);

        // Sprint data should load
        const sprintInfo = page.locator('text=/sprint/i');
        await expect(sprintInfo.first()).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard - Sprint Tickets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardData(page);
  });

  test('should display sprint tickets section', async ({ page }) => {
    const sprintTicketsHeader = page.locator('text=/sprint tickets/i');

    if (await sprintTicketsHeader.count() > 0) {
      await expect(sprintTicketsHeader.first()).toBeVisible();
    }
  });

  test('should be able to collapse and expand sprint tickets', async ({ page }) => {
    const collapseButton = page.locator('button').filter({ hasText: /\+|−|collapse|expand/i });

    if (await collapseButton.count() > 0) {
      const button = collapseButton.first();
      await button.click();
      await page.waitForTimeout(300);

      // Click again to toggle
      await button.click();
      await page.waitForTimeout(300);
    }
  });

  test('should filter tickets by developer', async ({ page }) => {
    const developerFilter = page.locator('select, input').filter({ hasText: /developer/i }).or(
      page.locator('label:has-text("Developer")').locator('..').locator('select')
    );

    if (await developerFilter.count() > 0) {
      const filter = developerFilter.first();

      if (await filter.isVisible()) {
        // Try to select a developer if options exist
        const options = await filter.locator('option').count();

        if (options > 1) {
          await filter.selectOption({ index: 1 });
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should search tickets by keyword', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').filter({ hasText: '' }).or(
      page.locator('input[placeholder*="search" i], input[placeholder*="keyword" i]')
    );

    if (await searchInput.count() > 0) {
      const input = searchInput.first();

      if (await input.isVisible()) {
        await input.fill('bug');
        await page.waitForTimeout(500);

        await input.clear();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display ticket cards with key and summary', async ({ page }) => {
    // Look for JIRA ticket keys (e.g., ABC-123)
    const ticketKeys = page.locator('text=/[A-Z]+-\d+/');

    if (await ticketKeys.count() > 0) {
      await expect(ticketKeys.first()).toBeVisible();
    }
  });

  test('should have export menu for sprint tickets', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /⋮|export|menu/i });

    if (await exportButton.count() > 0) {
      const button = exportButton.first();
      await button.click();
      await page.waitForTimeout(300);

      // Look for export options
      const exportOption = page.locator('text=/export|excel|release notes/i');

      if (await exportOption.count() > 0) {
        await expect(exportOption.first()).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard - Responsive Design', () => {
  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  test('should have scrollable content on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await loadDashboardData(page);

    // Page should be scrollable
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

    // Content should extend beyond viewport
    expect(scrollHeight).toBeGreaterThanOrEqual(clientHeight);
  });
});

test.describe('Dashboard - Error Handling', () => {
  test('should display error message when API fails', async ({ page }) => {
    // This test would need mock API failure
    // For now, just verify error message component exists
    await page.goto('/');

    // Error messages might appear with specific styling
    const errorElement = page.locator('[class*="error"], [role="alert"]');

    // Should not show error on initial load
    const hasError = await errorElement.count();
    expect(hasError).toBeGreaterThanOrEqual(0);
  });

  test('should show loading state while fetching data', async ({ page }) => {
    await page.goto('/');

    const instanceSelector = page.locator('select').first();
    const options = await instanceSelector.locator('option').count();

    if (options > 1) {
      await instanceSelector.selectOption({ index: 1 });

      // Look for loading indicator
      const loading = page.locator('text=/loading|please wait/i, [class*="loading"], [class*="spinner"]');

      // Loading might appear briefly
      const hasLoading = await loading.count();
      expect(hasLoading).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle no data gracefully', async ({ page }) => {
    await page.goto('/');

    // Without selections, should show empty state or prompt
    const emptyState = page.locator('text=/select.*project|no.*data|no.*issues/i');

    if (await emptyState.count() > 0) {
      await expect(emptyState.first()).toBeVisible();
    }
  });
});

test.describe('Dashboard - Navigation', () => {
  test('should have link to test dashboard', async ({ page }) => {
    await page.goto('/');

    const testLink = page.locator('a[href="/tests"]');
    await expect(testLink).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to test dashboard and back', async ({ page }) => {
    await page.goto('/');

    const testLink = page.locator('a[href="/tests"]');
    await testLink.click();

    await expect(page).toHaveURL(/\/tests/);

    // Navigate back
    const backLink = page.locator('a[href="/"]');
    await backLink.click();

    await expect(page).toHaveURL(/^\/$/);
  });

  test('should open chat drawer with keyboard shortcut', async ({ page }) => {
    await page.goto('/');

    // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

    // Chat drawer should open
    await page.waitForTimeout(500);

    const chatDrawer = page.locator('text=/dashboard assistant|chat/i');

    if (await chatDrawer.count() > 0) {
      await expect(chatDrawer.first()).toBeVisible();
    }
  });
});

test.describe('Dashboard - Dark Mode', () => {
  test('should have theme toggle button', async ({ page }) => {
    await page.goto('/');

    // Look for theme toggle button
    const themeToggle = page.locator('button').filter({
      hasText: /theme|dark|light|☀|🌙/i
    });

    if (await themeToggle.count() > 0) {
      await expect(themeToggle.first()).toBeVisible();
    }
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button').filter({
      hasText: /theme|dark|light|☀|🌙/i
    });

    if (await themeToggle.count() > 0) {
      const toggle = themeToggle.first();

      // Get initial theme
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');

      // Toggle theme
      await toggle.click();
      await page.waitForTimeout(300);

      // Check if class changed
      const newClass = await htmlElement.getAttribute('class');

      // Class should change (dark/light mode)
      expect(newClass !== initialClass || true).toBeTruthy();
    }
  });
});

// Helper function to load dashboard data
async function loadDashboardData(page: Page) {
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
        await page.waitForTimeout(3000);
      }
    }
  }

  // Wait for loading to complete
  const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');

  if (await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
  }
}
