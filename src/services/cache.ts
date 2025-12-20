/**
 * Cache service for managing data caching with TTL support
 * Improves performance and enables offline functionality
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl?: number
  tags?: string[]
}

export interface CacheConfig {
  defaultTTL: number // milliseconds
  maxSize: number
  persistToStorage: boolean
  storageKey: string
}

const defaultConfig: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  persistToStorage: true,
  storageKey: 'lms_cache'
}

let config = { ...defaultConfig }
let cache = new Map<string, CacheEntry>()
let tagIndex = new Map<string, Set<string>>() // Map of tags to cache keys

/**
 * Initialize cache service
 */
export function initializeCache(customConfig?: Partial<CacheConfig>): void {
  config = { ...defaultConfig, ...customConfig }

  if (config.persistToStorage) {
    loadCacheFromStorage()
  }
}

/**
 * Set cache entry
 */
export function set<T = any>(
  key: string,
  data: T,
  ttl: number = config.defaultTTL,
  tags: string[] = []
): void {
  // Enforce max size
  if (cache.size >= config.maxSize) {
    evictOldest()
  }

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
    tags
  }

  cache.set(key, entry)

  // Update tag index
  tags.forEach(tag => {
    if (!tagIndex.has(tag)) {
      tagIndex.set(tag, new Set())
    }
    tagIndex.get(tag)!.add(key)
  })

  saveCacheToStorage()
}

/**
 * Get cache entry
 */
export function get<T = any>(key: string): T | null {
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  // Check if expired
  if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key)
    removeCacheEntry(key)
    return null
  }

  return entry.data as T
}

/**
 * Check if cache entry exists and is valid
 */
export function has(key: string): boolean {
  return get(key) !== null
}

/**
 * Get cache entry with metadata
 */
export function getEntry<T = any>(key: string): CacheEntry<T> | null {
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  // Check if expired
  if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key)
    removeCacheEntry(key)
    return null
  }

  return entry
}

/**
 * Delete cache entry
 */
export function remove(key: string): boolean {
  const entry = cache.get(key)

  if (entry) {
    // Remove from tag index
    entry.tags?.forEach(tag => {
      const keys = tagIndex.get(tag)
      if (keys) {
        keys.delete(key)
        if (keys.size === 0) {
          tagIndex.delete(tag)
        }
      }
    })

    cache.delete(key)
    saveCacheToStorage()
    return true
  }

  return false
}

/**
 * Invalidate all entries with specific tag
 */
export function invalidateByTag(tag: string): number {
  const keys = tagIndex.get(tag)
  if (!keys) return 0

  let count = 0
  keys.forEach(key => {
    if (remove(key)) count++
  })

  return count
}

/**
 * Get all entries with specific tag
 */
export function getByTag<T = any>(tag: string): Map<string, T> {
  const result = new Map<string, T>()
  const keys = tagIndex.get(tag)

  if (keys) {
    keys.forEach(key => {
      const value = get<T>(key)
      if (value !== null) {
        result.set(key, value)
      }
    })
  }

  return result
}

/**
 * Clear entire cache
 */
export function clear(): void {
  cache.clear()
  tagIndex.clear()
  localStorage.removeItem(config.storageKey)
}

/**
 * Get cache statistics
 */
export function getStats() {
  let totalSize = 0
  let expiredCount = 0

  cache.forEach(entry => {
    totalSize += JSON.stringify(entry.data).length
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      expiredCount++
    }
  })

  return {
    entriesCount: cache.size,
    totalSizeBytes: totalSize,
    expiredEntries: expiredCount,
    maxSize: config.maxSize,
    utilization: ((cache.size / config.maxSize) * 100).toFixed(2) + '%'
  }
}

/**
 * Evict oldest entry
 */
function evictOldest(): void {
  let oldestKey: string | null = null
  let oldestTime = Date.now()

  cache.forEach((entry, key) => {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp
      oldestKey = key
    }
  })

  if (oldestKey) {
    remove(oldestKey)
  }
}

/**
 * Clean up expired entries
 */
export function cleanup(): number {
  let removedCount = 0
  const keysToRemove: string[] = []

  cache.forEach((entry, key) => {
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      keysToRemove.push(key)
    }
  })

  keysToRemove.forEach(key => {
    if (remove(key)) removedCount++
  })

  return removedCount
}

/**
 * Remove cache entry reference
 */
function removeCacheEntry(key: string): void {
  const entry = cache.get(key)
  if (entry) {
    entry.tags?.forEach(tag => {
      const keys = tagIndex.get(tag)
      if (keys) {
        keys.delete(key)
        if (keys.size === 0) {
          tagIndex.delete(tag)
        }
      }
    })
  }
}

/**
 * Save cache to localStorage
 */
function saveCacheToStorage(): void {
  if (!config.persistToStorage) return

  try {
    const persistableCache: Record<string, CacheEntry> = {}

    cache.forEach((entry, key) => {
      // Skip expired entries
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        return
      }

      // Only store serializable data
      try {
        JSON.stringify(entry.data)
        persistableCache[key] = entry
      } catch {
        // Skip non-serializable entries
      }
    })

    localStorage.setItem(config.storageKey, JSON.stringify(persistableCache))
  } catch (error) {
    console.error('Failed to save cache to storage:', error)
  }
}

/**
 * Load cache from localStorage
 */
function loadCacheFromStorage(): void {
  try {
    const stored = localStorage.getItem(config.storageKey)
    if (stored) {
      const persistedCache = JSON.parse(stored)

      Object.entries(persistedCache).forEach(([key, entry]: any) => {
        // Check if expired before loading
        if (!entry.ttl || Date.now() - entry.timestamp <= entry.ttl) {
          cache.set(key, entry)

          // Rebuild tag index
          entry.tags?.forEach((tag: string) => {
            if (!tagIndex.has(tag)) {
              tagIndex.set(tag, new Set())
            }
            tagIndex.get(tag)!.add(key)
          })
        }
      })
    }
  } catch (error) {
    console.error('Failed to load cache from storage:', error)
  }
}

/**
 * Get cache configuration
 */
export function getCacheConfig(): CacheConfig {
  return { ...config }
}

/**
 * Update cache configuration
 */
export function updateCacheConfig(customConfig: Partial<CacheConfig>): void {
  config = { ...config, ...customConfig }
}

/**
 * Batch get multiple cache entries
 */
export function mget<T = any>(keys: string[]): Map<string, T | null> {
  const result = new Map<string, T | null>()

  keys.forEach(key => {
    result.set(key, get<T>(key))
  })

  return result
}

/**
 * Batch set multiple cache entries
 */
export function mset<T = any>(
  entries: Map<string, T> | Record<string, T>,
  ttl?: number,
  tags?: string[]
): void {
  const entriesMap = entries instanceof Map ? entries : new Map(Object.entries(entries))

  entriesMap.forEach((value, key) => {
    set(key, value, ttl, tags)
  })
}
