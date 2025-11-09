import { test, expect } from '@playwright/test';

test.describe('JIRA Dashboard - Basic Functionality', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Development Metrics Dashboard|JIRA.*Dashboard/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display instance selector with options', async ({ page }) => {
    await page.goto('/');
    const instanceSelector = page.locator('select').first();
    await expect(instanceSelector).toBeVisible({ timeout: 5000 });

    const options = await instanceSelector.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('should display project selector after selecting instance', async ({ page }) => {
    await page.goto('/');

    const instanceSelector = page.locator('select').first();
    await instanceSelector.waitFor({ timeout: 5000 });

    const options = await instanceSelector.locator('option').count();
    if (options > 1) {
      await instanceSelector.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      const projectSelector = page.locator('select').nth(1);
      await expect(projectSelector).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have link to test dashboard', async ({ page }) => {
    await page.goto('/');
    const testLink = page.locator('a[href="/tests"]').first();
    await expect(testLink).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to test dashboard', async ({ page }) => {
    await page.goto('/');
    const testLink = page.locator('a[href="/tests"]').first();
    await testLink.click();

    await expect(page).toHaveURL(/\/tests/);
    await expect(page.locator('text=/test dashboard|run.*tests/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Test Dashboard', () => {
  test('should load test dashboard page', async ({ page }) => {
    await page.goto('/tests');
    await expect(page.locator('h1, h2').filter({ hasText: /test/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should display test run buttons', async ({ page }) => {
    await page.goto('/tests');
    const runButtons = page.locator('button').filter({ hasText: /run.*test/i });
    const buttonCount = await runButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should have back to dashboard link', async ({ page }) => {
    await page.goto('/tests');
    const backLink = page.locator('a[href="/"]').first();
    await expect(backLink).toBeVisible({ timeout: 5000 });
  });
});
