import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * This runs once before all tests to prepare the test environment
 */
async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the app to ensure it's running
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  try {
    // Wait for the app to be ready
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✓ Application is running and ready for E2E tests');
  } catch (error) {
    console.error('✗ Failed to load application:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
