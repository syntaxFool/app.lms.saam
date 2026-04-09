<template>
  <div class="h-full w-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
    <!-- Minimal Filter Header -->
    <div class="p-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shrink-0">
      <!-- Single Row: Search + Filter Button -->
      <div class="flex items-center gap-2">
        <!-- Search Input -->
        <div class="flex-1 relative">
          <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search leads..."
            class="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                   focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm outline-none"
          />
        </div>
        
        <!-- Filter Button with Badge -->
        <button
          @click="showFilterSheet = true"
          class="relative p-2.5 rounded-lg border-2 border-slate-300 hover:bg-slate-100 
                 active:bg-slate-200 transition-colors shrink-0"
        >
          <i class="ph-bold ph-funnel text-xl text-slate-700"></i>
          <span
            v-if="activeFilterCount > 0"
            class="absolute -top-1.5 -right-1.5 bg-primary text-white text-xs 
                   font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md"
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>
      
      <!-- Active Filter Chips -->
      <div v-if="activeFilterChips.length > 0" class="flex flex-wrap gap-2 mt-3">
        <span
          v-for="chip in activeFilterChips"
          :key="chip.key"
          class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 
                 bg-primary/10 text-primary rounded-full text-xs font-semibold"
        >
          {{ chip.label }}
          <button
            @click="clearFilter(chip.key)"
            class="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
          >
            <i class="ph-bold ph-x text-xs"></i>
          </button>
        </span>
        <button
          @click="clearAllFilters"
          class="inline-flex items-center gap-1 px-3 py-1.5 
                 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold
                 hover:bg-slate-300 transition-colors"
        >
          <i class="ph-bold ph-x-circle text-xs"></i>
          Clear All
        </button>
      </div>
    </div>

    <!-- FilterSheet Component -->
    <FilterSheet
      :is-open="showFilterSheet"
      :filters="currentFilters"
      :agents="agents"
      @close="showFilterSheet = false"
      @apply="applyFilters"
      @clear="clearAllFilters"
    />

    <!-- Bulk Actions Bar -->
    <div v-if="selectedLeads.length > 0" class="px-4 md:px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between shrink-0">
      <div class="text-sm font-medium text-blue-900">
        {{ selectedLeads.length }} lead{{ selectedLeads.length > 1 ? 's' : '' }} selected
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="showBulkAssignModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <i class="ph-bold ph-user-plus"></i>
          Assign
        </button>
        <button
          @click="showBulkDeleteModal = true"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <i class="ph-bold ph-trash"></i>
          Delete
        </button>
        <button
          @click="selectedLeads = []"
          class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs sm:text-sm">
        <thead class="sticky top-0 bg-slate-100 border-b-2 border-slate-300 z-10">
          <tr>
            <th class="px-4 py-3 font-bold text-slate-700 text-center w-12">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <th class="px-4 py-3 font-bold text-slate-700 text-left cursor-pointer hover:bg-slate-200 transition" @click="sortBy('name')">
              <div class="flex items-center gap-2">
                Name
                <i v-if="sortColumn === 'name'" :class="`ph-bold ph-arrow-${sortDirection === 'asc' ? 'up' : 'down'} text-xs`"></i>
              </div>
            </th>
            <th class="px-4 py-3 font-bold text-slate-700 text-left hidden sm:table-cell">
              Contact
            </th>
            <th class="px-4 py-3 font-bold text-slate-700 text-left cursor-pointer hover:bg-slate-200 transition" @click="sortBy('status')">
              <div class="flex items-center gap-2">
                Status
                <i v-if="sortColumn === 'status'" :class="`ph-bold ph-arrow-${sortDirection === 'asc' ? 'up' : 'down'} text-xs`"></i>
              </div>
            </th>
            <th class="px-4 py-3 font-bold text-slate-700 text-left hidden md:table-cell">
              Temperature
            </th>
            <th class="px-4 py-3 font-bold text-slate-700 text-left hidden lg:table-cell cursor-pointer hover:bg-slate-200 transition" @click="sortBy('value')">
              <div class="flex items-center gap-2">
                Value
                <i v-if="sortColumn === 'value'" :class="`ph-bold ph-arrow-${sortDirection === 'asc' ? 'up' : 'down'} text-xs`"></i>
              </div>
            </th>
            <th class="px-4 py-3 font-bold text-slate-700 text-left hidden sm:table-cell">
              Assigned
            </th>
            <th class="px-4 py-3 font-bold text-slate-700 text-center w-12">
              Action
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="lead in filteredLeads"
            :key="lead.id"
            class="hover:bg-slate-50 transition-colors group"
            :class="{ 'bg-blue-50': selectedLeads.includes(lead.id) }"
          >
            <td class="px-4 py-3 text-center">
              <input
                type="checkbox"
                :checked="selectedLeads.includes(lead.id)"
                @change="toggleSelectLead(lead.id)"
                class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </td>
            <td class="px-4 py-3 font-semibold text-slate-800 cursor-pointer" @click="$emit('open', lead.id)">
              <div class="line-clamp-1">{{ lead.name || lead.phone }}</div>
            </td>
            <td class="px-4 py-3 hidden sm:table-cell text-slate-600">
              <div class="text-xs font-medium">{{ lead.phone }}</div>
              <div class="text-xs text-slate-400 line-clamp-1">{{ lead.email }}</div>
            </td>
            <td class="px-4 py-3">
              <span :class="{
                'bg-blue-100 text-blue-800': lead.status === 'New',
                'bg-yellow-100 text-yellow-800': lead.status === 'Contacted',
                'bg-purple-100 text-purple-800': lead.status === 'Proposal',
                'bg-green-100 text-green-800': lead.status === 'Won',
                'bg-red-100 text-red-800': lead.status === 'Lost'
              }" class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full">
                {{ lead.status }}
              </span>
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
              <span v-if="lead.temperature" :class="{
                'text-red-600': lead.temperature === 'Hot',
                'text-orange-600': lead.temperature === 'Warm',
                'text-blue-600': lead.temperature === 'Cold'
              }" class="text-sm font-semibold">
                {{ lead.temperature === 'Hot' ? '🔴' : lead.temperature === 'Warm' ? '🟠' : '🔵' }}
                {{ lead.temperature }}
              </span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="px-4 py-3 hidden lg:table-cell text-slate-700 font-semibold text-sm">
              {{ formatCurrency(lead.value) }}
            </td>
            <td class="px-4 py-3 hidden sm:table-cell text-slate-600 text-xs">
              <span v-if="lead.assignedTo" class="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">
                {{ lead.assignedTo }}
              </span>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="px-4 py-3 text-center">
              <button
                @click="$emit('open', lead.id)"
                class="text-blue-600 hover:text-blue-700 font-bold text-lg transition"
                title="Edit Lead"
              >
                <i class="ph-bold ph-pencil"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- No Data State -->
      <div v-if="filteredLeads.length === 0" class="w-full h-64 flex flex-col items-center justify-center text-slate-400">
        <i class="ph-bold ph-magnifying-glass text-6xl mb-4 opacity-20"></i>
        <p class="text-lg font-semibold">No leads found</p>
        <p class="text-sm">Try adjusting your search or filters</p>
      </div>
    </div>

    <!-- Footer with Count -->
    <div class="px-4 md:px-6 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-600 font-medium shrink-0">
      Showing {{ filteredLeads.length }} of {{ props.leads.length }} leads
    </div>

    <!-- Bulk Assign Modal -->
    <Teleport to="body">
      <div v-if="showBulkAssignModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 class="text-xl font-bold text-slate-800 mb-4">Assign {{ selectedLeads.length }} Lead{{ selectedLeads.length > 1 ? 's' : '' }}</h3>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 mb-2">Select Agent</label>
            <select
              v-model="bulkAssignAgent"
              class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
            >
              <option value="">Choose an agent...</option>
              <option v-for="agent in agents" :key="agent.id" :value="agent.username">
                {{ agent.name || agent.username }}
              </option>
            </select>
          </div>

          <div class="flex gap-3">
            <button
              @click="confirmBulkAssign"
              :disabled="!bulkAssignAgent"
              class="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign
            </button>
            <button
              @click="showBulkAssignModal = false"
              class="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bulk Delete Modal -->
    <Teleport to="body">
      <div v-if="showBulkDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <i class="ph-bold ph-warning text-red-600 text-2xl"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800">Delete {{ selectedLeads.length }} Lead{{ selectedLeads.length > 1 ? 's' : '' }}?</h3>
          </div>
          
          <p class="text-slate-600 mb-6">
            Are you sure you want to delete {{ selectedLeads.length }} selected lead{{ selectedLeads.length > 1 ? 's' : '' }}? This action cannot be undone.
          </p>

          <div class="flex gap-3">
            <button
              @click="confirmBulkDelete"
              class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Delete
            </button>
            <button
              @click="showBulkDeleteModal = false"
              class="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import { useAppStore } from '@/stores/app'
import FilterSheet from './FilterSheet.vue'
import type { Lead } from '@/types'

interface Props {
  leads: Lead[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [leadId: string]
}>()

const leadsStore = useLeadsStore()
const appStore = useAppStore()

const agents = computed(() =>
  appStore.users.filter(u => ['superuser', 'admin', 'agent'].includes(u.role))
)

const searchQuery = ref('')
const statusFilter = ref('')
const temperatureFilter = ref('')
const assignedFilter = ref('')
const sourceFilter = ref('')
const interestFilter = ref('')
const locationFilter = ref('')
const followUpDateFrom = ref('')
const followUpDateTo = ref('')
const minValue = ref(0)
const showFilterSheet = ref(false)
const sortColumn = ref<'name' | 'status' | 'value' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Bulk actions
const selectedLeads = ref<string[]>([])
const showBulkAssignModal = ref(false)
const showBulkDeleteModal = ref(false)
const bulkAssignAgent = ref('')

const hasActiveFilters = computed(() => {
  return !!(
    statusFilter.value ||
    temperatureFilter.value ||
    assignedFilter.value ||
    sourceFilter.value ||
    interestFilter.value ||
    locationFilter.value ||
    followUpDateFrom.value ||
    followUpDateTo.value ||
    (minValue.value && minValue.value > 0)
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (statusFilter.value) count++
  if (temperatureFilter.value) count++
  if (assignedFilter.value) count++
  if (sourceFilter.value) count++
  if (interestFilter.value) count++
  if (locationFilter.value) count++
  if (followUpDateFrom.value) count++
  if (followUpDateTo.value) count++
  if (minValue.value && minValue.value > 0) count++
  return count
})

const activeFilterChips = computed(() => {
  const chips: Array<{ key: string; label: string }> = []
  if (statusFilter.value) chips.push({ key: 'status', label: `Status: ${statusFilter.value}` })
  if (temperatureFilter.value) {
    const tempEmoji = temperatureFilter.value === 'Hot' ? '🔴' : temperatureFilter.value === 'Warm' ? '🟠' : '🔵'
    chips.push({ key: 'temperature', label: `${tempEmoji} ${temperatureFilter.value}` })
  }
  if (assignedFilter.value) {
    const label = assignedFilter.value === '__unassigned__' ? 'Unassigned' : assignedFilter.value
    chips.push({ key: 'assigned', label: `Agent: ${label}` })
  }
  if (sourceFilter.value) chips.push({ key: 'source', label: `Source: ${sourceFilter.value}` })
  if (interestFilter.value) chips.push({ key: 'interest', label: `Interest: ${interestFilter.value}` })
  if (locationFilter.value) chips.push({ key: 'location', label: `Location: ${locationFilter.value}` })
  if (followUpDateFrom.value) chips.push({ key: 'followUpFrom', label: `From: ${followUpDateFrom.value}` })
  if (followUpDateTo.value) chips.push({ key: 'followUpTo', label: `To: ${followUpDateTo.value}` })
  if (minValue.value && minValue.value > 0) chips.push({ key: 'minValue', label: `Min: ₹${minValue.value.toLocaleString('en-IN')}` })
  return chips
})

const currentFilters = computed(() => ({
  status: statusFilter.value,
  temperature: temperatureFilter.value,
  assigned: assignedFilter.value,
  source: sourceFilter.value,
  interest: interestFilter.value,
  location: locationFilter.value,
  followUpDateFrom: followUpDateFrom.value,
  followUpDateTo: followUpDateTo.value,
  minValue: minValue.value
}))

function clearFilter(key: string) {
  switch (key) {
    case 'status': statusFilter.value = ''; break
    case 'temperature': temperatureFilter.value = ''; break
    case 'assigned': assignedFilter.value = ''; break
    case 'source': sourceFilter.value = ''; break
    case 'interest': interestFilter.value = ''; break
    case 'location': locationFilter.value = ''; break
    case 'followUpFrom': followUpDateFrom.value = ''; break
    case 'followUpTo': followUpDateTo.value = ''; break
    case 'minValue': minValue.value = 0; break
  }
}

function clearAllFilters() {
  searchQuery.value = ''
  statusFilter.value = ''
  temperatureFilter.value = ''
  assignedFilter.value = ''
  sourceFilter.value = ''
  interestFilter.value = ''
  locationFilter.value = ''
  followUpDateFrom.value = ''
  followUpDateTo.value = ''
  minValue.value = 0
  showFilterSheet.value = false
}

function applyFilters(filters: typeof currentFilters.value) {
  statusFilter.value = filters.status
  temperatureFilter.value = filters.temperature
  assignedFilter.value = filters.assigned
  sourceFilter.value = filters.source
  interestFilter.value = filters.interest
  locationFilter.value = filters.location
  followUpDateFrom.value = filters.followUpDateFrom
  followUpDateTo.value = filters.followUpDateTo
  minValue.value = filters.minValue
}

const filteredLeads = computed(() => {
  let results = [...props.leads]

  // Search filter
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase()
    results = results.filter(lead =>
      (lead.name?.toLowerCase().includes(search)) ||
      (lead.email?.toLowerCase().includes(search)) ||
      (lead.phone?.toLowerCase().includes(search))
    )
  }

  // Status filter
  if (statusFilter.value) {
    results = results.filter(lead => lead.status === statusFilter.value)
  }

  // Temperature filter
  if (temperatureFilter.value) {
    results = results.filter(lead => lead.temperature === temperatureFilter.value)
  }

  // Assigned filter
  if (assignedFilter.value === '__unassigned__') {
    results = results.filter(lead => !lead.assignedTo)
  } else if (assignedFilter.value) {
    results = results.filter(lead => lead.assignedTo === assignedFilter.value)
  }

  // Source filter
  if (sourceFilter.value) {
    results = results.filter(lead => lead.source === sourceFilter.value)
  }

  // Interest filter
  if (interestFilter.value) {
    results = results.filter(lead => lead.interest === interestFilter.value)
  }

  // Location filter
  if (locationFilter.value) {
    results = results.filter(lead => lead.location === locationFilter.value)
  }

  // Follow-up date range filter
  if (followUpDateFrom.value) {
    const fromDate = new Date(followUpDateFrom.value)
    fromDate.setHours(0, 0, 0, 0)
    results = results.filter(lead => {
      if (!lead.followUpDate) return false
      const leadDate = new Date(lead.followUpDate)
      leadDate.setHours(0, 0, 0, 0)
      return leadDate >= fromDate
    })
  }

  if (followUpDateTo.value) {
    const toDate = new Date(followUpDateTo.value)
    toDate.setHours(23, 59, 59, 999)
    results = results.filter(lead => {
      if (!lead.followUpDate) return false
      const leadDate = new Date(lead.followUpDate)
      return leadDate <= toDate
    })
  }

  // Value filter
  if (minValue.value && minValue.value > 0) {
    results = results.filter(lead => (lead.value || 0) >= minValue.value)
  }

  // Sorting
  if (sortColumn.value) {
    results.sort((a, b) => {
      let aVal: any = a[sortColumn.value as keyof Lead]
      let bVal: any = b[sortColumn.value as keyof Lead]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal?.toString().toLowerCase() || ''
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
  }

  return results
})

const isAllSelected = computed(() => {
  return filteredLeads.value.length > 0 && selectedLeads.value.length === filteredLeads.value.length
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedLeads.value = []
  } else {
    selectedLeads.value = filteredLeads.value.map(lead => lead.id)
  }
}

function toggleSelectLead(leadId: string) {
  const index = selectedLeads.value.indexOf(leadId)
  if (index > -1) {
    selectedLeads.value.splice(index, 1)
  } else {
    selectedLeads.value.push(leadId)
  }
}

function confirmBulkAssign() {
  if (!bulkAssignAgent.value) return
  
  leadsStore.bulkAssignLeads(selectedLeads.value, bulkAssignAgent.value)
  
  selectedLeads.value = []
  bulkAssignAgent.value = ''
  showBulkAssignModal.value = false
}

function confirmBulkDelete() {
  leadsStore.bulkDeleteLeads(selectedLeads.value)
  
  selectedLeads.value = []
  showBulkDeleteModal.value = false
}

function formatCurrency(value?: number): string {
  if (!value) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value)
}

function sortBy(column: 'name' | 'status' | 'value') {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}
</script>
