<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Lead, Activity, ActivityType } from '@/types'

const props = defineProps<{
  leads: Lead[]
}>()

const emit = defineEmits<{
  (e: 'open-lead', leadId: string): void
}>()

// ── Filter tabs ──
const allActivityTypes: Array<{ key: string; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: 'ph-list' },
  { key: 'lead_created', label: 'Created', icon: 'ph-user-plus' },
  { key: 'message', label: 'Message', icon: 'ph-chat-text' },
  { key: 'task', label: 'Task', icon: 'ph-check-square' },
  { key: 'status_change', label: 'Status', icon: 'ph-arrows-left-right' },
  { key: 'note', label: 'Note', icon: 'ph-note-pencil' },
  { key: 'call', label: 'Call', icon: 'ph-phone-call' },
]

const activeFilter = ref<string>('all')
const searchQuery = ref('')

// ── Flatten activities with lead info ──
interface ActivityWithLead extends Activity {
  leadId: string
  leadName: string
  leadPhone: string
}

const allActivities = computed<ActivityWithLead[]>(() => {
  const result: ActivityWithLead[] = []
  for (const lead of props.leads) {
    if (!lead.activities) continue
    for (const act of lead.activities) {
      result.push({ ...act, leadId: lead.id, leadName: lead.name, leadPhone: lead.phone })
    }
  }
  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

const filteredActivities = computed(() => {
  let list = allActivities.value
  if (activeFilter.value !== 'all') {
    list = list.filter(a => a.type === activeFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(a =>
      a.leadName?.toLowerCase().includes(q) ||
      a.leadPhone?.includes(q) ||
      a.note?.toLowerCase().includes(q)
    )
  }
  return list
})

// ── Pagination ──
const pageSize = 20
const page = ref(1)
const paginatedActivities = computed(() => filteredActivities.value.slice(0, page.value * pageSize))

const loadMore = () => { page.value++ }

// ── Helpers ──
const activityConfig: Record<string, { icon: string; color: string }> = {
  lead_created:  { icon: 'ph-user-plus',    color: 'text-green-600 bg-green-100' },
  status_change: { icon: 'ph-arrows-left-right', color: 'text-blue-600 bg-blue-100' },
  assignment:    { icon: 'ph-user-switch',   color: 'text-purple-600 bg-purple-100' },
  task:          { icon: 'ph-check-square',  color: 'text-orange-600 bg-orange-100' },
  follow_up:     { icon: 'ph-bell',          color: 'text-yellow-600 bg-yellow-100' },
  field_update:  { icon: 'ph-pencil',        color: 'text-slate-600 bg-slate-100' },
  lost_reason:   { icon: 'ph-x-circle',      color: 'text-red-600 bg-red-100' },
  note:          { icon: 'ph-note-pencil',   color: 'text-sky-600 bg-sky-100' },
  call:          { icon: 'ph-phone-call',    color: 'text-emerald-600 bg-emerald-100' },
  message:       { icon: 'ph-chat-text',     color: 'text-indigo-600 bg-indigo-100' },
}

function getActivityIcon(type: string): string {
  return activityConfig[type]?.icon || 'ph-bell'
}

function getActivityColor(type: string): string {
  return activityConfig[type]?.color || 'text-slate-600 bg-slate-100'
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header -->
    <div class="px-4 sm:px-6 py-4 border-b border-slate-200 shrink-0">
      <h2 class="text-xl font-bold text-slate-800">Activity Log</h2>
      <p class="text-sm text-slate-500 mt-0.5">All activities across all leads</p>
    </div>

    <!-- Filters -->
    <div class="px-4 sm:px-6 py-3 border-b border-slate-200 space-y-3 shrink-0">
      <div class="relative">
        <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search activities..."
          class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </div>
      <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          v-for="f in allActivityTypes"
          :key="f.key"
          @click="activeFilter = f.key; page = 1"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition shrink-0"
          :class="activeFilter === f.key ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100'"
        >
          <i :class="'ph-bold ' + f.icon"></i>
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Activity List -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="paginatedActivities.length === 0" class="py-16 text-center">
        <i class="ph-bold ph-clock-countdown text-5xl text-slate-300 mb-3"></i>
        <p class="text-slate-500 font-medium">No activities found</p>
        <p class="text-xs text-slate-400 mt-1">Activities will appear here when leads are updated</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="act in paginatedActivities"
          :key="act.id"
          class="px-4 sm:px-6 py-3 hover:bg-slate-50 transition cursor-pointer"
          @click="emit('open-lead', act.leadId)"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              :class="getActivityColor(act.type)"
            >
              <i :class="'ph-bold ' + getActivityIcon(act.type)" class="text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-sm font-semibold text-slate-800 truncate">
                  {{ act.leadName || act.leadPhone }}
                </span>
                <span class="text-[10px] font-medium text-slate-400 uppercase">{{ act.type.replace(/_/g, ' ') }}</span>
              </div>
              <p class="text-sm text-slate-600 line-clamp-2" v-if="act.note">{{ act.note }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-slate-400">{{ formatTime(act.timestamp) }}</span>
                <span class="text-xs text-slate-300">·</span>
                <span class="text-xs text-slate-400">{{ act.createdBy }}</span>
              </div>
            </div>
            <i class="ph-bold ph-caret-right text-slate-300 mt-2 shrink-0"></i>
          </div>
        </div>
      </div>

      <div v-if="filteredActivities.length > paginatedActivities.length" class="px-4 sm:px-6 py-4 text-center">
        <button
          @click="loadMore"
          class="text-sm font-medium text-primary hover:text-primary/80 transition"
        >
          Show more ({{ filteredActivities.length - paginatedActivities.length }} remaining)
        </button>
      </div>
    </div>
  </div>
</template>
