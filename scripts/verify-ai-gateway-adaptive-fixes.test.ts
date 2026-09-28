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
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import {
  adaptiveFixSuggestionCapability,
  AiGateway,
  AiGatewayConfiguration,
  AiGatewayFailureCode,
  AiProviderAdapter,
  AiProviderId,
  HostedOpenProvider,
  LocalProvider,
  ProviderInvocation,
  ProviderResult,
  readAiGatewayConfiguration,
} from '../src/core/ai/gateway'
import {
  buildMarkdown,
  generateFix,
  loadTriageReport,
  resolveTestSource,
  TriageFailure,
} from '../src/pipeline/adaptive-fixes'

const failure: TriageFailure = {
  verdict: 'test-defect',
  confidence: 'high',
  reasoning: 'The observed action exceeded its bounded wait.',
  suggestedAction: 'Review a bounded timeout adjustment.',
  test: {
    testTitle: 'loads observed inventory',
    suiteName: 'inventory',
    file: 'inventory.spec.ts',
    browserName: 'chromium',
    priority: 'P1',
    errorMessage: 'locator.click: Timeout 15000ms exceeded',
    errorStack: 'at inventory.spec.ts:3:22',
    retries: 1,
    isTaggedFlaky: false,
    isTaggedSlow: false,
    runId: 'run-adaptive-1',
  },
}

const sourceText = `test('loads observed inventory', async ({ page }) => {
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(page.getByText('Inventory')).toBeVisible()
})`

function availableSource(
  source = sourceText,
  resolvedRepositoryPath = 'src/tests/inventory.spec.ts',
) {
  return { availability: 'available' as const, source, resolvedRepositoryPath }
}

const validOutput = {
  fixCategory: 'timeout' as const,
  risk: 'Safe' as const,
  explanation: 'Increase only the bounded action timeout while preserving the assertion and test intent.',
  currentCode: "await page.getByRole('button', { name: 'Load' }).click()",
  suggestedCode: "await page.getByRole('button', { name: 'Load' }).click({ timeout: 30000 })",
}

function configuration(
  primaryProvider: AiProviderId = 'hosted-open',
  fallbackProviders: AiProviderId[] = [],
): AiGatewayConfiguration {
  return {
    primaryProvider,
    fallbackProviders,
    openai: { apiKey: 'configured', model: 'openai-test-model', timeoutMs: 1000 },
    anthropic: { apiKey: 'configured', model: 'anthropic-test-model', timeoutMs: 1000 },
    local: {
      enabled: true,
      runtime: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      model: 'local-test-model',
      timeoutMs: 1000,
      thinking: false,
    },
    hostedOpen: {
      apiKey: 'configured',
      baseUrl: 'https://router.huggingface.co/v1',
      model: 'hosted-open-test-model',
      timeoutMs: 1000,
    },
  }
}

class FakeProvider implements AiProviderAdapter {
  calls = 0
  invocation: ProviderInvocation | null = null
  readonly configuredModel: string | null

  constructor(
    readonly id: AiProviderId,
    private readonly result: ProviderResult,
    private readonly configured = true,
  ) {
    this.configuredModel = result.configuredModel
  }

  isConfigured(): boolean {
    return this.configured
  }

  async invoke(invocation: ProviderInvocation): Promise<ProviderResult> {
    this.calls += 1
    this.invocation = invocation
    return this.result
  }
}

function successProvider(
  id: AiProviderId,
  output: unknown = validOutput,
  includeUsage = true,
): FakeProvider {
  const providerRuntime = id === 'local'
    ? 'ollama' as const
    : id === 'hosted-open'
      ? 'hugging-face-router' as const
      : undefined
  return new FakeProvider(id, {
    status: 'SUCCESS',
    provider: id,
    providerRuntime,
    routedProvider: id === 'hosted-open' ? 'hf-inference' : undefined,
    configuredModel: `${id}-configured-model`,
    responseModel: `${id}-response-model`,
    output,
    providerRequestId: `${id}-request-id`,
    ...(includeUsage ? { usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 } } : {}),
  })
}

function failureProvider(code: AiGatewayFailureCode, id: AiProviderId): FakeProvider {
  assert.ok(!['UNKNOWN_CAPABILITY', 'NO_CONFIGURED_PROVIDER', 'NO_ALLOWED_PROVIDER', 'POLICY_BLOCKED'].includes(code))
  return new FakeProvider(id, {
    status: 'FAILURE',
    provider: id,
    providerRuntime: id === 'local' ? 'ollama' : id === 'hosted-open' ? 'hugging-face-router' : undefined,
    configuredModel: `${id}-configured-model`,
    code: code as Exclude<AiGatewayFailureCode,
      'UNKNOWN_CAPABILITY' | 'NO_CONFIGURED_PROVIDER' | 'NO_ALLOWED_PROVIDER' | 'POLICY_BLOCKED'>,
    message: 'vendor-specific raw detail',
  })
}

function gateway(primary: AiProviderId, provider: FakeProvider): AiGateway {
  return new AiGateway(configuration(primary), [provider], [adaptiveFixSuggestionCapability])
}

function reportFixture(runId: string | undefined, result: TriageFailure = failure) {
  return {
    ...(runId === undefined ? {} : { runId }),
    runTimestamp: '2026-09-28T00:30:47.000Z',
    totalFailed: 1,
    summary: {
      'app-bug': 0,
      'test-defect': 1,
      'infra-defect': 0,
      flaky: 0,
      'insufficient-evidence': 0,
    },
    results: [result],
  }
}

test('report-level runId is authoritative and appears in Adaptive Fix request identity', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-run-'))
  const reportPath = path.join(temporaryDirectory, 'triage-report.json')
  let queriedRunId: string | null = null
  try {
    fs.writeFileSync(reportPath, JSON.stringify(reportFixture('run-ci-canonical', {
      ...failure,
      test: { ...failure.test, runId: 'stale-result-run' },
    })))
    const report = await loadTriageReport(reportPath, {
      async findByRun(runId) {
        queriedRunId = runId
        return []
      },
    })
    assert.equal(queriedRunId, 'run-ci-canonical')
    assert.equal(report.runId, 'run-ci-canonical')
    assert.equal(report.results[0].test.runId, 'run-ci-canonical')

    const result = await generateFix(
      gateway('hosted-open', successProvider('hosted-open')),
      report.results[0],
      availableSource(),
    )
    assert.match(result.provenance.requestId, /^adaptive-fix:run-ci-canonical:/)
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('DB-backed failures preserve the canonical report-level runId', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-db-run-'))
  const reportPath = path.join(temporaryDirectory, 'triage-report.json')
  try {
    fs.writeFileSync(reportPath, JSON.stringify(reportFixture('run-db-canonical')))
    const report = await loadTriageReport(reportPath, {
      async findByRun(runId) {
        assert.equal(runId, 'run-db-canonical')
        return [{
          test_id: 'desktop/ui/saucedemo/tests/cart.spec.ts::loads observed inventory::chromium',
          failure_category: 'test-defect',
          confidence: 0.9,
          root_cause: 'Observed bounded failure.',
          suggested_fix: 'Review the exact test source.',
        }]
      },
    })
    assert.equal(report.runId, 'run-db-canonical')
    assert.equal(report.results[0].test.runId, 'run-db-canonical')
    const result = await generateFix(
      gateway('hosted-open', successProvider('hosted-open')),
      report.results[0],
      availableSource(),
    )
    assert.match(result.provenance.requestId, /^adaptive-fix:run-db-canonical:/)
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('missing report-level runId remains explicitly unbound and does not reuse a result runId', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-unbound-'))
  const reportPath = path.join(temporaryDirectory, 'triage-report.json')
  try {
    fs.writeFileSync(reportPath, JSON.stringify(reportFixture(undefined, {
      ...failure,
      test: { ...failure.test, runId: 'non-authoritative-result-run' },
    })))
    const report = await loadTriageReport(reportPath, {
      async findByRun() {
        assert.fail('DB lookup must not run without a canonical report runId')
      },
    })
    assert.equal(report.runId, null)
    assert.equal(report.results[0].test.runId, undefined)
    const result = await generateFix(
      gateway('hosted-open', successProvider('hosted-open')),
      report.results[0],
      availableSource(),
    )
    assert.match(result.provenance.requestId, /^adaptive-fix:unbound:/)
    assert.doesNotMatch(result.provenance.requestId, /non-authoritative-result-run/)
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('source resolver binds desktop/ui identity to canonical src/apps source', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-source-'))
  const repositoryPath = 'src/apps/desktop/ui/saucedemo/tests/cart.spec.ts'
  const sourcePath = path.join(temporaryDirectory, ...repositoryPath.split('/'))
  try {
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, sourceText)
    const resolved = resolveTestSource('desktop/ui/saucedemo/tests/cart.spec.ts', temporaryDirectory)
    assert.equal(resolved.availability, 'available')
    if (resolved.availability === 'available') {
      assert.equal(resolved.resolvedRepositoryPath, repositoryPath)
      assert.equal(resolved.source, sourceText)
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('source resolver accepts an already-valid repository-relative path', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-exact-path-'))
  const repositoryPath = 'src/apps/desktop/ui/saucedemo/tests/cart.spec.ts'
  const sourcePath = path.join(temporaryDirectory, ...repositoryPath.split('/'))
  try {
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, sourceText)
    const resolved = resolveTestSource(repositoryPath, temporaryDirectory)
    assert.equal(resolved.availability, 'available')
    if (resolved.availability === 'available') {
      assert.equal(resolved.resolvedRepositoryPath, repositoryPath)
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('source resolver fails closed for missing, traversal, and basename-only identities', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-source-safety-'))
  const first = path.join(temporaryDirectory, 'src', 'tests', 'cart.spec.ts')
  const second = path.join(temporaryDirectory, 'src', 'apps', 'desktop', 'cart.spec.ts')
  try {
    fs.mkdirSync(path.dirname(first), { recursive: true })
    fs.mkdirSync(path.dirname(second), { recursive: true })
    fs.writeFileSync(first, sourceText)
    fs.writeFileSync(second, sourceText)
    assert.deepEqual(resolveTestSource('missing.spec.ts', temporaryDirectory), {
      availability: 'unavailable', source: '',
    })
    assert.deepEqual(resolveTestSource('../outside.spec.ts', temporaryDirectory), {
      availability: 'unavailable', source: '',
    })
    assert.deepEqual(resolveTestSource('nested/cart.spec.ts', temporaryDirectory), {
      availability: 'unavailable', source: '',
    })
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('sourceBinding records the resolved path and exact bounded snippet SHA-256', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-source-binding-'))
  const repositoryPath = 'src/apps/desktop/ui/saucedemo/tests/cart.spec.ts'
  const sourcePath = path.join(temporaryDirectory, ...repositoryPath.split('/'))
  try {
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, sourceText)
    const source = resolveTestSource('desktop/ui/saucedemo/tests/cart.spec.ts', temporaryDirectory)
    const result = await generateFix(
      gateway('hosted-open', successProvider('hosted-open')),
      failure,
      source,
    )
    assert.equal(result.sourceBinding.availability, 'available')
    assert.equal(result.sourceBinding.resolvedRepositoryPath, repositoryPath)
    assert.equal(
      result.sourceBinding.exactTestSnippetSha256,
      createHash('sha256').update(sourceText).digest('hex'),
    )
    assert.equal(result.inputEvidence.source.exactTestSnippet, sourceText)
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('successful structured fix suggestion preserves evidence and complete hosted-open provenance', async () => {
  const provider = successProvider('hosted-open')
  const times = [new Date('2026-09-27T12:00:00.000Z'), new Date('2026-09-27T12:00:00.025Z')]
  const aiGateway = new AiGateway(
    configuration('hosted-open'),
    [provider],
    [adaptiveFixSuggestionCapability],
    () => times.shift() ?? new Date('2026-09-27T12:00:00.025Z'),
  )
  const result = await generateFix(aiGateway, failure, availableSource())

  assert.equal(result.advisoryStatus, 'CANDIDATE')
  assert.equal(result.autoApplied, false)
  assert.deepEqual({
    fixCategory: result.fixCategory,
    risk: result.risk,
    explanation: result.explanation,
    currentCode: result.currentCode,
    suggestedCode: result.suggestedCode,
  }, validOutput)
  assert.deepEqual(result.inputEvidence.failure, failure)
  assert.notEqual(result.inputEvidence.failure, failure)
  assert.equal(result.inputEvidence.source.availability, 'available')
  assert.equal(result.inputEvidence.source.exactTestSnippet, sourceText)
  assert.equal(provider.invocation?.capability, 'suggest-test-fix')
  assert.match(provider.invocation?.userPrompt ?? '', /locator\.click: Timeout 15000ms exceeded/)
  assert.match(provider.invocation?.userPrompt ?? '', /await page\.getByRole/)
  assert.equal(result.provenance.provider, 'hosted-open')
  assert.equal(result.provenance.providerRuntime, 'hugging-face-router')
  assert.equal(result.provenance.routedProvider, 'hf-inference')
  assert.equal(result.provenance.configuredModel, 'hosted-open-configured-model')
  assert.equal(result.provenance.responseModel, 'hosted-open-response-model')
  assert.match(result.provenance.requestId, /^adaptive-fix:run-adaptive-1:/)
  assert.equal(result.provenance.capability, 'suggest-test-fix')
  assert.equal(result.provenance.outputSchemaId, 'forge.ai.adaptive-fix-suggestion.v1')
  assert.deepEqual(result.provenance.attemptedProviders, ['hosted-open'])
  assert.equal(result.provenance.fallbackOccurred, false)
  assert.equal(result.provenance.durationMs, 25)
  assert.deepEqual(result.provenance.usage, { inputTokens: 50, outputTokens: 25, totalTokens: 75 })
})

test('malformed provider response is preserved as provider-neutral INVALID_RESPONSE', async () => {
  const result = await generateFix(
    gateway('hosted-open', failureProvider('INVALID_RESPONSE', 'hosted-open')),
    failure,
    availableSource(),
  )
  assert.equal(result.advisoryStatus, 'BLOCKED_AI')
  assert.equal(result.aiFailure?.code, 'INVALID_RESPONSE')
  assert.match(result.explanation, /AI advisory unavailable \(INVALID_RESPONSE\)/)
  assert.doesNotMatch(result.explanation, /Claude|Anthropic|vendor-specific/i)
})

test('schema violations reject missing fields, invalid Safe categories, and inexact source binding', async t => {
  const outputs = [
    { fixCategory: 'timeout', risk: 'Safe' },
    { ...validOutput, fixCategory: 'selector', risk: 'Safe' },
    { ...validOutput, currentCode: 'code not present in supplied source' },
  ]
  for (const output of outputs) {
    await t.test(JSON.stringify(output), async () => {
      const result = await generateFix(
        gateway('hosted-open', successProvider('hosted-open', output)),
        failure,
        availableSource(),
      )
      assert.equal(result.advisoryStatus, 'BLOCKED_AI')
      assert.equal(result.aiFailure?.code, 'SCHEMA_VIOLATION')
    })
  }
})

test('one-line target binding cannot spill into an unrelated following test', async () => {
  const oneLineSource = `test('loads observed inventory', async () => {})
test('unrelated destructive flow', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete' }).click()
})`
  const unrelatedCandidate = {
    ...validOutput,
    currentCode: "await page.getByRole('button', { name: 'Delete' }).click()",
  }
  const result = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', unrelatedCandidate)),
    failure,
    availableSource(oneLineSource),
  )
  assert.equal(result.advisoryStatus, 'BLOCKED_AI')
  assert.equal(result.aiFailure?.code, 'SCHEMA_VIOLATION')
  assert.equal(result.inputEvidence.source.exactTestSnippet, "test('loads observed inventory', async () => {})")
})

test('source binding requires the exact test title rather than a substring title', async () => {
  const substringSource = `test('loads observed inventory extended', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete' }).click()
})
test('loads observed inventory', async () => {})`
  const candidateFromWrongTest = {
    ...validOutput,
    currentCode: "await page.getByRole('button', { name: 'Delete' }).click()",
  }
  const result = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', candidateFromWrongTest)),
    failure,
    availableSource(substringSource),
  )
  assert.equal(result.advisoryStatus, 'BLOCKED_AI')
  assert.equal(result.aiFailure?.code, 'SCHEMA_VIOLATION')
  assert.equal(result.inputEvidence.source.exactTestSnippet, "test('loads observed inventory', async () => {})")
})

test('AST source binding ignores braces in literals and cannot cross into sibling tests', async () => {
  const lexicalBraceSource = `test.describe('inventory', () => {
  test('loads observed inventory', async ({ page }) => {
    await page.fill('#json', '{')
  })
  test('unrelated destructive flow', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete' }).click()
  })
})`
  const candidateFromSibling = {
    ...validOutput,
    currentCode: "await page.getByRole('button', { name: 'Delete' }).click()",
  }
  const result = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', candidateFromSibling)),
    failure,
    availableSource(lexicalBraceSource),
  )
  assert.equal(result.advisoryStatus, 'BLOCKED_AI')
  assert.equal(result.aiFailure?.code, 'SCHEMA_VIOLATION')
  assert.match(result.inputEvidence.source.exactTestSnippet, /page\.fill\('#json', '\{'\)/)
  assert.doesNotMatch(result.inputEvidence.source.exactTestSnippet, /Delete/)
})

test('duplicate exact test titles are treated as unavailable source', async () => {
  const duplicateSource = `${sourceText}\n${sourceText}`
  const bugReport = {
    fixCategory: 'bug-report' as const,
    risk: 'Review' as const,
    explanation: 'Duplicate test titles make exact source authority ambiguous.',
    currentCode: '',
    suggestedCode: '',
  }
  const result = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', bugReport)),
    failure,
    availableSource(duplicateSource),
  )
  assert.equal(result.advisoryStatus, 'CANDIDATE')
  assert.equal(result.inputEvidence.source.availability, 'unavailable')
  assert.equal(result.inputEvidence.source.exactTestSnippet, '')
})

test('malformed source is unavailable rather than AST-recovered across sibling tests', async () => {
  const malformedSource = `test.describe('inventory', () => {
  test('loads observed inventory', async ({ page }) => {
    await page.fill('#json', '{')
  test('unrelated destructive flow', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete' }).click()
  })
})`
  const candidateFromRecoveredSibling = {
    ...validOutput,
    currentCode: "await page.getByRole('button', { name: 'Delete' }).click()",
  }
  const result = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', candidateFromRecoveredSibling)),
    failure,
    availableSource(malformedSource),
  )
  assert.equal(result.advisoryStatus, 'BLOCKED_AI')
  assert.equal(result.aiFailure?.code, 'SCHEMA_VIOLATION')
  assert.equal(result.inputEvidence.source.availability, 'unavailable')
  assert.equal(result.inputEvidence.source.exactTestSnippet, '')
})

test('provider unavailable remains an explicit provider-neutral blocked advisory', async () => {
  const result = await generateFix(
    gateway('local', failureProvider('PROVIDER_UNAVAILABLE', 'local')),
    failure,
    availableSource(),
  )
  assert.equal(result.aiFailure?.code, 'PROVIDER_UNAVAILABLE')
  assert.equal(result.fixCategory, 'unavailable')
  assert.equal(result.autoApplied, false)
  assert.doesNotMatch(result.explanation, /Claude|Anthropic|Ollama/i)
})

test('hosted-open and local provider paths use the same capability contract', async t => {
  for (const providerId of ['hosted-open', 'local'] as const) {
    await t.test(providerId, async () => {
      const provider = successProvider(providerId)
      const result = await generateFix(
        gateway(providerId, provider), failure, availableSource(),
      )
      assert.equal(result.advisoryStatus, 'CANDIDATE')
      assert.equal(result.provenance.provider, providerId)
      assert.equal(result.provenance.providerRuntime, providerId === 'local' ? 'ollama' : 'hugging-face-router')
      assert.equal(provider.invocation?.outputSchemaId, 'forge.ai.adaptive-fix-suggestion.v1')
    })
  }
})

test('real hosted-open and local adapters accept the Adaptive Fixes structured schema', async t => {
  await t.test('HostedOpenProvider through Hugging Face router contract', async () => {
    let requestBody: Record<string, unknown> | null = null
    const adapter = new HostedOpenProvider(configuration().hostedOpen, async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({
        id: 'hf-adaptive-request',
        model: 'hosted-open-response-model',
        provider: 'hf-inference',
        choices: [{ message: { content: JSON.stringify(validOutput) } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const result = await generateFix(
      new AiGateway(configuration('hosted-open'), [adapter], [adaptiveFixSuggestionCapability]),
      failure,
      availableSource(),
    )
    assert.equal(result.advisoryStatus, 'CANDIDATE')
    assert.equal(result.provenance.provider, 'hosted-open')
    assert.equal(result.provenance.providerRuntime, 'hugging-face-router')
    assert.equal((requestBody?.response_format as { json_schema?: { strict?: unknown } })?.json_schema?.strict, true)
  })

  await t.test('LocalProvider through Ollama contract', async () => {
    let requestBody: Record<string, unknown> | null = null
    const adapter = new LocalProvider(configuration('local').local, async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({
        model: 'local-response-model',
        response: JSON.stringify(validOutput),
        done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const result = await generateFix(
      new AiGateway(configuration('local'), [adapter], [adaptiveFixSuggestionCapability]),
      failure,
      availableSource(),
    )
    assert.equal(result.advisoryStatus, 'CANDIDATE')
    assert.equal(result.provenance.provider, 'local')
    assert.equal(result.provenance.providerRuntime, 'ollama')
    assert.equal(requestBody?.think, false)
    assert.deepEqual(requestBody?.format, adaptiveFixSuggestionCapability.outputSchema)
  })
})

test('fallback is forbidden and a configured secondary provider is never attempted', async () => {
  const primary = failureProvider('PROVIDER_UNAVAILABLE', 'hosted-open')
  const fallback = successProvider('local')
  const aiGateway = new AiGateway(
    configuration('hosted-open', ['local']),
    [primary, fallback],
    [adaptiveFixSuggestionCapability],
  )
  const result = await generateFix(aiGateway, failure, availableSource())
  assert.equal(result.advisoryStatus, 'BLOCKED_AI')
  assert.equal(primary.calls, 1)
  assert.equal(fallback.calls, 0)
  assert.deepEqual(result.provenance.attemptedProviders, ['hosted-open'])
  assert.equal(result.provenance.fallbackOccurred, false)
})

test('Adaptive Fixes never mutates source and never marks a candidate auto-applied', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-adaptive-fixes-'))
  const testPath = path.join(temporaryDirectory, 'src', 'tests', 'inventory.spec.ts')
  try {
    fs.mkdirSync(path.dirname(testPath), { recursive: true })
    fs.writeFileSync(testPath, sourceText, 'utf8')
    const before = fs.readFileSync(testPath)
    const source = resolveTestSource('inventory.spec.ts', temporaryDirectory)
    const result = await generateFix(gateway('local', successProvider('local')), {
      ...failure,
      test: { ...failure.test, file: 'inventory.spec.ts' },
    }, source)
    const after = fs.readFileSync(testPath)
    assert.deepEqual(after, before)
    assert.equal(result.autoApplied, false)
    assert.equal(result.advisoryStatus, 'CANDIDATE')
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})

test('missing source permits only a review-only bug report with empty code', async () => {
  const bugReport = {
    fixCategory: 'bug-report' as const,
    risk: 'Review' as const,
    explanation: 'Source was unavailable, so this evidence should be reviewed as a possible Product defect.',
    currentCode: '',
    suggestedCode: '',
  }
  const valid = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', bugReport)),
    failure,
    { availability: 'unavailable', source: '' },
  )
  assert.equal(valid.advisoryStatus, 'CANDIDATE')

  const invalid = await generateFix(
    gateway('hosted-open', successProvider('hosted-open')),
    failure,
    { availability: 'unavailable', source: '' },
  )
  assert.equal(invalid.advisoryStatus, 'BLOCKED_AI')
  assert.equal(invalid.aiFailure?.code, 'SCHEMA_VIOLATION')

  const unbound = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', bugReport)),
    failure,
    availableSource("test('a different test', async () => {})"),
  )
  assert.equal(unbound.advisoryStatus, 'CANDIDATE')
  assert.equal(unbound.inputEvidence.source.availability, 'unavailable')
  assert.equal(unbound.inputEvidence.source.exactTestSnippet, '')
})

test('token usage is omitted when the provider does not supply it', async () => {
  const result = await generateFix(
    gateway('hosted-open', successProvider('hosted-open', validOutput, false)),
    failure,
    availableSource(),
  )
  assert.equal('usage' in result.provenance, false)
  assert.doesNotMatch(buildMarkdown({
    runId: 'run-adaptive-1',
    runTimestamp: '2026-09-27T00:00:00.000Z',
    totalFailed: 1,
    summary: {
      'app-bug': 0,
      'test-defect': 1,
      'infra-defect': 0,
      flaky: 0,
      'insufficient-evidence': 0,
    },
    results: [failure],
  }, [result]), /Token usage/)
})

test('Adaptive Fixes has no Anthropic requirement, direct AI client, or source repair path', () => {
  const source = fs.readFileSync('src/pipeline/adaptive-fixes.ts', 'utf8')
  assert.doesNotMatch(source, /ANTHROPIC_API_KEY|AiClient|aiCall|Claude API|applyFixes|findTestFilePath/)
  assert.match(source, /createAiGatewayFromEnvironment/)
  assert.match(source, /capability: 'suggest-test-fix'/)
  assert.match(source, /fallbackPolicy: 'forbid'/)
  assert.match(source, /autoApplied: false as const/)

  const withoutAnthropic = readAiGatewayConfiguration({
    FORGE_AI_PRIMARY_PROVIDER: 'hosted-open',
    HF_TOKEN: 'configured',
  })
  assert.equal(withoutAnthropic.primaryProvider, 'hosted-open')
  assert.equal(withoutAnthropic.anthropic.apiKey, undefined)
})

test('human-review report preserves advisory authority and useful review distinction', async () => {
  const suggestion = await generateFix(
    gateway('hosted-open', successProvider('hosted-open')),
    failure,
    availableSource(),
  )
  const markdown = buildMarkdown({
    runId: 'run-adaptive-1',
    runTimestamp: '2026-09-27T00:00:00.000Z',
    totalFailed: 1,
    summary: {
      'app-bug': 0,
      'test-defect': 1,
      'infra-defect': 0,
      flaky: 0,
      'insufficient-evidence': 0,
    },
    results: [failure],
  }, [suggestion])
  assert.match(markdown, /Advisory Only/)
  assert.match(markdown, /never auto-applied/)
  assert.match(markdown, /Safe advisory candidates \(still require review\)/)
  assert.match(markdown, /Fallback occurred:\*\* false/)
  assert.doesNotMatch(markdown, /Auto-Applied Fixes|applied directly to the test files/)
})
