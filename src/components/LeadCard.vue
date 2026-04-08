<template>
  <!-- Normal View (Full Card) -->
  <div
    v-if="viewMode === 'normal'"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    class="bg-white rounded-xl shadow-sm border-l-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
    :class="[
      isNoAction ? 'border-red-300 border-r border-t border-b bg-red-50/30' : isNoTask ? 'border-amber-300 border-r border-t border-b bg-amber-50/30' : 'border-slate-100 border-r border-t border-b',
      lead.status === 'Lost' ? 'grayscale opacity-60' : '',
      temperatureScore.borderColor,
      { 'ring-2 ring-primary ring-offset-2': isLongPressing }
    ]"
  >
    <!-- Card Header -->
    <div class="p-1.5 md:p-2 flex flex-col gap-1">
      <!-- Name + Badge -->
      <div class="flex justify-between items-start gap-1.5">
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <h3 class="font-bold text-slate-800 text-base leading-tight line-clamp-1">
            {{ lead.name || 'Unnamed Lead' }}
          </h3>
          <div v-if="lead.phone" class="flex items-center gap-1 text-xs text-slate-500">
            <i class="ph-bold ph-phone text-slate-400 text-[10px]"></i>
            <span class="font-medium">{{ lead.phone }}</span>
          </div>
          <div v-else class="text-xs text-slate-400 italic">
            No phone
          </div>
        </div>
        <div class="flex gap-0.5 shrink-0">
          <span
            v-if="isNoAction"
            title="No Action - Needs task"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 animate-pulse"
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

      <!-- Assigned To + Value -->
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1 text-xs font-semibold flex-wrap">
          <span
            v-if="lead.assignedTo"
            class="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold inline-flex items-center gap-0.5 whitespace-nowrap"
          >
            <i class="ph-bold ph-user text-indigo-600 text-[10px]"></i>
            {{ assignedToName }}
          </span>
        </div>
        <div class="text-lg font-bold shrink-0" :class="lead.value > 0 ? 'text-emerald-600' : 'text-slate-400'">{{ formatCurrency(lead.value) }}</div>
      </div>

      <!-- Interests - Hidden on mobile for density -->
      <div v-if="interests.length > 0" class="hidden md:flex flex-col gap-0.5">
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

      <!-- Primary Action Button -->
      <button
        @click.stop="emit('edit-task', lead.id)"
        title="Add Task"
        :class="[
          'w-full flex items-center justify-center gap-1 px-2 py-2 sm:py-1.5 rounded-lg border transition-colors min-h-[42px] sm:min-h-0',
          isNoAction
            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
            : isNoTask
              ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
              : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
          lead.status === 'Lost' ? 'pointer-events-none opacity-40' : ''
        ]"
      >
        <i class="ph-bold ph-plus text-lg"></i>
        <span class="text-xs font-semibold">Add Task</span>
      </button>

      <!-- Notes - Hidden on mobile for density -->
      <div
        v-if="lead.notes"
        class="hidden md:block text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded line-clamp-1 truncate"
      >
        {{ lead.notes }}
      </div>
    </div>
  </div>

  <!-- Compact View -->
  <div
    v-else-if="viewMode === 'compact'"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    class="bg-white rounded-lg shadow-sm border-l-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.99] p-2"
    :class="[
      lead.status === 'Lost' ? 'grayscale opacity-60' : '',
      temperatureScore.borderColor,
      { 'ring-2 ring-primary ring-offset-2': isLongPressing }
    ]"
  >
    <div class="flex items-center justify-between gap-2">
      <!-- Name & Badge -->
      <div class="flex-1 min-w-0 flex items-center gap-1.5">
        <h3 class="font-bold text-slate-800 text-sm truncate">{{ lead.name || 'Unnamed' }}</h3>
        <span
          v-if="isNoAction"
          class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 animate-pulse shrink-0"
        >
          <i class="ph-bold ph-warning-circle text-xs"></i>
        </span>
        <span
          v-else-if="isNoTask"
          class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 shrink-0"
        >
          <i class="ph-bold ph-warning text-xs"></i>
        </span>
      </div>
      <!-- Value -->
      <div class="text-sm font-bold shrink-0" :class="lead.value > 0 ? 'text-emerald-600' : 'text-slate-400'">
        {{ formatCurrency(lead.value) }}
      </div>
      <!-- Quick Action Button -->
      <button
        @click.stop="emit('edit-task', lead.id)"
        :class="[
          'p-1.5 rounded-lg border transition-colors shrink-0',
          isNoAction
            ? 'bg-red-50 text-red-600 border-red-200'
            : isNoTask
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-purple-50 text-purple-600 border-purple-200'
        ]"
      >
        <i class="ph-bold ph-plus text-base"></i>
      </button>
    </div>
  </div>

  <!-- List View -->
  <div
    v-else-if="viewMode === 'list'"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    class="bg-white border-l-4 cursor-pointer transition-all hover:bg-slate-50 active:bg-slate-100 px-2 py-1.5 flex items-center gap-2"
    :class="[
      lead.status === 'Lost' ? 'grayscale opacity-60' : '',
      temperatureScore.borderColor,
      { 'ring-2 ring-primary ring-offset-2': isLongPressing }
    ]"
  >
    <!-- Name -->
    <div class="flex-1 min-w-0">
      <h3 class="font-semibold text-slate-800 text-xs truncate">{{ lead.name || 'Unnamed' }}</h3>
    </div>
    <!-- Phone -->
    <div v-if="lead.phone" class="text-[10px] text-slate-500 w-20 truncate shrink-0">{{ lead.phone }}</div>
    <div v-else class="text-[10px] text-slate-400 italic w-20 shrink-0">No phone</div>
    <!-- Value -->
    <div class="text-xs font-bold w-16 text-right shrink-0" :class="lead.value > 0 ? 'text-emerald-600' : 'text-slate-400'">
      {{ formatCurrency(lead.value) }}
    </div>
    <!-- Badge -->
    <div class="w-5 shrink-0">
      <span
        v-if="isNoAction"
        class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 animate-pulse"
      >
        <i class="ph-bold ph-warning-circle text-[10px]"></i>
      </span>
      <span
        v-else-if="isNoTask"
        class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700"
      >
        <i class="ph-bold ph-warning text-[10px]"></i>
      </span>
    </div>
    <!-- Actions -->
    <div class="flex gap-1 shrink-0">
      <button
        @click.stop="emit('edit-task', lead.id)"
        :class="[
          'p-1 rounded border transition-colors',
          isNoAction ? 'bg-red-50 text-red-600 border-red-200' : isNoTask ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-purple-50 text-purple-600 border-purple-200'
        ]"
      >
        <i class="ph-bold ph-plus text-xs"></i>
      </button>
      <a
        v-if="lead.phone"
        :href="whatsappHref"
        target="_blank"
        @click.stop
        class="p-1 bg-green-50 text-green-600 rounded border border-green-200"
      >
        <i class="ph-fill ph-whatsapp-logo text-xs"></i>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, withDefaults } from 'vue'
import type { Lead, LeadStatus } from '@/types'
import { useLeadScoring } from '@/composables/useLeadScoring'

const props = withDefaults(
  defineProps<{
    lead: Lead
    getUserName?: (id?: string) => string
    viewMode?: 'normal' | 'compact' | 'list'
  }>(),
  {
    viewMode: 'normal'
  }
)

const emit = defineEmits<{
  open: [id: string]
  'edit-activity': [id: string]
  'edit-task': [id: string]
  move: [id: string, status: LeadStatus]
  'long-press': [lead: Lead]
}>()

const { getTemperatureScore, formatCurrency } = useLeadScoring()

// Long-press state
const isLongPressing = ref(false)
const longPressTimer = ref<number | null>(null)

// Right-click handler for desktop
function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  emit('long-press', props.lead)
}

// Long-press handlers for mobile
function handleTouchStart(e: TouchEvent) {
  isLongPressing.value = false
  longPressTimer.value = window.setTimeout(() => {
    isLongPressing.value = true
    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
    emit('long-press', props.lead)
  }, 500) // 500ms long-press threshold
}

function handleTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  isLongPressing.value = false
}

function handleTouchCancel() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  isLongPressing.value = false
}

function handleClick() {
  // Only emit open if it wasn't a long-press
  if (!isLongPressing.value) {
    emit('open', props.lead.id)
  }
}

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
