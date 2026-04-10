import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Composable for tracking user inactivity and auto-logout after 40 minutes
 * Shows warning modal at 38 minutes with 2-minute countdown
 */
export function useInactivity() {
  const authStore = useAuthStore()
  
  const INACTIVITY_TIMEOUT = 40 * 60 * 1000 // 40 minutes in milliseconds
  const WARNING_TIME = 38 * 60 * 1000 // 38 minutes (2min warning)
  
  let inactivityTimer: number | null = null
  let warningTimer: number | null = null
  
  const showWarning = ref(false)
  const remainingSeconds = ref(120) // 2 minutes = 120 seconds
  let countdownInterval: number | null = null
  
  const resetTimers = () => {
    // Clear existing timers
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (warningTimer) clearTimeout(warningTimer)
    if (countdownInterval) clearInterval(countdownInterval)
    
    showWarning.value = false
    
    // Only set timers if user is authenticated
    if (!authStore.isAuthenticated) return
    
    // Set warning timer (38 minutes)
    warningTimer = window.setTimeout(() => {
      showWarning.value = true
      remainingSeconds.value = 120
      
      // Start countdown
      countdownInterval = window.setInterval(() => {
        remainingSeconds.value--
        if (remainingSeconds.value <= 0) {
          logout()
        }
      }, 1000)
    }, WARNING_TIME)
    
    // Set logout timer (40 minutes)
    inactivityTimer = window.setTimeout(() => {
      logout()
    }, INACTIVITY_TIMEOUT)
  }
  
  const logout = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (warningTimer) clearTimeout(warningTimer)
    if (countdownInterval) clearInterval(countdownInterval)
    authStore.logout()
  }
  
  const extendSession = () => {
    showWarning.value = false
    resetTimers()
  }
  
  // Activity event handlers
  const handleActivity = () => {
    // Don't reset if warning is already showing (user must explicitly extend)
    if (!showWarning.value && authStore.isAuthenticated) {
      resetTimers()
    }
  }
  
  const handleVisibilityChange = async () => {
    // When tab becomes visible, check if session is still valid
    if (!document.hidden && authStore.isAuthenticated) {
      try {
        await authStore.checkSessionStatus()
        // Session still valid - reset timers
        resetTimers()
      } catch {
        // Session check failed - likely expired
        logout()
      }
    }
  }
  
  onMounted(() => {
    // Monitor user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    
    // Check session validity on tab visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Initial timer setup
    resetTimers()
  })
  
  onUnmounted(() => {
    // Cleanup timers
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (warningTimer) clearTimeout(warningTimer)
    if (countdownInterval) clearInterval(countdownInterval)
    
    // Remove event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.removeEventListener(event, handleActivity)
    })
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
  
  return {
    showWarning,
    remainingSeconds,
    extendSession,
    logout
  }
}
