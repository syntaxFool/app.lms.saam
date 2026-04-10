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
               md:-translate-x-1/2 md:-translate-y-1/2 md:w-[640px] md:max-w-[90vw]
               bg-white rounded-t-3xl md:rounded-2xl shadow-2xl z-[70]
               max-h-[85vh] flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <i class="ph-bold ph-funnel text-xl text-primary"></i>
            <h2 class="text-lg font-bold text-slate-900">Filter Leads</h2>
          </div>
          <button 
            @click="emit('close')"
            class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <i class="ph-bold ph-x text-xl text-slate-600"></i>
          </button>
        </div>
        
        <!-- Scrollable Filter Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Section: Core Filters -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Core Filters</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Status Filter -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  v-model="localFilters.status"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
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
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Temperature</label>
                <select
                  v-model="localFilters.temperature"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
                >
                  <option value="">All Temperature</option>
                  <option value="Hot">🔴 Hot</option>
                  <option value="Warm">🟠 Warm</option>
                  <option value="Cold">🔵 Cold</option>
                </select>
              </div>

              <!-- Assigned To Filter (Hidden for agents) -->
              <div v-if="authStore.canFilterByAssignedTo" class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Assigned To</label>
                <select
                  v-model="localFilters.assigned"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
                >
                  <option value="">All Agents</option>
                  <option value="__unassigned__">Unassigned</option>
                  <option v-for="agent in agents" :key="agent.id" :value="agent.username">
                    {{ agent.name || agent.username }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Section: Lead Details -->
          <div class="space-y-3 mt-6">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Lead Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Source Filter -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
                <select
                  v-model="localFilters.source"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
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
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Interest</label>
                <select
                  v-model="localFilters.interest"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
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
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                <select
                  v-model="localFilters.location"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
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
            </div>
          </div>
          
          <!-- Section: Date & Value -->
          <div class="space-y-3 mt-6">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Date & Value Filters</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Follow-up Date From -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Follow-up From</label>
                <input
                  v-model="localFilters.followUpDateFrom"
                  type="date"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
                />
              </div>

              <!-- Follow-up Date To -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Follow-up To</label>
                <input
                  v-model="localFilters.followUpDateTo"
                  type="date"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
                />
              </div>

              <!-- Min Value -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Minimum Value (₹)</label>
                <input
                  v-model.number="localFilters.minValue"
                  type="number"
                  placeholder="0"
                  min="0"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg 
                         focus:ring-2 focus:ring-primary focus:border-primary transition-all 
                         text-sm outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer Actions -->
        <div class="p-4 border-t border-slate-200 flex gap-3 shrink-0 bg-slate-50">
          <button
            @click="handleClear"
            class="flex-1 py-3 px-4 border-2 border-slate-300 text-slate-700 rounded-lg 
                   hover:bg-slate-100 transition-colors text-sm font-semibold
                   flex items-center justify-center gap-2"
          >
            <i class="ph-bold ph-x-circle text-base"></i>
            Clear All
          </button>
          <button
            @click="handleApply"
            class="flex-1 py-3 px-4 bg-primary text-white rounded-lg 
                   hover:bg-primary/90 transition-colors text-sm font-semibold
                   flex items-center justify-center gap-2 shadow-sm"
          >
            <i class="ph-bold ph-check-circle text-base"></i>
            Apply Filters
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

interface FilterState {
  status: string
  temperature: string
  assigned: string
  source: string
  interest: string
  location: string
  followUpDateFrom: string
  followUpDateTo: string
  minValue: number
}

interface Agent {
  id: number
  username: string
  name?: string
}

const props = defineProps<{
  isOpen: boolean
  filters: FilterState
  agents: Agent[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply', filters: FilterState): void
  (e: 'clear'): void
}>()

// Local filter state (edited in sheet before applying)
const localFilters = ref<FilterState>({ ...props.filters })

// Watch for filter prop changes (when parent updates)
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { deep: true })

// Watch for sheet opening to reset local state
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    localFilters.value = { ...props.filters }
  }
})

const handleApply = () => {
  emit('apply', { ...localFilters.value })
  emit('close')
}

const handleClear = () => {
  localFilters.value = {
    status: '',
    temperature: '',
    assigned: '',
    source: '',
    interest: '',
    location: '',
    followUpDateFrom: '',
    followUpDateTo: '',
    minValue: 0
  }
  emit('clear')
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
