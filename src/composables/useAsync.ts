import { ref, shallowRef, computed } from 'vue'

export type AsyncState = 'idle' | 'pending' | 'success' | 'error'

/**
 * Composable for managing async operations
 * Provides state management for promises/async functions
 */
export function useAsync<T, E = Error>(
  asyncFunction: () => Promise<T>,
  immediate = false
) {
  const state = ref<AsyncState>('idle')
  const data = ref<T | null>(null)
  const error = ref<E | null>(null)
  const isLoading = computed(() => state.value === 'pending')
  const isSuccess = computed(() => state.value === 'success')
  const isError = computed(() => state.value === 'error')
  const isIdle = computed(() => state.value === 'idle')

  /**
   * Execute async function
   */
  async function execute(): Promise<T | null> {
    state.value = 'pending'
    error.value = null
    
    try {
      const result = await asyncFunction()
      state.value = 'success'
      data.value = result
      return result
    } catch (err) {
      state.value = 'error'
      error.value = err as E
      return null
    }
  }

  /**
   * Reset state
   */
  function reset() {
    state.value = 'idle'
    data.value = null
    error.value = null
  }

  if (immediate) {
    execute()
  }

  return {
    state,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    isIdle,
    execute,
    reset
  }
}

/**
 * Composable for retrying failed async operations
 */
export function useAsyncRetry<T, E = Error>(
  asyncFunction: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
) {
  let retryCount = 0
  const asyncState = useAsync<T, E>(asyncFunction, false)

  /**
   * Execute with retries
   */
  async function executeWithRetry(): Promise<T | null> {
    retryCount = 0

    while (retryCount < maxRetries) {
      const result = await asyncState.execute()
      if (result !== null) {
        return result
      }

      retryCount++
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * retryCount))
      }
    }

    return null
  }

  return {
    ...asyncState,
    executeWithRetry,
    retryCount: computed(() => retryCount)
  }
}

/**
 * Composable for executing multiple async operations
 */
export function useAsyncQueue<T>(
  asyncFunctions: Array<() => Promise<T>>
) {
  const results = shallowRef<T[]>([])
  const errors = shallowRef<Error[]>([])
  const isLoading = ref(false)
  const progress = ref(0)

  /**
   * Execute all functions sequentially
   */
  async function executeSequential(): Promise<T[]> {
    isLoading.value = true
    results.value = []
    errors.value = []
    progress.value = 0

    for (let i = 0; i < asyncFunctions.length; i++) {
      try {
        const result = await asyncFunctions[i]()
        results.value.push(result)
      } catch (err) {
        errors.value.push(err instanceof Error ? err : new Error(String(err)))
      }
      progress.value = ((i + 1) / asyncFunctions.length) * 100
    }

    isLoading.value = false
    return results.value
  }

  /**
   * Execute all functions in parallel
   */
  async function executeParallel(): Promise<T[]> {
    isLoading.value = true
    results.value = []
    errors.value = []
    progress.value = 0

    try {
      results.value = await Promise.all(asyncFunctions.map(fn => fn()))
      progress.value = 100
    } catch (err) {
      errors.value.push(err instanceof Error ? err : new Error(String(err)))
    }

    isLoading.value = false
    return results.value
  }

  /**
   * Execute with concurrency limit
   */
  async function executeWithConcurrency(limit: number): Promise<T[]> {
    isLoading.value = true
    results.value = []
    errors.value = []
    progress.value = 0

    const queue = [...asyncFunctions]
    const active: Promise<any>[] = []
    const resultMap = new Map<number, T>()

    while (queue.length > 0 || active.length > 0) {
      while (active.length < limit && queue.length > 0) {
        const index = asyncFunctions.length - queue.length
        const fn = queue.shift()!

        const promise = fn()
          .then(result => {
            resultMap.set(index, result)
          })
          .catch(err => {
            errors.value.push(err instanceof Error ? err : new Error(String(err)))
          })
          .finally(() => {
            active.splice(active.indexOf(promise), 1)
            progress.value = ((asyncFunctions.length - queue.length) / asyncFunctions.length) * 100
          })

        active.push(promise)
      }

      if (active.length > 0) {
        await Promise.race(active)
      }
    }

    // Reconstruct results in original order
    for (let i = 0; i < asyncFunctions.length; i++) {
      if (resultMap.has(i)) {
        results.value[i] = resultMap.get(i)!
      }
    }

    isLoading.value = false
    return results.value
  }

  return {
    results,
    errors,
    isLoading,
    progress,
    executeSequential,
    executeParallel,
    executeWithConcurrency
  }
}
