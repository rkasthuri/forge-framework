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
 * Mission — the assignment handed to the Agent before it starts.
 * Same Agent, different behavior based on Mission policy.
 * Nova-approved abstraction (TD-093 Phase 2 design review).
 */

export type MissionType =
  | 'bootstrap'
  | 'crawl'
  | 'verification'
  | 'regression';

export interface Mission {
  type: MissionType;
  depthBudget: number;
  authAttemptsPermitted: boolean;
  /**
   * Hard lock: Bootstrap missions ALWAYS run supervised regardless of
   * the --autonomous CLI flag. Enforced in AgentRunner, not here.
   */
  supervisedOnly: boolean;
  optimizeFor: 'information-gain' | 'efficiency';
  label: string;
}

export const Missions = {
  bootstrap: (): Mission => ({
    type: 'bootstrap',
    depthBudget: 2,
    authAttemptsPermitted: true,
    supervisedOnly: true,
    optimizeFor: 'information-gain',
    label: 'Bootstrap: first-time app discovery',
  }),

  crawl: (): Mission => ({
    type: 'crawl',
    depthBudget: 10,
    authAttemptsPermitted: true,
    supervisedOnly: false,
    optimizeFor: 'efficiency',
    label: 'Crawl: deep app exploration',
  }),

  verification: (): Mission => ({
    type: 'verification',
    depthBudget: 3,
    authAttemptsPermitted: false,
    supervisedOnly: false,
    optimizeFor: 'efficiency',
    label: 'Verification: targeted element check',
  }),

  regression: (): Mission => ({
    type: 'regression',
    depthBudget: 10,
    authAttemptsPermitted: true,
    supervisedOnly: false,
    optimizeFor: 'efficiency',
    label: 'Regression: full re-verification',
  }),
};
