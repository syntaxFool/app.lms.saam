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
    // Use X-Service-Name header to identify which bridge created the lead
    // (e.g., 'Moon' for ac-lms, 'Bun' for hp-lms). Default to 'moon'.
    const serviceName = (req.headers['x-service-name'] as string || 'moon').toLowerCase()
    
    // Synthetic user so downstream handlers don't break on req.user checks
    req.user = {
      userId: serviceName + '-service',
      username: serviceName,
      role: 'agent',
      sessionId: serviceName + '-internal',
    }
    return next()
  }

  // Not an API key request — pass to next auth middleware (requireAuth)
  next()
}
