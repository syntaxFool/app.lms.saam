import * as Sentry from '@sentry/node'

/**
 * Initialises the Sentry SDK (v10) pointing at either a GlitchTip instance
 * or a standard Sentry DSN.
 *
 * Reads GLITCHTIP_DSN first; falls back to SENTRY_DSN for backwards
 * compatibility.  If neither is set, error tracking is silently disabled.
 *
 * Must be called before any other middleware / routes are registered.
 */
export function initGlitchTip(): void {
  const dsn = process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN
  if (!dsn) {
    console.log('[observability] GLITCHTIP_DSN / SENTRY_DSN not set — error tracking disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Strip request bodies from breadcrumbs that capture them accidentally
    beforeBreadcrumb(breadcrumb, _hint) {
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        delete (breadcrumb.data as any).body
      }
      return breadcrumb
    },

    // Noise we don't want propagated to GlitchTip
    ignoreErrors: [
      'Not allowed by CORS',
      'Invalid or expired token',
      'Missing or invalid authorization header',
      'Session expired or invalid',
      'Insufficient permissions',
      'Too many requests',
      'Too many login attempts',
    ],
  })

  console.log(`[observability] GlitchTip/Sentry initialised — env: ${process.env.NODE_ENV || 'production'}`)
}
