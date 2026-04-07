import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRoutes     from './routes/auth'
import leadsRoutes    from './routes/leads'
import usersRoutes    from './routes/users'
import settingsRoutes from './routes/settings'

const app = express()
const PORT = parseInt(process.env.PORT || '8080')

// ─── Security ───
app.use(helmet())
app.set('trust proxy', 1)

// ─── CORS ───
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// ─── Body parsing ───
app.use(express.json({ limit: '1mb' }))

// ─── Global rate limit ───
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 300 to 1000 for active users with polling
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down' },
}))

// ─── Strict rate limit for auth ───
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many login attempts' },
}))

// ─── Routes ───
app.use('/api/auth',     authRoutes)
app.use('/api/leads',    leadsRoutes)
app.use('/api/users',    usersRoutes)
app.use('/api/settings', settingsRoutes)

// ─── Health check ───
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', ts: Date.now() })
})

// ─── 404 ───
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' })
})

// ─── Start ───
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LMS API running on port ${PORT}`)
})

export default app
