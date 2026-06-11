/**
 * Central runtime configuration.
 * All files that previously hardcoded 'saucedemo' import from here instead.
 */

export function getAppName(): string {
  return process.env.APP_NAME || 'saucedemo'
}

export function getBaseUrl(): string {
  return process.env.BASE_URL || 'https://www.saucedemo.com'
}

export function getTriggeredBy(): 'ci' | 'manual' | 'platform' | 'agent' {
  const val = process.env.TRIGGERED_BY || 'manual'
  if (['ci', 'manual', 'platform', 'agent'].includes(val)) {
    return val as 'ci' | 'manual' | 'platform' | 'agent'
  }
  return 'manual'
}

export function getEnvironment(): 'local' | 'ci' | 'staging' | 'production' {
  if (process.env.ENVIRONMENT) {
    const val = process.env.ENVIRONMENT
    if (['local', 'ci', 'staging', 'production'].includes(val)) {
      return val as 'local' | 'ci' | 'staging' | 'production'
    }
  }
  return process.env.CI ? 'ci' : 'local'
}
