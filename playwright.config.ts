import { defineConfig, devices } from '@playwright/test';

/**
 * Seedlings customer journey tests intentionally use an already-running app by default.
 * Set E2E_START_SERVER=1 when you explicitly want Playwright to start Next.js.
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const startServer = process.env.E2E_START_SERVER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  ...(startServer
    ? {
        webServer: {
          command: 'npm run dev -- --hostname 127.0.0.1',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
});
