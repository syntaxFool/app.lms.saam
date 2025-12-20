/**
 * Offline detection and management service
 * Handles online/offline status and syncing when connection is restored
 */

export interface OfflineConfig {
  checkInterval: number // ms
  onlineThreshold: number // ms
  enableNotifications: boolean
}

export type OfflineListener = (isOnline: boolean) => void

const defaultConfig: OfflineConfig = {
  checkInterval: 5000,
  onlineThreshold: 3000,
  enableNotifications: true
}

let config = { ...defaultConfig }
let isOnlineState = navigator.onLine
let checkIntervalId: ReturnType<typeof setInterval> | null = null
let listeners: OfflineListener[] = []

/**
 * Initialize offline service
 */
export function initializeOfflineService(customConfig?: Partial<OfflineConfig>): void {
  config = { ...defaultConfig, ...customConfig }

  // Listen to browser online/offline events
  window.addEventListener('online', () => handleOnlineStatusChange(true))
  window.addEventListener('offline', () => handleOnlineStatusChange(false))

  // Periodic connectivity check
  checkIntervalId = setInterval(() => {
    checkConnectivity()
  }, config.checkInterval)
}

/**
 * Check actual connectivity with a test request
 */
async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.onlineThreshold)

    await fetch('/ping', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    })

    clearTimeout(timeout)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Handle online status change
 */
async function handleOnlineStatusChange(online: boolean): Promise<void> {
  // Verify with actual connectivity check
  const actualStatus = online ? await checkConnectivity() : false

  if (actualStatus !== isOnlineState) {
    isOnlineState = actualStatus
    notifyListeners(actualStatus)
  }
}

/**
 * Notify all listeners of status change
 */
function notifyListeners(isOnline: boolean): void {
  listeners.forEach(listener => {
    try {
      listener(isOnline)
    } catch (error) {
      console.error('Error in offline listener:', error)
    }
  })
}

/**
 * Subscribe to offline status changes
 */
export function onOfflineStatusChange(listener: OfflineListener): () => void {
  listeners.push(listener)

  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }
}

/**
 * Get current online status
 */
export function isOnline(): boolean {
  return isOnlineState
}

/**
 * Check if device is definitely offline
 */
export function isOffline(): boolean {
  return !isOnlineState
}

/**
 * Wait for online status
 */
export function waitForOnline(maxWaitTime = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnlineState) {
      resolve()
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = onOfflineStatusChange((online) => {
      if (online) {
        if (timeoutId) clearTimeout(timeoutId)
        unsubscribe()
        resolve()
      }
    })

    if (maxWaitTime > 0) {
      timeoutId = setTimeout(() => {
        unsubscribe()
        reject(new Error('Timeout waiting for online status'))
      }, maxWaitTime)
    }
  })
}

/**
 * Wait for specific duration with timeout
 */
export async function waitWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * Retry failed request with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Wait for online status before attempting
      if (isOffline()) {
        await waitForOnline(initialDelayMs * Math.pow(2, i))
      }

      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (i < maxRetries - 1) {
        // Exponential backoff
        const delayMs = initialDelayMs * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Clean up offline service
 */
export function cleanupOfflineService(): void {
  if (checkIntervalId) {
    clearInterval(checkIntervalId)
    checkIntervalId = null
  }

  window.removeEventListener('online', () => {})
  window.removeEventListener('offline', () => {})
  listeners = []
}

/**
 * Get offline service configuration
 */
export function getOfflineConfig(): OfflineConfig {
  return { ...config }
}

/**
 * Update offline service configuration
 */
export function updateOfflineConfig(customConfig: Partial<OfflineConfig>): void {
  config = { ...config, ...customConfig }
}
