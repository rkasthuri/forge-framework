import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,  // ← change undefined to 4
  reporter: [
    ['html', { outputFolder: 'reports/playwright-report', open: 'never' }],  // ← add open:'never'
    ['json', { outputFile: 'reports/test-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.CI ? true : false,   // ← was false, now CI-aware
    actionTimeout:     process.env.CI ? 30000 : 15000,  // ← was 15000 flat
    navigationTimeout: process.env.CI ? 30000 : 15000,  // ← add this
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
    name: 'api',
    testMatch: '**/api.spec.ts',
    use: { baseURL: 'https://restful-booker.herokuapp.com' },
    headless: true,  // ← no browser needed for API tests
    },
  ],
});