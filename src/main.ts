import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { registerSW } from 'virtual:pwa-register'

// Register service worker
registerSW({
  onNeedRefresh() {
    // New content available - could show UI notification
  },
  onOfflineReady() {
    // App ready for offline use
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')