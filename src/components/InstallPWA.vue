<template>
  <Teleport to="body">
    <div
      v-if="showInstallPrompt"
      class="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-2xl p-4 z-50 animate-slide-up"
    >
      <button
        @click="dismissPrompt"
        class="absolute top-2 right-2 text-white/80 hover:text-white transition"
      >
        <i class="ph-bold ph-x text-lg"></i>
      </button>

      <div class="flex items-start gap-3">
        <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <path d="M10 12h12M10 16h12M10 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-lg mb-1">Install LeadFlow</h3>
          <p class="text-sm text-white/90 mb-3">
            Get instant access from your home screen. Works offline!
          </p>

          <div class="flex gap-2">
            <button
              @click="install"
              class="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition"
            >
              Install Now
            </button>
            <button
              @click="dismissPrompt"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold text-sm transition"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showInstallPrompt = ref(false)
let deferredPrompt: any = null

onMounted(() => {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return
  }

  // Check if user dismissed before
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) {
    const dismissedDate = new Date(dismissed)
    const now = new Date()
    const daysSinceDismissed = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceDismissed < 7) {
      return
    }
  }

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    
    // Show prompt after 10 seconds
    setTimeout(() => {
      showInstallPrompt.value = true
    }, 10000)
  })

  // Listen for app installed
  window.addEventListener('appinstalled', () => {
    showInstallPrompt.value = false
    deferredPrompt = null
  })
})

async function install() {
  if (!deferredPrompt) return

  deferredPrompt.prompt()
  
  const { outcome } = await deferredPrompt.userChoice
  
  if (outcome === 'accepted') {
    showInstallPrompt.value = false
  }
  
  deferredPrompt = null
}

function dismissPrompt() {
  showInstallPrompt.value = false
  localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
}
</script>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
