/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and
 * Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or
 * modification of this software is strictly
 * prohibited.
 */

/**
 * TD-110 — ObservationSettlingPolicy: reusable abstraction for waiting until
 * a page has revealed its evidence.
 *
 * Nova-approved (TD-110 design review).
 *
 * Problem: SPAs render content client-side after domcontentloaded. Detectors
 * that run immediately after page.goto() observe an incomplete page state —
 * live-confirmed on OrangeHRM, whose Vue-rendered login form appears after
 * hydration, so detectAuthType counted 0 password fields and concluded
 * authType 'none' (the TD-110 root cause).
 *
 * Solution: an injectable settling policy that waits for EVIDENCE rather than
 * sleeping for a fixed time. The timeout is the OUTER BOUND, not the
 * mechanism (Nova ruling: evidence-driven settling, not clock-driven).
 *
 * Future consumers: auth detection, strategy detection, nav detection, modal
 * detection, shadow DOM, React suspense, Vue hydration — one interface.
 */
import { Page } from '@playwright/test'

export interface ObservationSettlingPolicy {
  /**
   * Wait until the page has settled enough to reveal the evidence we're
   * looking for. Must NOT throw — log and continue on timeout (absent
   * evidence is the caller's call to make, not this policy's).
   */
  settle(page: Page): Promise<void>;
}

/**
 * DomcontentloadedPolicy — the pre-TD-110 default behavior: no additional
 * waiting beyond domcontentloaded. For fixture flows and static-HTML apps.
 */
export class DomcontentloadedPolicy implements ObservationSettlingPolicy {
  async settle(_page: Page): Promise<void> {
    // No-op — domcontentloaded is sufficient for this consumer.
  }
}

/**
 * WaitForSelectorPolicy — settles the moment a specific selector appears
 * (state: 'attached' — presence is the evidence; visibility is a separate
 * question). Evidence-driven: an app whose selector exists at load settles
 * instantly; the timeout fires only when the evidence genuinely never comes.
 */
export class WaitForSelectorPolicy implements ObservationSettlingPolicy {
  constructor(
    private selector: string,
    private timeoutMs: number = 3000,
  ) {}

  async settle(page: Page): Promise<void> {
    try {
      await page.waitForSelector(this.selector, {
        timeout: this.timeoutMs,
        state: 'attached',
      })
    } catch {
      // Selector not found within the outer bound — the page genuinely may
      // not have this element. Log and continue; the caller decides what
      // absent evidence means (Rule 5: visible, never silent).
      console.log(
        `[ObservationSettlingPolicy] Selector "${this.selector}" not found ` +
        `within ${this.timeoutMs}ms — proceeding with available evidence`,
      )
    }
  }
}

/**
 * NetworkIdlePolicy — settles when the network goes idle. For apps that
 * fetch content on load. More aggressive than WaitForSelectorPolicy.
 */
export class NetworkIdlePolicy implements ObservationSettlingPolicy {
  constructor(private timeoutMs: number = 5000) {}

  async settle(page: Page): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout: this.timeoutMs })
    } catch {
      console.log(
        `[ObservationSettlingPolicy] Network idle not reached within ` +
        `${this.timeoutMs}ms — proceeding with available evidence`,
      )
    }
  }
}

/**
 * ComposedPolicy — runs multiple policies in sequence (each contributes its
 * own settling; none invalidates a prior one — the cumulative-observation
 * principle).
 */
export class ComposedPolicy implements ObservationSettlingPolicy {
  constructor(private policies: ObservationSettlingPolicy[]) {}

  async settle(page: Page): Promise<void> {
    for (const policy of this.policies) {
      await policy.settle(page)
    }
  }
}

/** Default settling policy for SPA login detection (TD-110 Fix 1). */
export const SPA_AUTH_SETTLING_POLICY =
  new WaitForSelectorPolicy('input[type="password"]', 3000)

/** Default policy — no additional settling (pre-TD-110 behavior). */
export const DEFAULT_SETTLING_POLICY = new DomcontentloadedPolicy()
