/**
 * Request queue service for managing API requests
 * Handles queuing during offline, rate limiting, and retry logic
 */

export interface QueuedRequest<T = any> {
  id: string
  fn: () => Promise<T>
  priority: number
  timestamp: number
  retries: number
  maxRetries: number
  status: 'pending' | 'executing' | 'completed' | 'failed'
  error?: Error
  resolve?: (value: T) => void
  reject?: (error: Error) => void
}

export interface QueueConfig {
  maxConcurrent: number
  maxQueueSize: number
  retryStrategy: 'exponential' | 'linear' | 'immediate'
  initialRetryDelay: number
  persistToStorage: boolean
}

const defaultConfig: QueueConfig = {
  maxConcurrent: 3,
  maxQueueSize: 100,
  retryStrategy: 'exponential',
  initialRetryDelay: 1000,
  persistToStorage: true
}

let config = { ...defaultConfig }
let queue: QueuedRequest[] = []
let activeRequests = 0
let requestId = 0

/**
 * Initialize request queue
 */
export function initializeQueue(customConfig?: Partial<QueueConfig>): void {
  config = { ...defaultConfig, ...customConfig }

  if (config.persistToStorage) {
    loadQueueFromStorage()
  }
}

/**
 * Add request to queue
 */
export function enqueue<T = any>(
  fn: () => Promise<T>,
  priority = 0,
  maxRetries = 3
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (queue.length >= config.maxQueueSize) {
      reject(new Error('Queue is full'))
      return
    }

    const request: QueuedRequest<T> = {
      id: `req_${++requestId}`,
      fn,
      priority,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
      status: 'pending',
      resolve,
      reject
    }

    // Insert in priority order (higher priority first)
    const insertIndex = queue.findIndex(req => req.priority < priority)
    if (insertIndex === -1) {
      queue.push(request)
    } else {
      queue.splice(insertIndex, 0, request)
    }

    saveQueueToStorage()
    processQueue()
  })
}

/**
 * Process queue items
 */
async function processQueue(): Promise<void> {
  while (activeRequests < config.maxConcurrent && queue.length > 0) {
    const request = queue.find(req => req.status === 'pending')
    if (!request) break

    activeRequests++
    request.status = 'executing'

    try {
      const result = await request.fn()
      request.status = 'completed'
      if (request.resolve) request.resolve(result)
      queue = queue.filter(req => req.id !== request.id)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      request.error = err

      if (request.retries < request.maxRetries) {
        request.retries++
        request.status = 'pending'
        // Schedule retry with backoff
        const delay = calculateRetryDelay(request.retries)
        setTimeout(() => processQueue(), delay)
      } else {
        request.status = 'failed'
        if (request.reject) request.reject(err)
        queue = queue.filter(req => req.id !== request.id)
      }
    } finally {
      activeRequests--
      saveQueueToStorage()
    }
  }
}

/**
 * Calculate retry delay based on strategy
 */
function calculateRetryDelay(retryCount: number): number {
  switch (config.retryStrategy) {
    case 'exponential':
      return config.initialRetryDelay * Math.pow(2, retryCount - 1)
    case 'linear':
      return config.initialRetryDelay * retryCount
    case 'immediate':
      return 0
    default:
      return config.initialRetryDelay
  }
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  const pending = queue.filter(req => req.status === 'pending').length
  const executing = queue.filter(req => req.status === 'executing').length
  const failed = queue.filter(req => req.status === 'failed').length

  return {
    totalItems: queue.length,
    pendingItems: pending,
    executingItems: executing,
    failedItems: failed,
    activeRequests,
    maxConcurrent: config.maxConcurrent
  }
}

/**
 * Clear queue
 */
export function clearQueue(): void {
  queue = queue.filter(req => req.status === 'executing')
  localStorage.removeItem('lms_request_queue')
}

/**
 * Pause queue processing
 */
export function pauseQueue(): void {
  activeRequests = config.maxConcurrent
}

/**
 * Resume queue processing
 */
export function resumeQueue(): void {
  activeRequests = Math.max(0, activeRequests - 1)
  processQueue()
}

/**
 * Get queue items
 */
export function getQueueItems(): QueuedRequest[] {
  return [...queue]
}

/**
 * Remove request from queue
 */
export function removeFromQueue(requestId: string): boolean {
  const index = queue.findIndex(req => req.id === requestId)
  if (index !== -1) {
    queue.splice(index, 1)
    saveQueueToStorage()
    return true
  }
  return false
}

/**
 * Reprioritize request in queue
 */
export function reprioritizeRequest(requestId: string, newPriority: number): boolean {
  const request = queue.find(req => req.id === requestId)
  if (!request) return false

  request.priority = newPriority

  // Re-sort queue
  queue.sort((a, b) => b.priority - a.priority)
  saveQueueToStorage()
  processQueue()
  return true
}

/**
 * Save queue to localStorage for persistence
 */
function saveQueueToStorage(): void {
  if (!config.persistToStorage) return

  try {
    // Only save pending and failed requests
    const persistableQueue = queue
      .filter(req => req.status === 'pending' || req.status === 'failed')
      .map(req => ({
        id: req.id,
        priority: req.priority,
        timestamp: req.timestamp,
        retries: req.retries,
        maxRetries: req.maxRetries,
        status: req.status,
        error: req.error?.message
      }))

    localStorage.setItem('lms_request_queue', JSON.stringify(persistableQueue))
  } catch (error) {
    console.error('Failed to save queue to storage:', error)
  }
}

/**
 * Load queue from localStorage
 */
function loadQueueFromStorage(): void {
  try {
    const stored = localStorage.getItem('lms_request_queue')
    if (stored) {
      JSON.parse(stored)
      // Note: Function references won't be restored, so queue items need to be re-added
    }
  } catch (error) {
    console.error('Failed to load queue from storage:', error)
  }
}

/**
 * Get queue configuration
 */
export function getQueueConfig(): QueueConfig {
  return { ...config }
}

/**
 * Update queue configuration
 */
export function updateQueueConfig(customConfig: Partial<QueueConfig>): void {
  config = { ...config, ...customConfig }
}

/**
 * Batch enqueue multiple requests
 */
export async function batchEnqueue<T = any>(
  requests: Array<{ fn: () => Promise<T>; priority?: number }>
): Promise<(T | Error)[]> {
  const promises = requests.map((req, index) =>
    enqueue(req.fn, req.priority ?? -index, 3).catch(err => err)
  )

  return Promise.all(promises)
}
