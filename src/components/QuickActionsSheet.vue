<template>
  <Transition name="sheet">
    <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center" @click="close">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      <!-- Sheet / Context Menu -->
      <div
        @click.stop
        class="relative w-full md:w-auto md:min-w-[320px] md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-2">
          <div class="w-12 h-1.5 bg-slate-300 rounded-full"></div>
        </div>

        <!-- Header -->
        <div class="px-5 pb-3 border-b border-slate-200">
          <h3 class="text-lg font-bold text-slate-800">{{ lead?.name || 'Unnamed Lead' }}</h3>
          <p v-if="lead?.phone" class="text-sm text-slate-500 mt-0.5">{{ lead.phone }}</p>
          <div v-if="lead?.value" class="text-base font-bold text-emerald-600 mt-1">
            {{ formatCurrency(lead.value) }}
          </div>
        </div>

        <!-- Actions -->
        <div class="py-2">
          <!-- Call -->
          <a
            v-if="lead?.phone"
            :href="`tel:+${cleanPhone}`"
            @click="close"
            class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <i class="ph-fill ph-phone text-orange-600 text-xl"></i>
            </div>
            <span class="text-base font-semibold text-slate-800">Call</span>
          </a>

          <!-- WhatsApp -->
          <a
            v-if="lead?.phone"
            :href="`https://wa.me/${cleanPhone}`"
            target="_blank"
            @click="close"
            class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <i class="ph-fill ph-whatsapp-logo text-green-600 text-xl"></i>
            </div>
            <span class="text-base font-semibold text-slate-800">WhatsApp</span>
          </a>

          <!-- Add Activity -->
          <button
            @click="handleAction('activity')"
            class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <i class="ph-bold ph-chat text-blue-600 text-xl"></i>
            </div>
            <span class="text-base font-semibold text-slate-800">Add Activity</span>
          </button>

          <!-- Add Task -->
          <button
            @click="handleAction('task')"
            class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <i class="ph-bold ph-plus text-purple-600 text-xl"></i>
            </div>
            <span class="text-base font-semibold text-slate-800">Add Task</span>
          </button>

          <!-- Edit Lead -->
          <button
            @click="handleAction('edit')"
            class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <i class="ph-bold ph-pencil text-indigo-600 text-xl"></i>
            </div>
            <span class="text-base font-semibold text-slate-800">Edit Lead</span>
          </button>

          <!-- Move to Next Status -->
          <button
            v-if="nextStatus"
            @click="handleAction('move-next')"
            class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <i class="ph-bold ph-arrow-right text-primary text-xl"></i>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-base font-semibold text-slate-800">Move to {{ nextStatus }}</span>
              <span class="text-xs text-slate-500">Next stage</span>
            </div>
          </button>

          <!-- Move to Previous Status -->
          <button
            v-if="prevStatus"
            @click="handleAction('move-prev')"
            class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <i class="ph-bold ph-arrow-left text-slate-600 text-xl"></i>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-base font-semibold text-slate-800">Move to {{ prevStatus }}</span>
              <span class="text-xs text-slate-500">Previous stage</span>
            </div>
          </button>
        </div>

        <!-- Cancel Button -->
        <div class="p-4 border-t border-slate-200">
          <button
            @click="close"
            class="w-full py-3 text-base font-semibold text-slate-600 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Lead, LeadStatus } from '@/types'
import { useLeadScoring } from '@/composables/useLeadScoring'

const props = defineProps<{
  isOpen: boolean
  lead: Lead | null
}>()

const emit = defineEmits<{
  close: []
  'edit-activity': [id: string]
  'edit-task': [id: string]
  'edit-lead': [id: string]
  'move-status': [id: string, status: LeadStatus]
}>()

const { formatCurrency } = useLeadScoring()

const statusOrder: LeadStatus[] = ['New', 'Contacted', 'Proposal', 'Won', 'Lost']

const cleanPhone = computed(() => (props.lead?.phone || '').replace(/\D/g, ''))

const currentStatusIndex = computed(() => {
  if (!props.lead) return -1
  return statusOrder.indexOf(props.lead.status)
})

const nextStatus = computed(() => {
  const idx = currentStatusIndex.value
  if (idx >= statusOrder.length - 1) return null
  const next = statusOrder[idx + 1]
  // Prevent moving to Lost via quick actions (requires modal)
  if (next === 'Lost') return null
  return next
})

const prevStatus = computed(() => {
  const idx = currentStatusIndex.value
  return idx > 0 ? statusOrder[idx - 1] : null
})

function close() {
  emit('close')
}

function handleAction(action: string) {
  if (!props.lead) return

  switch (action) {
    case 'activity':
      emit('edit-activity', props.lead.id)
      break
    case 'task':
      emit('edit-task', props.lead.id)
      break
    case 'edit':
      emit('edit-lead', props.lead.id)
      break
    case 'move-next':
      if (nextStatus.value) {
        emit('move-status', props.lead.id, nextStatus.value)
      }
      break
    case 'move-prev':
      if (prevStatus.value) {
        emit('move-status', props.lead.id, prevStatus.value)
      }
      break
  }
  
  close()
}
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.3s ease;
}

.sheet-enter-active > div:last-child,
.sheet-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from > div:last-child,
.sheet-leave-to > div:last-child {
  transform: translateY(100%);
}
</style>
