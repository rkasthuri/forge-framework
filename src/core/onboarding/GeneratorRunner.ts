import * as path from 'path'
import * as fs   from 'fs'
import * as os   from 'os'
import { loadAppModel }     from './ModelValidator'
import { PomGenerator }     from './generators/PomGenerator'
import { FixtureGenerator } from './generators/FixtureGenerator'
import { SpecGenerator }    from './generators/SpecGenerator'
import { AppModel, OnboardingConfig } from './types'
import { pathToFileURL }   from 'url'
import { ModuleClassifier } from '../crawler/ModuleClassifier'
import { Workspace } from '../workspace/WorkspaceManager'
import { toOnboardingConfig } from '../workspace/ConfigAdapter'

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

  async generate(appName: string, workspace?: Workspace): Promise<void> {
    // TD-121 Standalone Mode — route generated output through the Workspace
    // (tests/<module>/) instead of the fixture src/apps/ tree.
    if (workspace) {
      return this.generateIntoWorkspace(appName, workspace)
    }

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

  /**
   * TD-121 Standalone Mode — generate into the workspace's tests/ tree.
   *
   * The three generators write files themselves (generate(outputDir)) and are
   * deliberately UNTOUCHED, so this path stages into a throwaway temp dir and
   * then routes every staged file through the Workspace with a mapping that
   * preserves the generated tree's relative imports exactly:
   *   specs/<file>  → tests/<module>/<file>   ('../pages/X', '../fixtures.generated' still resolve)
   *   pages/<file>  → tests/pages/<file>
   *   <root files>  → tests/<file>            (fixtures.generated.ts; API apps' './X' imports preserved)
   *
   * The persisted model carries NO module assignments (CrawlRunner classifies
   * after Crawler saves — TD-112), so the pure rule-based ModuleClassifier is
   * re-run here at generation time. No src/apps/ search on this path.
   */
  private async generateIntoWorkspace(appName: string, workspace: Workspace): Promise<void> {
    console.log(`[GeneratorRunner] Loading model from workspace for: ${appName}`)
    const raw = await workspace.loadModel(appName)
    if (raw === null) {
      throw new Error(`[GeneratorRunner] No app model found for "${appName}" in this workspace. Run forge crawl first.`)
    }
    const model = raw as AppModel

    // Re-run the (pure, deterministic, no-AI) module rule pass — finding E.
    const classifier = new ModuleClassifier()
    for (const page of model.pages ?? []) page.module = classifier.classify(page)
    const moduleOfFlow = (flowId: string): string => {
      const flow = model.flows?.find(f => f.id === flowId)
      // Anchor on the flow's FIRST step's page (FlowDefinition has no start-page
      // field of its own — steps[].pageId is the real signal).
      const firstPageId = flow?.steps?.[0]?.pageId
      const page = firstPageId ? model.pages?.find(p => p.id === firstPageId) : undefined
      const name = page?.module?.name
      return name && page?.module?.confidence !== 'unknown' ? name : 'general'
    }

    // Config for per-role loginUrl/successUrl: adapt the workspace AppConfig
    // (no onboarding.<app>.config.ts exists in a workspace — don't search src/apps/).
    let config: OnboardingConfig | undefined
    const appConfig = await workspace.loadConfig()
    if (appConfig) config = toOnboardingConfig(appConfig)

    // Stage into a temp dir, then route through the workspace.
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-gen-'))
    try {
      const isApiApp = (model.app.appType === 'rest-api' || model.app.appType === 'graphql-api')
      if (!isApiApp) {
        fs.mkdirSync(path.join(staging, 'pages'), { recursive: true })
        fs.mkdirSync(path.join(staging, 'specs'), { recursive: true })
      }

      new PomGenerator(model).generate(staging)
      new FixtureGenerator(model, config).generate(staging)
      new SpecGenerator(model).generate(staging)

      let written = 0
      // Root files (fixtures.generated.ts; API apps: ApiClient + api spec) → tests/ root.
      for (const entry of fs.readdirSync(staging, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        await workspace.writeTestsFile(entry.name, fs.readFileSync(path.join(staging, entry.name), 'utf-8'))
        written++
      }
      // POMs → tests/pages/ (specs import them as '../pages/X').
      const pagesDir = path.join(staging, 'pages')
      if (fs.existsSync(pagesDir)) {
        for (const f of fs.readdirSync(pagesDir)) {
          await workspace.writeTests('pages', f, fs.readFileSync(path.join(pagesDir, f), 'utf-8'))
          written++
        }
      }
      // Specs → tests/<module>/ via the flow's start page's module.
      const specsDir = path.join(staging, 'specs')
      if (fs.existsSync(specsDir)) {
        for (const f of fs.readdirSync(specsDir)) {
          const flowId = f.replace(/\.generated\.spec\.ts$/, '')
          await workspace.writeTests(moduleOfFlow(flowId), f, fs.readFileSync(path.join(specsDir, f), 'utf-8'))
          written++
        }
      }

      console.log(`\n[GeneratorRunner] Generation complete — ${written} file(s) written to ${workspace.testsDir}`)
    } finally {
      fs.rmSync(staging, { recursive: true, force: true })
    }
  }
}
