<template>
  <div class="space-y-3">
    <!-- No Tasks Message -->
    <div v-if="!lead?.tasks || lead.tasks.length === 0" class="text-center text-slate-400 py-8">
      <p>No tasks yet</p>
    </div>

    <!-- Task Items -->
    <div
      v-for="(task, idx) in lead?.tasks"
      :key="task.id"
      @click="emit('open-detail', lead!.id, idx)"
      class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 transition"
    >
      <div class="flex-1 min-w-0">
        <!-- Task Title -->
        <p class="font-semibold text-slate-700 break-words">{{ task.title }}</p>

        <!-- Task Note -->
        <p v-if="task.note" class="text-xs text-slate-600 mt-1 break-words">{{ task.note }}</p>

        <!-- Task Metadata -->
        <div class="flex gap-3 items-center mt-2 text-xs text-slate-500">
          <span
            :class="[
              'px-2 py-1 rounded-full font-medium',
              task.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : task.status === 'dropped'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
            ]"
          >
            {{ task.status || 'pending' }}
          </span>
          <span v-if="task.dueDate">{{ formatDate(task.dueDate) }}</span>
        </div>
      </div>

      <!-- Delete Button -->
      <button
        @click.stop="emit('delete', lead!.id, idx)"
        class="text-slate-400 hover:text-red-500 transition p-1 shrink-0"
        title="Delete task"
      >
        <i class="ph ph-trash text-lg"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Lead } from '@/types'
import { useFollowUpTracking } from '@/composables/useFollowUpTracking'

const props = defineProps<{
  lead: Lead | null
}>()

const emit = defineEmits<{
  'open-detail': [leadId: string, taskIndex: number]
  delete: [leadId: string, taskIndex: number]
}>()

const { formatDate } = useFollowUpTracking()
</script>
