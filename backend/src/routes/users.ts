import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createUserSchema, updateUserSchema, updateOwnProfileSchema } from '../schemas'
import { ROLE_LIMITS } from '../constants/roleLimits'

const router = Router()

// GET /api/users
router.get('/', requireAuth, requireRole('superuser', 'admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await query(
      'SELECT id, username, name, mobile, role, created_at FROM users ORDER BY created_at ASC'
    )
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('Get users error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch users' })
  }
})

// POST /api/users
router.post('/', requireAuth, requireRole('superuser', 'admin'), validate(createUserSchema), async (req: Request, res: Response): Promise<void> => {
  const { username, password, name, mobile, role } = req.body as {
    username: string; password: string; name: string; mobile?: string; role: string
  }

  if (!username || !password || !name || !role) {
    res.status(400).json({ success: false, error: 'username, password, name and role are required' })
    return
  }

  // Enforce role hierarchy — admins can't create superusers
  if (req.user!.role === 'admin' && role === 'superuser') {
    res.status(403).json({ success: false, error: 'Admins cannot create superuser accounts' })
    return
  }

  try {
    // Check role limit
    const countRow = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE role = $1', [role]
    )
    const currentCount = parseInt(countRow?.count || '0')
    const limit = ROLE_LIMITS[role] ?? Infinity
    if (currentCount >= limit) {
      res.status(409).json({
        success: false,
        error: `Role limit reached: max ${limit} ${role} account(s) allowed`
      })
      return
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await queryOne(
      `INSERT INTO users (username, password, name, mobile, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, mobile, role, created_at`,
      [username.trim().toLowerCase(), hashed, name, mobile || null, role]
    )
    res.status(201).json({ success: true, data: user })
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, error: 'Username already exists' })
      return
    }
    console.error('Create user error:', err)
    res.status(500).json({ success: false, error: 'Failed to create user' })
  }
})

// PUT /api/users/me — update own profile (no role escalation allowed)
router.put('/me', requireAuth, validate(updateOwnProfileSchema), async (req: Request, res: Response): Promise<void> => {
  const { name, mobile } = req.body
  try {
    const user = await queryOne(
      `UPDATE users SET
         name   = COALESCE($1, name),
         mobile = COALESCE($2, mobile),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, name, mobile, role`,
      [name || null, mobile || null, req.user!.userId]
    )
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return }
    res.json({ success: true, data: user })
  } catch (err) {
    console.error('Update own profile error:', err)
    res.status(500).json({ success: false, error: 'Failed to update profile' })
  }
})

// PUT /api/users/:id
router.put('/:id', requireAuth, requireRole('superuser', 'admin'), validate(updateUserSchema), async (req: Request, res: Response): Promise<void> => {
  const { name, mobile, role, password } = req.body
  const { id } = req.params

  // Prevent demoting/altering superuser unless caller is superuser
  if (req.user!.role !== 'superuser' && role === 'superuser') {
    res.status(403).json({ success: false, error: 'Only superuser can assign superuser role' })
    return
  }

  try {
    let passwordClause = ''
    const params: any[] = [name || null, mobile || null, role || null, id]

    if (password) {
      const hashed = await bcrypt.hash(password, 12)
      passwordClause = ', password = $5'
      params.splice(3, 0, hashed)
      params[params.length - 1] = id
    }

    const user = await queryOne(
      `UPDATE users SET
         name   = COALESCE($1, name),
         mobile = COALESCE($2, mobile),
         role   = COALESCE($3::user_role, role)
         ${passwordClause},
         updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING id, username, name, mobile, role`,
      params
    )

    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return }
    res.json({ success: true, data: user })
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ success: false, error: 'Failed to update user' })
  }
})

// DELETE /api/users/:id
router.delete('/:id', requireAuth, requireRole('superuser'), async (req: Request, res: Response): Promise<void> => {
  if (req.user!.userId === req.params.id) {
    res.status(400).json({ success: false, error: 'Cannot delete your own account' })
    return
  }
  try {
    const row = await queryOne('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id])
    if (!row) { res.status(404).json({ success: false, error: 'User not found' }); return }
    res.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ success: false, error: 'Failed to delete user' })
  }
})

export default router
