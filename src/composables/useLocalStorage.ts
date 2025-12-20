import { watch, type Ref, shallowRef } from 'vue'

/**
 * Composable for managing localStorage with reactive synchronization
 * Automatically syncs state with browser localStorage
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [Ref<T>, (value: T) => void] {
  // Try to load from localStorage
  const loadValue = (): T => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Failed to load "${key}" from localStorage:`, error)
      return defaultValue
    }
  }

  const storedValue = shallowRef<T>(loadValue())

  /**
   * Update localStorage value
   */
  const setValue = (value: T) => {
    try {
      storedValue.value = value
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to store "${key}" in localStorage:`, error)
    }
  }

  /**
   * Watch for changes and update localStorage
   */
  watch(storedValue, (newValue) => {
    try {
      localStorage.setItem(key, JSON.stringify(newValue))
    } catch (error) {
      console.error(`Failed to update "${key}" in localStorage:`, error)
    }
  }, { deep: true })

  /**
   * Handle storage events from other tabs/windows
   */
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === key && event.newValue) {
      try {
        storedValue.value = JSON.parse(event.newValue)
      } catch (error) {
        console.warn(`Failed to parse storage change for "${key}":`, error)
      }
    }
  }

  window.addEventListener('storage', handleStorageChange)

  return [storedValue as Ref<T>, setValue]
}

/**
 * Composable for managing sessionStorage with reactive synchronization
 */
export function useSessionStorage<T>(key: string, defaultValue: T): [Ref<T>, (value: T) => void] {
  const loadValue = (): T => {
    try {
      const item = sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Failed to load "${key}" from sessionStorage:`, error)
      return defaultValue
    }
  }

  const storedValue = shallowRef<T>(loadValue())

  const setValue = (value: T) => {
    try {
      storedValue.value = value
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to store "${key}" in sessionStorage:`, error)
    }
  }

  watch(storedValue, (newValue) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(newValue))
    } catch (error) {
      console.error(`Failed to update "${key}" in sessionStorage:`, error)
    }
  }, { deep: true })

  return [storedValue as Ref<T>, setValue]
}

/**
 * Utility functions for direct localStorage access
 */
export const storageUtil = {
  /**
   * Get value from localStorage
   */
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue ?? null
    } catch (error) {
      console.error(`Failed to get "${key}" from localStorage:`, error)
      return defaultValue ?? null
    }
  },

  /**
   * Set value in localStorage
   */
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`Failed to set "${key}" in localStorage:`, error)
      return false
    }
  },

  /**
   * Remove value from localStorage
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`Failed to remove "${key}" from localStorage:`, error)
      return false
    }
  },

  /**
   * Clear all localStorage
   */
  clear(): boolean {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
      return false
    }
  },

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null
  },

  /**
   * Get all keys
   */
  keys(): string[] {
    return Object.keys(localStorage)
  }
}
