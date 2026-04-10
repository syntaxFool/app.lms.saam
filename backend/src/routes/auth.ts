import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { query, queryOne } from '../db'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { loginSchema, changePasswordSchema } from '../schemas'

interface DbUser {
  id: string
  username: string
  password: string
  name: string
  mobile: string | null
  role: string
  created_at: string
}

const router = Router()

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { uid, password } = req.body as { uid: string; password: string }

  try {
    const user = await queryOne<DbUser>(
      'SELECT * FROM users WHERE username = $1',
      [uid.trim().toLowerCase()]
    )

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    // NEW: Single session enforcement - invalidate all existing sessions
    await query('DELETE FROM sessions WHERE user_id = $1', [user.id])

    // NEW: Generate session ID
    const sessionId = crypto.randomUUID()

    const secret = process.env.JWT_SECRET!
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, sessionId },
      secret,
      { expiresIn: '7d' }
    )

    // NEW: Store session in database
    await query(
      `INSERT INTO sessions (user_id, session_id, token, device_info, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [
        user.id,
        sessionId,
        token,
        JSON.stringify({ userAgent: req.headers['user-agent'] || 'unknown' })
      ]
    )

    const { password: _, ...safeUser } = user
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: safeUser.id,
          username: safeUser.username,
          name: safeUser.name,
          mobile: safeUser.mobile,
          role: safeUser.role,
        }
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/auth/validate
router.get('/validate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<DbUser>(
      'SELECT id, username, name, mobile, role FROM users WHERE id = $1',
      [req.user!.userId]
    )

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' })
      return
    }

    res.json({ success: true, data: user })
  } catch (err) {
    console.error('Validate error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // NEW: Delete session from database
    if (req.user?.sessionId) {
      await query('DELETE FROM sessions WHERE session_id = $1', [req.user.sessionId])
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// NEW: GET /api/auth/session-status - Check session validity and inactivity
router.get('/session-status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.sessionId) {
      res.status(401).json({ success: false, error: 'No session ID in token' })
      return
    }

    const session = await queryOne<{ last_activity: string; expires_at: string }>(
      `SELECT last_activity, expires_at FROM sessions 
       WHERE session_id = $1 AND user_id = $2`,
      [req.user.sessionId, req.user.userId]
    )
    
    if (!session) {
      res.status(401).json({ success: false, error: 'Session not found' })
      return
    }
    
    const now = new Date()
    const lastActivity = new Date(session.last_activity)
    const inactiveMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    
    res.json({
      success: true,
      data: {
        active: inactiveMinutes < 40,
        inactiveMinutes: Math.floor(inactiveMinutes),
        expiresAt: session.expires_at
      }
    })
  } catch (err) {
    console.error('Session status error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/auth/change-password
router.post('/change-password', requireAuth, validate(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
  const { oldPassword, newPassword } = req.body as { oldPassword: string; newPassword: string }
  try {
    const user = await queryOne<DbUser>(
      'SELECT * FROM users WHERE id = $1',
      [req.user!.userId]
    )
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return }

    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) {
      res.status(400).json({ success: false, error: 'Current password is incorrect' })
      return
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await queryOne(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashed, req.user!.userId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ success: false, error: 'Failed to change password' })
  }
})

export default router
