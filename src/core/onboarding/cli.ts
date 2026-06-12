import * as fs   from 'fs'
import * as path from 'path'
import { runMigrations }      from '../storage/migrate'
import { Crawler }            from './Crawler'
import { GeneratorRunner }    from './GeneratorRunner'
import { VerificationRunner } from './VerificationRunner'

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

async function main() {
  const command = process.argv[2]
  const args    = process.argv.slice(3)

  const getArg = (flag: string): string | undefined =>
    args.find(a => a.startsWith(`--${flag}=`))
      ?.split('=').slice(1).join('=')

  const appName = getArg('app') || process.env.APP_NAME || 'saucedemo'

  switch (command) {
    case 'crawl': {
      await runMigrations()
      const config  = await resolveConfig(appName)
      const crawler = new Crawler(config)
      const model   = await crawler.crawl()
      console.log(`\n[CLI] Crawl complete \u2014 ${model.pages?.length ?? 0} pages discovered`)
      console.log(`[CLI] Review: models/${model.app.name}/app-model.json`)
      console.log(`[CLI] Next:   npm run onboard:verify -- --app=${model.app.name}`)
      break
    }

    case 'verify': {
      const runner = new VerificationRunner(appName)
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
RYQ Framework \u2014 Onboarding CLI

Commands:
  npm run onboard              Crawl app and produce App Model
  npm run onboard:verify       Verify App Model against live app
  npm run onboard:generate     Generate POMs, fixtures, and specs
  npm run onboard:refresh      Re-crawl and update App Model

Options:
  --app=<name>     App name (default: APP_NAME env or saucedemo)
  --url=<url>      Override base URL for crawl
      `)
  }

  process.exit(0)
}

main().catch(e => {
  console.error('[CLI] Fatal error:', e)
  process.exit(1)
})
