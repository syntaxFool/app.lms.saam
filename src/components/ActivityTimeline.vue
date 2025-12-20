<template>
  <div v-if="lead?.activities && lead.activities.length > 0" class="space-y-0">
    <div
      v-for="activity in lead.activities"
      :key="activity.id"
      class="timeline-item relative pl-8 py-4 border-l-2 border-primary border-opacity-30 hover:bg-slate-50 rounded px-2 transition-colors"
    >
      <!-- Timeline Icon -->
      <div class="absolute left-0 top-4 w-6 h-6 flex items-center justify-center text-lg">
        {{ getActivityIcon(activity.type) }}
      </div>

      <!-- Activity Content -->
      <div class="flex flex-col gap-1">
        <div class="text-xs text-slate-500">{{ formatDateTime(activity.timestamp) }}</div>
        <div class="text-sm font-medium text-slate-800">{{ formatActivityType(activity.type) }}</div>
        <div v-if="activity.note" class="text-sm text-slate-700 mt-1">{{ activity.note }}</div>
        <div class="text-xs text-slate-400 mt-1">
          {{ activity.createdBy }}
          <span v-if="activity.role" class="text-slate-500">({{ activity.role }})</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-slate-400 text-sm text-center py-8">No activity yet.</div>
</template>

<script setup lang="ts">
import type { Lead, ActivityType } from '@/types'
import { useFollowUpTracking } from '@/composables/useFollowUpTracking'

const props = defineProps<{
  lead: Lead | null
}>()

const { formatDate } = useFollowUpTracking()

const activityIcons: Record<ActivityType, string> = {
  lead_created: '✨',
  status_change: '📊',
  assignment: '👤',
  task: '✅',
  follow_up: '📅',
  field_update: '✏️',
  lost_reason: '❌'
}

const activityLabels: Record<ActivityType, string> = {
  lead_created: 'Lead Created',
  status_change: 'Status Changed',
  assignment: 'Assignment',
  task: 'Task',
  follow_up: 'Follow Up',
  field_update: 'Field Updated',
  lost_reason: 'Lost Reason'
}

function getActivityIcon(type: ActivityType): string {
  return activityIcons[type] || '📌'
}

function formatActivityType(type: ActivityType): string {
  return activityLabels[type] || type.replace(/_/g, ' ').toUpperCase()
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    let hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours || 12
    const hoursStr = String(hours).padStart(2, '0')
    return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`
  } catch {
    return dateString
  }
}
</script>
