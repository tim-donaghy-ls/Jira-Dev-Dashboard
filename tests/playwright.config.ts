import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for JIRA Dev Dashboard
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**', '**/frontend/**'],

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Global timeout for each test */
  timeout: 15000, // 15 seconds for more complex tests

  /* Maximum time a test suite can run */
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  /* Global setup */
  globalSetup: './e2e/global-setup.ts',

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Action timeout */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',

  /* Note: E2E tests require the application to be running with authentication disabled.
   *
   * To run E2E tests:
   * 1. From the project root: SKIP_AUTH=true bash start.sh
   * 2. In another terminal:
   *    - Run all tests: npx playwright test --config=tests/playwright.config.ts
   *    - Run specific file: npx playwright test tests/e2e/dashboard.spec.ts
   *    - Run with UI: npx playwright test --config=tests/playwright.config.ts --ui
   *    - Run in debug mode: npx playwright test --config=tests/playwright.config.ts --debug
   *
   * The SKIP_AUTH environment variable must be set when starting the application server,
   * not just when running Playwright tests.
   *
   * Environment Requirements:
   * - Frontend: http://localhost:3000
   * - Backend: http://localhost:8080
   * - SKIP_AUTH=true (authentication disabled)
   */
});
