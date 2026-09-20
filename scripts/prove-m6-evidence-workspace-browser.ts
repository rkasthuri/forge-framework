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

import * as fs from 'node:fs'
import * as path from 'node:path'
import express from 'express'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import type { EvidenceWorkspaceSources } from '../forge-ui/server/context/CanonicalEvidenceWorkspaceController'
import { createEvidenceWorkspaceRoute } from '../forge-ui/server/routes/projects'
import { serializeCanonicalExecutionResultsRead } from '../forge-ui/src/api/resultsContract'

const assembledAt = '2026-09-17T12:00:00.000Z'
const output = path.resolve(process.argv[2] ?? 'notes/review-scratch/m6-evidence-workspace-browser')
const hash = (value: string) => value.repeat(64)

type ScenarioName = 'project-no-evidence' | 'readiness-blocked' | 'result-diagnostic-refusal' | 'completed-repair' | 'malformed-context' | 'cross-project-reference' | 'cross-project-result' | 'missing-historical-target' | 'missing-exact-target' | 'source-unavailable' | 'integrity-invalid'

let activeScenario: ScenarioName = 'project-no-evidence'

function diagnostic(integrityInvalid = false) {
  const evidenceHash = hash(integrityInvalid ? '9' : 'e')
  return {
    state: 'available',
    identity: { projectId: 'product', executionId: 'execution-1', runId: 'run-1', itemOrdinal: 1, evidenceSchemaVersion: 'forge.m4.diagnostic-evidence/v1' },
    evidenceSchemaVersion: 'forge.m4.diagnostic-evidence/v1', evidenceHash,
    classifierVersion: 'forge.m4.diagnostic-classifier/v1',
    outcome: integrityInvalid
      ? { schemaVersion: 'forge.m4.diagnostic-outcome/v1', evidenceSchemaVersion: 'forge.m4.diagnostic-evidence/v1', classifierVersion: 'forge.m4.diagnostic-classifier/v1', evidenceHash, kind: 'refusal', refusalCode: 'integrity_invalid', integrityFindings: ['diagnostic_authority_binding_invalid'], explanationCode: 'diagnostic_integrity_validation_failed', explanationParameters: {} }
      : { schemaVersion: 'forge.m4.diagnostic-outcome/v1', evidenceSchemaVersion: 'forge.m4.diagnostic-evidence/v1', classifierVersion: 'forge.m4.diagnostic-classifier/v1', evidenceHash, kind: 'refusal', refusalCode: 'insufficient_evidence', explanationCode: 'diagnostic_predicates_not_satisfied', explanationParameters: {} },
    displayString: integrityInvalid ? 'Diagnostic integrity validation failed.' : 'Evidence was insufficient for a bounded diagnosis.',
  }
}

function resultRead() {
  return { kind: 'ok', projection: {
    availability: 'available', headlineOutcome: 'failed',
    execution: { executionId: 'execution-1', lifecycle: 'completed', outcome: 'failed', reasonCode: 'result_failed', acceptedAt: assembledAt, terminalAt: assembledAt, manifestCount: 1, definitionAuthority: { schemaVersion: 2, testSetId: 'set-1', revision: 4, modelRowId: 7, modelVersion: '1.0.0', supportSealHash: hash('a'), routeEvidenceIdentityHash: hash('b'), authenticationExpectationIdentityHash: hash('c') }, selectionAuthority: { kind: 'suite_revision', suiteId: 'suite-11111111-1111-1111-1111-111111111111', suiteRevision: 3, suiteContentHash: hash('9'), name: 'Exact Suite', purpose: 'sanity' } },
    run: { runId: 'run-1', lifecycle: 'completed', outcome: 'failed', reasonCode: 'action_failed', startedAt: assembledAt, terminalAt: assembledAt, expectedResultCount: 1, observedResultCount: 1, aggregateCounts: { passed: 0, failed: 1, couldNotVerify: 0 } },
    items: [{ itemOrdinal: 1, definitionId: 'definition-1', executablePlanHash: hash('d'), result: { state: 'result_observed', resultId: 'result-1', outcome: 'failed', reasonCode: 'action_failed', safeMessage: null, durationMs: 12, oracleKind: 'subject_observable', observedSubjectId: 'subject-1' }, diagnostic: diagnostic(activeScenario === 'integrity-invalid') }],
    integrityWarnings: [],
  } }
}

function exactDefinition(projectId = 'product') {
  return { rowId: 44, contentHash: hash('f'), testSet: { projectId, testSetId: 'set-1', revision: 4 }, definition: { definitionId: 'definition-1', title: 'Historical definition', provenance: { supportingObservationIds: ['observation-1'] }, materialUnknowns: [], confidenceLimitations: [] } }
}

function completedRepair() {
  return {
    entry: { entryId: 'entry-1', projectId: 'product', proposalId: 'proposal-1', originalEvidence: { executionId: 'execution-before', runId: 'run-before', resultId: 'result-before', itemOrdinal: 1 }, request: {
      source: { modelRowId: 7, modelVersion: '1.0.0', modelContentHash: hash('7'), selector: { value: '#old' } },
      candidate: { modelRowId: 8, modelVersion: '2.0.0', modelContentHash: hash('8'), selector: { value: '#new' } },
    } },
    proposal: { proposalId: 'proposal-1', proposalHash: hash('1'), source: { selector: { value: '#old' }, modelVersion: '1.0.0', modelRowId: 7, sourceSubjectId: 'subject-old', targetSubjectId: 'subject-new' }, candidate: { selector: { value: '#new' }, modelVersion: '2.0.0', modelRowId: 8, sourceSubjectId: 'subject-old', targetSubjectId: 'subject-new' } }, originalResult: { outcome: 'failed' },
    decision: { decision: 'approve', decisionId: 'decision-1', decisionHash: hash('2'), decidedBy: { actorId: 'reviewer' } }, supersession: { authorityId: 'supersession-1', authorityHash: hash('3') },
    origin: { testSetRowId: 45, resultingDefinitionAuthority: { testSetId: 'set-repaired', testSetRevision: 5, definitionId: 'definition-1' } },
    execution: { executionId: 'execution-after', terminal: true, aggregation: { outcome: 'failed' }, result: { result_id: 'result-after', run_id: 'run-after', execution_item_ordinal: 1, outcome: 'failed', status: 'failed' } },
    comparison: { comparisonId: 'comparison-1', evidenceHash: hash('4'), state: 'REPAIR_CONFIRMED', reason: 'target_action_completed' },
    disposition: { dispositionId: 'disposition-1', state: 'bounded_repair_resolved', decision: { action: 'resolve_bounded_repair' }, effectiveness: { comparisonId: 'comparison-1' } },
    nextActions: [], executionIntentKey: 'repair-entry-1', operationReadiness: { state: 'current', code: null }, integrity: 'valid',
  }
}

function readinessOwner() {
  const blocked = activeScenario === 'readiness-blocked'
  return { data: { project: { id: 'product', name: 'product' }, decisions: [{
    id: 'observe_application', label: 'Observe the application', state: blocked ? 'blocked' : 'supported_with_constraints',
    explanation: blocked ? 'The owner recorded a blocking observation outcome.' : 'The owner recorded bounded observation support.',
    supportingEvidence: [{ kind: 'observation', id: 'observation-1', label: 'Observation observation-1', href: '/application/observations?project=product&observation=observation-1', integrity: 'not_evaluated', freshness: 'not_evaluated' }],
    blockers: blocked ? ['Authentication did not establish accepted application access.'] : [],
    unknowns: ['Future target availability is unknown.'], limitations: ['Freshness is not evaluated.'], preventedStrongerState: 'Fresh evidence is required.',
    safeNextAction: blocked ? null : { actionId: 'readiness-observe_application', label: 'Review the source observation', explanation: 'Inspect bounded evidence.', href: '/application/observations?project=product&observation=observation-1' },
  }] } }
}

const sources: EvidenceWorkspaceSources = {
  readInventory: async () => ({ total: 0 }),
  readEvidenceInventory: async () => {
    if (activeScenario === 'source-unavailable') throw new Error('offline')
    return { authority: 'canonical_product', page: { projectTotal: 0 } }
  },
  readResults: async (_projectId, executionId) => activeScenario === 'missing-historical-target' || activeScenario === 'cross-project-result' || executionId !== 'execution-1' ? { kind: 'not_found' } : resultRead(),
  readExactDefinition: async () => activeScenario === 'cross-project-reference' ? exactDefinition('other') : exactDefinition(),
  readRepair: async () => activeScenario === 'completed-repair' ? completedRepair() : null,
  readExactAppModel: async (projectId, rowId, version, fingerprint) => activeScenario !== 'missing-exact-target' && projectId === 'product' && ((rowId === 7 && version === '1.0.0') || (rowId === 8 && version === '2.0.0'))
    && (fingerprint === null || fingerprint === hash(String(rowId)))
    ? { kind: 'ok', model: { rowId, appName: projectId, version, validation: 'valid', integrity: 'verified', modelFingerprint: hash(String(rowId)) } } : { kind: 'not_found' },
  readExactObservation: async (projectId, observationId) => activeScenario !== 'missing-exact-target' && projectId === 'product' && observationId === 'observation-1'
    ? { kind: 'ok', observation: { projectId, observationId, integrity: 'verified' } } : { kind: 'not_found' },
  readReadiness: async () => readinessOwner(),
  readExactSuite: async projectId => ({ schemaVersion: 1, projectId, suiteId: 'suite-11111111-1111-1111-1111-111111111111', revision: 3, contentHash: hash('9'), name: 'Exact Suite', purpose: 'sanity' }),
  now: () => assembledAt,
}

function presentedModel(rowId: number, version: string) {
  return {
    rowId, appName: 'product', version, lifecycle: rowId === 8 ? 'active' : 'superseded', createdAt: assembledAt, sourceCrawlAt: assembledAt,
    sourceObservation: {
      id: 'observation-1', available: true, outcome: 'completed', startedAt: assembledAt, completedAt: assembledAt,
      href: '/application/observations?project=product&observation=observation-1&exact=true',
    },
    evidenceState: 'crawled', validation: 'valid', integrity: 'verified', modelFingerprint: hash(String(rowId)),
    projection: rowId === 8 ? 'current' : 'not_evaluated', freshness: 'not_evaluated', coverage: 'unknown',
    subjects: [{ id: `subject-${rowId}`, kind: 'page', routePath: `/model-${rowId}`, basis: 'direct_observation', evidenceId: 'observation-1', derivedClassification: null }],
    recovery: null, limitations: [], unknowns: [], blockers: [],
    recommendation: {
      action: 'Review the source observation', because: 'Inspect the exact source.', destination: 'observation-1',
      href: '/application/observations?project=product&observation=observation-1&exact=true',
    },
  }
}

const exactObservation = {
  observationId: 'observation-1', projectId: 'product', runId: 'run-1', historyPosition: 'historical',
  run: { lifecycle: 'completed', completeness: 'complete', startedAt: assembledAt, terminalAt: assembledAt }, outcome: 'present',
  subject: 'inventory-page', predicate: 'page.discovered', method: { id: 'browser_dom_inspection', version: '1' },
  boundary: { schemaVersion: 'forge-observation-boundary/v1', kind: 'document', scope: { path: '/inventory' }, startedAt: assembledAt, endedAt: assembledAt, completion: 'complete', policyId: 'fixture', policyVersion: '1' },
  capturedAt: assembledAt, provenanceClass: 'native', reasonCode: null, artifactIds: ['artifact-1'],
  sourceModels: [{ rowId: 7, version: '1.0.0', lifecycle: 'superseded' }], integrity: 'verified',
}

const exactSuiteRevision = {
  schemaVersion: 1,
  suiteId: 'suite-11111111-1111-1111-1111-111111111111',
  projectId: 'product',
  revision: 3,
  name: 'Exact Suite',
  purpose: 'sanity',
  members: [{
    ordinal: 1,
    definitionAuthority: {
      definitionId: 'definition-1',
      definitionSchemaVersion: 2,
      testSetId: 'set-1',
      testSetRevision: 4,
      testSetContentHash: hash('f'),
    },
  }],
  createdAt: assembledAt,
  provenance: {
    source: 'product_api',
    changeKind: 'revised',
    priorRevision: 2,
    changeIntentKey: 'suite-change-3',
    changeIntentFingerprint: hash('6'),
  },
  contentHash: hash('9'),
}

const exactSuitePreflight = {
  kind: 'suite_preflight',
  projectId: 'product',
  selection: { kind: 'suite_revision', suiteId: exactSuiteRevision.suiteId, suiteRevision: 3 },
  selectionAuthority: { kind: 'suite_revision', suiteId: exactSuiteRevision.suiteId, suiteRevision: 3, suiteContentHash: hash('9'), name: 'Exact Suite', purpose: 'sanity' },
  aggregate: { state: 'ready', explanation: 'Exact Suite revision is eligible.' },
  definitionResults: [],
  liveEligibility: { state: 'eligible', runner: 'available', credentials: 'not_required' },
  boundaries: { suiteAuthority: 'established', executionEligibility: 'eligible', persisted: false },
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const app = express()
  app.get('/api/v1/projects', (_request, response) => response.json({ data: { projects: [{ appName: 'product', url: 'https://example.invalid' }, { appName: 'other', url: 'https://other.invalid' }] }, error: null, timestamp: assembledAt }))
  app.get('/api/v1/projects/:appName/evidence-workspace', createEvidenceWorkspaceRoute(async appName => appName === 'product' ? { appName } : undefined, sources))
  app.get('/api/v1/projects/:appName/executions', (request, response) => response.json({ data: request.params.appName === 'product' ? { executions: [{ executionId: 'execution-1', lifecycle: 'completed', evidenceHeadlineOutcome: 'failed', terminalOutcome: 'failed', authorityReasonCode: 'result_failed', acceptedAt: assembledAt, terminalAt: assembledAt, expectedResultCount: 1, runCount: 1, observedResultCount: 1, passedResultCount: 0, failedResultCount: 1, couldNotVerifyResultCount: 0, integrityState: 'valid', selectionAuthority: { kind: 'suite_revision', suiteId: 'suite-11111111-1111-1111-1111-111111111111', suiteRevision: 3, suiteContentHash: hash('9'), name: 'Exact Suite', purpose: 'sanity' } }], page: { limit: 25 } } : { executions: [], page: { limit: 25 } }, error: null, timestamp: assembledAt }))
  app.get('/api/v1/projects/:appName/executions/:executionId/results', (request, response) => {
    if (request.params.appName !== 'product' || request.params.executionId !== 'execution-1') return response.status(404).json({ error: 'Execution not found.', code: 'NOT_FOUND' })
    const read = serializeCanonicalExecutionResultsRead(resultRead(), 'product')
    if (read.kind !== 'ok') throw new Error('Browser fixture Result did not serialize.')
    response.json({ data: read.projection, error: null, timestamp: assembledAt })
  })
  app.get('/api/v1/projects/:appName/repairs/:entryId', (request, response) => {
    if (request.params.appName !== 'product' || request.params.entryId !== 'entry-1') return response.status(404).json({ error: 'Repair not found.', code: 'NOT_FOUND' })
    response.json({ data: completedRepair(), error: null, timestamp: assembledAt })
  })
  app.get('/api/v1/projects/:appName/app-models/:rowId', (request, response) => {
    const rowId = Number(request.params.rowId), version = String(request.query.version ?? ''), fingerprint = request.query.fingerprint === undefined ? null : String(request.query.fingerprint)
    if (request.params.appName !== 'product' || !((rowId === 7 && version === '1.0.0') || (rowId === 8 && version === '2.0.0')) || fingerprint !== hash(String(rowId))) return response.status(404).json({ error: 'Exact historical App Model not found.', code: 'EXACT_APP_MODEL_NOT_FOUND' })
    response.json({ data: { schemaVersion: 'forge.exact-app-model/v1', project: { id: 'product', name: 'product' }, model: presentedModel(rowId, version) }, error: null, timestamp: assembledAt })
  })
  app.get('/api/v1/projects/:appName/observations/:observationId', (request, response) => {
    if (request.params.appName !== 'product' || request.params.observationId !== 'observation-1') return response.status(404).json({ error: 'Exact historical Observation not found.', code: 'EXACT_OBSERVATION_NOT_FOUND' })
    response.json({ data: { schemaVersion: 'forge.exact-observation/v1', project: { id: 'product', name: 'product' }, observation: exactObservation }, error: null, timestamp: assembledAt })
  })
  app.get('/api/v1/projects/:appName/suites/:suiteId', (request, response) => {
    if (request.params.appName !== 'product' || request.params.suiteId !== exactSuiteRevision.suiteId || request.query.revision !== '3') return response.status(404).json({ error: 'Exact Suite revision not found.', code: 'NOT_FOUND' })
    response.json({ data: exactSuiteRevision, error: null, timestamp: assembledAt })
  })
  app.post('/api/v1/projects/:appName/execution/preflight', (request, response) => {
    if (request.params.appName !== 'product') return response.status(404).json({ error: 'Project not found.', code: 'NOT_FOUND' })
    response.json({ data: exactSuitePreflight, error: null, timestamp: assembledAt })
  })
  const api = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listener = app.listen(3000, '127.0.0.1', () => resolve(listener))
    listener.once('error', reject)
  })
  const server = await createServer({ root: path.resolve('forge-ui'), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Vite proof server did not expose a TCP address.')
  const base = `http://127.0.0.1:${address.port}`
  const browser = await chromium.launch({ headless: true })
  const receipts: Array<Record<string, unknown>> = []
  try {
    const scenarios: Array<{ name: ScenarioName; url: string; assertions: string[]; linkFragments?: string[] }> = [
      { name: 'project-no-evidence', url: '/truth-board?project=product&context=project', assertions: ['Evidence Workspace', 'No canonical evidence in the inspected domains', 'no evidence'] },
      { name: 'readiness-blocked', url: '/truth-board?project=product&context=project', assertions: ['Observe the application', 'blocked', 'Authentication did not establish accepted application access'] },
      { name: 'result-diagnostic-refusal', url: '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=1&result=result-1', assertions: ['Exact historical Result', 'failed', 'Diagnostic refusal', 'Exact historical Test Definition'], linkFragments: ['/results?project=product&execution=execution-1&run=run-1&item=1&result=result-1', '/tests?project=product&testSet=set-1&revision=4&test=definition-1', '/application/model?project=product&model=7&version=1.0.0', '/application/observations?project=product&observation=observation-1&exact=true'] },
      { name: 'completed-repair', url: '/truth-board?project=product&context=repair&repair=entry-1', assertions: ['Completed repair lifecycle', 'Original Result', 'Rerun Result', 'failed', 'Bounded repair effectiveness', 'REPAIR_CONFIRMED', 'Human disposition', 'bounded_repair_resolved', 'Source App Model', 'Candidate App Model'], linkFragments: ['execution=execution-before&run=run-before&item=1&result=result-before', 'execution=execution-after&run=run-after&item=1&result=result-after', 'testSet=set-repaired&revision=5&test=definition-1', '/application/model?project=product&model=7&version=1.0.0', '/application/model?project=product&model=8&version=2.0.0'] },
      { name: 'malformed-context', url: '/truth-board?project=product&context=result&execution=execution-1', assertions: ['Context refused', 'incomplete or conflicting'] },
      { name: 'cross-project-reference', url: '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=1&result=result-1', assertions: ['Exact historical Result', 'Historical Test Set revision unavailable', 'Source failures', 'Exact historical Definition authority did not match'] },
      { name: 'missing-historical-target', url: '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=1&result=result-missing', assertions: ['Selected Result context unavailable', 'Source failures'] },
      { name: 'missing-exact-target', url: '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=1&result=result-1', assertions: ['Exact historical Test Definition', 'Unresolved: The exact historical App Model identity could not be verified', 'Unresolved: The exact historical Observation identity could not be verified', 'Source failures'] },
      { name: 'source-unavailable', url: '/truth-board?project=product&context=project', assertions: ['Source failures', 'Canonical Observation source unavailable'] },
      { name: 'integrity-invalid', url: '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=1&result=result-1', assertions: ['Diagnostic refusal', 'integrity: invalid', 'Diagnostic integrity validation failed'] },
    ]
    for (const scenario of scenarios) {
      activeScenario = scenario.name
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
      await page.goto(base + scenario.url)
      await expect(page.getByTestId('evidence-workspace')).toBeVisible()
      for (const value of scenario.assertions) await expect(page.getByText(value, { exact: false }).first()).toBeVisible()
      const hrefs = await page.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')).filter((value): value is string => value !== null))
      for (const fragment of scenario.linkFragments ?? []) {
        if (!hrefs.some(href => href.includes(fragment))) throw new Error(`${scenario.name} did not render exact link fragment ${fragment}.`)
      }
      if (scenario.name === 'missing-exact-target' && hrefs.some(href => href.includes('/application/model') || href.includes('/application/observations'))) throw new Error('Missing exact targets were promoted to links.')
      const screenshot = path.join(output, `${scenario.name}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })
      receipts.push({ scenario: scenario.name, status: 'PASS', screenshot, hrefs, bodyText: await page.locator('body').innerText() })
      await page.close()
      console.log(`PASS Evidence Workspace browser ${scenario.name}`)
    }
    const journeys = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
    activeScenario = 'project-no-evidence'
    await journeys.goto(base + '/results?project=product&execution=execution-1')
    await journeys.getByRole('link', { name: 'Evidence', exact: true }).click()
    await expect(journeys).toHaveURL(/truth-board\?project=product/)
    await expect(journeys.getByText('Observe the application', { exact: true })).toBeVisible()
    await expect(journeys.getByText('Future target availability is unknown.', { exact: true })).toBeVisible()
    if ((await journeys.locator('body').innerText()).match(/project health|truth confidence/i)) throw new Error('J1 rendered derived project health or confidence.')
    receipts.push({ scenario: 'J1-project-readiness-normal-navigation', status: 'PASS', url: journeys.url() })

    await journeys.goto(base + '/results?project=product&execution=execution-1')
    await expect(journeys.getByText('Result ID', { exact: true }).first()).toBeVisible()
    await journeys.getByRole('link', { name: 'Open in Evidence Workspace', exact: true }).first().click()
    await expect(journeys).toHaveURL(/context=result.*execution=execution-1.*run=run-1.*item=1.*result=result-1/)
    await expect(journeys.getByText('Exact historical Result', { exact: true })).toBeVisible()
    await expect(journeys.getByText('Accepted Suite revision', { exact: true })).toBeVisible()
    const resultWorkspaceUrl = journeys.url()
    await journeys.locator(`a[href="/run?project=product&suiteId=${exactSuiteRevision.suiteId}&suiteRevision=3"]`).click()
    await expect(journeys).toHaveURL(new RegExp(`/run\\?project=product&suiteId=${exactSuiteRevision.suiteId}&suiteRevision=3`))
    await expect(journeys.getByText('Exact Suite', { exact: true })).toBeVisible()
    await expect(journeys.getByText('Sanity · immutable revision 3', { exact: true })).toBeVisible()
    receipts.push({ scenario: 'J2-result-entry-and-exact-suite-round-trip', status: 'PASS', sourceUrl: resultWorkspaceUrl, suiteUrl: journeys.url() })

    activeScenario = 'completed-repair'
    await journeys.goto(base + '/results?project=product&execution=execution-1&repairEntry=entry-1')
    const repairPanel = journeys.locator('section[aria-labelledby="repair-heading"]')
    await expect(repairPanel.getByText('Governed selector repair', { exact: true })).toBeVisible()
    await repairPanel.getByRole('link', { name: 'Open in Evidence Workspace', exact: true }).click()
    await expect(journeys).toHaveURL(/context=repair&repair=entry-1/)
    await expect(journeys.getByText('Original Result', { exact: false }).first()).toBeVisible()
    await expect(journeys.getByText('Rerun Result', { exact: false }).first()).toBeVisible()
    await expect(journeys.getByText('Bounded repair effectiveness', { exact: true })).toBeVisible()
    await expect(journeys.getByText('Human disposition', { exact: true })).toBeVisible()
    receipts.push({ scenario: 'J3-repair-entry', status: 'PASS', url: journeys.url() })

    activeScenario = 'readiness-blocked'
    await journeys.goto(base + '/results?project=product&execution=execution-1')
    await journeys.getByRole('link', { name: 'Evidence', exact: true }).click()
    await expect(journeys.getByText('Authentication did not establish accepted application access.', { exact: true })).toBeVisible()
    await expect(journeys.getByRole('link', { name: 'Review the source observation', exact: true })).toHaveCount(0)
    receipts.push({ scenario: 'J4-blocked-readiness', status: 'PASS', url: journeys.url() })

    activeScenario = 'result-diagnostic-refusal'
    await journeys.goto(base + '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=1&result=result-1')
    await journeys.locator('a[href*="/results?project=product&execution=execution-1&run=run-1&item=1&result=result-1"]').first().click()
    await expect(journeys.getByTestId('exact-result-context')).toContainText('result-1')
    await journeys.getByRole('link', { name: 'Open in Evidence Workspace', exact: true }).first().click()
    await expect(journeys).toHaveURL(/execution=execution-1.*run=run-1.*item=1.*result=result-1/)
    receipts.push({ scenario: 'J5-historical-result-round-trip', status: 'PASS', url: journeys.url() })

    activeScenario = 'cross-project-result'
    await journeys.goto(base + '/truth-board?project=product&context=result&execution=execution-other&run=run-other&item=1&result=result-other')
    await expect(journeys.getByText('Selected Result context unavailable', { exact: true })).toBeVisible()
    await expect(journeys.getByText('Exact historical Result', { exact: true })).toHaveCount(0)
    receipts.push({ scenario: 'J6-cross-project-hostile', status: 'PASS', url: journeys.url() })
    await journeys.screenshot({ path: path.join(output, 'normal-entry-journeys.png'), fullPage: true })
    await journeys.close()
    console.log('PASS Evidence Workspace browser normal Product entry J1-J6')

    activeScenario = 'result-diagnostic-refusal'
    const clickPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
    await clickPage.goto(base + '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=1&result=result-1')
    await clickPage.locator('a[href*="/tests?project=product&testSet=set-1&revision=4"]').first().click()
    await expect(clickPage).toHaveURL(/testSet=set-1.*revision=4.*test=definition-1/)
    await clickPage.goBack()
    await clickPage.locator('a[href*="/application/model?project=product&model=7"]').first().click()
    await expect(clickPage.getByText('Exact historical App Model row 7, version 1.0.0', { exact: false })).toBeVisible()
    await clickPage.getByText('Observed subjects and interpretation', { exact: true }).click()
    await expect(clickPage.getByText('subject-7', { exact: false }).first()).toBeVisible()
    await clickPage.getByText('Provenance and recovery', { exact: true }).click()
    await clickPage.locator('a[href*="/application/observations?project=product&observation=observation-1&exact=true"]').first().click()
    await expect(clickPage.getByText('Exact historical Observation', { exact: true })).toBeVisible()
    await expect(clickPage.getByText('observation-1', { exact: true })).toBeVisible()
    await clickPage.goBack()
    await clickPage.goBack()
    await clickPage.locator('a[href*="/application/observations?project=product&observation=observation-1"]').first().click()
    await expect(clickPage.getByText('Exact historical Observation', { exact: true })).toBeVisible()
    await expect(clickPage.getByText('observation-1', { exact: true })).toBeVisible()
    activeScenario = 'completed-repair'
    await clickPage.goto(base + '/truth-board?project=product&context=repair&repair=entry-1')
    await clickPage.locator('a[href*="/application/model?project=product&model=7"]').first().click()
    await expect(clickPage.getByText('Exact historical App Model row 7, version 1.0.0', { exact: false })).toBeVisible()
    await clickPage.goBack()
    await clickPage.locator('a[href*="/application/model?project=product&model=8"]').first().click()
    await expect(clickPage.getByText('Exact historical App Model row 8, version 2.0.0', { exact: false })).toBeVisible()
    await clickPage.goto(base + '/application/model?project=product&model=999&version=9.9.9&fingerprint=' + hash('9'))
    await expect(clickPage.getByText('Application Model unavailable', { exact: false })).toBeVisible()
    await expect(clickPage.getByText('subject-8', { exact: false })).toHaveCount(0)
    await clickPage.goto(base + '/application/observations?project=product&observation=missing&exact=true')
    await expect(clickPage.getByText('Observation history unavailable', { exact: false })).toBeVisible()
    await expect(clickPage.getByText('observation-1', { exact: true })).toHaveCount(0)
    await clickPage.goto(base + '/application/model?project=other&model=7&version=1.0.0&fingerprint=' + hash('7'))
    await expect(clickPage.getByText('Application Model unavailable', { exact: false })).toBeVisible()
    await expect(clickPage.getByText('subject-7', { exact: false })).toHaveCount(0)
    await clickPage.goto(base + '/application/observations?project=other&observation=observation-1&exact=true')
    await expect(clickPage.getByText('Observation history unavailable', { exact: false })).toBeVisible()
    await expect(clickPage.getByText('observation-1', { exact: true })).toHaveCount(0)
    receipts.push({ scenario: 'exact-click-through-j1-j5', status: 'PASS' })
    console.log('PASS Evidence Workspace browser exact click-through J1-J5')
    await clickPage.close()
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({ status: 'PASS', route: 'createEvidenceWorkspaceRoute', scenarios: receipts }, null, 2))
    console.log(output)
  } finally {
    await browser.close()
    await server.close()
    await new Promise<void>(resolve => api.close(() => resolve()))
  }
}
main().catch(cause => { console.error(cause); process.exitCode = 1 })
