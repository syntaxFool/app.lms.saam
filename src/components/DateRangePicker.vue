<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" 
        @click="emit('close')"
      ></div>
    </Transition>
    
    <!-- Sheet/Modal -->
    <Transition name="slide-up">
      <div 
        v-if="isOpen" 
        class="fixed bottom-0 inset-x-0 md:bottom-auto md:top-1/2 md:left-1/2 
               md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-w-[90vw]
               bg-white rounded-t-3xl md:rounded-2xl shadow-2xl z-[70]
               max-h-[85vh] flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <i class="ph-bold ph-calendar text-xl text-primary"></i>
            <h2 class="text-lg font-bold text-slate-900">Select Date Range</h2>
          </div>
          <button 
            @click="emit('close')"
            class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <i class="ph-bold ph-x text-xl text-slate-600"></i>
          </button>
        </div>
        
        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Quick Presets -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Quick Filters</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                v-for="preset in presets"
                :key="preset.value"
                @click="selectPreset(preset.value)"
                class="px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-semibold"
                :class="localPreset === preset.value 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-slate-300 hover:border-slate-400 text-slate-700'"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
          
          <!-- Custom Range -->
          <div class="space-y-3 mt-6">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Custom Range</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">From Date</label>
                <input
                  v-model="localStartDate"
                  type="date"
                  @change="localPreset = 'custom'"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">To Date</label>
                <input
                  v-model="localEndDate"
                  type="date"
                  @change="localPreset = 'custom'"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
                />
              </div>
            </div>
          </div>
          
          <!-- Comparison Toggle -->
          <div class="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="localCompareMode"
                type="checkbox"
                class="w-5 h-5 rounded border-slate-300 text-primary 
                       focus:ring-2 focus:ring-primary cursor-pointer"
              />
              <div class="flex-1">
                <div class="text-sm font-semibold text-slate-800">Compare to previous period</div>
                <div class="text-xs text-slate-500 mt-0.5">
                  Show change vs {{ getComparisonPeriodLabel() }}
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- Footer Actions -->
        <div class="p-4 border-t border-slate-200 flex gap-3 shrink-0 bg-slate-50">
          <button
            @click="emit('close')"
            class="flex-1 py-3 px-4 border-2 border-slate-300 text-slate-700 rounded-lg 
                   hover:bg-slate-100 transition-colors text-sm font-semibold
                   flex items-center justify-center gap-2"
          >
            <i class="ph-bold ph-x text-base"></i>
            Cancel
          </button>
          <button
            @click="handleApply"
            class="flex-1 py-3 px-4 bg-primary text-white rounded-lg 
                   hover:bg-primary/90 transition-colors text-sm font-semibold
                   flex items-center justify-center gap-2 shadow-sm"
          >
            <i class="ph-bold ph-check text-base"></i>
            Apply
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface DateRange {
  startDate: string
  endDate: string
  preset: string
  compareMode: boolean
}

const props = defineProps<{
  isOpen: boolean
  startDate: string
  endDate: string
  preset: string
  compareMode: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply', range: DateRange): void
}>()

// Local state
const localStartDate = ref(props.startDate)
const localEndDate = ref(props.endDate)
const localPreset = ref(props.preset)
const localCompareMode = ref(props.compareMode)

// Preset options
const presets = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'this-year', label: 'This Year' },
  { value: 'all-time', label: 'All Time' }
]

// Watch for prop changes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    localStartDate.value = props.startDate
    localEndDate.value = props.endDate
    localPreset.value = props.preset
    localCompareMode.value = props.compareMode
  }
})

function selectPreset(preset: string) {
  localPreset.value = preset
  const dates = calculatePresetDates(preset)
  localStartDate.value = dates.startDate
  localEndDate.value = dates.endDate
}

function calculatePresetDates(preset: string): { startDate: string; endDate: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let startDate = new Date(today)
  let endDate = new Date(today)
  
  switch (preset) {
    case 'today':
      // Start and end are today
      break
      
    case 'yesterday':
      startDate.setDate(today.getDate() - 1)
      endDate.setDate(today.getDate() - 1)
      break
      
    case 'this-week':
      // Start from Sunday (week start)
      startDate.setDate(today.getDate() - today.getDay())
      break
      
    case 'last-week':
      startDate.setDate(today.getDate() - today.getDay() - 7)
      endDate.setDate(today.getDate() - today.getDay() - 1)
      break
      
    case 'this-month':
      startDate.setDate(1)
      break
      
    case 'last-month':
      startDate.setMonth(today.getMonth() - 1, 1)
      endDate = new Date(today.getFullYear(), today.getMonth(), 0)
      break
      
    case 'this-quarter':
      const currentQuarter = Math.floor(today.getMonth() / 3)
      startDate = new Date(today.getFullYear(), currentQuarter * 3, 1)
      break
      
    case 'this-year':
      startDate = new Date(today.getFullYear(), 0, 1)
      break
      
    case 'all-time':
      startDate = new Date(2020, 0, 1) // Arbitrary start date
      break
  }
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getComparisonPeriodLabel(): string {
  const start = new Date(localStartDate.value)
  const end = new Date(localEndDate.value)
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  switch (localPreset.value) {
    case 'today':
    case 'yesterday':
      return 'previous day'
    case 'this-week':
    case 'last-week':
      return 'previous week'
    case 'this-month':
    case 'last-month':
      return 'previous month'
    case 'this-quarter':
      return 'previous quarter'
    case 'this-year':
      return 'previous year'
    default:
      return `previous ${duration} days`
  }
}

function handleApply() {
  emit('apply', {
    startDate: localStartDate.value,
    endDate: localEndDate.value,
    preset: localPreset.value,
    compareMode: localCompareMode.value
  })
  emit('close')
}
</script>

<style scoped>
/* Fade transition for backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide up transition for sheet */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translate(-50%, -50%) scale(0.95);
    opacity: 0;
  }
  
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.2s ease;
  }
}
</style>
