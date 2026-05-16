# Moon — WhatsApp Message Handler for LMS

> **"Moon watches over your leads, silently, from above."**

A WhatsApp message listener service that automatically creates/updates leads and sends persistent notifications when students/clients message your WhatsApp number.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Network (lms_net)                   │
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐                │
│  │  Nginx   │───▶│  Backend  │───▶│  Postgres  │                │
│  │  (:80)   │    │  (:8080)  │    │  (:5432)   │                │
│  └────┬─────┘    └─────┬─────┘    └────────────┘                │
│       │                │  ▲                                      │
│       ▼                │  │ API calls (internal, API key)        │
│  ┌──────────┐    ┌─────┴──┴─────┐                               │
│  │ Frontend │    │     Moon     │                               │
│  │ (Vue SPA)│    │  (Baileys)   │                               │
│  └──────────┘    └──────┬───────┘                               │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                  WhatsApp Web Socket
                          │
                  ┌───────┴───────┐
                  │   WhatsApp    │
                  │   (Meta)      │
                  └───────────────┘
```

## Flow

```
📱 Student sends WhatsApp message
       │
       ▼
🌕 Moon receives via Baileys socket
       │
       ├── Ignore own messages, group chats, broadcasts
       ├── Extract phone: JID "918452093228@s.whatsapp.net" → "+91 8452093228"
       │
       ▼
   GET /api/leads/check-duplicate/+91 8452093228
       │                              (X-API-Key auth)
       ├── EXISTS ──────▶ POST /api/leads/:id/activities
       │                   POST /api/notifications
       │
       └── NEW ─────────▶ POST /api/leads (status: New, source: WhatsApp)
                           Lead auto-creates "lead_created" activity
                           POST /api/notifications
       │
       ▼
🔔 LMS Dashboard: Notification bell shows count + dropdown
```

---

## AI? Not needed.

The core flow is pure API integration:
- Phone extraction + normalization → simple string manipulation
- Lead lookup → existing REST endpoint
- Lead creation → existing REST endpoint
- Activity logging → existing REST endpoint
- Notifications → new REST endpoints (simple CRUD)

No AI/LLM calls required. Moon is a deterministic bridge between WhatsApp and LMS.

---

## Implementation Plan

### Dependency Order

```
Phase 1: DB         → Migration 013 (notifications table)
Phase 2: Backend    → API key middleware → notification schemas → notification routes → register route
Phase 3: Moon Svc   → Config → Phone normalization → API client → Handler → Entry point
Phase 4: Docker     → Moon Dockerfile → docker-compose moon service
Phase 5: Frontend   → NotificationDropdown polling update
Phase 6: Test       → End-to-end verification
```

---

## Phase 1: Database Migration

### CREATE: `backend/db/migrations/013_notifications.sql`

```sql
-- Migration 013: Persistent notifications table
CREATE TABLE notifications (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info',
  lead_id    TEXT REFERENCES leads(id) ON DELETE SET NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_read     ON notifications(read);
CREATE INDEX idx_notifications_created  ON notifications(created_at DESC);
CREATE INDEX idx_notifications_lead_id  ON notifications(lead_id);
```

---

## Phase 2: Backend Additions

### 2.1 CREATE: `backend/src/middleware/apiKey.ts`

Allows Moon to call LMS endpoints without JWT, using a shared secret.

```typescript
import { Request, Response, NextFunction } from 'express'

export function allowApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined
  const expectedKey = process.env.MOON_API_KEY

  if (expectedKey && apiKey === expectedKey) {
    // Synthetic user so downstream handlers don't break
    req.user = {
      userId: 'moon-service',
      username: 'moon',
      role: 'agent',
      sessionId: 'moon-internal',
    }
    return next()
  }

  // Not an API key request → pass to next middleware (requireAuth)
  next()
}
```

### 2.2 MODIFY: `backend/src/schemas.ts`

Add at bottom:

```typescript
// ── Notifications ──────────────────────────────────────────────────────────
export const createNotificationSchema = z.object({
  title:   z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type:    z.string().max(50).optional(),
  leadId:  z.string().optional(),
  createdBy: z.string().max(100).optional(),
})

export const updateNotificationSchema = z.object({
  read: z.boolean(),
})
```

### 2.3 CREATE: `backend/src/routes/notifications.ts`

```typescript
import { Router, Request, Response } from 'express'
import { query, queryOne } from '../db'
import { requireAuth } from '../middleware/auth'
import { allowApiKey } from '../middleware/apiKey'
import { validate } from '../middleware/validate'
import { createNotificationSchema, updateNotificationSchema } from '../schemas'

const router = Router()

// GET /api/notifications — poll notifications (JWT or API key)
router.get('/', allowApiKey, requireAuth, async (req, res) => {
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
          id: r.id, title: r.title, message: r.message, type: r.type,
          leadId: r.lead_id, read: r.read, createdBy: r.created_by, createdAt: r.created_at,
        })),
        unreadCount: parseInt(countRow?.count || '0'),
      },
    })
  } catch (err) {
    console.error('Get notifications error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' })
  }
})

// POST /api/notifications — create notification (Moon uses this)
router.post('/', allowApiKey, requireAuth, validate(createNotificationSchema), async (req, res) => {
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

// PUT /api/notifications/:id — mark as read/unread
router.put('/:id', requireAuth, validate(updateNotificationSchema), async (req, res) => {
  const { read } = req.body
  try {
    const row = await queryOne(
      'UPDATE notifications SET read = $1 WHERE id = $2 RETURNING *',
      [read, req.params.id]
    )
    if (!row) { res.status(404).json({ success: false, error: 'Notification not found' }); return }
    res.json({ success: true, data: row })
  } catch (err) {
    console.error('Update notification error:', err)
    res.status(500).json({ success: false, error: 'Failed to update notification' })
  }
})

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await query('UPDATE notifications SET read = true WHERE read = false')
    res.json({ success: true })
  } catch (err) {
    console.error('Mark all read error:', err)
    res.status(500).json({ success: false, error: 'Failed to mark all read' })
  }
})

export default router
```

### 2.4 MODIFY: `backend/src/index.ts`

Add import and route registration:

```typescript
import notificationsRoutes from './routes/notifications'  // ADD

// ...existing routes...
app.use('/api/notifications', notificationsRoutes)       // ADD after settings
```

### 2.5 MODIFY: `backend/src/routes/leads.ts`

Add `allowApiKey` middleware to the `check-duplicate` route so Moon can call it:

```typescript
// MODIFY line ~195:
router.get('/check-duplicate/:phone', allowApiKey, requireAuth, async (req, res) => {
```

And to the create lead route (already requires auth, but Moon needs API key access):

```typescript
// MODIFY line ~114:
router.post('/', allowApiKey, requireAuth, requireRole('superuser', 'admin', 'agent'), validate(createLeadSchema), async (req, res) => {
```

And to the add-activity route:

```typescript
// MODIFY line ~245:
router.post('/:id/activities', allowApiKey, requireAuth, async (req, res) => {
```

### 2.6 MODIFY: `.env.example` and `.env`

Add:
```
MOON_API_KEY=your-secret-moon-api-key-here
```

---

## Phase 3: Moon Service

### Directory Structure
```
whatsapp-moon/
├── package.json
├── tsconfig.json
├── .env.example
├── Dockerfile
└── src/
    ├── index.ts        # Entry: Baileys connect + listen
    ├── config.ts       # Env config
    ├── phone.ts        # JID → LMS phone normalization
    ├── api.ts          # LMS API client (axios + API key)
    └── handler.ts      # Message handler: extract → check → create/activity → notify
```

### 3.1 CREATE: `whatsapp-moon/package.json`

```json
{
  "name": "whatsapp-moon",
  "version": "1.0.0",
  "description": "Moon — WhatsApp-to-LMS bridge service",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.0",
    "axios": "^1.6.0",
    "dotenv": "^16.4.0",
    "pino": "^8.17.0",
    "qrcode-terminal": "^0.12.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/qrcode-terminal": "^0.12.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

### 3.2 CREATE: `whatsapp-moon/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

### 3.3 CREATE: `whatsapp-moon/.env.example`

```
LMS_API_URL=http://localhost:8080/api
MOON_API_KEY=your-secret-moon-api-key-here
LOG_LEVEL=info
```

### 3.4 CREATE: `whatsapp-moon/src/config.ts`

```typescript
import dotenv from 'dotenv'
dotenv.config()

export const config = {
  lmsApiUrl: process.env.LMS_API_URL || 'http://localhost:8080/api',
  moonApiKey: process.env.MOON_API_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
}
```

### 3.5 CREATE: `whatsapp-moon/src/phone.ts`

Phone normalization from WhatsApp JID to LMS format.

```typescript
/**
 * Normalize WhatsApp JID to LMS phone format.
 *
 * Input:  "918452093228@s.whatsapp.net"   (12 digits with country code)
 *         "8452093228@s.whatsapp.net"      (10 digits, no country code)
 *         "14155551234@s.whatsapp.net"     (US number)
 *
 * Output: "+91 8452093228"   (LMS format: +CC XXXXXXXXXX)
 */
export function normalizeJidToLmsPhone(jid: string): string {
  const digits = jid.replace(/@.*$/, '').replace(/\D/g, '')
  if (digits.length === 0) throw new Error(`Cannot normalize empty JID: ${jid}`)

  // 10 digits → Indian, prepend +91
  if (digits.length === 10) return `+91 ${digits}`

  // 12 digits starting with 91 → Indian with country code
  if (digits.length === 12 && digits.startsWith('91'))
    return `+91 ${digits.slice(2)}`

  // US/Canada: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1'))
    return `+1 ${digits.slice(1)}`

  // International: try country code lengths 3, 2, 1
  if (digits.length >= 11 && digits.length <= 15) {
    for (const ccLen of [3, 2, 1]) {
      const cc = digits.slice(0, ccLen)
      const local = digits.slice(ccLen)
      if (local.length >= 7 && local.length <= 12)
        return `+${cc} ${local}`
    }
  }

  // Fallback
  return `+${digits.slice(0, 2)} ${digits.slice(2)}`
}

export function extractDigitsFromJid(jid: string): string {
  return jid.replace(/@.*$/, '').replace(/\D/g, '')
}
```

**Test cases:**

| WhatsApp JID | LMS Phone |
|---|---|
| `918452093228@s.whatsapp.net` | `+91 8452093228` |
| `8452093228@s.whatsapp.net` | `+91 8452093228` |
| `14155551234@s.whatsapp.net` | `+1 4155551234` |
| `447911123456@s.whatsapp.net` | `+44 7911123456` |

### 3.6 CREATE: `whatsapp-moon/src/api.ts`

LMS API client authenticated with API key.

```typescript
import axios, { AxiosInstance } from 'axios'
import { config } from './config'

const api: AxiosInstance = axios.create({
  baseURL: config.lmsApiUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': config.moonApiKey,
  },
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('[Moon API] Error:', err.response?.status, err.response?.data || err.message)
    return Promise.reject(err)
  }
)

export interface LeadCheckResult {
  exists: boolean
  leads: Array<{
    id: string; name: string; phone: string; status: string; assignedTo: string
  }>
}

export const lmsApi = {
  checkDuplicate: async (phone: string): Promise<LeadCheckResult> => {
    const encoded = encodeURIComponent(phone)
    const response = await api.get(`/leads/check-duplicate/${encoded}`) as any
    return response.data
  },

  createLead: async (data: { phone: string; name?: string; status?: string; notes?: string; source?: string }) => {
    const response = await api.post('/leads', data) as any
    return response.data
  },

  addActivity: async (leadId: string, data: { type: string; note: string }) => {
    const response = await api.post(`/leads/${leadId}/activities`, data) as any
    return response.data
  },

  createNotification: async (payload: {
    title: string; message: string; type?: string; leadId?: string; createdBy?: string
  }) => {
    const response = await api.post('/notifications', payload) as any
    return response.data
  },
}
```

### 3.7 CREATE: `whatsapp-moon/src/handler.ts`

Core message handler — the business logic.

```typescript
import { normalizeJidToLmsPhone } from './phone'
import { lmsApi } from './api'

interface WAMessage {
  key: { remoteJid: string; fromMe: boolean; id: string }
  message?: {
    conversation?: string
    extendedTextMessage?: { text: string }
    imageMessage?: { caption?: string }
    videoMessage?: { caption?: string }
    documentMessage?: { caption?: string }
  }
}

export async function handleIncomingMessage(msg: WAMessage): Promise<void> {
  // 1. Ignore outgoing, groups, broadcasts
  if (msg.key.fromMe) return
  const jid = msg.key.remoteJid
  if (!jid || jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@status')) return

  // 2. Extract message text
  const text = extractMessageText(msg)

  // 3. Normalize phone
  let phone: string
  try {
    phone = normalizeJidToLmsPhone(jid)
  } catch (err) {
    console.error(`[Moon] Failed to normalize JID: ${jid}`, err)
    return
  }

  console.log(`[Moon] 🌕 Message from ${phone}: "${text?.slice(0, 80) || '(media)'}"`)

  try {
    // 4. Check if lead exists
    const check = await lmsApi.checkDuplicate(phone)

    if (check.exists && check.leads.length > 0) {
      // ── EXISTING LEAD ──
      const lead = check.leads[0]
      const note = text
        ? `WhatsApp message: ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`
        : 'WhatsApp media received (no caption)'

      await lmsApi.addActivity(lead.id, { type: 'message', note })

      await lmsApi.createNotification({
        title: '💬 WhatsApp message',
        message: `${lead.name || phone}: ${text ? text.slice(0, 100) : 'Sent media'}`,
        type: 'whatsapp-message',
        leadId: lead.id,
        createdBy: 'moon',
      })

      console.log(`[Moon] Activity added to lead ${lead.id}`)

    } else {
      // ── NEW LEAD ──
      const newLead = await lmsApi.createLead({
        phone,
        status: 'New',
        source: 'WhatsApp',
        notes: text
          ? `Auto-created from WhatsApp: "${text.slice(0, 500)}"`
          : 'Auto-created from WhatsApp (media message)',
      })

      if (newLead?.id) {
        await lmsApi.createNotification({
          title: '🆕 New lead from WhatsApp',
          message: `${phone} — ${text ? text.slice(0, 100) : 'Sent media'}`,
          type: 'whatsapp-new-lead',
          leadId: newLead.id,
          createdBy: 'moon',
        })
        console.log(`[Moon] New lead created: ${newLead.id}`)
      }
    }
  } catch (err: any) {
    console.error(`[Moon] Error processing message from ${phone}:`,
      err.response?.status, err.response?.data || err.message)

    // Attempt to notify about the failure
    try {
      await lmsApi.createNotification({
        title: '⚠️ Moon processing error',
        message: `Failed to process message from ${phone}: ${err.message}`,
        type: 'error',
        createdBy: 'moon',
      })
    } catch {
      console.error('[Moon] Could not create error notification')
    }
  }
}

function extractMessageText(msg: WAMessage): string | null {
  if (!msg.message) return null
  const m = msg.message
  if (m.conversation) return m.conversation
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text
  if (m.imageMessage?.caption) return m.imageMessage.caption
  if (m.videoMessage?.caption) return m.videoMessage.caption
  if (m.documentMessage?.caption) return m.documentMessage.caption
  return null
}
```

### 3.8 CREATE: `whatsapp-moon/src/index.ts`

Entry point — Baileys connection with reconnection.

```typescript
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import Pino from 'pino'
import { handleIncomingMessage } from './handler'
import { config } from './config'

const logger = Pino({ level: config.logLevel })
let reconnectAttempts = 0

async function connect(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_moon')
  const { version, isLatest } = await fetchLatestBaileysVersion()

  logger.info(`🌕 Moon rising... Baileys v${version.join('.')}, latest=${isLatest}`)

  const sock = makeWASocket({
    version,
    auth: state,
    logger: logger as any,
    printQRInTerminal: true,
    browser: ['Moon', 'Chrome', '1.0.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      logger.warn(`Connection closed. Reconnecting: ${shouldReconnect}`)

      if (shouldReconnect) {
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 60000)
        reconnectAttempts++
        setTimeout(connect, delay)
      } else {
        logger.error('🔴 Logged out. Manual re-auth required.')
      }
    } else if (connection === 'open') {
      reconnectAttempts = 0
      logger.info('🌕 Moon connected to WhatsApp')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      try {
        await handleIncomingMessage(msg as any)
      } catch (err) {
        logger.error({ err }, 'Unhandled error in message handler')
      }
    }
  })
}

connect().catch((err) => {
  logger.fatal({ err }, 'Failed to start Moon')
  process.exit(1)
})
```

### 3.9 CREATE: `whatsapp-moon/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
VOLUME ["/app/auth_info_moon"]
CMD ["node", "dist/index.js"]
```

---

## Phase 4: Docker Integration

### 4.1 MODIFY: `docker-compose.yml`

Add Moon service after backend:

```yaml
  moon:
    build:
      context: ./whatsapp-moon
      dockerfile: Dockerfile
    container_name: lms_moon
    restart: unless-stopped
    environment:
      LMS_API_URL: http://lms_api:8080/api
      MOON_API_KEY: ${MOON_API_KEY}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    volumes:
      - moon_auth:/app/auth_info_moon
    depends_on:
      - backend
    networks:
      - lms_net
```

Add volume at bottom:

```yaml
volumes:
  postgres_data:
  moon_auth:
```

Also add `MOON_API_KEY` to the backend service's environment so it can validate the key:

```yaml
  backend:
    environment:
      # ...existing vars...
      MOON_API_KEY: ${MOON_API_KEY}
```

---

## Phase 5: Frontend — Notification Polling

### 5.1 MODIFY: `src/components/NotificationDropdown.vue`

The notification dropdown already shows lead-based notifications (overdue follow-ups, tasks). We add server-persisted notifications from Moon as a second data source.

**Script additions:**

```typescript
import { api } from '@/services/api'
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface ServerNotification {
  id: string
  title: string
  message: string
  type: string        // 'whatsapp-new-lead', 'whatsapp-message', etc.
  leadId: string | null
  read: boolean
  createdBy: string
  createdAt: string
}

// --- New reactive state ---
const serverNotifications = ref<ServerNotification[]>([])
const serverUnreadCount = ref(0)
let pollInterval: number | null = null

// --- Polling ---
async function pollServerNotifications() {
  try {
    const response = await api.get('/notifications', {
      params: { unread: true, limit: 20 }
    }) as any
    if (response.success && response.data) {
      serverNotifications.value = response.data.notifications || []
      serverUnreadCount.value = response.data.unreadCount || 0
    }
  } catch {
    // Silently fail — not critical
  }
}

onMounted(() => {
  pollServerNotifications()
  pollInterval = window.setInterval(pollServerNotifications, 30000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

// --- Merged unread count ---
const mergedUnreadCount = computed(() => {
  return serverUnreadCount.value + /* existing local unread count */
})

// --- Mark as read (server persistence) ---
async function markServerRead(serverId: string) {
  try {
    await api.put(`/notifications/${serverId}`, { read: true }) as any
    const sn = serverNotifications.value.find(n => n.id === serverId)
    if (sn) sn.read = true
    serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1)
  } catch {
    console.error('Failed to mark notification read')
  }
}

// --- Mark all read ---
async function markAllServerRead() {
  try {
    await api.put('/notifications/read-all', {}) as any
    serverNotifications.value.forEach(n => n.read = true)
    serverUnreadCount.value = 0
  } catch {
    console.error('Failed to mark all notifications read')
  }
}
```

**Template:** Server notifications render using the same component pattern as existing notifications. Moon notifications get a 🌕 moon icon prefix.

---

## Phase 6: Verification

### Test Checklist

| # | Test | Expected |
|---|---|---|
| 1 | `POST /api/notifications` via API key | 201, notification created |
| 2 | `GET /api/notifications?unread=true` | Returns unread count + items |
| 3 | `PUT /api/notifications/:id` mark read | read=true persisted |
| 4 | `PUT /api/notifications/read-all` | All notifications marked read |
| 5 | Moon scans QR code, connects | `🌕 Moon connected` log |
| 6 | Send WhatsApp message from new number | New lead created in LMS + notification |
| 7 | Send WhatsApp message from existing number | Activity added to lead + notification |
| 8 | Send media without caption | Still creates lead/activity with "(media)" note |
| 9 | Send group message | Ignored (no lead created) |
| 10 | LMS backend down, Moon keeps running | Error logged, error notification created |
| 11 | WhatsApp disconnect, Moon reconnects | Reconnects with exponential backoff |
| 12 | Frontend notification bell shows count | Updates within 30s polling window |

---

## Files Summary

### CREATE (13 files):
| File | Purpose |
|---|---|
| `backend/db/migrations/013_notifications.sql` | Database table |
| `backend/src/middleware/apiKey.ts` | API key auth |
| `backend/src/routes/notifications.ts` | Notification endpoints |
| `whatsapp-moon/package.json` | Moon dependencies |
| `whatsapp-moon/tsconfig.json` | TypeScript config |
| `whatsapp-moon/.env.example` | Env template |
| `whatsapp-moon/Dockerfile` | Container build |
| `whatsapp-moon/src/index.ts` | Entry / Baileys |
| `whatsapp-moon/src/config.ts` | Config loader |
| `whatsapp-moon/src/phone.ts` | Phone normalization |
| `whatsapp-moon/src/api.ts` | LMS API client |
| `whatsapp-moon/src/handler.ts` | Message handler |

### MODIFY (5 files):
| File | Change |
|---|---|
| `backend/src/schemas.ts` | Add notification schemas |
| `backend/src/index.ts` | Register notification routes |
| `backend/src/routes/leads.ts` | Add `allowApiKey` to 3 routes |
| `docker-compose.yml` | Add Moon service + env vars |
| `src/components/NotificationDropdown.vue` | Add server polling |

---

## Design Decisions

| Decision | Rationale |
|---|---|
| **API Key** vs JWT for Moon | Simpler — no token refresh, no session management. Internal Docker network is trusted. |
| **HTTP Polling** vs WebSocket for notifications | App already polls for leads. Notification volume is low. 30s latency is acceptable. |
| **Phone normalization in Moon** | The DB `normalize_phone()` handles storage, but Moon needs the format for API calls. |
| **One Moon = One WhatsApp number** | Baileys connects one session per process. Multiple numbers → multiple Moon instances. |
| **`ON DELETE SET NULL` for lead_id** | Deleting a lead shouldn't cascade-delete its notification history. |
