/**
 * run.ts — Test Orchestrator
 * ─────────────────────────────────────────────────────────────
 * Runs the full pipeline sequentially regardless of test failures:
 *   1. playwright test  (failures are OK — we want to triage them)
 *   2. ai-triage.ts     (always runs)
 *   3. results-store.ts (always runs)
 *
 * Usage:
 *   npx tsx src/run.ts           — run all tests
 *   npx tsx src/run.ts --smoke   — run smoke tests only
 * ─────────────────────────────────────────────────────────────
 */

import { execSync } from 'child_process';

// Prevent HTML report from auto-opening and blocking the pipeline
process.env['PLAYWRIGHT_HTML_OPEN'] = 'never';

const isSmokeRun = process.argv.includes('--smoke');

const playwrightCmd = isSmokeRun
  ? 'npx playwright test loginFast.spec.ts e2e-journey.spec.ts'
  : 'npx playwright test';

function run(label: string, cmd: string): number {
  console.log(`\n▶  ${label}`);
  console.log(`   ${cmd}\n`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return 0;
  } catch (err: any) {
    // execSync throws on non-zero exit — that's fine for test failures
    return err.status ?? 1;
  }
}

// Step 1 — Run tests (exit code ignored — failures are expected)
const testExit = run('Running Playwright tests...', playwrightCmd);

if (testExit === 0) {
  console.log('\n✅ All tests passed.');
} else {
  console.log(`\n⚠️  Tests completed with ${testExit !== 1 ? testExit + ' failures' : 'failures'} — continuing to triage...`);
}

// Step 2 — Always triage (even if tests failed)
run('Running AI Triage / RCA...', 'npx tsx src/ai-triage.ts');

// Step 3 — Always store results
run('Storing results...', 'npx tsx src/results-store.ts');

console.log('\n🏁 Pipeline complete.\n');
