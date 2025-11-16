import { Page, expect } from '@playwright/test';

/**
 * Helper utilities for E2E tests
 */

/**
 * Load dashboard with data by selecting instance, project, and sprint
 */
export async function loadDashboardData(page: Page) {
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

  // Additional wait for async data
  await page.waitForTimeout(2000);
}

/**
 * Open the AI chat drawer
 */
export async function openChatDrawer(page: Page) {
  // Try keyboard shortcut first
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.waitForTimeout(500);

  // Verify drawer is open
  const drawer = page.locator('text=/dashboard assistant/i');

  if ((await drawer.count()) === 0) {
    // Try clicking button if shortcut didn't work
    const chatButton = page.locator('button').filter({
      hasText: /chat|assistant/i,
    });

    if ((await chatButton.count()) > 0) {
      await chatButton.first().click();
      await page.waitForTimeout(500);
    }
  }

  // Ensure drawer is visible
  await expect(drawer.first()).toBeVisible({ timeout: 3000 });
}

/**
 * Close the AI chat drawer
 */
export async function closeChatDrawer(page: Page) {
  const closeButton = page.locator('button').filter({
    has: page.locator('svg'),
  }).last();

  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Send a message in the chat drawer
 */
export async function sendChatMessage(page: Page, message: string) {
  const textarea = page.locator('textarea');
  await textarea.fill(message);
  await textarea.press('Enter');
  await page.waitForTimeout(1000);
}

/**
 * Wait for chat response
 */
export async function waitForChatResponse(page: Page, timeout: number = 10000) {
  await page.waitForTimeout(timeout);
}

/**
 * Select a specific JIRA instance
 */
export async function selectInstance(page: Page, instanceIndex: number) {
  const instanceSelector = page.locator('select').first();
  await instanceSelector.selectOption({ index: instanceIndex });
  await page.waitForTimeout(2000);
}

/**
 * Select a specific project
 */
export async function selectProject(page: Page, projectIndex: number) {
  const projectSelector = page.locator('select').nth(1);
  await projectSelector.selectOption({ index: projectIndex });
  await page.waitForTimeout(2000);
}

/**
 * Select a specific sprint
 */
export async function selectSprint(page: Page, sprintIndex: number) {
  const sprintSelector = page.locator('select').nth(2);
  await sprintSelector.selectOption({ index: sprintIndex });
  await page.waitForTimeout(3000);

  // Wait for loading
  const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');
  if (await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
  }
}

/**
 * Filter sprint tickets by developer
 */
export async function filterByDeveloper(page: Page, developerName: string) {
  const developerFilter = page.locator('select').filter({ hasText: /all|developer/i }).or(
    page.locator('label').filter({ hasText: /developer/i }).locator('..').locator('select')
  );

  if ((await developerFilter.count()) > 0) {
    const filter = developerFilter.first();
    await filter.selectOption({ label: developerName });
    await page.waitForTimeout(500);
  }
}

/**
 * Search tickets by keyword
 */
export async function searchTickets(page: Page, keyword: string) {
  const searchInput = page.locator('input[type="text"]').filter({ hasText: '' }).or(
    page.locator('input[placeholder*="search" i], input[placeholder*="keyword" i]')
  );

  if ((await searchInput.count()) > 0) {
    const input = searchInput.first();
    await input.fill(keyword);
    await page.waitForTimeout(500);
  }
}

/**
 * Click on a developer row in workload table
 */
export async function expandDeveloperRow(page: Page, developerName: string) {
  const developerRow = page.locator('tbody tr').filter({
    has: page.locator(`td:has-text("${developerName}")`),
  });

  if ((await developerRow.count()) > 0) {
    await developerRow.first().click();
    await page.waitForTimeout(500);
  }
}

/**
 * Toggle theme (dark/light mode)
 */
export async function toggleTheme(page: Page) {
  const themeToggle = page.locator('button').filter({
    hasText: /theme|dark|light|☀|🌙/i,
  });

  if ((await themeToggle.count()) > 0) {
    await themeToggle.first().click();
    await page.waitForTimeout(300);
  }
}

/**
 * Collapse or expand a section
 */
export async function toggleSection(page: Page, sectionName: string) {
  const sectionHeader = page.locator(`h3:has-text("${sectionName}")`);

  if ((await sectionHeader.count()) > 0) {
    const collapseButton = sectionHeader.locator('..').locator('button').first();
    await collapseButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Wait for connection status to load
 */
export async function waitForConnectionStatus(page: Page, service: 'JIRA' | 'GitHub' | 'Aha') {
  const statusLocator = page.locator(`text=/connected.*${service}|${service}.*connected/i`);
  await page.waitForTimeout(3000);
}

/**
 * Check if element is visible with custom timeout
 */
export async function isVisibleWithTimeout(page: Page, selector: string, timeout: number = 5000): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string | null> {
  try {
    const element = page.locator(selector);
    if ((await element.count()) > 0) {
      return await element.first().textContent();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Click if visible
 */
export async function clickIfVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      await element.click();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingComplete(page: Page) {
  const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"], text=/loading/i');

  if (await loadingSpinner.isVisible()) {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
  }

  await page.waitForTimeout(500);
}

/**
 * Get count of elements matching selector
 */
export async function getElementCount(page: Page, selector: string): Promise<number> {
  try {
    return await page.locator(selector).count();
  } catch {
    return 0;
  }
}

/**
 * Check if any element in array is visible
 */
export async function isAnyVisible(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    if (await isVisibleWithTimeout(page, selector, 1000)) {
      return true;
    }
  }
  return false;
}

/**
 * Navigate to test dashboard
 */
export async function navigateToTestDashboard(page: Page) {
  const testLink = page.locator('a[href="/tests"]');
  await testLink.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate back to main dashboard
 */
export async function navigateToMainDashboard(page: Page) {
  const backLink = page.locator('a[href="/"]');
  await backLink.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Take screenshot with custom name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Set viewport size for responsive testing
 */
export async function setViewport(page: Page, preset: 'mobile' | 'tablet' | 'desktop') {
  const viewports = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 },
  };

  await page.setViewportSize(viewports[preset]);
  await page.waitForTimeout(500);
}

/**
 * Mock API response (for error testing)
 */
export async function mockAPIError(page: Page, endpoint: string) {
  await page.route(`**/${endpoint}`, (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });
}

/**
 * Clear chat messages
 */
export async function clearChatMessages(page: Page) {
  const clearButton = page.locator('button').filter({ hasText: /clear/i });

  if ((await clearButton.count()) > 0) {
    await clearButton.first().click();
    await page.waitForTimeout(500);
  }
}

/**
 * Get all ticket keys from page
 */
export async function getTicketKeys(page: Page): Promise<string[]> {
  const ticketElements = page.locator('text=/[A-Z]+-\\d+/');
  const count = await ticketElements.count();
  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await ticketElements.nth(i).textContent();
    if (text) {
      const match = text.match(/[A-Z]+-\d+/);
      if (match) {
        keys.push(match[0]);
      }
    }
  }

  return [...new Set(keys)]; // Remove duplicates
}

/**
 * Check if dashboard data is loaded
 */
export async function isDashboardLoaded(page: Page): Promise<boolean> {
  const indicators = [
    'text=/total issues/i',
    'text=/story points/i',
    'table tbody tr',
    'canvas',
  ];

  return await isAnyVisible(page, indicators);
}

/**
 * Get connection statuses
 */
export async function getConnectionStatuses(page: Page): Promise<{
  jira: string | null;
  github: string | null;
  aha: string | null;
}> {
  await page.waitForTimeout(3000);

  const jiraStatus = await getTextContent(page, 'text=/jira.*connected|connected.*jira/i');
  const githubStatus = await getTextContent(page, 'text=/github.*connected|connected.*github/i');
  const ahaStatus = await getTextContent(page, 'text=/aha.*connected|connected.*aha/i');

  return {
    jira: jiraStatus,
    github: githubStatus,
    aha: ahaStatus,
  };
}
