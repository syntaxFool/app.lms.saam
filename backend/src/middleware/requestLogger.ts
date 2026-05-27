import morgan from 'morgan'
import * as Sentry from '@sentry/node'
import { Request, Response } from 'express'

// ─── Custom Morgan token: authenticated user ───
morgan.token('user', (req: Request) => {
  return (req as any).user?.username || 'anonymous'
})

// ─── Custom Morgan token: request body (truncated, passwords redacted) ───
morgan.token('body', (req: Request) => {
  if (!req.body || Object.keys(req.body as object).length === 0) return '-'
  const safe: Record<string, any> = { ...(req.body as object) }
  // Never log secrets
  const SECRET_KEYS = ['password', 'oldPassword', 'newPassword', 'secret', 'token', 'authorization']
  for (const key of SECRET_KEYS) {
    if (key in safe) safe[key] = '***'
  }
  const str = JSON.stringify(safe)
  return str.length > 200 ? str.slice(0, 200) + '…' : str
})

// ─── Stdout format ───
// Tokens: :method :url :status :response-time ms - :user
const STDOUT_FORMAT =
  ':remote-addr :method :url :status :response-time[0]ms - :user'

const stdoutStream: morgan.StreamOptions = {
  write: (message: string) => process.stdout.write(message),
}

/**
 * Morgan middleware — logs every HTTP request to stdout.
 * Place after body parsers, before routes.
 */
export const requestLogger = morgan(STDOUT_FORMAT, { stream: stdoutStream })

// ─── Sentry breadcrumb middleware ───

/**
 * Attaches user context and HTTP breadcrumbs to the current Sentry
 * isolation scope so that any error fired later carries the request
 * that caused it.
 *
 * Place immediately after requestLogger, before routes.
 */
export function sentryBreadcrumbs(
  req: Request,
  _res: Response,
  next: () => void
): void {
  const dsn = process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN
  if (!dsn) {
    next()
    return
  }

  const scope = Sentry.getIsolationScope()

  // User context
  const user = (req as any).user
  if (user?.userId) {
    scope.setUser({ id: user.userId, username: user.username })
    scope.setTag('role', user.role || 'anonymous')
  }

  // HTTP breadcrumb
  scope.addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.originalUrl}`,
    level: 'info',
    data: {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      ip: req.ip,
      userAgent: (req.headers['user-agent'] || '').slice(0, 150),
    },
  })

  next()
}
