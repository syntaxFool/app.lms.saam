import { ref, computed } from 'vue'

/**
 * Composable for managing pagination logic
 * Handles page navigation and item slicing
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const currentPage = ref(1)
  const itemsPerPage = ref(pageSize)

  const totalItems = computed(() => items.length)
  const totalPages = computed(() => 
    Math.ceil(totalItems.value / itemsPerPage.value)
  )

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return items.slice(start, end)
  })

  const startIndex = computed(() => 
    (currentPage.value - 1) * itemsPerPage.value + 1
  )

  const endIndex = computed(() => 
    Math.min(currentPage.value * itemsPerPage.value, totalItems.value)
  )

  const hasNextPage = computed(() => 
    currentPage.value < totalPages.value
  )

  const hasPreviousPage = computed(() => 
    currentPage.value > 1
  )

  /**
   * Go to a specific page
   */
  function goToPage(page: number) {
    const validPage = Math.max(1, Math.min(page, totalPages.value))
    currentPage.value = validPage
  }

  /**
   * Go to next page
   */
  function nextPage() {
    if (hasNextPage.value) {
      currentPage.value++
    }
  }

  /**
   * Go to previous page
   */
  function previousPage() {
    if (hasPreviousPage.value) {
      currentPage.value--
    }
  }

  /**
   * Go to first page
   */
  function firstPage() {
    currentPage.value = 1
  }

  /**
   * Go to last page
   */
  function lastPage() {
    currentPage.value = totalPages.value
  }

  /**
   * Change items per page
   */
  function setPageSize(size: number) {
    itemsPerPage.value = Math.max(1, size)
    // Reset to first page when changing page size
    currentPage.value = 1
  }

  /**
   * Reset pagination
   */
  function reset() {
    currentPage.value = 1
  }

  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    reset
  }
}
