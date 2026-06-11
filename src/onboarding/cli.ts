import * as path from 'path'
import { runMigrations }      from '../storage/migrate'
import { Crawler }            from './Crawler'
import { GeneratorRunner }    from './GeneratorRunner'
import { VerificationRunner } from './VerificationRunner'

async function main() {
  const command = process.argv[2]
  const args    = process.argv.slice(3)

  const getArg = (flag: string): string | undefined =>
    args.find(a => a.startsWith(`--${flag}=`))
      ?.split('=').slice(1).join('=')

  switch (command) {
    case 'crawl': {
      await runMigrations()
      const configPath = path.resolve('onboarding.config.ts')
      const configUrl  = new URL(`file://${configPath.replace(/\\/g, '/')}`)
      const { default: config } = await import(configUrl.href)
      const crawler = new Crawler(config)
      const model   = await crawler.crawl()
      console.log(`\n[CLI] Crawl complete — ${model.pages?.length ?? 0} pages discovered`)
      console.log(`[CLI] Review: models/${model.app.name}/app-model.json`)
      console.log(`[CLI] Next:   npm run onboard:verify -- --app=${model.app.name}`)
      break
    }

    case 'verify': {
      const appName = getArg('app') || process.env.APP_NAME || 'saucedemo'
      const runner  = new VerificationRunner(appName)
      await runner.run()
      break
    }

    case 'generate': {
      const appName = getArg('app') || process.env.APP_NAME || 'saucedemo'
      const runner  = new GeneratorRunner()
      await runner.generate(appName)
      break
    }

    case 'refresh': {
      await runMigrations()
      const configPath = path.resolve('onboarding.config.ts')
      const configUrl  = new URL(`file://${configPath.replace(/\\/g, '/')}`)
      const { default: config } = await import(configUrl.href)
      const crawler = new Crawler(config)
      await crawler.crawl()
      break
    }

    default:
      console.log(`
RYQ Framework — Onboarding CLI

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
