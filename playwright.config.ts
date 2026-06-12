import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './src/apps',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { outputFolder: 'reports/playwright-report', open: 'never' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['list'],
    ['./src/platform/platform-reporter.ts'],
  ],
  use: {
    baseURL: 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.CI ? true : false,
    actionTimeout:     process.env.CI ? 30000 : 15000,
    navigationTimeout: process.env.CI ? 30000 : 15000,
  },
  projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    testIgnore: ['**/api.spec.ts', '**/generated/**'],
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
    testIgnore: ['**/api.spec.ts', '**/generated/**'],
  },
  {
    name: 'api',
    testMatch: '**/api.spec.ts',
    use: {
      baseURL: 'https://restful-booker.herokuapp.com',
    },
  },
  ],
});
