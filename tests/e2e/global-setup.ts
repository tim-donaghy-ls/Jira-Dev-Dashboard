import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests in tests/e2e directory
 * This runs once before all tests to prepare the test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('\n=== E2E Test Suite Setup ===\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the app to ensure it's running
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  try {
    console.log('Checking if application is running...');
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('✓ Frontend is accessible at', baseURL);

    // Check if backend is accessible
    try {
      const backendURL = 'http://localhost:8080/api/instances';
      const response = await page.goto(backendURL, { timeout: 10000 });

      if (response && response.ok()) {
        console.log('✓ Backend API is accessible at http://localhost:8080');
      } else {
        console.warn('⚠ Backend API returned non-OK status');
      }
    } catch (error) {
      console.warn('⚠ Backend API check failed - some tests may fail');
      console.warn('  Make sure backend is running with: SKIP_AUTH=true bash start.sh');
    }

    // Check authentication status
    await page.goto(baseURL);
    await page.waitForTimeout(2000);

    const hasAuthError = await page.locator('text=/unauthorized|sign in|login/i').count() > 0;

    if (hasAuthError) {
      console.error('✗ Authentication is enabled!');
      console.error('  Please restart the application with: SKIP_AUTH=true bash start.sh');
      throw new Error('Authentication must be disabled for E2E tests');
    } else {
      console.log('✓ Authentication is properly disabled');
    }

    console.log('✓ Application is ready for E2E tests\n');
    console.log('=== Starting Test Execution ===\n');
  } catch (error) {
    console.error('\n✗ Failed to load application:', error);
    console.error('\nPlease ensure:');
    console.error('  1. Application is running: SKIP_AUTH=true bash start.sh');
    console.error('  2. Frontend is accessible at', baseURL);
    console.error('  3. Backend is accessible at http://localhost:8080');
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
