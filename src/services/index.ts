// Re-export all services for convenient imports

export { apiClient, api, gasApi } from './api'

export { authService } from './auth'

export { leadsService } from './leads'

export {
  initializeServices,
  startAutoSync,
  stopAutoSync,
  getServiceStatus,
  cleanupServices,
  type ServiceConfig
} from './setup'

export { syncService } from './sync'
export type { SyncOperation, SyncConflict, SyncState } from './sync'

export {
  initializeOfflineService,
  onOfflineStatusChange,
  isOnline,
  isOffline,
  waitForOnline,
  waitWithTimeout,
  retryWithBackoff,
  cleanupOfflineService,
  getOfflineConfig,
  updateOfflineConfig
} from './offline'
export type { OfflineConfig, OfflineListener } from './offline'

export {
  initializeQueue,
  enqueue,
  getQueueStatus,
  clearQueue,
  pauseQueue,
  resumeQueue,
  getQueueItems,
  removeFromQueue,
  reprioritizeRequest,
  batchEnqueue,
  getQueueConfig,
  updateQueueConfig
} from './queue'
export type { QueuedRequest, QueueConfig } from './queue'

export {
  initializeCache,
  set,
  get,
  has,
  getEntry,
  remove,
  invalidateByTag,
  getByTag,
  clear,
  getStats,
  cleanup,
  mget,
  mset,
  getCacheConfig,
  updateCacheConfig
} from './cache'
export type { CacheEntry, CacheConfig } from './cache'
