import { ref, computed } from 'vue'

/**
 * Composable for managing loading states across the application
 * Useful for tracking async operations and display loading indicators
 */
export function useLoading(initialState = false) {
  const isLoading = ref(initialState)
  const error = ref<string | null>(null)

  const isIdle = computed(() => !isLoading.value && !error.value)
  const isError = computed(() => !!error.value)

  /**
   * Execute an async function with loading state management
   */
  async function execute<T>(asyncFn: () => Promise<T>): Promise<T | null> {
    try {
      isLoading.value = true
      error.value = null
      const result = await asyncFn()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Loading Error:', errorMessage)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set loading state manually
   */
  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  /**
   * Set error state manually
   */
  function setError(errorMessage: string | null) {
    error.value = errorMessage
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Reset to initial state
   */
  function reset() {
    isLoading.value = initialState
    error.value = null
  }

  return {
    isLoading,
    error,
    isIdle,
    isError,
    execute,
    setLoading,
    setError,
    clearError,
    reset
  }
}
