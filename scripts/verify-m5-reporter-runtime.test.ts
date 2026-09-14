/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or modification
 * of this software is strictly prohibited.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { repairEffectivenessTriggers039 } from '../src/core/storage/migrations/039_repair_effectiveness_evidence'

// The parent uses the canonical unit runner, but the child must use only
// Playwright's own CJS TypeScript loader, as the real reporting job does.
test('Chunk6 migration 039 starts the actual Playwright reporter and persists current reporting across reopen', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-c6-playwright-reporter-'))
  const dbPath = path.join(root, 'reporter.db')
  const reportPath = path.join(root, 'test-results.json')
  const source = path.resolve(__dirname, '..')
  const config = path.join(root, 'playwright.config.cjs')
  fs.writeFileSync(config, `module.exports = ${JSON.stringify({
    testDir: root, testMatch: 'reporter.spec.ts', workers: 1, retries: 0,
    outputDir: path.join(root, 'results'),
    reporter: [['json', { outputFile: reportPath }],
      [path.join(source, 'src/pipeline/ForgeStreamingReporter.ts'), { dbPath, appName: 'm5-loader-proof' }]],
  })}`)
  fs.writeFileSync(path.join(root, 'reporter.spec.ts'), `
    const {test,expect,chromium} = require(${JSON.stringify(require.resolve('@playwright/test'))});
    test('current reporter runtime proof', async () => {
      expect(process.execArgv.some(arg => /tsx/.test(arg))).toBe(false);
      if (process.env.FORGE_M5_REPORTER_BROWSER === '1') {
        const browser = await chromium.launch({headless:true});
        try { const page = await browser.newPage(); await page.setContent('<button>Observed</button>');
          await page.getByRole('button',{name:'Observed'}).click();
          expect(await page.getByRole('button').textContent()).toBe('Observed');
        } finally { await browser.close(); }
      }
    });`)
  const env = { ...process.env, CI: '1', DB_PATH: dbPath }
  delete env.NODE_OPTIONS
  delete env.DATABASE_URL
  const expectedTriggers = await repairEffectivenessTriggers039()
  const receipts: unknown[] = []
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath)
    const runId = `m5-reporter-${path.basename(root)}-${attempt}`
    const child = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config', config], {
      cwd: root, env: { ...env, CURRENT_RUN_ID: runId }, encoding: 'utf8', timeout: 120000,
    })
    fs.writeFileSync(path.join(root, `runtime-${attempt}.log`), child.stdout + child.stderr)
    assert.equal(child.error, undefined, String(child.error))
    assert.equal(child.status, 0, `Actual Playwright reporter failed; evidence ${root}\n${child.stdout}\n${child.stderr}`)
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    assert.deepEqual(report.errors, [])
    assert.equal(report.stats.expected, 1)
    assert.equal(report.stats.unexpected, 0)
    assert.equal(report.stats.skipped, 0)
    assert.equal(report.stats.flaky, 0)
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true })
    try {
      assert.equal(db.prepare('SELECT name FROM kysely_migration ORDER BY name DESC LIMIT 1').get().name, '039_repair_effectiveness_evidence')
      for (const [name, sql] of Object.entries(expectedTriggers)) {
        assert.equal(db.prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name=?").get(name).sql, sql)
      }
      const run = db.prepare('SELECT * FROM runs WHERE run_id=?').get(runId)
      assert.equal(run.lifecycle, 'completed'); assert.equal(run.status, 'passed')
      assert.equal(run.total_tests, 1); assert.equal(run.passed, 1)
      const results = db.prepare('SELECT * FROM test_results WHERE run_id=?').all(runId)
      assert.equal(results.length, 1); assert.equal(results[0].status, 'passed')
      assert.equal(db.prepare('SELECT count(*) AS n FROM repair_effectiveness_evidence').get().n, 0)
      receipts.push({ runId, currentReport: report.stats, migration: '039', exactTriggers: true, resultRows: 1 })
    } finally { db.close() }
  }
  fs.writeFileSync(path.join(root, 'receipt.json'), JSON.stringify({ status: 'PASS', source, browser: env.FORGE_M5_REPORTER_BROWSER === '1', receipts }, null, 2))
  console.log(`Actual Playwright reporter proof: ${root}`)
})
