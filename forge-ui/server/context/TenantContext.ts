import type { Request, Response, NextFunction } from 'express'

/**
 * Server-side tenant middleware stub. Phase 1: single tenant (always 'local').
 * Phase 2: extract tenantId from the verified JWT. Nova-approved stub.
 * (The `Express.Request` augmentation lives in AuthContext.ts.)
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.tenantId = 'local'
  next()
}
