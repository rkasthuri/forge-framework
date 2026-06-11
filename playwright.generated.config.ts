/**
 * playwright.generated.config.ts
 * -------------------------------------------------------------
 * Minimal config for validating generated tests in src/tests/generated/.
 * Used by the platform's Save & Run button and for direct CLI validation.
 *
 * Does NOT write to run-history.json -- validation only, not a tracked run.
 *
 * Migration convention:
 *   Once a generated test is merged into a main spec file, move it to
 *   src/tests/generated/migrated/ -- this folder is excluded below so
 *   migrated tests don't re-execute alongside newly generated ones.
 *
 * Usage:
 *   npx playwright test tc066-login.spec.ts --config=playwright.generated.config.ts --project=chromium
 *   npx playwright test --config=playwright.generated.config.ts   <- run all NEW generated tests
 * -------------------------------------------------------------
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir:       './src/tests/generated',
  testIgnore:    ['**/migrated/**'],   // migrated tests live in main spec files -- skip here
  fullyParallel: false,
  retries:       0,           // fail fast -- we want to see what needs fixing
  workers:       1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/generated-test-results.json' }],
  ],
  use: {
    baseURL:           'https://www.saucedemo.com',
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    headless:          false,
    actionTimeout:     15000,
    navigationTimeout: 15000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
