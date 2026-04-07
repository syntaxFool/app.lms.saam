import { Router, Request, Response } from 'express'
import { query, queryOne } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /api/settings — public, no auth required (all devices can load branding)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings'
    )
    const settings: Record<string, string> = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    res.json({ success: true, data: settings })
  } catch (err) {
    console.error('Get settings error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch settings' })
  }
})

// PUT /api/settings — admin/superuser only
router.put('/', requireAuth, requireRole('superuser', 'admin'), async (req: Request, res: Response): Promise<void> => {
  const { app_name, app_logo, interests_list, sources_list } = req.body as { app_name?: string; app_logo?: string; interests_list?: string[]; sources_list?: string[] }

  if (app_name === undefined && app_logo === undefined && interests_list === undefined && sources_list === undefined) {
    res.status(400).json({ success: false, error: 'No settings provided' })
    return
  }

  try {
    if (app_name !== undefined) {
      const name = app_name.trim() || 'LeadFlow India'
      await queryOne(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('app_name', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [name]
      )
    }
    if (app_logo !== undefined) {
      await queryOne(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('app_logo', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [app_logo]
      )
    }
    if (interests_list !== undefined) {
      // Validate that it's an array of strings
      if (!Array.isArray(interests_list) || !interests_list.every(i => typeof i === 'string' && i.trim().length > 0)) {
        res.status(400).json({ success: false, error: 'interests_list must be an array of non-empty strings' })
        return
      }
      // Store as JSON string
      await queryOne(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('interests_list', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(interests_list)]
      )
    }
    if (sources_list !== undefined) {
      // Validate that it's an array of strings
      if (!Array.isArray(sources_list) || !sources_list.every(s => typeof s === 'string' && s.trim().length > 0)) {
        res.status(400).json({ success: false, error: 'sources_list must be an array of non-empty strings' })
        return
      }
      // Store as JSON string
      await queryOne(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('sources_list', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(sources_list)]
      )
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Update settings error:', err)
    res.status(500).json({ success: false, error: 'Failed to update settings' })
  }
})

export default router
