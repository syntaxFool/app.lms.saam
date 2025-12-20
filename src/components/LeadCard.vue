<template>
  <div
    @click="emit('open', lead.id)"
    class="bg-white rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
    :class="[
      isNoAction ? 'border-red-300 bg-red-50/30' : isNoTask ? 'border-amber-300 bg-amber-50/30' : 'border-slate-100',
      lead.status === 'Lost' ? 'grayscale opacity-60' : ''
    ]"
  >
    <!-- Card Header -->
    <div class="p-3 flex flex-col gap-1.5 flex-1">
      <!-- Name + Badge -->
      <div class="flex justify-between items-start gap-1">
        <h3 class="font-bold text-slate-800 text-xs leading-tight line-clamp-2 flex-1">
          {{ lead.name || lead.phone }}
        </h3>
        <div class="flex gap-0.5 shrink-0 text-xs">
          <span
            v-if="isNoAction"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap"
          >
            <i class="ph-bold ph-warning-circle text-xs"></i>
            No Action
          </span>
          <span
            v-else-if="isNoTask"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 whitespace-nowrap"
          >
            <i class="ph-bold ph-warning text-xs"></i>
            No Task
          </span>
        </div>
      </div>

      <!-- Assigned To + Status + Temperature -->
      <div class="flex items-center gap-1.5 text-xs font-semibold flex-wrap">
        <span
          v-if="lead.assignedTo"
          class="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
        >
          <i class="ph-bold ph-user text-indigo-600 text-xs"></i>
          {{ assignedToName }}
        </span>
        <span class="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold inline-flex items-center gap-1">
          <i class="ph-bold ph-folder text-xs text-slate-600"></i>
          {{ lead.status }}
        </span>
        <span :class="[temperatureScore.tempColor, 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold']">
          <i :class="['ph-bold', temperatureScore.tempIcon, 'text-xs']"></i>
          {{ temperatureScore.temperature || 'N/A' }}
        </span>
      </div>

      <!-- Interests -->
      <div v-if="interests.length > 0" class="flex flex-col gap-0.5 mt-1">
        <div
          v-for="(interest, idx) in interests.slice(0, 2)"
          :key="idx"
          class="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-md text-[11px] font-medium text-indigo-700 line-clamp-1"
        >
          <i class="ph-bold ph-star text-indigo-600 text-xs"></i>
          <span>{{ interest }}</span>
        </div>
        <div v-if="interests.length > 2" class="text-[10px] font-medium text-slate-400 px-2 py-0.5">
          +{{ interests.length - 2 }} interest{{ interests.length - 2 > 1 ? 's' : '' }}
        </div>
      </div>

      <!-- Value -->
      <div class="text-sm font-bold text-slate-900 mt-1">{{ formatCurrency(lead.value) }}</div>

      <!-- Action Buttons -->
      <div class="flex gap-1.5 flex-wrap mt-1.5 w-full">
        <button
          @click.stop="emit('edit-activity', lead.id)"
          title="Activity"
          class="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 active:bg-blue-200 transition-colors shadow-sm"
        >
          <i class="ph-bold ph-chat text-base"></i>
        </button>
        <button
          @click.stop="emit('edit-task', lead.id)"
          title="Task"
          :class="[
            'flex-1 flex items-center justify-center px-3 py-2 rounded-lg border transition-colors shadow-sm',
            isNoAction
              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
              : isNoTask
                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
          ]"
        >
          <i class="ph-bold ph-plus text-base"></i>
        </button>
        <a
          v-if="lead.phone"
          :href="`tel:${lead.phone.replace(/\\s+/g, '')}`"
          @click.stop
          title="Call"
          class="flex-1 flex items-center justify-center px-3 py-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-100 active:bg-orange-200 transition-colors shadow-sm"
        >
          <i class="ph-fill ph-phone text-base"></i>
        </a>
        <a
          v-if="lead.phone"
          :href="`https://wa.me/${lead.phone.replace(/\\D/g, '')}`"
          target="_blank"
          @click.stop
          title="WhatsApp"
          class="flex-1 flex items-center justify-center px-3 py-2 bg-green-50 text-green-600 rounded-lg border border-green-200 hover:bg-green-100 active:bg-green-200 transition-colors shadow-sm"
        >
          <i class="ph-fill ph-whatsapp-logo text-base"></i>
        </a>
      </div>

      <!-- Notes -->
      <div
        v-if="lead.notes"
        class="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded line-clamp-1 mt-1 truncate"
      >
        {{ lead.notes }}
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex gap-1.5 p-2 border-t border-slate-100 bg-slate-50 mt-auto">
      <button
        v-if="prevStatus"
        @click.stop="emit('move', lead.id, prevStatus)"
        title="Move left"
        class="flex items-center justify-center flex-1 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-300 active:bg-slate-400 transition-colors"
      >
        <i class="ph-bold ph-arrow-left text-xs"></i>
      </button>
      <div v-else class="flex-1"></div>

      <button
        v-if="nextStatus"
        @click.stop="emit('move', lead.id, nextStatus)"
        title="Move right"
        class="flex items-center justify-center flex-1 py-1.5 bg-primary/15 text-primary rounded text-xs font-semibold hover:bg-primary/25 active:bg-primary/35 transition-colors"
      >
        <i class="ph-bold ph-arrow-right text-xs"></i>
      </button>
      <div v-else class="flex-1"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Lead, LeadStatus } from '@/types'
import { useLeadScoring } from '@/composables/useLeadScoring'

const props = defineProps<{
  lead: Lead
  getUserName?: (id?: string) => string
}>()

const emit = defineEmits<{
  open: [id: string]
  'edit-activity': [id: string]
  'edit-task': [id: string]
  move: [id: string, status: LeadStatus]
}>()

const { getTemperatureScore, formatCurrency } = useLeadScoring()

const statusOrder: LeadStatus[] = ['New', 'Contacted', 'Proposal', 'Won', 'Lost']

const temperatureScore = computed(() => getTemperatureScore(props.lead))

const interests = computed(() => {
  if (!props.lead.interest) return []
  return props.lead.interest.split(',').map(i => i.trim()).filter(Boolean)
})

const assignedToName = computed(() => {
  if (!props.lead.assignedTo) return ''
  return props.getUserName?.(props.lead.assignedTo) || props.lead.assignedTo
})

const isActiveStage = computed(() => !['Won', 'Lost'].includes(props.lead.status))

const taskCount = computed(() => props.lead.tasks?.length || 0)

const hasPendingTask = computed(
  () => props.lead.tasks?.some(t => t.status === 'pending') ?? false
)

const isNoAction = computed(() => isActiveStage.value && taskCount.value === 0)

const isNoTask = computed(() => isActiveStage.value && taskCount.value > 0 && !hasPendingTask.value)

const currentStatusIndex = computed(() => {
  return statusOrder.indexOf(props.lead.status)
})

const prevStatus = computed(() => {
  const idx = currentStatusIndex.value
  return idx > 0 ? statusOrder[idx - 1] : null
})

const nextStatus = computed(() => {
  const idx = currentStatusIndex.value
  return idx < statusOrder.length - 1 ? statusOrder[idx + 1] : null
})
</script>
