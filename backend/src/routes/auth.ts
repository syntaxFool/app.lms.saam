import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { queryOne } from '../db'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { loginSchema, changePasswordSchema } from '../schemas'

interface DbUser {
  id: string
  username: string
  password: string
  name: string
  email: string | null
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

    const secret = process.env.JWT_SECRET!
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: '7d' }
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
          email: safeUser.email,
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
      'SELECT id, username, name, email, role FROM users WHERE id = $1',
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
router.post('/logout', requireAuth, (_req: Request, res: Response): void => {
  // JWT is stateless; client drops the token
  res.json({ success: true })
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
