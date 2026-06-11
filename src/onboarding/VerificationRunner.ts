import { chromium, Browser, BrowserContext, Page } from '@playwright/test'
import * as fs   from 'fs'
import * as path from 'path'
import {
  AppModel, PageDefinition, ElementDefinition,
  FlowDefinition, FlowStep, Strategy
} from './types'
import { loadAppModel }       from './ModelValidator'
import { RunRepository }      from '../storage/repositories/RunRepository'
import { runMigrations }      from '../storage/migrate'

// ── Result types ──────────────────────────────────────────────────────────────

export interface ElementResult {
  elementId:       string
  name:            string
  pageId:          string
  status:          'passed' | 'failed' | 'healed'
  strategyUsed:    Strategy | null
  durationMs:      number
  error:           string | null
  screenshotPath:  string | null
  nearestMatch:    string | null
}

export interface FlowResult {
  flowId:          string
  displayName:     string
  status:          'passed' | 'failed'
  stepsTotal:      number
  stepsPassed:     number
  failedAtStep:    number | null
  error:           string | null
  screenshotPath:  string | null
  durationMs:      number
}

export interface VerificationReport {
  appName:          string
  modelVersion:     string
  runId:            string
  startedAt:        string
  completedAt:      string
  elementResults:   ElementResult[]
  flowResults:      FlowResult[]
  elementsPassed:   number
  elementsTotal:    number
  flowsPassed:      number
  flowsTotal:       number
  confidenceScore:  number
  confidenceLevel:  'HIGH' | 'MEDIUM' | 'LOW'
  recommendation:   string
}

// ── VerificationRunner ────────────────────────────────────────────────────────

export class VerificationRunner {

  private screenshotDir: string
  private runId:         string

  constructor(private appName: string) {
    this.runId         = `verify-${appName}-${Date.now()}`
    this.screenshotDir = path.resolve('reports/verify')
    fs.mkdirSync(this.screenshotDir, { recursive: true })
  }

  async run(): Promise<VerificationReport> {
    const model     = loadAppModel(this.appName) as unknown as AppModel
    const pages     = model.pages  || []
    const flows     = model.flows  || []
    const startedAt = new Date().toISOString()

    this.printHeader(model)

    const browser        = await chromium.launch({ headless: true })
    const elementResults: ElementResult[] = []
    const flowResults:    FlowResult[]    = []

    try {
      // ── Element verification ──────────────────────────────────────────
      console.log('\nELEMENTS\n')
      for (const page of pages) {
        const critical = page.elements.filter(e => e.critical)
        if (critical.length === 0) continue

        console.log(`  ${page.displayName.toUpperCase()}`)

        const context = await this.createContext(model, browser)
        const pw      = await context.newPage()

        try {
          // Authenticate if page requires it
          await this.authenticateForPage(pw, page, model)

          // Navigate to target page
          const targetUrl = page.urlPattern === '/'
            ? model.app.baseUrl
            : `${model.app.baseUrl}${page.urlPattern}`

          await pw.goto(targetUrl, {
            waitUntil: 'networkidle',
            timeout:   30000,
          })

          // Confirm we are not on the login page
          const currentUrl = pw.url()
          const redirectedToLogin = /\/$/.test(new URL(currentUrl).pathname) &&
            page.urlPattern !== '/'

          if (redirectedToLogin) {
            console.log(
              `  ⚠ Redirected to login — credentials may be wrong for this page`
            )
          }

          for (const el of critical) {
            const result = await this.verifyElement(pw, el, page.id, model)
            elementResults.push(result)
            this.printElementResult(result)
          }
        } catch (e: any) {
          console.log(`  ⚠ Could not load ${page.displayName}: ${e.message}`)
        } finally {
          await pw.close()
          await context.close()
        }

        console.log('')
      }

      // ── Flow verification ─────────────────────────────────────────────
      console.log('FLOWS\n')
      for (const flow of flows) {
        const context = await this.createContext(model, browser)
        const pw      = await context.newPage()

        try {
          // Authenticate for the flow's role if needed
          const role = model.roles.find(r => r.id === flow.roleId)
          if (role && role.authFlow !== 'none' && role.credentialsEnvKey) {
            const raw = process.env[role.credentialsEnvKey]
            if (raw) {
              const [username, password] = raw.split(':')
              const loginPage = (model.pages || []).find(p => p.isAuthPage)
              if (loginPage && username && password) {
                const usernameEl = loginPage.elements.find(
                  e => e.name.toLowerCase().includes('username')
                )
                const passwordEl = loginPage.elements.find(
                  e => e.name.toLowerCase().includes('password')
                )
                const submitEl = loginPage.elements.find(
                  e => e.kind === 'button' && e.critical
                )
                const userSel   = usernameEl
                  ? this.strategyToSelector(usernameEl.strategies[0])
                  : '[data-test="username"]'
                const passSel   = passwordEl
                  ? this.strategyToSelector(passwordEl.strategies[0])
                  : '[data-test="password"]'
                const submitSel = submitEl
                  ? this.strategyToSelector(submitEl.strategies[0])
                  : '[data-test="login-button"]'

                await pw.goto(model.app.baseUrl, { waitUntil: 'networkidle' })
                await pw.fill(userSel, username)
                await pw.fill(passSel, password)
                await pw.click(submitSel)
                await pw.waitForLoadState('networkidle', { timeout: 10000 })
              }
            }
          }

          const result = await this.verifyFlow(pw, flow, model)
          flowResults.push(result)
          this.printFlowResult(result)
        } catch (e: any) {
          flowResults.push({
            flowId:        flow.id,
            displayName:   flow.displayName,
            status:        'failed',
            stepsTotal:    (flow.steps || []).length,
            stepsPassed:   0,
            failedAtStep:  0,
            error:         e.message,
            screenshotPath: null,
            durationMs:    0,
          })
          console.log(`  ✗ ${flow.displayName} — setup failed: ${e.message}`)
        } finally {
          await pw.close()
          await context.close()
        }
      }

    } finally {
      await browser.close()
    }

    const report = this.buildReport(
      model, elementResults, flowResults, startedAt
    )

    await this.saveReport(report)
    this.printSummary(report)

    // Write model back if any heals occurred
    const healed = elementResults.filter(r => r.status === 'healed')
    if (healed.length > 0) {
      this.writeModelHealbacks(model, healed)
    }

    return report
  }

  // ── Element verification ────────────────────────────────────────────────────

  private async verifyElement(
    page:    Page,
    el:      ElementDefinition,
    pageId:  string,
    model:   AppModel
  ): Promise<ElementResult> {
    const start = Date.now()

    for (const strategy of el.strategies) {
      const selector = this.strategyToSelector(strategy)
      try {
        const locator = page.locator(selector).first()
        await locator.waitFor({ state: 'attached', timeout: 5000 })

        return {
          elementId:      el.id,
          name:           el.name,
          pageId,
          status:         strategy === el.strategies[0] ? 'passed' : 'healed',
          strategyUsed:   strategy,
          durationMs:     Date.now() - start,
          error:          null,
          screenshotPath: null,
          nearestMatch:   null,
        }
      } catch {
        // try next strategy
      }
    }

    // All strategies failed — take screenshot and find nearest match
    const screenshotPath = await this.takeScreenshot(page, `el-${el.name}`)
    const nearestMatch   = await this.findNearestMatch(page, el)

    return {
      elementId:      el.id,
      name:           el.name,
      pageId,
      status:         'failed',
      strategyUsed:   null,
      durationMs:     Date.now() - start,
      error:          `All ${el.strategies.length} strategies failed`,
      screenshotPath,
      nearestMatch,
    }
  }

  private async findNearestMatch(
    page: Page,
    el:   ElementDefinition
  ): Promise<string | null> {
    try {
      const dataTestEls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-test]'))
          .map(e => e.getAttribute('data-test'))
          .filter(Boolean)
          .slice(0, 10)
      })
      if (dataTestEls.length > 0) {
        return `data-test candidates: ${dataTestEls.join(', ')}`
      }
    } catch {}
    return null
  }

  // ── Flow verification ───────────────────────────────────────────────────────

  private async verifyFlow(
    page:  Page,
    flow:  FlowDefinition,
    model: AppModel
  ): Promise<FlowResult> {
    const start       = Date.now()
    let stepsPassed   = 0
    let failedAtStep: number | null = null
    let error:        string | null = null
    let screenshotPath: string | null = null

    await page.goto(model.app.baseUrl, { waitUntil: 'networkidle' })

    for (const step of (flow.steps || [])) {
      try {
        await this.executeStep(page, step, model)
        stepsPassed++
      } catch (e: any) {
        failedAtStep   = step.stepIndex
        error          = e.message
        screenshotPath = await this.takeScreenshot(
          page, `flow-${flow.id}-step${step.stepIndex}`
        )
        break
      }
    }

    const passed = failedAtStep === null

    return {
      flowId:        flow.id,
      displayName:   flow.displayName,
      status:        passed ? 'passed' : 'failed',
      stepsTotal:    (flow.steps || []).length,
      stepsPassed,
      failedAtStep,
      error,
      screenshotPath,
      durationMs:    Date.now() - start,
    }
  }

  private async executeStep(
    page:  Page,
    step:  FlowStep,
    model: AppModel
  ): Promise<void> {
    const timeout = 10000

    switch (step.action) {
      case 'navigate': {
        await page.goto(
          `${model.app.baseUrl}${step.value || ''}`,
          { waitUntil: 'networkidle', timeout }
        )
        break
      }

      case 'fill': {
        if (!step.elementId) break
        const el       = this.findElement(step.elementId, model)
        const selector = el ? this.strategyToSelector(el.strategies[0]) : step.elementId
        const value    = this.resolveValue(step.value || '')
        await page.fill(selector, value, { timeout })
        break
      }

      case 'click': {
        if (!step.elementId) break
        const el       = this.findElement(step.elementId, model)
        const selector = el ? this.strategyToSelector(el.strategies[0]) : step.elementId
        await page.click(selector, { timeout })
        break
      }

      case 'assert-navigation': {
        const pattern = step.value || ''
        try {
          await page.waitForURL(
            url => url.href.includes(pattern),
            { timeout }
          )
        } catch {
          // fallback — check current URL contains pattern
          const current = page.url()
          if (!current.includes(pattern)) {
            throw new Error(
              `Expected URL to contain "${pattern}" but got "${current}"`
            )
          }
        }
        break
      }

      case 'assert-element-visible': {
        if (!step.elementId) break
        const el       = this.findElement(step.elementId, model)
        const selector = el ? this.strategyToSelector(el.strategies[0]) : step.elementId
        await page.locator(selector).waitFor({ state: 'visible', timeout })
        break
      }

      case 'select': {
        if (!step.elementId || !step.value) break
        const el       = this.findElement(step.elementId, model)
        const selector = el ? this.strategyToSelector(el.strategies[0]) : step.elementId
        await page.selectOption(selector, step.value)
        break
      }

      default:
        console.log(`    [skip] Unknown action: ${(step as any).action}`)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async createContext(
    model:   AppModel,
    browser: Browser
  ): Promise<BrowserContext> {
    return browser.newContext({
      baseURL: model.app.baseUrl,
    })
  }

  private async authenticateForPage(
    page:     Page,
    pageDef:  PageDefinition,
    model:    AppModel
  ): Promise<void> {
    // Login page and guest-accessible pages need no auth
    if (pageDef.isAuthPage) return
    if (pageDef.accessibleByRoles.includes('guestPage') &&
        pageDef.accessibleByRoles.length === 1) return

    // Find a non-guest role that can access this page
    const roleId = pageDef.accessibleByRoles.find(r => r !== 'guestPage')
    if (!roleId) return

    const role = model.roles.find(r => r.id === roleId)
    if (!role || role.authFlow === 'none') return
    if (!role.credentialsEnvKey) return

    const raw = process.env[role.credentialsEnvKey]
    if (!raw) {
      console.log(
        `  ⚠ Missing env var ${role.credentialsEnvKey} — skipping auth`
      )
      return
    }

    const [username, password] = raw.split(':')
    if (!username || !password) return

    // Find login page
    const loginPage = (model.pages || []).find(p => p.isAuthPage)
    if (!loginPage) return

    // Find login elements from model
    const usernameEl = loginPage.elements.find(
      e => e.name.toLowerCase().includes('username') ||
           e.name.toLowerCase().includes('user')
    )
    const passwordEl = loginPage.elements.find(
      e => e.name.toLowerCase().includes('password') ||
           e.name.toLowerCase().includes('pass')
    )
    const submitEl = loginPage.elements.find(
      e => e.kind === 'button' && e.critical
    )

    const userSelector   = usernameEl
      ? this.strategyToSelector(usernameEl.strategies[0])
      : '[data-test="username"]'
    const passSelector   = passwordEl
      ? this.strategyToSelector(passwordEl.strategies[0])
      : '[data-test="password"]'
    const submitSelector = submitEl
      ? this.strategyToSelector(submitEl.strategies[0])
      : '[data-test="login-button"]'

    try {
      await page.goto(model.app.baseUrl, {
        waitUntil: 'networkidle',
        timeout:   15000,
      })
      await page.fill(userSelector, username)
      await page.fill(passSelector, password)
      await page.click(submitSelector)
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      console.log(`  [auth] Authenticated as ${roleId}`)
    } catch (e: any) {
      console.log(`  ⚠ Auth failed for ${roleId}: ${e.message}`)
    }
  }

  private findElement(
    elementId: string,
    model:     AppModel
  ): ElementDefinition | null {
    for (const page of (model.pages || [])) {
      const el = page.elements.find(e => e.id === elementId)
      if (el) return el
    }
    return null
  }

  private strategyToSelector(strategy: Strategy): string {
    switch (strategy.type) {
      case 'data-test': return `[data-test="${strategy.value}"]`
      case 'id':        return `#${strategy.value}`
      case 'role':      return `[role="${strategy.value}"]`
      case 'text':      return `text=${strategy.value}`
      case 'css':       return strategy.value
      default:          return strategy.value
    }
  }

  private resolveValue(value: string): string {
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return process.env[key] || ''
    })
  }

  private async takeScreenshot(page: Page, name: string): Promise<string> {
    const fileName = `${name}-${Date.now()}.png`
    const filePath = path.join(this.screenshotDir, fileName)
    try {
      await page.screenshot({ path: filePath, fullPage: false })
      return filePath
    } catch {
      return ''
    }
  }

  private writeModelHealbacks(
    model:  AppModel,
    healed: ElementResult[]
  ): void {
    let changed = false

    for (const result of healed) {
      if (!result.strategyUsed) continue
      const [pageId, elName] = result.elementId.split(':')
      const page = (model.pages || []).find(p => p.id === pageId)
      if (!page) continue
      const el = page.elements.find(e => e.name === elName)
      if (!el) continue

      // Promote healed strategy to primary
      const idx = el.strategies.findIndex(
        s => s.type === result.strategyUsed!.type &&
             s.value === result.strategyUsed!.value
      )
      if (idx > 0) {
        const [promoted] = el.strategies.splice(idx, 1)
        el.strategies.unshift(promoted)
        console.log(
          `[Verify] Healed ${result.elementId} — ` +
          `promoted ${result.strategyUsed.type} strategy to primary`
        )
        changed = true
      }
    }

    if (changed) {
      const modelPath = path.resolve(
        `models/${model.app.name}/app-model.json`
      )
      fs.writeFileSync(modelPath, JSON.stringify(model, null, 2))
      console.log(`[Verify] Model updated: ${modelPath}`)
    }
  }

  // ── Report building ──────────────────────────────────────────────────────────

  private buildReport(
    model:          AppModel,
    elementResults: ElementResult[],
    flowResults:    FlowResult[],
    startedAt:      string
  ): VerificationReport {
    const elementsPassed = elementResults.filter(
      r => r.status === 'passed' || r.status === 'healed'
    ).length
    const elementsTotal  = elementResults.length
    const flowsPassed    = flowResults.filter(r => r.status === 'passed').length
    const flowsTotal     = flowResults.length

    const elementScore = elementsTotal > 0
      ? (elementsPassed / elementsTotal) * 0.6
      : 0.6
    const flowScore = flowsTotal > 0
      ? (flowsPassed / flowsTotal) * 0.4
      : 0.4

    const confidenceScore = Math.round((elementScore + flowScore) * 100) / 100
    const confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      confidenceScore >= 0.85 ? 'HIGH' :
      confidenceScore >= 0.65 ? 'MEDIUM' : 'LOW'

    const recommendation =
      confidenceLevel === 'HIGH'
        ? 'Model is ready. Run: npm run onboard:generate'
        : confidenceLevel === 'MEDIUM'
          ? 'Review flagged items in app-model.json then re-run verify'
          : 'Significant issues found. Review model before generating.'

    return {
      appName:         model.app.name,
      modelVersion:    model.app.modelVersion,
      runId:           this.runId,
      startedAt,
      completedAt:     new Date().toISOString(),
      elementResults,
      flowResults,
      elementsPassed,
      elementsTotal,
      flowsPassed,
      flowsTotal,
      confidenceScore,
      confidenceLevel,
      recommendation,
    }
  }

  private async saveReport(report: VerificationReport): Promise<void> {
    const reportPath = path.resolve(
      `reports/verify/${report.appName}-verify-report.json`
    )
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    try {
      await runMigrations()
      const runRepo = new RunRepository()
      await runRepo.insert({
        run_id:           report.runId,
        app_name:         report.appName,
        branch:           process.env.GITHUB_REF_NAME || 'local',
        commit_sha:       process.env.GITHUB_SHA      || 'local',
        environment:      (process.env.CI ? 'ci' : 'local') as any,
        base_url:         process.env.BASE_URL        || '',
        triggered_by:     'manual' as any,
        reporter_version: '5.4',
        status:           report.confidenceLevel === 'HIGH' ? 'passed' : 'failed',
        total_tests:      report.elementsTotal + report.flowsTotal,
        passed:           report.elementsPassed + report.flowsPassed,
        failed:           (report.elementsTotal - report.elementsPassed) +
                          (report.flowsTotal - report.flowsPassed),
        skipped:          0,
        duration_ms:      new Date(report.completedAt).getTime() -
                          new Date(report.startedAt).getTime(),
        started_at:       report.startedAt,
        completed_at:     report.completedAt,
        metadata:         JSON.stringify({
          type:            'verification',
          confidenceScore: report.confidenceScore,
          confidenceLevel: report.confidenceLevel,
        }),
      })
    } catch (e) {
      console.warn('[Verify] DB write failed (non-fatal):', e)
    }
  }

  // ── Console output ───────────────────────────────────────────────────────────

  private printHeader(model: AppModel): void {
    console.log(
      `\nVerification Report — ${model.app.name} v${model.app.modelVersion}`
    )
    console.log('─'.repeat(52))
  }

  private printElementResult(result: ElementResult): void {
    const icon     = result.status === 'failed' ? '✗' :
                     result.status === 'healed' ? '⚡' : '✓'
    const strategy = result.strategyUsed
      ? `${result.strategyUsed.type}:${result.strategyUsed.value}`.slice(0, 35)
      : 'no strategy worked'
    const timing   = `(${result.durationMs}ms)`
    const line     = `  ${icon} ${result.name.padEnd(22)} ${strategy.padEnd(36)} ${timing}`
    console.log(line)

    if (result.status === 'failed') {
      if (result.nearestMatch) {
        console.log(`    → Nearest match: ${result.nearestMatch}`)
      }
      if (result.screenshotPath) {
        console.log(`    → Screenshot: ${result.screenshotPath}`)
      }
      console.log(
        `    → Fix in: models/${result.pageId.split(':')[0]}/app-model.json`
      )
    }
    if (result.status === 'healed') {
      console.log(
        `    ⚡ Healed via ${result.strategyUsed?.type} — model updated`
      )
    }
  }

  private printFlowResult(result: FlowResult): void {
    const icon   = result.status === 'passed' ? '✓' : '✗'
    const steps  = `${result.stepsPassed}/${result.stepsTotal} steps`
    const timing = `(${result.durationMs}ms)`
    console.log(
      `  ${icon} ${result.displayName.padEnd(32)} ${steps.padEnd(12)} ${timing}`
    )

    if (result.status === 'failed') {
      console.log(`    → Failed at step ${result.failedAtStep}: ${result.error}`)
      if (result.screenshotPath) {
        console.log(`    → Screenshot: ${result.screenshotPath}`)
      }
    }
  }

  private printSummary(report: VerificationReport): void {
    const line = '─'.repeat(52)
    console.log(`\n${line}`)
    console.log(`Elements: ${report.elementsPassed}/${report.elementsTotal} passed`)
    console.log(`Flows:    ${report.flowsPassed}/${report.flowsTotal} passed`)
    console.log(
      `Model confidence: ${report.confidenceLevel} ` +
      `(${report.confidenceScore.toFixed(2)})`
    )
    console.log(`\n${report.recommendation}`)
    console.log(`${line}\n`)
  }
}
