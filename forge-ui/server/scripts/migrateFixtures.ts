import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/**
 * TD-UI-013 — migrate fixture apps (OrangeHRM, Restful Booker) into real UI
 * workspaces at ~/.forge-projects/<appName>/.forge/config.json so they are
 * discovered by GET /api/v1/projects (and no longer render greyed "not yet
 * crawled" in the switcher). Fixtures otherwise ship as .ts onboarding configs
 * that the workspace scan never sees.
 *
 * Idempotent — skips any app whose config.json already exists, so it is safe to
 * run on every server start (including the EADDRINUSE port-retry path).
 * TD-097: all paths runtime-derived via os.homedir() + path.join — no hardcodes.
 */
interface Fixture {
  appName: string
  url: string
  appType: string
  crawlStrategy: string
  authType: string
}

const FIXTURES: Fixture[] = [
  {
    appName: 'orangehrm',
    url: 'https://opensource-demo.orangehrmlive.com',
    appType: 'spa',
    crawlStrategy: 'auto',
    authType: 'form-login',
  },
  {
    appName: 'restful-booker',
    url: 'https://restful-booker.herokuapp.com',
    appType: 'api',
    crawlStrategy: 'auto',
    authType: 'none',
  },
]

export async function migrateFixtures(): Promise<void> {
  for (const fixture of FIXTURES) {
    const workspacePath = path.join(os.homedir(), '.forge-projects', fixture.appName)
    const forgeDir = path.join(workspacePath, '.forge')
    const configPath = path.join(forgeDir, 'config.json')

    // Skip if already migrated.
    if (fs.existsSync(configPath)) {
      console.log(`[migrate] ${fixture.appName} already migrated — skipping`)
      continue
    }

    // Create workspace structure.
    fs.mkdirSync(forgeDir, { recursive: true })
    fs.mkdirSync(path.join(workspacePath, 'tests', 'generated'), { recursive: true })
    fs.mkdirSync(path.join(workspacePath, 'tests', 'manual'), { recursive: true })
    fs.mkdirSync(path.join(workspacePath, 'reports'), { recursive: true })

    // Write AppConfig JSON.
    const config = {
      schemaVersion: 1,
      appName: fixture.appName,
      url: fixture.url,
      appType: fixture.appType,
      crawlStrategy: fixture.crawlStrategy,
      authType: fixture.authType,
      budgets: {
        maxDepth: 5,
        maxPages: 50,
        aiCalls: 150,
      },
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Write project.json manifest.
    const now = new Date().toISOString()
    const projectManifest = {
      projectVersion: 1,
      frameworkVersion: '1.0.0',
      appName: fixture.appName,
      url: fixture.url,
      createdAt: now,
      lastOpenedAt: now,
      databaseVersion: 12,
    }
    fs.writeFileSync(
      path.join(forgeDir, 'project.json'),
      JSON.stringify(projectManifest, null, 2),
    )

    console.log(`[migrate] ✅ ${fixture.appName} migrated to ${workspacePath}`)
  }
}
