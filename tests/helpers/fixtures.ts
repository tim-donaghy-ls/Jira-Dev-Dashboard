import { Page } from '@playwright/test';
import dashboardData from '../fixtures/dashboard-data.json';
import ahaFeatures from '../fixtures/aha-features.json';
import githubActivity from '../fixtures/github-activity.json';

/**
 * Set up API mocking with realistic test fixtures
 * Call this before navigating to the page in your tests
 */
export async function setupTestFixtures(page: Page) {
  // Mock JIRA dashboard API
  await page.route('**/api/dashboard**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboardData)
    });
  });

  // Mock Aha verification API
  await page.route('**/api/aha/verify**', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData && postData.jiraKeys) {
      const results: any = {};
      postData.jiraKeys.forEach((key: string) => {
        results[key] = ahaFeatures.verification_results[key as keyof typeof ahaFeatures.verification_results] || {
          verified: false,
          ahaReference: null,
          ahaUrl: null,
          ahaStatus: null
        };
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results)
      });
    } else {
      await route.fulfill({ status: 400 });
    }
  });

  // Mock Aha connection test
  await page.route('**/api/aha/test**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        connected: true,
        message: 'Aha connection successful'
      })
    });
  });

  // Mock GitHub activity API
  await page.route('**/api/github/activity**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(githubActivity)
    });
  });

  // Mock GitHub connection test
  await page.route('**/api/github/test**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        connected: true,
        repositories: githubActivity.repositories.length
      })
    });
  });

  // Mock projects API
  await page.route('**/api/projects**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { key: 'DASH', name: 'Dashboard Project' }
      ])
    });
  });

  // Mock sprints API
  await page.route('**/api/sprints**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 24,
          name: 'Sprint 24',
          state: 'active',
          startDate: '2025-11-01T00:00:00Z',
          endDate: '2025-11-15T00:00:00Z'
        }
      ])
    });
  });

  // Mock instances API
  await page.route('**/api/instances**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { name: 'Primary', url: 'https://jira.example.com' }
      ])
    });
  });
}

/**
 * Set up fixtures with delayed responses to simulate real API latency
 * Useful for testing loading states and performance
 */
export async function setupTestFixturesWithDelay(page: Page, delayMs: number = 500) {
  await page.route('**/api/**', async (route) => {
    await new Promise(resolve => setTimeout(resolve, delayMs));

    if (route.request().url().includes('/dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardData)
      });
    } else if (route.request().url().includes('/aha/verify')) {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData && postData.jiraKeys) {
        const results: any = {};
        postData.jiraKeys.forEach((key: string) => {
          results[key] = ahaFeatures.verification_results[key as keyof typeof ahaFeatures.verification_results] || {
            verified: false,
            ahaReference: null,
            ahaUrl: null,
            ahaStatus: null
          };
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(results)
        });
      } else {
        await route.fulfill({ status: 400 });
      }
    } else {
      await route.continue();
    }
  });
}

/**
 * Set up fixtures that simulate API errors
 * Useful for testing error handling
 */
export async function setupTestFixturesWithErrors(page: Page) {
  await page.route('**/api/dashboard**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' })
    });
  });

  await page.route('**/api/aha/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Service unavailable' })
    });
  });
}
