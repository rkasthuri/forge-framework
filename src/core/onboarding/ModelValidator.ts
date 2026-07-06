import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import * as fs from 'fs'
import * as path from 'path'

/**
 * TD-108 smoke finding A (TD-097/TD-109 pattern): the schema SHIPS WITH FORGE —
 * it must resolve from this file's location (src/core/onboarding/), never from
 * process.cwd(). The old cwd-relative resolve crashed every standalone crawl
 * run outside the repo (ENOENT on <workspace>/models/schema/...).
 * NOTE: loadAppModel()'s model path below is deliberately NOT repo-anchored —
 * the model is a DATA artifact whose home (repo vs workspace) is the open
 * TD-114-family placement question; the schema is not.
 */
const REPO_ROOT  = path.resolve(__dirname, '../../..')   // onboarding → core → src → repoRoot
const schemaPath = path.join(REPO_ROOT, 'models', 'schema', 'app-model.schema.json')

let _validator: ReturnType<Ajv['compile']> | null = null

function getValidator() {
  if (_validator) return _validator
  const ajv = new Ajv({ allErrors: true, strict: false })
  try {
    addFormats(ajv)
  } catch {
    // ajv-formats optional
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))
  _validator = ajv.compile(schema)
  return _validator
}

export interface ValidationResult {
  valid:  boolean
  errors: string[]
}

export function validateAppModel(modelPath: string): ValidationResult {
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'))
  const validate = getValidator()
  const valid = validate(model) as boolean
  const errors = valid
    ? []
    : (validate.errors || []).map(e =>
        `${e.instancePath || '(root)'} ${e.message}`
      )
  return { valid, errors }
}

export function loadAppModel(appName: string): Record<string, unknown> {
  const modelPath = path.resolve(`models/${appName}/app-model.json`)
  if (!fs.existsSync(modelPath)) {
    throw new Error(`App model not found: ${modelPath}`)
  }
  const result = validateAppModel(modelPath)
  if (!result.valid) {
    throw new Error(
      `App model validation failed for ${appName}:\n` +
      result.errors.join('\n')
    )
  }
  return JSON.parse(fs.readFileSync(modelPath, 'utf-8'))
}
