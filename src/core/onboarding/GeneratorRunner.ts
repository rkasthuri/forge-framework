import * as path from 'path'
import * as fs   from 'fs'
import { loadAppModel }     from './ModelValidator'
import { PomGenerator }     from './generators/PomGenerator'
import { FixtureGenerator } from './generators/FixtureGenerator'
import { SpecGenerator }    from './generators/SpecGenerator'
import { AppModel, OnboardingConfig } from './types'
import { pathToFileURL }   from 'url'

export class GeneratorRunner {

  private findAppDir(appName: string): string {
    const appsDir = path.resolve('src/apps')
    const search  = (dir: string): string | null => {
      if (!fs.existsSync(dir)) return null
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        if (entry.name === appName) return path.join(dir, entry.name)
        const found = search(path.join(dir, entry.name))
        if (found) return found
      }
      return null
    }
    return search(appsDir) || path.resolve(`src/apps/${appName}`)
  }

  async generate(appName: string): Promise<void> {
    console.log(`[GeneratorRunner] Loading model for: ${appName}`)
    const raw   = loadAppModel(appName)
    const model = raw as unknown as AppModel

    // Load onboarding config so generators can use per-role loginUrl/successUrl
    let config: OnboardingConfig | undefined
    try {
      const appsDir = path.resolve('src/apps')
      const findCfg = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) { const f = findCfg(path.join(dir, e.name)); if (f) return f }
          else if (e.name === `onboarding.${appName}.config.ts`) return path.join(dir, e.name)
        }
        return null
      }
      const cfgPath = findCfg(appsDir) ?? path.resolve('onboarding.config.ts')
      const { default: cfg } = await import(pathToFileURL(cfgPath).href)
      config = cfg as OnboardingConfig
    } catch (err) {
      console.warn(
        `[GeneratorRunner] Failed to load onboarding config for "${appName}" — ` +
        `successUrl/loginUrl resolution will fall back to defaults for every role:`,
        err,
      )
    }

    const appDir    = this.findAppDir(appName)
    const outputDir = path.join(appDir, 'generated')
    const isApiApp  = (model.app.appType === 'rest-api' || model.app.appType === 'graphql-api')
    fs.mkdirSync(outputDir, { recursive: true })
    if (!isApiApp) {
      fs.mkdirSync(path.join(outputDir, 'pages'), { recursive: true })
      fs.mkdirSync(path.join(outputDir, 'specs'), { recursive: true })
    }

    console.log(`[GeneratorRunner] Output directory: ${outputDir}`)
    console.log(`[GeneratorRunner] Pages:     ${model.pages?.length ?? 0}`)
    console.log(`[GeneratorRunner] Endpoints: ${model.endpoints?.length ?? 0}`)
    console.log(`[GeneratorRunner] Roles:     ${model.roles.length}`)
    console.log(`[GeneratorRunner] Flows:     ${model.flows?.length ?? 0}`)

    const pomGen     = new PomGenerator(model)
    const fixtureGen = new FixtureGenerator(model, config)
    const specGen    = new SpecGenerator(model)

    pomGen.generate(outputDir)
    fixtureGen.generate(outputDir)
    specGen.generate(outputDir)

    console.log(`\n[GeneratorRunner] Generation complete`)
    console.log(`[GeneratorRunner] Review output at: ${outputDir}`)
    console.log(`[GeneratorRunner] Run verify:  npm run onboard:verify -- --app=${appName}`)
  }
}
