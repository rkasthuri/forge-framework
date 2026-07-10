/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and
 * Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or
 * modification of this software is strictly
 * prohibited.
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * add-headers.ts — prepend the FORGE/AnvilQ copyright header to every
 * hand-authored source file (and each ADR). Idempotent: files already carrying
 * the marker are skipped. Machine-generated files (src/apps/**\/generated/**)
 * are intentionally excluded — they are marked "DO NOT EDIT" and regenerated,
 * so a manual header would drift; their attribution belongs in the generator
 * emit templates (a separate change).
 *
 * MAINTENANCE: run this script whenever new files are added so copyright headers
 * stay current. Idempotent — skips files already containing 'AnvilQ Technologies':
 *   npx tsx scripts/add-headers.ts
 */

const TS_HEADER = `/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and
 * Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or
 * modification of this software is strictly
 * prohibited.
 */
`

const MD_HEADER = `<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->
`

const MARKER = 'AnvilQ Technologies'

const CODE_ROOTS = ['src', 'forge-ui/src', 'forge-ui/server', 'scripts']
const DOC_ROOTS = ['docs/ADR']

const isGenerated = (file: string): boolean => file.split(path.sep).includes('generated')

function includedCode(file: string): boolean {
  if (!/\.tsx?$/.test(file)) return false      // .ts / .tsx (incl. *.test.ts)
  if (file.endsWith('.d.ts')) return false     // type declarations
  if (file.endsWith('.config.ts')) return false // vite/tailwind/postcss configs
  if (isGenerated(file)) return false
  return true
}

function walk(dir: string, filter: (f: string) => boolean, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue
      walk(full, filter, out)
    } else if (filter(full)) {
      out.push(full)
    }
  }
  return out
}

const repoRoot = process.cwd()
let modified = 0
let skipped = 0

function prepend(content: string, header: string): string {
  // Keep a shebang on line 1 — insert the header just below it.
  if (content.startsWith('#!')) {
    const nl = content.indexOf('\n')
    const shebang = content.slice(0, nl + 1)
    return shebang + header + '\n' + content.slice(nl + 1)
  }
  return header + '\n' + content
}

function apply(files: string[], header: string): void {
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    if (content.includes(MARKER)) { skipped++; continue }
    fs.writeFileSync(file, prepend(content, header))
    modified++
    console.log(`[header] ${path.relative(repoRoot, file).replace(/\\/g, '/')}`)
  }
}

for (const root of CODE_ROOTS) {
  const abs = path.join(repoRoot, root)
  if (fs.existsSync(abs)) apply(walk(abs, includedCode), TS_HEADER)
}
for (const root of DOC_ROOTS) {
  const abs = path.join(repoRoot, root)
  if (fs.existsSync(abs)) apply(walk(abs, f => f.endsWith('.md')), MD_HEADER)
}

console.log(`\n[header] done — ${modified} modified, ${skipped} already had the marker`)
