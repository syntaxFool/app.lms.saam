import { Request, Response, NextFunction } from 'express'

/**
 * Middleware that allows internal services (Moon) to authenticate
 * using X-API-Key header instead of JWT.
 *
 * Must be placed BEFORE requireAuth in the route chain.
 * If the API key matches, it sets a synthetic req.user and skips JWT.
 * If not, it passes control to requireAuth for normal JWT flow.
 */
export function allowApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined
  const expectedKey = process.env.MOON_API_KEY

  if (expectedKey && apiKey === expectedKey) {
    // Synthetic user so downstream handlers don't break on req.user checks
    req.user = {
      userId: 'moon-service',
      username: 'moon',
      role: 'agent',
      sessionId: 'moon-internal',
    }
    return next()
  }

  // Not an API key request — pass to next auth middleware (requireAuth)
  next()
}
