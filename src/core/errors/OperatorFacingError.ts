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
 * OperatorFacingError — base for ENGINE preconditions whose failure an operator
 * can act on (not an internal bug). These are thrown from inside the engine run,
 * where the ExecutionContext boundary stringifies thrown errors — so the typed
 * class does NOT survive to forge-ui. What survives is data on the instance:
 *
 *   - `code`: a stable, machine-readable discriminator (e.g. 'MODEL_NOT_FOUND').
 *   - `operatorFacing`: a brand so a consumer that CANNOT import this class (the
 *     forge-ui side of the boundary) can recognize the family structurally,
 *     without colliding with Node's own coded errors (ENOENT, etc.).
 *
 * forge-ui reads `code` duck-typed (never importing this module) and surfaces
 * `.message` to the Mission Timeline. The message is operator-facing — no
 * internal tags, no stack noise. THIS FILE MUST NEVER REFERENCE forge-ui.
 *
 * This is the rail every future engine precondition rides: add a subclass with a
 * new `code` and an operator-facing message; the forge-ui surfacing is generic.
 */
export abstract class OperatorFacingError extends Error {
  /** Brand for structural recognition across the ExecutionContext boundary. */
  readonly operatorFacing = true as const
  /** Stable, machine-readable discriminator — survives serialization. */
  abstract readonly code: string
}

/**
 * A generation precondition: the app has no crawled model in its workspace yet.
 * The operator fix is to run a crawl first. Thrown by GeneratorRunner when
 * loadModel() returns null on the standalone/workspace path.
 */
export class ModelNotFoundError extends OperatorFacingError {
  readonly code = 'MODEL_NOT_FOUND'
  constructor(appName: string) {
    super(`No crawled model for '${appName}'. Run a crawl before generating tests.`)
    this.name = 'ModelNotFoundError'
  }
}

/**
 * A generation/verification precondition: the app has been ONBOARDED (a model
 * file exists) but never crawled — the model contains 0 pages, 0 flows, and 0
 * endpoints, so there is nothing to generate or verify FROM. Distinct from
 * ModelNotFoundError (no model file at all): here a model exists but is empty
 * (TC-04, 2026-07-13 — bootstrap persists a contentless model).
 */
export class EmptyModelError extends OperatorFacingError {
  readonly code = 'MODEL_EMPTY'
  constructor(appName: string) {
    super(`'${appName}' has been onboarded but never crawled — the model contains 0 pages, 0 flows, and 0 endpoints. Run a crawl before generating tests.`)
    this.name = 'EmptyModelError'
  }
}
