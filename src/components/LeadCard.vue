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
    <div class="p-2 flex flex-col gap-1.5">
      <!-- Name + Badge -->
      <div class="flex justify-between items-start gap-1.5">
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <h3 class="font-bold text-slate-800 text-base leading-tight line-clamp-1">
            {{ lead.name || 'Unnamed Lead' }}
          </h3>
          <div v-if="lead.phone" class="flex items-center gap-1.5 text-xs text-slate-500">
            <i class="ph-bold ph-phone text-slate-400 text-[11px]"></i>
            <span class="font-medium">{{ lead.phone }}</span>
          </div>
          <div v-else class="text-xs text-slate-400 italic">
            No phone number
          </div>
        </div>
        <div class="flex gap-0.5 shrink-0">
          <span
            v-if="isNoAction"
            title="No Action - Needs task"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700"
          >
            <i class="ph-bold ph-warning-circle text-base"></i>
          </span>
          <span
            v-else-if="isNoTask"
            title="No pending tasks"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700"
          >
            <i class="ph-bold ph-warning text-base"></i>
          </span>
        </div>
      </div>

      <!-- Assigned To + Temperature + Value -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1 text-xs font-semibold flex-wrap">
          <span
            v-if="lead.assignedTo"
            class="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold inline-flex items-center gap-0.5 whitespace-nowrap"
          >
            <i class="ph-bold ph-user text-indigo-600 text-[10px]"></i>
            {{ assignedToName }}
          </span>
          <span :class="[temperatureScore.tempColor, 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold']">
            <i :class="['ph-bold', temperatureScore.tempIcon, 'text-[10px]']"></i>
            {{ temperatureScore.temperature || 'N/A' }}
          </span>
        </div>
        <div class="text-base font-bold text-slate-900 shrink-0">{{ formatCurrency(lead.value) }}</div>
      </div>

      <!-- Interests -->
      <div v-if="interests.length > 0" class="flex flex-col gap-0.5">
        <div
          v-for="(interest, idx) in interests.slice(0, 2)"
          :key="idx"
          class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-md text-[10px] font-medium text-indigo-700 line-clamp-1"
        >
          <i class="ph-bold ph-star text-indigo-600 text-[10px]"></i>
          <span class="truncate">{{ interest }}</span>
        </div>
        <div v-if="interests.length > 2" class="text-[9px] font-medium text-slate-400 px-1">
          +{{ interests.length - 2 }} more
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-1.5 flex-wrap w-full" :class="lead.status === 'Lost' ? 'pointer-events-none opacity-40' : ''">
        <button
          @click.stop="emit('edit-task', lead.id)"
          title="Task"
          :class="[
            'flex-1 flex items-center justify-center px-3 py-2.5 sm:py-2 rounded-lg border transition-colors min-h-[44px] sm:min-h-0',
            isNoAction
              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
              : isNoTask
                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
          ]"
        >
          <i class="ph-bold ph-plus text-xl sm:text-lg"></i>
        </button>
        <a
          v-if="lead.phone"
          :href="callHref"
          @click.stop
          title="Call"
          class="flex-1 flex items-center justify-center px-3 py-2.5 sm:py-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-100 active:bg-orange-200 transition-colors min-h-[44px] sm:min-h-0"
        >
          <i class="ph-fill ph-phone text-xl sm:text-lg"></i>
        </a>
        <a
          v-if="lead.phone"
          :href="whatsappHref"
          target="_blank"
          @click.stop
          title="WhatsApp"
          class="flex-1 flex items-center justify-center px-3 py-2.5 sm:py-2 bg-green-50 text-green-600 rounded-lg border border-green-200 hover:bg-green-100 active:bg-green-200 transition-colors min-h-[44px] sm:min-h-0"
        >
          <i class="ph-fill ph-whatsapp-logo text-xl sm:text-lg"></i>
        </a>
      </div>

      <!-- Notes -->
      <div
        v-if="lead.notes"
        class="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded line-clamp-1 truncate"
      >
        {{ lead.notes }}
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex gap-1.5 p-1.5 border-t border-slate-100 bg-slate-50">
      <button
        v-if="prevStatus"
        @click.stop="emit('move', lead.id, prevStatus)"
        title="Move left"
        class="flex items-center justify-center flex-1 py-2 sm:py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 active:bg-slate-400 transition-colors min-h-[40px] sm:min-h-0"
      >
        <i class="ph-bold ph-arrow-left text-sm"></i>
      </button>
      <div v-else class="flex-1"></div>

      <button
        v-if="nextStatus"
        @click.stop="emit('move', lead.id, nextStatus)"
        title="Move right"
        class="flex items-center justify-center flex-1 py-2 sm:py-1.5 bg-primary/15 text-primary rounded-lg text-xs font-semibold hover:bg-primary/25 active:bg-primary/35 transition-colors min-h-[40px] sm:min-h-0"
      >
        <i class="ph-bold ph-arrow-right text-sm"></i>
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
  if (idx >= statusOrder.length - 1) return null
  
  const next = statusOrder[idx + 1]
  // Prevent moving to Lost via navigation buttons
  // Lost status requires Lost Reason Modal
  if (next === 'Lost') return null
  
  return next
})

const cleanPhone = computed(() => (props.lead.phone || '').replace(/\D/g, ''))
const whatsappHref = computed(() => `https://wa.me/${cleanPhone.value}`)
const callHref = computed(() => `tel:+${cleanPhone.value}`)
</script>
