<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-start justify-center pt-20" @click.self="closeModal">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="closeModal"></div>

      <!-- Search Box -->
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-96 flex flex-col" @click.stop>
        <!-- Search Input -->
        <div class="p-4 border-b border-slate-200">
          <div class="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2">
            <i class="ph-bold ph-magnifying-glass text-slate-400 text-lg"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name, email, or phone..."
              class="flex-1 bg-transparent outline-none text-sm text-slate-800"
              autofocus
              @input="performSearch"
              @keydown.escape="closeModal"
            />
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
              <i class="ph-bold ph-x text-lg"></i>
            </button>
          </div>
        </div>

        <!-- Results -->
        <div class="flex-1 overflow-y-auto divide-y divide-slate-200">
          <div v-if="searchQuery.length === 0" class="p-6 text-center text-slate-500 text-sm">
            Type to search for leads...
          </div>
          <div v-else-if="searchResults.length === 0" class="p-6 text-center text-slate-500 text-sm">
            No leads found
          </div>
          <button
            v-for="lead in searchResults"
            :key="lead.id"
            @click="selectLead(lead)"
            class="w-full text-left p-4 hover:bg-slate-50 transition flex items-center justify-between group"
          >
            <div class="flex-1">
              <div class="font-semibold text-slate-900 text-sm group-hover:text-primary">
                {{ lead.name }}
              </div>
              <div class="text-xs text-slate-500 mt-1">
                <span v-if="lead.phone">{{ lead.phone }}</span>
                <span v-if="lead.email" class="ml-2">{{ lead.email }}</span>
              </div>
              <div class="text-xs text-slate-400 mt-1">
                <span class="inline-block px-2 py-1 rounded bg-slate-100">{{ lead.status }}</span>
              </div>
            </div>
            <i class="ph-bold ph-caret-right text-slate-300 ml-4"></i>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import type { Lead } from '@/types'

const leadsStore = useLeadsStore()

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'select', lead: Lead): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const searchQuery = ref('')
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const query = searchQuery.value.toLowerCase()
  return leadsStore.leads.filter(lead =>
    lead.name?.toLowerCase().includes(query) ||
    lead.email?.toLowerCase().includes(query) ||
    lead.phone?.toLowerCase().includes(query)
  ).slice(0, 10)
})

const performSearch = () => {
  // Computed property handles the searching
}

const selectLead = (lead: Lead) => {
  emit('select', lead)
  closeModal()
}

const closeModal = () => {
  searchQuery.value = ''
  emit('close')
}
</script>
