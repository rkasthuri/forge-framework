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

import { sql, type Kysely } from 'kysely'
import type { Database } from './types'
import { canonicalJson } from './JsonAppModelMigrationPlanner'
import { parseCanonicalTestSetV3 } from '../test-design/TestDefinitionContract'
import { historicalDefinitionContentHash } from '../execution/HistoricalDefinitionAuthorityResolver'
import { suiteHash, type CanonicalSuiteRevision } from '../suites/SuiteContract'
import { REPAIR_AUTHORITY_COLUMNS, isExactRepairAuthorityRow, parseRepairAuthority, validateRepairAuthority } from './RepairAuthorityValidation'
import { assertSourceProductAuthority, sourceProductRowsSql } from './RepairSourceAuthority'

type Row = Record<string, any>
type ProductRows = Record<string, Row[]> & { sourceAuthority: Parameters<typeof assertSourceProductAuthority>[1] }
const mismatch = (): never => { throw new Error('Repair rerun persisted Product authority mismatch.') }
const same = (a: unknown, b: unknown): boolean => canonicalJson(a) === canonicalJson(b)
const one = (rows: Row[]): Row => rows.length === 1 ? rows[0] : mismatch()

/** SQL expressions are internal constants; all caller payloads are bound values.
 * The same actual-row snapshot feeds SQL insertion, repository reads and restart.
 * No nested persistedAuthorities value is used to select Product evidence.
 */
export function rerunProductRowsSql(payload: string): string {
  const field = (name: string) => `json_extract(${payload},'$.${name}')`
  const execution = `execution_id=${field('executionAuthority.executionId')}`
  const exactExecution = `${execution} AND project_id=${field('projectId')}`
  const suiteId = `(SELECT suite_id FROM executions WHERE ${exactExecution})`
  const suiteRevision = `(SELECT suite_revision FROM executions WHERE ${exactExecution})`
  const suite = `suite_id=${suiteId} AND suite_revision=${suiteRevision}`
  const tables: Record<string, { columns: string[]; where: string; order: string }> = {
    executions: { columns:['execution_id','project_id','max_run_attempts','suite_id','suite_revision','suite_content_hash'], where:exactExecution, order:'execution_id' },
    execution_items: { columns:['execution_id','item_ordinal','definition_id','executable_plan_hash'], where:execution, order:'item_ordinal' },
    execution_item_authorities: { columns:['execution_id','item_ordinal','test_set_row_id','test_set_id','test_set_revision','test_set_content_hash','definition_schema_version','definition_id'], where:execution, order:'item_ordinal' },
    runs: { columns:['run_id','execution_id','app_name','origin','attempt_ordinal'], where:`run_id=${field('executionAuthority.runId')}`, order:'run_id' },
    test_results: { columns:['result_id','run_id','execution_item_ordinal','definition_id','executable_plan_hash'], where:`result_id=${field('executionAuthority.resultId')}`, order:'result_id' },
    repair_revision_origins: { columns:['canonical_payload',...Object.keys(REPAIR_AUTHORITY_COLUMNS.repair_revision_origins)], where:`repair_origin_id=${field('repairOriginId')}`, order:'repair_origin_id' },
    test_set_revisions: { columns:['id','project_id','test_set_id','revision','content_hash','schema_version','definition_count','payload_json','model_row_id','model_version','observation_run_id','support_seal_hash','characterization_policy_id','characterization_policy_version','revision_origin_kind','repair_origin_id'],
      where:`id=${field('resultingDefinitionAuthority.testSetRowId')}
        OR id IN (SELECT test_set_row_id FROM execution_item_authorities WHERE ${execution})
        OR id IN (SELECT test_set_row_id FROM suite_revision_member_authorities WHERE ${suite})`, order:'id' },
    suites: { columns:['suite_id','project_id','current_revision'], where:`suite_id=${suiteId}`, order:'suite_id' },
    suite_revisions: { columns:['suite_id','revision','project_id','name','purpose','suite_schema_version','definition_schema_version','test_set_row_id','test_set_id','test_set_revision','test_set_content_hash','created_at','provenance_source','change_kind','prior_revision','change_intent_key','change_intent_fingerprint','member_count','content_hash'], where:`suite_id=${suiteId} AND revision=${suiteRevision}`, order:'revision' },
    suite_revision_members: { columns:['suite_id','suite_revision','member_ordinal','definition_id'], where:suite, order:'member_ordinal' },
    suite_revision_member_authorities: { columns:['suite_id','suite_revision','member_ordinal','test_set_row_id','test_set_id','test_set_revision','test_set_content_hash','definition_schema_version','definition_id'], where:suite, order:'member_ordinal' },
  }
  const originPayload = `(SELECT canonical_payload FROM repair_revision_origins WHERE repair_origin_id=${field('repairOriginId')})`
  return `json_object('sourceAuthority',${sourceProductRowsSql(originPayload)},${Object.entries(tables).map(([table, { columns, where, order }]) =>
    `'${table}',(SELECT json_group_array(json_object(${columns.map(column => `'${column}',${column}`).join(',')}))
      FROM (SELECT ${columns.join(',')} FROM ${table} WHERE ${where} ORDER BY ${order}))`).join(',')})`
}

/** Strict shape first, independent Product rebound second, own hash last. */
export function assertRerunProductAuthority(input: unknown, rows: ProductRows): void {
  validateRepairAuthority('repair_rerun_links', input)
  const link = input, claim = link.executionAuthority, project = link.projectId
  const execution = one(rows.executions), run = one(rows.runs), result = one(rows.test_results)
  if (execution.project_id !== project || execution.execution_id !== claim.executionId
    || run.run_id !== claim.runId || run.execution_id !== execution.execution_id || run.origin !== 'product'
    || run.app_name !== project || run.attempt_ordinal !== claim.attemptOrdinal
    || !Number.isSafeInteger(run.attempt_ordinal) || run.attempt_ordinal < 1 || run.attempt_ordinal > execution.max_run_attempts
    || result.result_id !== claim.resultId || result.run_id !== run.run_id
    || result.execution_item_ordinal !== claim.itemOrdinal || result.definition_id !== link.resultingDefinitionAuthority.definitionId
    || result.executable_plan_hash !== claim.planHash) mismatch()

  function definitionAuthority(authority: Row): Row {
    const row = one(rows.test_set_revisions.filter(row => row.id === authority.test_set_row_id))
    const parsed = parseCanonicalTestSetV3(row.payload_json), set = parsed.value, support = set.canonicalSupport
    if (row.project_id !== project || set.projectId !== project || row.schema_version !== 3
      || authority.definition_schema_version !== 3 || row.test_set_id !== authority.test_set_id
      || row.revision !== authority.test_set_revision || row.content_hash !== authority.test_set_content_hash
      || parsed.fingerprint !== row.content_hash || set.testSetId !== row.test_set_id || set.revision !== row.revision
      || set.definitions.length !== row.definition_count || support.modelRowId !== row.model_row_id
      || support.modelVersion !== row.model_version || support.observationRunId !== row.observation_run_id
      || support.supportSealHash !== row.support_seal_hash || support.characterizationPolicy.id !== row.characterization_policy_id
      || support.characterizationPolicy.version !== row.characterization_policy_version) mismatch()
    const definition = one(set.definitions.filter(definition => definition.id === authority.definition_id))
    return { testSetRowId:row.id, testSetId:row.test_set_id, testSetRevision:row.revision, testSetContentHash:parsed.fingerprint,
      definitionId:definition.id, definitionContentHash:historicalDefinitionContentHash(definition as any),
      modelRowId:row.model_row_id, modelVersion:row.model_version, supportSealHash:row.support_seal_hash }
  }

  if (rows.execution_items.length < 1 || rows.execution_items.length !== rows.execution_item_authorities.length) mismatch()
  const manifest = rows.execution_items.map((item, index) => {
    const authority = one(rows.execution_item_authorities.filter(row => row.item_ordinal === item.item_ordinal))
    if (item.execution_id !== execution.execution_id || item.item_ordinal !== index + 1
      || authority.execution_id !== execution.execution_id || authority.definition_id !== item.definition_id) mismatch()
    return { itemOrdinal:item.item_ordinal, definitionAuthority:definitionAuthority(authority), planHash:item.executable_plan_hash }
  })
  const selected = one(manifest.filter(item => item.itemOrdinal === claim.itemOrdinal))
  if (selected.planHash !== claim.planHash || !same(selected.definitionAuthority, link.resultingDefinitionAuthority)) mismatch()
  const originRow = one(rows.repair_revision_origins)
  const { canonical_payload, ...originColumns } = originRow
  if (isExactRepairAuthorityRow('repair_revision_origins', canonical_payload, JSON.stringify(originColumns)) !== 1) mismatch()
  const origin = parseRepairAuthority('repair_revision_origins', canonical_payload)
  assertSourceProductAuthority(origin, rows.sourceAuthority)
  const repaired = one(rows.test_set_revisions.filter(row => row.id === selected.definitionAuthority.testSetRowId))
  if (origin.repairOriginId !== link.repairOriginId || origin.projectId !== project || origin.lineageHash !== link.repairLineageHash
    || origin.testSetRowId !== repaired.id || repaired.repair_origin_id !== origin.repairOriginId || repaired.revision_origin_kind !== 'repair'
    || !same(origin.resultingDefinitionAuthority, selected.definitionAuthority)) mismatch()

  let suiteReference: Row | null = null
  let suite: CanonicalSuiteRevision | undefined
  if (link.suiteAuthority === null) {
    if ([execution.suite_id, execution.suite_revision, execution.suite_content_hash].some(value => value !== null)) mismatch()
  } else {
    const head = one(rows.suites), revision = one(rows.suite_revisions)
    if (head.project_id !== project || head.suite_id !== execution.suite_id || head.current_revision < revision.revision
      || revision.project_id !== project || revision.suite_id !== execution.suite_id || revision.revision !== execution.suite_revision
      || revision.content_hash !== execution.suite_content_hash || revision.suite_schema_version !== 2
      || revision.provenance_source !== 'product_api' || revision.purpose !== 'sanity'
      || [revision.definition_schema_version, revision.test_set_row_id, revision.test_set_id, revision.test_set_revision, revision.test_set_content_hash].some(value => value !== null)
      || (revision.revision === 1 ? revision.change_kind !== 'created' || revision.prior_revision !== null
        : revision.change_kind !== 'revised' || revision.prior_revision !== revision.revision - 1)
      || rows.suite_revision_members.length !== revision.member_count || revision.member_count < 1
      || rows.suite_revision_member_authorities.length !== revision.member_count) mismatch()
    const members = rows.suite_revision_members.map((member, index) => {
      const authority = one(rows.suite_revision_member_authorities.filter(row => row.member_ordinal === member.member_ordinal))
      if (member.member_ordinal !== index + 1 || member.definition_id !== authority.definition_id) mismatch()
      definitionAuthority(authority)
      return { ordinal:member.member_ordinal, definitionAuthority: { testSetRowId:authority.test_set_row_id,
        definitionId:authority.definition_id, definitionSchemaVersion:3 as const, testSetId:authority.test_set_id,
        testSetRevision:authority.test_set_revision, testSetContentHash:authority.test_set_content_hash } }
    })
    // Bind every accepted Suite member to the exact execution item authority;
    // the repaired member cannot float back to a historical source revision.
    if (members.length !== manifest.length || members.some((member, index) => {
      const actual = manifest[index].definitionAuthority
      return member.definitionAuthority.testSetRowId !== actual.testSetRowId || member.definitionAuthority.definitionId !== actual.definitionId
    })) mismatch()
    suite = { schemaVersion:2, suiteId:revision.suite_id, projectId:revision.project_id, revision:revision.revision,
      name:revision.name, purpose:'sanity', members, createdAt:revision.created_at,
      provenance:{ source:'product_api', changeKind:revision.change_kind, priorRevision:revision.prior_revision,
        changeIntentKey:revision.change_intent_key, changeIntentFingerprint:revision.change_intent_fingerprint }, contentHash:revision.content_hash }
    if (suiteHash(suite) !== suite.contentHash) mismatch()
    suiteReference = { projectId:project, suiteId:suite.suiteId, revision:suite.revision, contentHash:suite.contentHash, itemOrdinal:selected.itemOrdinal }
    if (!same(suiteReference, link.suiteAuthority)) mismatch()
  }
  const expected = {
    execution:{ projectId:execution.project_id, executionId:execution.execution_id, origin:run.origin, manifest, suiteAuthority:suiteReference },
    run:{ projectId:run.app_name, runId:run.run_id, executionId:run.execution_id, origin:run.origin, attemptOrdinal:run.attempt_ordinal },
    result:{ projectId:run.app_name, resultId:result.result_id, runId:result.run_id, itemOrdinal:result.execution_item_ordinal,
      definitionId:result.definition_id, planHash:result.executable_plan_hash },
    ...(suite ? { suite } : {}),
  }
  if (!same(expected, link.persistedAuthorities)) mismatch()
  parseRepairAuthority('repair_rerun_links', link)
}

export function isRerunProductAuthority(payload: unknown, snapshot: unknown): number {
  try {
    if (typeof payload !== 'string' || typeof snapshot !== 'string') return 0
    assertRerunProductAuthority(JSON.parse(payload), JSON.parse(snapshot)); return 1
  } catch { return 0 }
}

export async function verifyRerunProductAuthority(db: Kysely<Database>, value: unknown): Promise<void> {
  validateRepairAuthority('repair_rerun_links', value)
  const result = await sql<{ authority:string }>`WITH rerun_input(payload) AS (SELECT ${canonicalJson(value)})
    SELECT ${sql.raw(rerunProductRowsSql('(SELECT payload FROM rerun_input)'))} AS authority`.execute(db)
  assertRerunProductAuthority(value, JSON.parse(result.rows[0].authority))
}
