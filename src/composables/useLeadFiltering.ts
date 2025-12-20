import { ref, computed } from 'vue'
import type { Lead } from '@/types'

export interface FilterOptions {
  search: string
  status: string
  assignedTo: string
  noTask: boolean
  noAction: boolean
  temperature?: string
}

export function useLeadFiltering(leads: Lead[]) {
  const filters = ref<FilterOptions>({
    search: '',
    status: '',
    assignedTo: '',
    noTask: false,
    noAction: false,
    temperature: ''
  })

  const sortColumn = ref<keyof Lead | null>(null)
  const sortDirection = ref<'asc' | 'desc'>('asc')

  const filteredLeads = computed(() => {
    let result = [...leads]

    // Search filter
    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(lead =>
        lead.name?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search) ||
        lead.phone?.toLowerCase().includes(search)
      )
    }

    // Status filter
    if (filters.value.status) {
      result = result.filter(lead => lead.status === filters.value.status)
    }

    // Assigned to filter
    if (filters.value.assignedTo) {
      result = result.filter(lead => lead.assignedTo === filters.value.assignedTo)
    }

    // Temperature filter
    if (filters.value.temperature) {
      result = result.filter(lead => lead.temperature === filters.value.temperature)
    }

    // No task filter (has tasks but none pending)
    if (filters.value.noTask) {
      result = result.filter(lead => {
        const isActive = !['Won', 'Lost'].includes(lead.status)
        const hasTasks = lead.tasks && lead.tasks.length > 0
        const hasPending = lead.tasks?.some(t => t.status === 'pending')
        return isActive && hasTasks && !hasPending
      })
    }

    // No action filter (0 tasks)
    if (filters.value.noAction) {
      result = result.filter(lead => {
        const isActive = !['Won', 'Lost'].includes(lead.status)
        const hasTasks = lead.tasks && lead.tasks.length > 0
        return isActive && !hasTasks
      })
    }

    // Sort
    if (sortColumn.value) {
      result.sort((a, b) => {
        const aVal = a[sortColumn.value as keyof Lead]
        const bVal = b[sortColumn.value as keyof Lead]

        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortDirection.value === 'asc' ? 1 : -1
        if (bVal == null) return sortDirection.value === 'asc' ? -1 : 1

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        return sortDirection.value === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    }

    return result
  })

  function updateFilters(newFilters: Partial<FilterOptions>) {
    Object.assign(filters.value, newFilters)
  }

  function clearFilters() {
    filters.value = {
      search: '',
      status: '',
      assignedTo: '',
      noTask: false,
      noAction: false,
      temperature: ''
    }
  }

  function setSortColumn(column: keyof Lead | null) {
    if (sortColumn.value === column) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortColumn.value = column
      sortDirection.value = 'asc'
    }
  }

  return {
    filters,
    filteredLeads,
    sortColumn,
    sortDirection,
    updateFilters,
    clearFilters,
    setSortColumn
  }
}
