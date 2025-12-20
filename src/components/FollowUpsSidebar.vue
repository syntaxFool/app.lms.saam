<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-40 lg:relative lg:z-0">
      <!-- Backdrop (mobile only) -->
      <div class="lg:hidden absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="close"></div>

      <!-- Sidebar -->
      <div 
        :class="[
          'fixed lg:relative right-0 top-0 h-full bg-white border-l border-slate-200 shadow-xl lg:shadow-none transition-transform duration-300 z-50 flex flex-col',
          'w-80 lg:w-96',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        ]"
      >
        <!-- Header -->
        <div class="p-4 border-b border-slate-200 shrink-0">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i class="ph-bold ph-calendar-check text-primary"></i>
              Follow-ups
            </h3>
            <button @click="close" class="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <i class="ph-bold ph-x text-xl"></i>
            </button>
          </div>

          <!-- Agent Filter -->
          <select
            v-model="selectedAgent"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">All Agents</option>
            <option value="agent1">Agent 1</option>
            <option value="agent2">Agent 2</option>
          </select>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Overdue Section -->
          <div class="border-b border-slate-200">
            <button
              @click="toggleSection('overdue')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div class="flex items-center gap-2">
                <i class="ph-bold ph-warning-circle text-red-500"></i>
                <span class="font-semibold text-slate-800">Overdue</span>
                <span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {{ overdueLeads.length }}
                </span>
              </div>
              <i :class="['ph-bold', expandedSections.overdue ? 'ph-caret-up' : 'ph-caret-down', 'text-slate-400']"></i>
            </button>
            
            <div v-if="expandedSections.overdue" class="pb-2">
              <div v-if="overdueLeads.length === 0" class="px-4 py-6 text-center text-sm text-slate-400">
                No overdue follow-ups
              </div>
              <div
                v-for="lead in overdueLeads"
                :key="lead.id"
                @click="openLead(lead.id)"
                class="mx-2 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg hover:border-red-300 cursor-pointer transition"
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-semibold text-slate-800 text-sm">{{ lead.name }}</h4>
                  <span class="text-xs text-red-600 font-medium">{{ getDaysOverdue(lead.followUpDate!) }}</span>
                </div>
                <p class="text-xs text-slate-600 mb-2">{{ lead.phone }}</p>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 bg-white border border-red-200 rounded-full text-slate-700">
                    {{ lead.status }}
                  </span>
                  <span v-if="lead.assignedTo" class="text-xs text-slate-500">
                    {{ lead.assignedTo }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Today Section -->
          <div class="border-b border-slate-200">
            <button
              @click="toggleSection('today')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div class="flex items-center gap-2">
                <i class="ph-bold ph-calendar-dot text-orange-500"></i>
                <span class="font-semibold text-slate-800">Today</span>
                <span class="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {{ todayLeads.length }}
                </span>
              </div>
              <i :class="['ph-bold', expandedSections.today ? 'ph-caret-up' : 'ph-caret-down', 'text-slate-400']"></i>
            </button>
            
            <div v-if="expandedSections.today" class="pb-2">
              <div v-if="todayLeads.length === 0" class="px-4 py-6 text-center text-sm text-slate-400">
                No follow-ups for today
              </div>
              <div
                v-for="lead in todayLeads"
                :key="lead.id"
                @click="openLead(lead.id)"
                class="mx-2 mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg hover:border-orange-300 cursor-pointer transition"
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-semibold text-slate-800 text-sm">{{ lead.name }}</h4>
                  <span class="text-xs text-orange-600 font-medium">Today</span>
                </div>
                <p class="text-xs text-slate-600 mb-2">{{ lead.phone }}</p>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 bg-white border border-orange-200 rounded-full text-slate-700">
                    {{ lead.status }}
                  </span>
                  <span v-if="lead.assignedTo" class="text-xs text-slate-500">
                    {{ lead.assignedTo }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Upcoming Section -->
          <div>
            <button
              @click="toggleSection('upcoming')"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div class="flex items-center gap-2">
                <i class="ph-bold ph-calendar-blank text-blue-500"></i>
                <span class="font-semibold text-slate-800">Upcoming</span>
                <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {{ upcomingLeads.length }}
                </span>
              </div>
              <i :class="['ph-bold', expandedSections.upcoming ? 'ph-caret-up' : 'ph-caret-down', 'text-slate-400']"></i>
            </button>
            
            <div v-if="expandedSections.upcoming" class="pb-2">
              <div v-if="upcomingLeads.length === 0" class="px-4 py-6 text-center text-sm text-slate-400">
                No upcoming follow-ups
              </div>
              <div
                v-for="lead in upcomingLeads"
                :key="lead.id"
                @click="openLead(lead.id)"
                class="mx-2 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:border-blue-300 cursor-pointer transition"
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-semibold text-slate-800 text-sm">{{ lead.name }}</h4>
                  <span class="text-xs text-blue-600 font-medium">{{ getRelativeDate(lead.followUpDate!) }}</span>
                </div>
                <p class="text-xs text-slate-600 mb-2">{{ lead.phone }}</p>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 bg-white border border-blue-200 rounded-full text-slate-700">
                    {{ lead.status }}
                  </span>
                  <span v-if="lead.assignedTo" class="text-xs text-slate-500">
                    {{ lead.assignedTo }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import type { Lead } from '@/types'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'open-lead', leadId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const leadsStore = useLeadsStore()
const selectedAgent = ref('')
const expandedSections = ref({
  overdue: true,
  today: true,
  upcoming: true
})

// Filter leads by agent
const filteredLeads = computed(() => {
  let leads = leadsStore.leads.filter(lead => lead.followUpDate)
  if (selectedAgent.value) {
    leads = leads.filter(lead => lead.assignedTo === selectedAgent.value)
  }
  return leads
})

// Categorize leads by follow-up date
const overdueLeads = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return filteredLeads.value
    .filter(lead => {
      const followUpDate = new Date(lead.followUpDate!)
      followUpDate.setHours(0, 0, 0, 0)
      return followUpDate < today
    })
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
})

const todayLeads = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return filteredLeads.value
    .filter(lead => {
      const followUpDate = new Date(lead.followUpDate!)
      followUpDate.setHours(0, 0, 0, 0)
      return followUpDate.getTime() === today.getTime()
    })
})

const upcomingLeads = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  return filteredLeads.value
    .filter(lead => {
      const followUpDate = new Date(lead.followUpDate!)
      followUpDate.setHours(0, 0, 0, 0)
      return followUpDate > today && followUpDate <= nextWeek
    })
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
})

const toggleSection = (section: 'overdue' | 'today' | 'upcoming') => {
  expandedSections.value[section] = !expandedSections.value[section]
}

const getDaysOverdue = (dateStr: string): string => {
  const followUpDate = new Date(dateStr)
  const today = new Date()
  const diffTime = today.getTime() - followUpDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return `${diffDays}d overdue`
}

const getRelativeDate = (dateStr: string): string => {
  const followUpDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  followUpDate.setHours(0, 0, 0, 0)
  
  const diffTime = followUpDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `${diffDays}d`
  return followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const openLead = (leadId?: string) => {
  if (!leadId || leadId === 'undefined') return
  emit('open-lead', leadId)
}

const close = () => {
  emit('close')
}
</script>
