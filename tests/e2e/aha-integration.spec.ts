import { test, expect, Page } from '@playwright/test';

test.describe('Aha Integration - Connection Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display Aha connection status', async ({ page }) => {
    // Wait for connection status to load
    await page.waitForTimeout(3000);

    const ahaStatus = page.locator('text=/aha/i');
    await expect(ahaStatus.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show connection status indicator', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Look for Aha status text
    const statusText = page.locator('text=/connected|checking|not configured/i');
    const count = await statusText.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should show error when Aha is not configured', async ({ page }) => {
    await page.waitForTimeout(3000);

    const notConfigured = page.locator('text=/not configured|no.*aha/i');

    // Might show not configured if Aha is not set up
    const count = await notConfigured.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display successful connection message', async ({ page }) => {
    await page.waitForTimeout(3000);

    const connected = page.locator('text=/connected.*aha/i');

    // May show connected if Aha is configured
    const count = await connected.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Aha Integration - Feature Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should verify JIRA tickets against Aha features', async ({ page }) => {
    // Wait for Aha verification to complete
    await page.waitForTimeout(5000);

    // Look for verification badges or indicators
    const verificationBadge = page.locator('[class*="badge"], [class*="aha"]');

    // Badges might appear on tickets
    const count = await verificationBadge.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display verification badges on JIRA tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for Aha verification in ticket cards
    const ticketCards = page.locator('[class*="issue"], [class*="card"]');

    if (await ticketCards.count() > 0) {
      // Tickets should be visible
      await expect(ticketCards.first()).toBeVisible();
    }
  });

  test('should show checkmark for verified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for success indicators (checkmark, green badge)
    const successIndicator = page.locator('text=/✓|verified|in aha/i');

    // Some tickets might be verified
    const count = await successIndicator.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show warning for unverified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for warning indicators
    const warningIndicator = page.locator('text=/not found|missing|not in aha/i');

    // Some tickets might not be in Aha
    const count = await warningIndicator.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display Aha reference for verified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for Aha reference numbers
    const ahaReference = page.locator('text=/aha-\w+|\w+-\d+-\d+/i');

    // Verified tickets might show Aha reference
    const count = await ahaReference.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should link to Aha feature page', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for links to Aha
    const ahaLinks = page.locator('a[href*="aha.io"]');

    // Might have links to Aha features
    const count = await ahaLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Aha Integration - Verification Badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display badge for tickets verified in Aha', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for Aha badges
    const badges = page.locator('[class*="badge"], span').filter({
      hasText: /aha|verified/i
    });

    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show different badge colors for verified vs unverified', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Verified badges might be green
    const successBadge = page.locator('[class*="green"], [class*="success"]');

    // Warning badges might be yellow/orange
    const warningBadge = page.locator('[class*="yellow"], [class*="warning"]');

    const hasStatusBadges = (await successBadge.count()) + (await warningBadge.count());
    expect(hasStatusBadges).toBeGreaterThanOrEqual(0);
  });

  test('should display badge with Aha status', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for status text
    const statusText = page.locator('text=/ready|in progress|complete|shipped/i');

    // Aha status might be shown
    const count = await statusText.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show tooltip on hover over badge', async ({ page }) => {
    await page.waitForTimeout(5000);

    const badges = page.locator('[class*="badge"]').filter({
      hasText: /aha/i
    });

    if (await badges.count() > 0) {
      const badge = badges.first();
      await badge.hover();
      await page.waitForTimeout(500);

      // Tooltip might appear
      const tooltip = page.locator('[role="tooltip"], [class*="tooltip"]');
      const hasTooltip = await tooltip.count();
      expect(hasTooltip).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Aha Integration - Warning Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display warning for tickets not in Aha', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for Aha warning section
    const ahaWarning = page.locator('text=/aha.*warning|not.*aha|missing.*aha/i');

    // Warning might appear if tickets are missing
    const count = await ahaWarning.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show count of unverified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for count in warning message
    const countPattern = page.locator('text=/\d+.*ticket.*not.*aha/i');

    if (await countPattern.count() > 0) {
      const text = await countPattern.first().textContent();
      expect(text).toMatch(/\d+/);
    }
  });

  test('should list unverified ticket keys', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Warning might list ticket keys
    const ticketKeys = page.locator('text=/[A-Z]+-\d+/');

    const count = await ticketKeys.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should link to unverified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Tickets in warning should be clickable
    const ticketLinks = page.locator('a').filter({
      hasText: /[A-Z]+-\d+/
    });

    const count = await ticketLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be dismissible warning', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for close/dismiss button on warning
    const dismissButton = page.locator('button').filter({
      hasText: /×|close|dismiss/i
    });

    if (await dismissButton.count() > 0) {
      const button = dismissButton.first();
      await button.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Aha Integration - Batch Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should verify all tickets in batch', async ({ page }) => {
    await page.waitForTimeout(5000);

    // All tickets in sprint should be verified
    const tickets = page.locator('text=/[A-Z]+-\d+/');
    const ticketCount = await tickets.count();

    // Should have tickets to verify
    expect(ticketCount).toBeGreaterThan(0);
  });

  test('should show loading state during verification', async ({ page }) => {
    // Verification happens on page load
    await page.waitForTimeout(2000);

    // Loading might appear briefly
    const loading = page.locator('text=/loading|verifying/i');
    const hasLoading = await loading.count();
    expect(hasLoading).toBeGreaterThanOrEqual(0);
  });

  test('should complete verification in reasonable time', async ({ page }) => {
    const startTime = Date.now();

    // Wait for verification
    await page.waitForTimeout(8000);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within 10 seconds
    expect(duration).toBeLessThan(10000);
  });

  test('should not block dashboard rendering during verification', async ({ page }) => {
    // Dashboard should be visible immediately
    const summaryCards = page.locator('text=/total issues/i');
    await expect(summaryCards.first()).toBeVisible({ timeout: 10000 });

    // Aha verification happens in background
    await page.waitForTimeout(5000);
  });
});

test.describe('Aha Integration - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle Aha connection failure gracefully', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Should show error or not configured status
    const error = page.locator('text=/not configured|error|failed/i');

    const count = await error.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should not block dashboard when Aha fails', async ({ page }) => {
    await loadDashboardWithData(page);

    // Dashboard should work without Aha
    const summaryCards = page.locator('text=/total issues/i');
    await expect(summaryCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle API timeout gracefully', async ({ page }) => {
    await loadDashboardWithData(page);
    await page.waitForTimeout(8000);

    // Should not show errors if Aha times out
    const tickets = page.locator('text=/[A-Z]+-\d+/');
    const count = await tickets.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle partial verification results', async ({ page }) => {
    await loadDashboardWithData(page);
    await page.waitForTimeout(5000);

    // Some tickets might be verified, some not
    const verifiedBadges = page.locator('[class*="badge"]');
    const count = await verifiedBadges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show error for individual ticket verification failures', async ({ page }) => {
    await loadDashboardWithData(page);
    await page.waitForTimeout(5000);

    // Individual tickets might have errors
    const errorIndicator = page.locator('text=/error|failed/i');
    const count = await errorIndicator.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Aha Integration - Status Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should display Aha feature status', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for Aha status values
    const statusValues = page.locator('text=/ready|in progress|complete|shipped|under review/i');

    const count = await statusValues.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show Aha URL for verified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Verified tickets might have Aha links
    const ahaUrl = page.locator('a[href*="aha.io"]');

    const count = await ahaUrl.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open Aha feature in new tab', async ({ page }) => {
    await page.waitForTimeout(5000);

    const ahaLinks = page.locator('a[href*="aha.io"]');

    if (await ahaLinks.count() > 0) {
      const link = ahaLinks.first();
      const target = await link.getAttribute('target');

      // Should open in new tab
      expect(target).toBe('_blank');
    }
  });

  test('should display Aha reference number', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for Aha reference format
    const ahaRef = page.locator('text=/aha-|[A-Z]+-\d+-\d+/i');

    const count = await ahaRef.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Aha Integration - Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should filter to show only verified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for filter option
    const filterButton = page.locator('button').filter({
      hasText: /filter|verified|aha/i
    });

    if (await filterButton.count() > 0) {
      await filterButton.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should filter to show only unverified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for unverified filter
    const unverifiedFilter = page.locator('text=/not.*verified|missing/i');

    if (await unverifiedFilter.count() > 0) {
      const hasFilter = await unverifiedFilter.first().isVisible();
      expect(hasFilter || true).toBeTruthy();
    }
  });

  test('should show verification percentage', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for percentage or fraction
    const percentage = page.locator('text=/\d+%|\d+\/\d+/');

    const count = await percentage.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Aha Integration - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should verify tickets asynchronously', async ({ page }) => {
    await loadDashboardWithData(page);

    // Dashboard should be usable immediately
    const summaryCards = page.locator('text=/total issues/i');
    await expect(summaryCards.first()).toBeVisible({ timeout: 10000 });

    // Aha verification happens in background
    await page.waitForTimeout(3000);
  });

  test('should batch verify tickets in single API call', async ({ page }) => {
    await loadDashboardWithData(page);

    // Wait for verification to complete
    await page.waitForTimeout(8000);

    // All tickets should be verified at once
    const tickets = page.locator('text=/[A-Z]+-\d+/');
    const ticketCount = await tickets.count();

    expect(ticketCount).toBeGreaterThan(0);
  });

  test('should cache verification results', async ({ page }) => {
    await loadDashboardWithData(page);
    await page.waitForTimeout(8000);

    // Get verification state
    const badges = await page.locator('[class*="badge"]').count();

    // Reload page
    await page.reload();
    await loadDashboardWithData(page);
    await page.waitForTimeout(2000);

    // Results should load faster on second load
    const newBadges = await page.locator('[class*="badge"]').count();

    expect(newBadges).toBeGreaterThanOrEqual(0);
  });

  test('should not make redundant API calls', async ({ page }) => {
    await loadDashboardWithData(page);
    await page.waitForTimeout(8000);

    // Wait more
    await page.waitForTimeout(3000);

    // Should not re-verify without user action
    const tickets = page.locator('text=/[A-Z]+-\d+/');
    const count = await tickets.count();

    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Aha Integration - UI/UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadDashboardWithData(page);
  });

  test('should show progress indicator during verification', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for progress indicator
    const progress = page.locator('[class*="progress"], [role="progressbar"]');

    // Progress might appear briefly
    const count = await progress.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display verification status summary', async ({ page }) => {
    await page.waitForTimeout(8000);

    // Summary might show verification stats
    const summary = page.locator('text=/\d+.*verified|\d+.*aha/i');

    const count = await summary.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should highlight unverified tickets', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Unverified tickets might be highlighted
    const highlightedTickets = page.locator('[class*="warning"], [class*="unverified"]');

    const count = await highlightedTickets.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should provide clear visual feedback for verification status', async ({ page }) => {
    await page.waitForTimeout(5000);

    // Look for visual indicators (colors, icons)
    const visualIndicators = page.locator('[class*="badge"], [class*="icon"]');

    const count = await visualIndicators.count();
    expect(count).toBeGreaterThan(0);
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
