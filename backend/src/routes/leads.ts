import { Router, Request, Response } from 'express'
import { query, queryOne } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createLeadSchema, updateLeadSchema, bulkLeadUpdateSchema, bulkLeadDeleteSchema } from '../schemas'

interface DbLead {
  id: string
  name: string
  phone: string
  email: string | null
  location: string | null
  interest: string | null
  source: string | null
  status: string
  assigned_to: string | null
  temperature: string
  value: string
  lost_reason: string | null
  lost_reason_type: string | null
  notes: string | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
  last_modified_by: string | null
  activities?: any[]
  tasks?: any[]
}

function mapLead(row: DbLead, activities: any[] = [], tasks: any[] = []) {
  return {
    id:             row.id,
    name:           row.name,
    phone:          row.phone,
    email:          row.email || '',
    location:       row.location || '',
    interest:       row.interest || '',
    source:         row.source || '',
    status:         row.status,
    assignedTo:     row.assigned_to || '',
    temperature:    row.temperature || '',
    value:          parseFloat(row.value) || 0,
    lostReason:     row.lost_reason || '',
    lostReasonType: row.lost_reason_type || '',
    notes:          row.notes || '',
    followUpDate:   row.follow_up_date || '',
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
    lastModified:   row.updated_at,
    lastModifiedBy: row.last_modified_by || '',
    activities:     activities.map(a => ({
      id:            a.id,
      type:          a.type,
      note:          a.note,
      timestamp:     a.created_at,
      createdBy:     a.created_by,
      role:          a.role || undefined,
      relatedTaskId: a.related_task_id || undefined,
      changes:       a.changes || undefined,
    })),
    tasks: tasks.map(t => ({
      id:          t.id,
      title:       t.title,
      note:        t.note || '',
      dueDate:     t.due_date || '',
      status:      t.status,
      priority:    t.priority || 'medium',
      createdAt:   t.created_at,
      completedAt: t.completed_at || undefined,
      createdBy:   t.created_by || '',
      assignedTo:  t.assigned_to || '',
    })),
  }
}

const router = Router()

// ─── GET /api/leads ─── sync endpoint
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const since = req.query.since ? new Date(parseInt(req.query.since as string)).toISOString() : null
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 200))

    const whereClause = since ? 'WHERE updated_at > $1' : ''
    const baseParams: any[] = since ? [since] : []

    // Total count for pagination metadata
    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM leads ${whereClause}`,
      baseParams
    )
    const total = countRow?.count ?? 0

    const offset = (page - 1) * limit
    const paginatedParams = [...baseParams, limit, offset]
    const paramOffset = baseParams.length

    const leadsRows = await query<DbLead>(
      `SELECT * FROM leads ${whereClause} ORDER BY updated_at DESC LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`,
      paginatedParams
    )

    if (leadsRows.length === 0) {
      res.json({ success: true, data: { leads: [], lastUpdate: Date.now(), total, page, limit } })
      return
    }

    const leadIds = leadsRows.map(l => l.id)
    const placeholders = leadIds.map((_, i) => `$${i + 1}`).join(',')

    const [activitiesRows, tasksRows] = await Promise.all([
      query(`SELECT * FROM activities WHERE lead_id IN (${placeholders}) ORDER BY created_at ASC`, leadIds),
      query(`SELECT * FROM tasks WHERE lead_id IN (${placeholders}) ORDER BY created_at ASC`, leadIds),
    ])

    const actMap: Record<string, any[]> = {}
    const taskMap: Record<string, any[]> = {}
    activitiesRows.forEach(a => { (actMap[a.lead_id] ||= []).push(a) })
    tasksRows.forEach(t => { (taskMap[t.lead_id] ||= []).push(t) })

    const leads = leadsRows.map(l => mapLead(l, actMap[l.id] || [], taskMap[l.id] || []))

    res.json({ success: true, data: { leads, lastUpdate: Date.now(), total, page, limit } })
  } catch (err) {
    console.error('Get leads error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch leads' })
  }
})

// ─── GET /api/leads/check-updates ───
router.get('/check-updates', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const since = req.query.since ? new Date(parseInt(req.query.since as string)).toISOString() : null
    const row = await queryOne<{ has_updates: boolean; last_update: string }>(
      `SELECT EXISTS(SELECT 1 FROM leads WHERE updated_at > $1) AS has_updates,
              MAX(updated_at) AS last_update FROM leads`,
      [since || new Date(0).toISOString()]
    )

    res.json({
      success: true,
      data: {
        hasUpdates: row?.has_updates || false,
        lastUpdate: row?.last_update ? new Date(row.last_update).getTime() : 0
      }
    })
  } catch (err) {
    console.error('Check updates error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// ─── POST /api/leads ───
router.post('/', requireAuth, requireRole('superuser', 'admin', 'agent'), validate(createLeadSchema), async (req: Request, res: Response): Promise<void> => {
  const d = req.body
  try {
    const row = await queryOne<DbLead>(
      `INSERT INTO leads
         (id, name, phone, email, location, interest, source, status, assigned_to,
          temperature, value, notes, follow_up_date, last_modified_by)
       VALUES (COALESCE($1::uuid, gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        d.id || null,
        d.name || null, d.phone,
        d.email || null, d.location || null, d.interest || null, d.source || null,
        d.status || 'New',
        d.assignedTo || null,
        d.temperature || '',
        d.value || 0,
        d.notes || null,
        d.followUpDate || null,
        req.user!.username,
      ]
    )

    if (!row) { res.status(500).json({ success: false, error: 'Insert failed' }); return }

    // Insert initial activity
    await query(
      `INSERT INTO activities (lead_id, type, note, created_by, role)
       VALUES ($1, 'lead_created', $2, $3, $4)`,
      [row.id, `Lead created: ${d.name || d.phone}`, req.user!.username, req.user!.role]
    )

    const activities = await query('SELECT * FROM activities WHERE lead_id = $1', [row.id])
    res.status(201).json({ success: true, data: mapLead(row, activities, []) })
  } catch (err) {
    console.error('Create lead error:', err)
    res.status(500).json({ success: false, error: 'Failed to create lead' })
  }
})

// ─── PUT /api/leads/bulk ───
router.put('/bulk', requireAuth, requireRole('superuser', 'admin', 'agent'), validate(bulkLeadUpdateSchema), async (req: Request, res: Response): Promise<void> => {
  const { leadIds, updates } = req.body as { leadIds: string[]; updates: Record<string, any> }
  try {
    const placeholders = leadIds.map((_, i) => `$${i + 3}`).join(',')
    await query(
      `UPDATE leads SET assigned_to = $1, updated_at = NOW(),
         last_modified_by = $2
       WHERE id IN (${placeholders})`,
      [updates.assignedTo, req.user!.username, ...leadIds]
    )
    res.json({ success: true, data: { count: leadIds.length } })
  } catch (err) {
    console.error('Bulk update error:', err)
    res.status(500).json({ success: false, error: 'Bulk update failed' })
  }
})

// ─── DELETE /api/leads/bulk ───
router.delete('/bulk', requireAuth, requireRole('superuser', 'admin'), validate(bulkLeadDeleteSchema), async (req: Request, res: Response): Promise<void> => {
  const { leadIds } = req.body as { leadIds: string[] }
  try {
    const placeholders = leadIds.map((_, i) => `$${i + 1}`).join(',')
    const result = await query(`DELETE FROM leads WHERE id IN (${placeholders}) RETURNING id`, leadIds)
    res.json({ success: true, data: { count: result.length } })
  } catch (err) {
    console.error('Bulk delete error:', err)
    res.status(500).json({ success: false, error: 'Bulk delete failed' })
  }
})

// ─── PUT /api/leads/:id ───
router.put('/:id', requireAuth, requireRole('superuser', 'admin', 'agent'), validate(updateLeadSchema), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const d = req.body
  try {
    const row = await queryOne<DbLead>(
      `UPDATE leads SET
         name             = COALESCE($1,  name),
         phone            = COALESCE($2,  phone),
         email            = COALESCE($3,  email),
         location         = COALESCE($4,  location),
         interest         = COALESCE($5,  interest),
         source           = COALESCE($6,  source),
         status           = COALESCE($7,  status),
         assigned_to      = COALESCE($8,  assigned_to),
         temperature      = COALESCE($9,  temperature),
         value            = COALESCE($10, value),
         lost_reason      = COALESCE($11, lost_reason),
         lost_reason_type = COALESCE($12::lost_reason_type, lost_reason_type),
         notes            = COALESCE($13, notes),
         follow_up_date   = COALESCE($14::date, follow_up_date),
         last_modified_by = $15,
         updated_at       = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        d.name || null, d.phone || null, d.email || null,
        d.location || null, d.interest || null, d.source || null,
        d.status || null, d.assignedTo || null, d.temperature ?? null,
        d.value != null ? d.value : null,
        d.lostReason || null, d.lostReasonType || null,
        d.notes || null, d.followUpDate || null,
        req.user!.username,
        id,
      ]
    )

    if (!row) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const [activities, tasks] = await Promise.all([
      query('SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at ASC', [id]),
      query('SELECT * FROM tasks WHERE lead_id = $1 ORDER BY created_at ASC', [id]),
    ])

    res.json({ success: true, data: mapLead(row, activities, tasks) })
  } catch (err) {
    console.error('Update lead error:', err)
    res.status(500).json({ success: false, error: 'Failed to update lead' })
  }
})

// ─── DELETE /api/leads/:id ───
router.delete('/:id', requireAuth, requireRole('superuser', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await queryOne('DELETE FROM leads WHERE id = $1 RETURNING id', [req.params.id])
    if (!row) { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    res.json({ success: true })
  } catch (err) {
    console.error('Delete lead error:', err)
    res.status(500).json({ success: false, error: 'Failed to delete lead' })
  }
})

// ─── POST /api/leads/:id/activities ───
router.post('/:id/activities', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { type, note, changes, relatedTaskId } = req.body
  try {
    const row = await queryOne(
      `INSERT INTO activities (lead_id, type, note, created_by, role, related_task_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, type, note, req.user!.username, req.user!.role, relatedTaskId || null, changes ? JSON.stringify(changes) : null]
    )
    res.status(201).json({ success: true, data: row })
  } catch (err) {
    console.error('Add activity error:', err)
    res.status(500).json({ success: false, error: 'Failed to add activity' })
  }
})

// ─── POST /api/leads/:id/tasks ───
router.post('/:id/tasks', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { title, note, dueDate, priority, assignedTo } = req.body
  try {
    const row = await queryOne(
      `INSERT INTO tasks (lead_id, title, note, due_date, priority, created_by, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, title, note || null, dueDate || null, priority || 'medium', req.user!.username, assignedTo || null]
    )
    // Log activity
    await query(
      `INSERT INTO activities (lead_id, type, note, created_by, role)
       VALUES ($1, 'task', $2, $3, $4)`,
      [req.params.id, `Task created: ${title}`, req.user!.username, req.user!.role]
    )
    res.status(201).json({ success: true, data: row })
  } catch (err) {
    console.error('Add task error:', err)
    res.status(500).json({ success: false, error: 'Failed to add task' })
  }
})

// ─── PUT /api/leads/:id/tasks/:taskId ───
router.put('/:id/tasks/:taskId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { status, completedAt } = req.body
  try {
    const row = await queryOne(
      `UPDATE tasks SET status = COALESCE($1, status),
         completed_at = COALESCE($2::timestamptz, completed_at)
       WHERE id = $3 AND lead_id = $4 RETURNING *`,
      [status || null, completedAt || null, req.params.taskId, req.params.id]
    )
    if (!row) { res.status(404).json({ success: false, error: 'Task not found' }); return }
    res.json({ success: true, data: row })
  } catch (err) {
    console.error('Update task error:', err)
    res.status(500).json({ success: false, error: 'Failed to update task' })
  }
})

// ─── DELETE /api/leads/:id/tasks/:taskId ───
router.delete('/:id/tasks/:taskId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await query('DELETE FROM tasks WHERE id = $1 AND lead_id = $2', [req.params.taskId, req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Delete task error:', err)
    res.status(500).json({ success: false, error: 'Failed to delete task' })
  }
})

export default router
