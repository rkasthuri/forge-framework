import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import * as fs from 'fs'
import * as path from 'path'

const schemaPath = path.resolve('models/schema/app-model.schema.json')

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
