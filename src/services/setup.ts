/**
 * Service setup and initialization
 * Call this from your main.ts to initialize all services
 */

import {
  initializeOfflineService,
  onOfflineStatusChange,
  type OfflineConfig
} from './offline'
import {
  initializeQueue,
  type QueueConfig
} from './queue'
import {
  initializeCache,
  type CacheConfig
} from './cache'
import { syncService } from './sync'
import { leadsService } from './leads'

export interface ServiceConfig {
  offline?: Partial<OfflineConfig>
  queue?: Partial<QueueConfig>
  cache?: Partial<CacheConfig>
  enableAutoSync?: boolean
  autoSyncInterval?: number
}

const defaultConfig: ServiceConfig = {
  offline: {
    checkInterval: 5000,
    onlineThreshold: 3000,
    enableNotifications: true
  },
  queue: {
    maxConcurrent: 3,
    maxQueueSize: 100,
    retryStrategy: 'exponential',
    initialRetryDelay: 1000,
    persistToStorage: true
  },
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 50,
    persistToStorage: true,
    storageKey: 'lms_cache'
  },
  enableAutoSync: true,
  autoSyncInterval: 30000 // 30 seconds
}

let autoSyncInterval: ReturnType<typeof setInterval> | null = null

/**
 * Initialize all services
 */
export async function initializeServices(config: ServiceConfig = {}): Promise<void> {
  const mergedConfig = { ...defaultConfig, ...config }

  // Initialize offline service
  initializeOfflineService(mergedConfig.offline)

  // Initialize queue service
  initializeQueue(mergedConfig.queue)

  // Initialize cache service
  initializeCache(mergedConfig.cache)

  // Initialize sync service
  await syncService.initialize()

  // Set up offline status change handler
  onOfflineStatusChange(async (isOnline) => {
    if (isOnline) {
      try {
        await leadsService.syncPending()
      } catch (error) {
        console.error('Sync failed:', error)
      }
    }
  })

  // Set up auto-sync if enabled
  if (mergedConfig.enableAutoSync) {
    startAutoSync(mergedConfig.autoSyncInterval || 30000)
  }
}

/**
 * Start automatic sync interval
 */
export function startAutoSync(interval: number = 30000): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
  }

  autoSyncInterval = setInterval(async () => {
    try {
      const status = leadsService.getSyncStatus()

      if (status.pendingCount > 0) {
        await leadsService.syncPending()
      }
    } catch (error) {
      console.error('Auto-sync failed:', error)
    }
  }, interval)
}

/**
 * Stop automatic sync
 */
export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
    autoSyncInterval = null
  }
}

/**
 * Get service health status
 */
export function getServiceStatus() {
  return {
    sync: leadsService.getSyncStatus(),
    pending: leadsService.getPendingOperations().length
  }
}

/**
 * Cleanup services (call this on app unmount)
 */
export function cleanupServices(): void {
  stopAutoSync()
}
