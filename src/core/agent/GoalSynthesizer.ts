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
 * TD-093 Phase 2 / TD-013 Phase 3 — GoalSynthesizer.
 *
 * Synthesizes candidate PENDING goals from observed landing-page signals.
 * Used by the Bootstrap Mission (Phase 2) and, later, by full-crawl goal
 * auto-discovery (TD-013 Phase 3) — one implementation, different mission
 * policies.
 *
 * PURE: no Playwright dependency, no I/O, no AI calls — simple signal reading
 * only (AI reasoning happens in AgentPlanner when a goal executes). Synthesis
 * generates ZERO evidence: every returned goal has an empty evidenceChain —
 * evidence begins only at execution (Nova Q1).
 */
import { Mission } from './Mission'
import { Goal, GoalOrigin } from './types'

export interface PageSignals {
  navLinks: Array<{ text: string; href: string }>;
  buttonTexts: string[];
  formPresence: boolean;
  currentUrl: string;
  pageTitle: string;
}

export interface GoalSynthesizer {
  synthesize(signals: PageSignals, mission: Mission): Goal[];
}

/** Candidate-goal cap for a bootstrap mission (shallow, information-gain first). */
const BOOTSTRAP_MAX_GOALS = 5

const AUTH_TEXT = /login|sign.?in/i

export class DefaultGoalSynthesizer implements GoalSynthesizer {
  synthesize(signals: PageSignals, mission: Mission): Goal[] {
    const goals: Goal[] = []
    const origin: GoalOrigin = 'synthesized'

    // Auth goal — a "Login"/"Sign in" button (or nav link) suggests an auth
    // capability worth probing. Only synthesized when the mission permits
    // auth attempts; at most one auth goal per page.
    const authSignal =
      signals.buttonTexts.find(t => AUTH_TEXT.test(t)) ??
      signals.navLinks.find(l => AUTH_TEXT.test(l.text))?.text
    if (authSignal && mission.authAttemptsPermitted) {
      goals.push(this.newGoal(goals.length, origin, {
        description: `Authenticate via the observed '${authSignal.trim()}' control`,
        successCriteria: [{
          description: 'A password field is present (auth form reachable)',
          verifier: 'dom-assertion',
          locator: 'input[type="password"]',
        }],
      }))
    }

    // Navigation goals — one per distinct, real nav link (skip hash/js/empty).
    const seenHrefs = new Set<string>()
    for (const link of signals.navLinks) {
      const href = (link.href ?? '').trim()
      const text = (link.text ?? '').trim()
      if (!href || !text) continue
      if (href === '#' || href.startsWith('#') || href.startsWith('javascript')) continue
      if (seenHrefs.has(href)) continue
      seenHrefs.add(href)
      goals.push(this.newGoal(goals.length, origin, {
        description: `Navigate to '${text}' (${href})`,
        successCriteria: [{
          description: `URL reflects navigation to ${href}`,
          verifier: 'page-url',
          expectedValue: href,
        }],
      }))
    }

    // Mission policy: bootstrap is shallow — cap candidates at 5.
    const cap = mission.type === 'bootstrap' ? BOOTSTRAP_MAX_GOALS : goals.length
    return goals.slice(0, cap)
  }

  /** Every synthesized goal: origin='synthesized', status='pending', ZERO evidence. */
  private newGoal(
    index: number,
    origin: GoalOrigin,
    fields: { description: string; successCriteria: Goal['successCriteria'] },
  ): Goal {
    return {
      id:              `synthesized-${index}-${Date.now()}`,
      type:            'capability',
      origin,
      description:     fields.description,
      successCriteria: fields.successCriteria,
      prerequisites:   [],
      status:          'pending',
      evidenceChain:   [],   // evidence starts only at execution — never here
      createdAt:       new Date().toISOString(),
    }
  }
}
