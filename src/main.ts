import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { registerSW } from 'virtual:pwa-register'
import { initializeServices } from './services/setup'

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
    keys.filter(k => !k.includes('shanuzz-lms-v2')).forEach(k => caches.delete(k))
  })
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

initializeServices().catch(err => console.error('Service initialization failed:', err))

app.mount('#app')