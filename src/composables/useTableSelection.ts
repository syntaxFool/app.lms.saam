import { ref, computed } from 'vue'

/**
 * Composable for managing table row selection
 * Handles single/multi-select with helper methods
 */
export function useTableSelection<T extends { id: string }>(items: T[] = []) {
  const selectedIds = ref<Set<string>>(new Set())

  const selectedItems = computed(() => 
    items.filter(item => selectedIds.value.has(item.id))
  )

  const selectionCount = computed(() => selectedIds.value.size)

  const isAllSelected = computed(() => 
    items.length > 0 && selectedIds.value.size === items.length
  )

  const isPartiallySelected = computed(() => 
    selectedIds.value.size > 0 && selectedIds.value.size < items.length
  )

  /**
   * Check if item is selected
   */
  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  /**
   * Select single item
   */
  function selectItem(id: string) {
    selectedIds.value.add(id)
  }

  /**
   * Deselect single item
   */
  function deselectItem(id: string) {
    selectedIds.value.delete(id)
  }

  /**
   * Toggle selection of single item
   */
  function toggleItem(id: string) {
    if (isSelected(id)) {
      deselectItem(id)
    } else {
      selectItem(id)
    }
  }

  /**
   * Select all items
   */
  function selectAll() {
    items.forEach(item => selectedIds.value.add(item.id))
  }

  /**
   * Deselect all items
   */
  function deselectAll() {
    selectedIds.value.clear()
  }

  /**
   * Toggle all items
   */
  function toggleAll() {
    if (isAllSelected.value) {
      deselectAll()
    } else {
      selectAll()
    }
  }

  /**
   * Select multiple items
   */
  function selectMultiple(ids: string[]) {
    ids.forEach(id => selectedIds.value.add(id))
  }

  /**
   * Deselect multiple items
   */
  function deselectMultiple(ids: string[]) {
    ids.forEach(id => selectedIds.value.delete(id))
  }

  /**
   * Set selection to specific items
   */
  function setSelection(ids: string[]) {
    selectedIds.value.clear()
    ids.forEach(id => selectedIds.value.add(id))
  }

  /**
   * Get selected IDs as array
   */
  function getSelectedIds(): string[] {
    return Array.from(selectedIds.value)
  }

  /**
   * Clear selection
   */
  function clear() {
    selectedIds.value.clear()
  }

  /**
   * Invert selection
   */
  function invertSelection() {
    const inverted = new Set<string>()
    items.forEach(item => {
      if (!selectedIds.value.has(item.id)) {
        inverted.add(item.id)
      }
    })
    selectedIds.value = inverted
  }

  return {
    selectedIds,
    selectedItems,
    selectionCount,
    isAllSelected,
    isPartiallySelected,
    isSelected,
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    deselectAll,
    toggleAll,
    selectMultiple,
    deselectMultiple,
    setSelection,
    getSelectedIds,
    clear,
    invertSelection
  }
}
