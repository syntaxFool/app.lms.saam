import { Router, Request, Response } from 'express'
import { query, queryOne } from '../db'
import { requireAuth } from '../middleware/auth'
import { allowApiKey } from '../middleware/apiKey'
import { validate } from '../middleware/validate'
import { createNotificationSchema, updateNotificationSchema } from '../schemas'

const router = Router()

// ─── GET /api/notifications ───
// Returns unread count + recent notifications. Supports both JWT and API key.
router.get('/', allowApiKey, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20)
    const unreadOnly = req.query.unread === 'true'

    const where = unreadOnly ? 'WHERE read = false' : ''
    const rows = await query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $1`,
      [limit]
    )

    const countRow = await queryOne<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE read = false'
    )

    res.json({
      success: true,
      data: {
        notifications: rows.map(r => ({
          id:        r.id,
          title:     r.title,
          message:   r.message,
          type:      r.type,
          leadId:    r.lead_id,
          read:      r.read,
          createdBy: r.created_by,
          createdAt: r.created_at,
        })),
        unreadCount: parseInt(countRow?.count || '0'),
      },
    })
  } catch (err) {
    console.error('Get notifications error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' })
  }
})

// ─── POST /api/notifications ───
// Moon service uses this to create notifications. Also callable by admins.
router.post('/', allowApiKey, requireAuth, validate(createNotificationSchema), async (req: Request, res: Response): Promise<void> => {
  const { title, message, type, leadId, createdBy } = req.body
  try {
    const row = await queryOne(
      `INSERT INTO notifications (title, message, type, lead_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, message, type || 'info', leadId || null, createdBy || req.user!.username]
    )
    res.status(201).json({ success: true, data: row })
  } catch (err) {
    console.error('Create notification error:', err)
    res.status(500).json({ success: false, error: 'Failed to create notification' })
  }
})

// ─── PUT /api/notifications/:id ───
// Mark notification as read/unread (JWT-only — frontend user action)
router.put('/:id', requireAuth, validate(updateNotificationSchema), async (req: Request, res: Response): Promise<void> => {
  const { read } = req.body
  try {
    const row = await queryOne(
      'UPDATE notifications SET read = $1 WHERE id = $2 RETURNING *',
      [read, req.params.id]
    )
    if (!row) {
      res.status(404).json({ success: false, error: 'Notification not found' })
      return
    }
    res.json({ success: true, data: row })
  } catch (err) {
    console.error('Update notification error:', err)
    res.status(500).json({ success: false, error: 'Failed to update notification' })
  }
})

// ─── PUT /api/notifications/read-all ───
// Convenience: mark all as read
router.put('/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await query('UPDATE notifications SET read = true WHERE read = false')
    res.json({ success: true })
  } catch (err) {
    console.error('Mark all read error:', err)
    res.status(500).json({ success: false, error: 'Failed to mark all read' })
  }
})

export default router
