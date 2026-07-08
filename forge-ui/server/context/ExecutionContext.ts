/**
 * ExecutionContext — Phase 1: runs in-process. Phase 2: submits to a cloud job
 * queue. Nova-approved: wraps ALL engine calls. Routes must NEVER call
 * CrawlRunner/GeneratorRunner/VerificationRunner directly — always go through
 * ExecutionContext, so Phase 2 can swap in-process for a queue with no route
 * changes.
 *
 * Engine imports are DYNAMIC and via a variable path so forge-ui's tsc does not
 * pull the engine (a separate tsconfig/compilation) into the UI build — the
 * one-directional boundary holds (forge-ui → src, never the reverse). Resolved
 * at runtime under tsx.
 */
export interface Job {
  type: 'crawl' | 'generate' | 'run' | 'verify'
  appName: string
  options: Record<string, unknown>
}

export interface JobResult {
  jobId: string
  status: 'completed' | 'failed'
  result?: unknown
  error?: string
}

const ENGINE = {
  crawlRunner:  '../../../src/core/runner/CrawlRunner',
  generator:    '../../../src/core/onboarding/GeneratorRunner',
  verifier:     '../../../src/core/onboarding/VerificationRunner',
}

export class ExecutionContext {
  async submit(job: Job): Promise<JobResult> {
    const jobId = `job-${Date.now()}`
    try {
      const result = await this.runInProcess(job)
      return { jobId, status: 'completed', result }
    } catch (err) {
      return { jobId, status: 'failed', error: String(err) }
    }
  }

  private async runInProcess(job: Job): Promise<unknown> {
    switch (job.type) {
      case 'crawl': {
        const mod: any = await import(ENGINE.crawlRunner)
        return new mod.CrawlRunner().run(job.options as any)
      }
      case 'generate': {
        const mod: any = await import(ENGINE.generator)
        // GeneratorRunner.generate(appName, workspace?) → void today (TD-UI-003).
        return new mod.GeneratorRunner().generate(job.appName, undefined)
      }
      case 'verify': {
        const mod: any = await import(ENGINE.verifier)
        return new mod.VerificationRunner(job.appName).run()
      }
      case 'run':
        // Test execution runs via the Playwright CLI, not a runner class.
        // Wiring (spawn + SSE surfacing) lands in TD-UI-004.
        throw new Error("ExecutionContext: 'run' not yet wired — TD-UI-004")
      default:
        throw new Error(`Unknown job type: ${(job as Job).type}`)
    }
  }
}

export const executionContext = new ExecutionContext()
