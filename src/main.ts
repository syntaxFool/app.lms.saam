import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { registerSW } from 'virtual:pwa-register'
import { initializeServices } from './services/setup'
import * as Sentry from '@sentry/vue'

// Register service worker
registerSW({
  onNeedRefresh() {
    // New content available - could show UI notification
  },
  onOfflineReady() {
    // App ready for offline use
  },
})

// Force SW update check on every page load so fixes propagate immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.update())
  })
  // Delete all old caches that don't belong to current SW
  caches.keys().then(keys => {
    keys.filter(k => !k.includes('shanuzz-lms-v3')).forEach(k => caches.delete(k))
  })
}

const app = createApp(App)
const pinia = createPinia()

// ─── Sentry ───
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ['lms.aika-shuz.fyi', /^\/api\//],
    // Don't send errors in dev unless DSN is explicitly set
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
  })
}

app.use(pinia)
app.use(router)

initializeServices().catch(err => console.error('Service initialization failed:', err))

app.mount('#app')