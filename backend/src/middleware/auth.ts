import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { query, queryOne } from '../db'

export interface JwtPayload {
  userId: string
  username: string
  role: string
  sessionId: string  // NEW: Session identifier for single-session enforcement
  iat?: number
  exp?: number
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET not configured')
    const payload = jwt.verify(token, secret) as JwtPayload
    
    // NEW: Validate session exists and is active (40min inactivity check)
    if (payload.sessionId) {
      const session = await queryOne<{ last_activity: string; expires_at: string }>(
        `SELECT last_activity, expires_at FROM sessions 
         WHERE session_id = $1 
         AND user_id = $2 
         AND expires_at > NOW()
         AND last_activity > NOW() - INTERVAL '40 minutes'`,
        [payload.sessionId, payload.userId]
      )
      
      if (!session) {
        res.status(401).json({ success: false, error: 'Session expired or invalid' })
        return
      }
      
      // Update last activity (async - don't wait)
      query('UPDATE sessions SET last_activity = NOW() WHERE session_id = $1', [payload.sessionId])
        .catch(err => console.error('Failed to update session activity:', err))
    }
    
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
