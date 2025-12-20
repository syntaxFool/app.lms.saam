<template>
  <div class="h-full w-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
    <!-- Filter Bar -->
    <div class="p-4 md:p-6 border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shrink-0">
      <!-- Primary Filters -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <!-- Search -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Search</label>
          <div class="relative">
            <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Name, email, phone..."
              class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
            />
          </div>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Status</label>
          <select
            v-model="statusFilter"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          >
            <option value="">All Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Proposal">Proposal</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <!-- Temperature Filter -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Temperature</label>
          <select
            v-model="temperatureFilter"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          >
            <option value="">All Temperature</option>
            <option value="Hot">🔴 Hot</option>
            <option value="Warm">🟠 Warm</option>
            <option value="Cold">🔵 Cold</option>
          </select>
        </div>

        <!-- Assigned To Filter -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Assigned To</label>
          <select
            v-model="assignedFilter"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          >
            <option value="">All Agents</option>
            <option value="Akash Singh">Akash Singh</option>
            <option value="Meera Patel">Meera Patel</option>
            <option value="Rajesh Kumar">Rajesh Kumar</option>
            <option value="">Unassigned</option>
          </select>
        </div>
      </div>

      <!-- Advanced Filters Toggle -->
      <div class="flex items-center justify-between">
        <button
          @click="showAdvancedFilters = !showAdvancedFilters"
          class="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors"
        >
          <i :class="`ph-bold ph-caret-${showAdvancedFilters ? 'up' : 'down'}`"></i>
          {{ showAdvancedFilters ? 'Hide' : 'Show' }} Advanced Filters
        </button>
        
        <button
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          class="text-sm font-medium text-slate-600 hover:text-slate-700 flex items-center gap-2 transition-colors"
        >
          <i class="ph-bold ph-x-circle"></i>
          Clear All Filters
        </button>
      </div>

      <!-- Advanced Filters -->
      <div v-if="showAdvancedFilters" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-300">
        <!-- Follow-up Date Range -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Follow-up Date From</label>
          <input
            v-model="followUpDateFrom"
            type="date"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Follow-up Date To</label>
          <input
            v-model="followUpDateTo"
            type="date"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          />
        </div>

        <!-- Source Filter -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Source</label>
          <select
            v-model="sourceFilter"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          >
            <option value="">All Sources</option>
            <option value="Website">Website</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Referral">Referral</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Call">Call</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <!-- Interest Filter -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Interest</label>
          <select
            v-model="interestFilter"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          >
            <option value="">All Interests</option>
            <option value="Full Stack Development">Full Stack Development</option>
            <option value="Data Science">Data Science</option>
            <option value="UI/UX Design">UI/UX Design</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Mobile App Development">Mobile App Development</option>
            <option value="Cloud Computing">Cloud Computing</option>
            <option value="Cybersecurity">Cybersecurity</option>
            <option value="Business Analytics">Business Analytics</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <!-- Location Filter -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Location</label>
          <select
            v-model="locationFilter"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          >
            <option value="">All Locations</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Chennai">Chennai</option>
            <option value="Kolkata">Kolkata</option>
            <option value="Pune">Pune</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <!-- Value Range -->
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Min Value (₹)</label>
          <input
            v-model.number="minValue"
            type="number"
            placeholder="0"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
          />
        </div>
      </div>

      <!-- Active Filters Tags -->
      <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-300">
        <span v-if="searchQuery" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Search: {{ searchQuery }}
          <button @click="searchQuery = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="statusFilter" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Status: {{ statusFilter }}
          <button @click="statusFilter = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="temperatureFilter" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Temperature: {{ temperatureFilter }}
          <button @click="temperatureFilter = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="assignedFilter" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Agent: {{ assignedFilter || 'Unassigned' }}
          <button @click="assignedFilter = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="sourceFilter" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Source: {{ sourceFilter }}
          <button @click="sourceFilter = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="interestFilter" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Interest: {{ interestFilter }}
          <button @click="interestFilter = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="locationFilter" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Location: {{ locationFilter }}
          <button @click="locationFilter = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="followUpDateFrom" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          From: {{ followUpDateFrom }}
          <button @click="followUpDateFrom = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="followUpDateTo" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          To: {{ followUpDateTo }}
          <button @click="followUpDateTo = ''" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
        <span v-if="minValue && minValue > 0" class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Min: ₹{{ minValue }}
          <button @click="minValue = 0" class="hover:text-blue-900"><i class="ph-bold ph-x text-xs"></i></button>
        </span>
      </div>
    </div>

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
                class="text-blue-600 hover:text-blue-700 font-bold text-lg opacity-0 group-hover:opacity-100 transition"
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
              <option value="Akash Singh">Akash Singh</option>
              <option value="Meera Patel">Meera Patel</option>
              <option value="Rajesh Kumar">Rajesh Kumar</option>
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
import type { Lead } from '@/types'

interface Props {
  leads: Lead[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [leadId: string]
}>()

const leadsStore = useLeadsStore()

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
const showAdvancedFilters = ref(false)
const sortColumn = ref<'name' | 'status' | 'value' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Bulk actions
const selectedLeads = ref<string[]>([])
const showBulkAssignModal = ref(false)
const showBulkDeleteModal = ref(false)
const bulkAssignAgent = ref('')

const hasActiveFilters = computed(() => {
  return !!(
    searchQuery.value ||
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
  if (assignedFilter.value === '') {
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
