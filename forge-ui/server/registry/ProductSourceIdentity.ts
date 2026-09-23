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

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export interface ProductSourceIdentity {
  productSourceSha: string
  productSourceSnapshotSha256: string
  sourceFileCount: number
  method: 'configured-build' | 'git-worktree-snapshot-v1'
}

const SHA40 = /^[a-f0-9]{40}$/
const SHA256 = /^[a-f0-9]{64}$/
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SCOPES = ['src', 'forge-ui/server', 'forge-ui/src', 'scripts', 'docs/configuration/baselines']

function configured(): ProductSourceIdentity | null {
  const productSourceSha = process.env.FORGE_PRODUCT_SOURCE_SHA ?? process.env.GITHUB_SHA ?? ''
  const productSourceSnapshotSha256 = process.env.FORGE_PRODUCT_SOURCE_SNAPSHOT_SHA256 ?? ''
  const count = Number(process.env.FORGE_PRODUCT_SOURCE_FILE_COUNT)
  return SHA40.test(productSourceSha) && SHA256.test(productSourceSnapshotSha256) && Number.isSafeInteger(count) && count > 0
    ? { productSourceSha, productSourceSnapshotSha256, sourceFileCount: count, method: 'configured-build' }
    : null
}

/**
 * Exact local-development identity. The commit identifies the baseline and the
 * canonical content digest includes tracked plus untracked Product files, so a
 * dirty checkpoint is never represented as the clean commit alone.
 */
export function readProductSourceIdentity(): ProductSourceIdentity | null {
  const build = configured()
  if (build) return build
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true })
  const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...SCOPES], { cwd: ROOT, encoding: 'utf8', windowsHide: true })
  const productSourceSha = head.status === 0 ? head.stdout.trim() : ''
  const files = listed.status === 0 ? listed.stdout.split(/\r?\n/).filter(Boolean).sort() : []
  if (!SHA40.test(productSourceSha) || files.length === 0) return null
  const hash = crypto.createHash('sha256')
  try {
    for (const relative of files) {
      const absolute = path.resolve(ROOT, relative)
      if (!absolute.startsWith(`${ROOT}${path.sep}`) || !fs.statSync(absolute).isFile()) return null
      hash.update(relative.replaceAll('\\', '/')).update('\0').update(fs.readFileSync(absolute)).update('\0')
    }
  } catch {
    return null
  }
  return { productSourceSha, productSourceSnapshotSha256: hash.digest('hex'), sourceFileCount: files.length, method: 'git-worktree-snapshot-v1' }
}

