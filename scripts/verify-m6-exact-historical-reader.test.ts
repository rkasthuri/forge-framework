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

import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { closeDb, initDb } from '../src/core/storage/db'
import { getProductDb } from '../src/core/storage/db'
import { runMigrations } from '../src/core/storage/migrate'
import { canonicalJson } from '../src/core/storage/JsonAppModelMigrationPlanner'
import { TestSetRepository } from '../src/core/storage/repositories/TestSetRepository'
import { TestSetService } from '../src/core/storage/TestSetService'
import type { TestDesignAuthorityInput } from '../src/core/test-design/TestDefinitionContract'

const observationId = '11111111-1111-4111-8111-111111111111'
const at = '2026-09-17T12:00:00.000Z'

function authority(projectId: string): TestDesignAuthorityInput {
  return {
    projectId,
    sourceObservation: { id: observationId, outcome: 'completed', authenticationOutcome: 'not_required', authenticationExpectation: 'none', credentialReference: null, subjectIds: ['inventory-html'] },
    model: { rowId: 7, version: '1.0.0', sourceObservationId: observationId, validation: 'valid', integrity: 'verified', subjects: [{ id: 'inventory-html', routePath: '/inventory.html', evidenceId: observationId }] },
    evidence: [{ id: observationId, canonicalSubjectId: 'inventory-html', routePath: '/inventory.html', sourceObservationId: observationId, sourceModelRows: [7], support: 'current', integrity: 'verified', freshness: 'not_evaluated', access: 'available', conflict: 'not_evaluated' }],
    generatedAt: at,
  }
}

test('exact historical reader never substitutes latest and preserves verified row/hash membership', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m6-exact-reader-'))
  initDb(path.join(root, 'forge.db'))
  try {
    await runMigrations()
    const repository = new TestSetRepository()
    const service = new TestSetService(repository, () => at)
    const first = await service.generate(authority('product'), 'generation-one')
    const second = await service.generate(authority('product'), 'generation-two')
    const definitionId = first.testSet.definitions[0].id
    assert.equal(second.testSet.revision, 2)
    const exact = await repository.readExactDefinition('product', first.testSet.testSetId, 1, definitionId)
    assert.equal(exact?.rowId, first.rowId)
    assert.equal(exact?.contentHash, first.contentHash)
    assert.equal(exact?.testSet.revision, 1)
    assert.equal(exact?.definition.id, definitionId)
    assert.equal(await repository.readExactDefinition('product', first.testSet.testSetId, 99, definitionId), null)
    assert.equal(await repository.readExactDefinition('other', first.testSet.testSetId, 1, definitionId), null)
    assert.equal(await repository.readExactDefinition('product', first.testSet.testSetId, 1, 'definition-missing'), null)
    const validRow = await getProductDb().selectFrom('test_set_revisions').selectAll().where('id', '=', first.rowId).executeTakeFirstOrThrow()
    const { id: _id, ...corruptRow } = validRow
    const corruptPayload = { ...first.testSet, projectId: 'corrupt-project', testSetId: 'corrupt-set', generationId: 'corrupt-generation' }
    await getProductDb().insertInto('test_set_revisions').values({
      ...corruptRow,
      project_id: corruptPayload.projectId,
      test_set_id: corruptPayload.testSetId,
      generation_id: corruptPayload.generationId,
      payload_json: canonicalJson(corruptPayload),
      content_hash: '0'.repeat(64),
    }).execute()
    await assert.rejects(repository.readExactDefinition('corrupt-project', 'corrupt-set', 1, definitionId), { name: 'MalformedTestSetError' })
  } finally {
    await closeDb()
    fs.rmSync(root, { recursive: true, force: true })
  }
})
