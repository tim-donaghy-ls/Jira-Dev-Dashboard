import { test as base, Page } from '@playwright/test';

/**
 * Custom fixtures for E2E tests
 * These fixtures provide reusable setup and utilities for tests
 */

type DashboardFixtures = {
  dashboardPage: Page;
  loadedDashboard: Page;
};

export const test = base.extend<DashboardFixtures>({
  /**
   * Fixture that provides a page already navigated to the dashboard
   */
  dashboardPage: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  /**
   * Fixture that provides a page with dashboard data already loaded
   */
  loadedDashboard: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Load dashboard data
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

    await use(page);
  },
});

export { expect } from '@playwright/test';
