import * as fs   from 'fs'
import * as path from 'path'
import { runMigrations }      from '../storage/migrate'
import { Crawler }            from './Crawler'
import { GeneratorRunner }    from './GeneratorRunner'
import { VerificationRunner } from './VerificationRunner'
import { Bootstrap, BootstrapOptions, BootstrapCredential, mapDetectedAppType } from './Bootstrap'
import { AgentRunner } from '../agent/AgentRunner'
import { JsonAgentMemoryRepository } from '../agent/AgentMemoryRepository'
import { GoalDefinition } from '../agent/AgentPlanner'
import { AgentMode } from '../agent/types'

async function resolveConfig(appName: string): Promise<any> {
  // Search for app-specific config under src/apps/**/
  const appsDir = path.resolve('src/apps')

  function findConfig(dir: string): string | null {
    if (!fs.existsSync(dir)) return null
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const found = findConfig(path.join(dir, entry.name))
        if (found) return found
      } else if (entry.name === `onboarding.${appName}.config.ts`) {
        return path.join(dir, entry.name)
      }
    }
    return null
  }
  const appConfigPath = findConfig(appsDir)

  if (appConfigPath) {
    console.log(`[CLI] Loading config: ${appConfigPath}`)
    const configUrl = new URL(
      `file://${appConfigPath.replace(/\\/g, '/')}`
    )
    const { default: config } = await import(configUrl.href)
    return config
  }
  // Fall back to project root onboarding.config.ts
  console.log(`[CLI] No app config found for "${appName}" \u2014 using root onboarding.config.ts`)
  const rootConfigPath = path.resolve('onboarding.config.ts')
  const rootConfigUrl  = new URL(
    `file://${rootConfigPath.replace(/\\/g, '/')}`
  )
  const { default: config } = await import(rootConfigUrl.href)
  return config
}

/**
 * TD-013 Agent Mode — find + import the hand-authored goal config for an app
 * (goals.<appName>.config.ts under src/apps/**), mirroring resolveConfig's search.
 * Missing goals is a warning, not a crash — the agent runs with an empty goal set.
 */
async function loadGoalDefinitions(appName: string): Promise<GoalDefinition[]> {
  const appsDir = path.resolve('src/apps')
  function find(dir: string): string | null {
    if (!fs.existsSync(dir)) return null
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const found = find(path.join(dir, entry.name))
        if (found) return found
      } else if (entry.name === `goals.${appName}.config.ts`) {
        return path.join(dir, entry.name)
      }
    }
    return null
  }
  const goalsPath = find(appsDir)
  if (!goalsPath) {
    console.warn(`[Agent] No goals config found for "${appName}" (goals.${appName}.config.ts) — running with no goals`)
    return []
  }
  const goalsUrl = new URL(`file://${goalsPath.replace(/\\/g, '/')}`)
  const { default: goals } = await import(goalsUrl.href)
  return goals as GoalDefinition[]
}

/**
 * TD-093 Bootstrap Mode — parse the --bootstrap flags, probe the live URL, print
 * a detection summary, write the generated onboarding config to disk, and return
 * the derived app name so the caller can resolve+crawl it. Runs BEFORE the normal
 * --app requirement / resolveConfig path.
 *
 * SECURITY: --username/--password are consumed only to build BootstrapOptions and
 * are NEVER written into the generated config (which emits a credentialsEnvKey
 * pointer only). Note they are visible in the shell/process list — a local-dev
 * bootstrap trade-off, not a stored secret.
 */
async function handleBootstrap(args: string[]): Promise<string> {
  const getArg = (flag: string): string | undefined =>
    args.find(a => a.startsWith(`--${flag}=`))?.split('=').slice(1).join('=')

  const url = getArg('url')
  if (!url) {
    console.error('[bootstrap] --url is required.')
    console.error('  Example: npm run onboard -- --bootstrap --url=https://example.com \\')
    console.error('             --role=admin --username=<user> --password=<pass>')
    process.exit(1)
  }

  // Collect ordered --role/--username/--password triplets (supports multiple roles).
  const credentials: BootstrapCredential[] = []
  let cur: { role?: string; username?: string; password?: string } = {}
  const flush = (): void => {
    if (cur.role && cur.username !== undefined && cur.password !== undefined) {
      credentials.push({ role: cur.role, username: cur.username, password: cur.password })
    } else if (cur.role) {
      console.warn(`[bootstrap] Role '${cur.role}' missing --username/--password — skipped`)
    }
    cur = {}
  }
  for (const a of args) {
    if      (a.startsWith('--role='))     { flush(); cur.role     = a.slice('--role='.length) }
    else if (a.startsWith('--username=')) { cur.username = a.slice('--username='.length) }
    else if (a.startsWith('--password=')) { cur.password = a.slice('--password='.length) }
  }
  flush()

  const maxPagesArg = getArg('maxPages')
  const maxPagesNum = maxPagesArg ? Number(maxPagesArg) : 50
  const options: BootstrapOptions = {
    url,
    credentials,
    nameOverride: getArg('name'),
    maxPages: Number.isFinite(maxPagesNum) ? maxPagesNum : 50,
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  }

  const bootstrap = new Bootstrap()
  const detection = await bootstrap.detect(options)

  const fmt = (f: { value: unknown; confidence: string; source: string }): string =>
    `${String(f.value).padEnd(16)} (${f.confidence} — ${f.source})`
  // appType is shown as it will appear in the generated config (post-mapping),
  // not the raw detection vocabulary — e.g. 'desktop-web' displays as 'web-ui'.
  const mappedAppType = { ...detection.appType, value: mapDetectedAppType(detection.appType.value) }
  console.log('[bootstrap] Detected:')
  console.log(`  appName:       ${fmt(detection.appName)}`)
  console.log(`  appType:       ${fmt(mappedAppType)}`)
  console.log(`  crawlStrategy: ${fmt(detection.crawlStrategy)}`)
  console.log(`  authType:      ${fmt(detection.authType)}`)

  await bootstrap.writeConfig(detection, options)
  console.log('[bootstrap] Proceeding to crawl with generated config...')
  return detection.appName.value
}

async function main() {
  const command = process.argv[2]
  const args    = process.argv.slice(3)

  const getArg = (flag: string): string | undefined =>
    args.find(a => a.startsWith(`--${flag}=`))
      ?.split('=').slice(1).join('=')

  const isBootstrap = args.includes('--bootstrap')

  // TD-093: in bootstrap mode the app name is DERIVED (from --name or the URL
  // hostname), so --app is not required; every other command still requires it.
  let appName = getArg('app') || process.env.APP_NAME || ''
  if (!appName && !isBootstrap) {
    console.error('[CLI] --app is required. Example: npm run onboard -- --app=myapp')
    process.exit(1)
  }

  switch (command) {
    case 'crawl': {
      // TD-093 Bootstrap Mode — detect from a live URL, generate + write the
      // config, THEN fall through to the normal crawl (resolveConfig now finds
      // the freshly-written file by the derived app name).
      if (isBootstrap) {
        appName = await handleBootstrap(args)
      }
      await runMigrations()
      const config  = await resolveConfig(appName)

      // TD-013 Agent Mode — run the goal-directed AgentPlanner against a live
      // ExecutionEnvironment (selected by appType) instead of the mechanical crawl.
      // Intercepts AFTER config load (it needs the config); --supervised is the
      // safe default so a user who forgets the flag gets the interactive mode.
      if (args.includes('--agent')) {
        const mode: AgentMode = args.includes('--autonomous') ? 'autonomous' : 'supervised'
        const goals   = await loadGoalDefinitions(appName)
        const runner  = new AgentRunner({ config, goals, mode, repository: new JsonAgentMemoryRepository() })
        const session = await runner.run()
        console.log(`\n[Agent] Session ${session.id} complete.`)
        process.exit(0)
      }

      const crawler = new Crawler(config)
      const model   = await crawler.crawl()
      const count = model.endpoints?.length ?? model.pages?.length ?? 0
      const unit  = (model.endpoints?.length ?? 0) > 0 ? 'endpoints' : 'pages'
      console.log(`\n[CLI] Crawl complete \u2014 ${count} ${unit} discovered`)
      console.log(`[CLI] Review: models/${model.app.name}/app-model.json`)
      console.log(`[CLI] Next:   npm run onboard:verify -- --app=${model.app.name}`)
      break
    }

    case 'verify': {
      const config = await resolveConfig(appName)
      const runner = new VerificationRunner(appName, config)
      await runner.run()
      break
    }

    case 'generate': {
      const runner = new GeneratorRunner()
      await runner.generate(appName)
      break
    }

    case 'refresh': {
      await runMigrations()
      const config  = await resolveConfig(appName)
      const crawler = new Crawler(config)
      await crawler.crawl()
      break
    }

    default:
      console.log(`
FORGE \u2014 Onboarding CLI

Commands:
  npm run onboard              Crawl app and produce App Model
  npm run onboard:verify       Verify App Model against live app
  npm run onboard:generate     Generate POMs, fixtures, and specs
  npm run onboard:refresh      Re-crawl and update App Model

Options:
  --app=<name>     App name (required, except in --bootstrap). Also reads APP_NAME.
  --url=<url>      Override base URL for crawl

Bootstrap Mode (TD-093) — zero-config onboarding from a live URL:
  npm run onboard -- --bootstrap --url=<url> \\
    --role=<id> --username=<user> --password=<pass> [more roles...] \\
    [--name=<appName>] [--maxPages=<n>] [--force]
  Probes the URL, generates onboarding.<app>.config.ts, then crawls.
  Credentials are used to build the config's credentialsEnvKey pointers;
  the secrets themselves are never written to the generated file.

Agent Mode (TD-013) — goal-directed crawl via the AgentPlanner:
  npm run onboard -- --app=<name> --agent [--autonomous]
  Runs goals.<app>.config.ts against a live ExecutionEnvironment (selected by
  appType). Default is --supervised (interactive decisions); --autonomous logs
  only. Requires a goals.<app>.config.ts (else runs with no goals + a warning).
      `)
  }

  process.exit(0)
}

main().catch(e => {
  console.error('[CLI] Fatal error:', e)
  process.exit(1)
})
