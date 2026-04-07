<template>
  <div class="h-full w-full flex flex-col">
    <!-- Kanban Board -->
    <div class="kanban-board h-full w-full p-2 md:p-6 flex overflow-x-auto gap-2 md:gap-6 items-start">
      <div
        v-for="status in statuses"
        :key="status"
        :class="[
          'kanban-column flex flex-col h-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden',
          'w-[calc(100vw-1.5rem)] md:w-72 flex-shrink-0',
          activeMobileTab && activeMobileTab !== status ? 'hidden md:flex' : 'flex'
        ]"
      >
        <!-- Column Header -->
        <div class="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full" :class="getStatusColor(status)"></div>
            <h2 class="font-bold text-slate-700 text-sm md:text-base">{{ status }}</h2>
          </div>
          <span class="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {{ leadsByStatus[status].length }}
          </span>
        </div>

        <!-- Column Content -->
        <div class="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 md:space-y-3 overscroll-contain">
          <div
            v-if="leadsByStatus[status].length === 0"
            class="flex flex-col items-center justify-center h-48 text-slate-400 opacity-60"
          >
            <i class="ph-duotone ph-ghost text-4xl mb-2"></i>
            <p class="text-sm">Empty</p>
          </div>

          <LeadCard
            v-for="lead in leadsByStatus[status]"
            :key="lead.id"
            :lead="lead"
            :get-user-name="getUserName"
            :view-mode="viewMode"
            @open="emit('open', $event)"
            @edit-activity="emit('edit-activity', $event)"
            @edit-task="emit('edit-task', $event)"
            @move="(id: string, newStatus: LeadStatus) => emit('move', id, newStatus)"
            @long-press="handleLongPress"
          />

          <div class="h-20 md:hidden"></div>
        </div>

        <!-- Column Footer -->
        <div class="bg-white/50 border-t border-slate-200 p-2 text-center text-xs text-slate-500 font-medium">
          Total: {{ formatCurrency(columnTotal(status)) }}
        </div>
      </div>
    </div>

    <!-- Quick Actions Sheet -->
    <QuickActionsSheet
      :is-open="isSheetOpen"
      :lead="selectedLead"
      @close="closeSheet"
      @edit-activity="handleSheetAction('activity', $event)"
      @edit-task="handleSheetAction('task', $event)"
      @edit-lead="handleSheetAction('edit', $event)"
      @move-status="handleMoveStatus"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Lead, LeadStatus } from '@/types'
import LeadCard from './LeadCard.vue'
import QuickActionsSheet from './QuickActionsSheet.vue'
import { useLeadScoring } from '@/composables/useLeadScoring'

const props = defineProps<{
  leads: Lead[]
  getUserName?: (id?: string) => string
  activeMobileTab?: LeadStatus
  viewMode?: 'normal' | 'compact' | 'list'
}>()

const emit = defineEmits<{
  open: [id: string]
  'edit-activity': [id: string]
  'edit-task': [id: string]
  move: [id: string, status: LeadStatus]
}>()

const { formatCurrency } = useLeadScoring()

// Quick Actions Sheet state
const isSheetOpen = ref(false)
const selectedLead = ref<Lead | null>(null)

function handleLongPress(lead: Lead) {
  selectedLead.value = lead
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
  setTimeout(() => {
    selectedLead.value = null
  }, 300) // Wait for animation
}

function handleSheetAction(type: 'activity' | 'task' | 'edit', id: string) {
  if (type === 'activity') {
    emit('edit-activity', id)
  } else if (type === 'task') {
    emit('edit-task', id)
  } else if (type === 'edit') {
    emit('open', id)
  }
}

function handleMoveStatus(id: string, status: LeadStatus) {
  emit('move', id, status)
}

const statuses: LeadStatus[] = ['New', 'Contacted', 'Proposal', 'Won', 'Lost']

const leadsByStatus = computed(() => {
  const result: Record<LeadStatus, Lead[]> = {
    New: [],
    Contacted: [],
    Proposal: [],
    Won: [],
    Lost: []
  }
  props.leads.forEach(lead => {
    if (result[lead.status]) {
      result[lead.status].push(lead)
    }
  })
  return result
})

function columnTotal(status: LeadStatus): number {
  return leadsByStatus.value[status].reduce((sum, l) => sum + (l.value || 0), 0)
}

function getStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    New: 'bg-blue-500',
    Contacted: 'bg-yellow-500',
    Proposal: 'bg-purple-500',
    Won: 'bg-green-500',
    Lost: 'bg-red-500'
  }
  return colors[status] || 'bg-slate-500'
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
