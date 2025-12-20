import { ref } from 'vue'

/**
 * Composable for debouncing function calls
 * Useful for search inputs, resize handlers, etc.
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay = 300
): [(...args: Parameters<T>) => void, () => void] {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * Debounced function
   */
  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      callback(...args)
      timeoutId = null
    }, delay)
  }

  /**
   * Cancel debounced call
   */
  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return [debouncedFn, cancel]
}

/**
 * Composable for throttling function calls
 * Useful for scroll events, resize handlers, etc.
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit = 300
): [(...args: Parameters<T>) => void, () => void] {
  let lastRun = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * Throttled function
   */
  const throttledFn = (...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastRun = now - lastRun

    if (timeSinceLastRun >= limit) {
      callback(...args)
      lastRun = now
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        callback(...args)
        lastRun = Date.now()
        timeoutId = null
      }, limit - timeSinceLastRun)
    }
  }

  /**
   * Cancel throttled call
   */
  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return [throttledFn, cancel]
}

/**
 * Composable for debouncing with reactive state
 */
export function useDebouncedRef<T>(initialValue: T, delay = 300) {
  const value = ref<T>(initialValue)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debouncedValue = ref<T>(initialValue)

  const updateValue = (newValue: T) => {
    value.value = newValue

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue
      timeoutId = null
    }, delay)
  }

  return {
    value,
    debouncedValue,
    updateValue
  }
}
