<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Lead, Task } from '@/types'

const props = defineProps<{
  leads: Lead[]
}>()

const emit = defineEmits<{
  (e: 'open-lead', leadId: string): void
}>()

// ── Filter tabs ──
const activeFilter = ref<'all' | 'pending' | 'completed'>('all')
const searchQuery = ref('')

// ── Flatten tasks with lead info ──
interface TaskWithLead extends Task {
  leadId: string
  leadName: string
  leadPhone: string
}

const allTasks = computed<TaskWithLead[]>(() => {
  const result: TaskWithLead[] = []
  for (const lead of props.leads) {
    if (!lead.tasks) continue
    for (const task of lead.tasks) {
      result.push({ ...task, leadId: lead.id, leadName: lead.name, leadPhone: lead.phone })
    }
  }
  return result.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })
})

const filteredTasks = computed(() => {
  let list = allTasks.value
  if (activeFilter.value === 'pending') {
    list = list.filter(t => t.status === 'pending')
  } else if (activeFilter.value === 'completed') {
    list = list.filter(t => t.status === 'completed')
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.leadName?.toLowerCase().includes(q) ||
      t.leadPhone?.includes(q)
    )
  }
  return list
})

const pendingCount = computed(() => allTasks.value.filter(t => t.status === 'pending').length)
const completedCount = computed(() => allTasks.value.filter(t => t.status === 'completed').length)

// ── Toggle task status (optimistic update) ──
const togglingTasks = ref<Set<string>>(new Set())

async function toggleTask(task: TaskWithLead) {
  if (togglingTasks.value.has(task.id)) return
  togglingTasks.value.add(task.id)

  const newStatus = task.status === 'completed' ? 'pending' : 'completed'
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : undefined

  try {
    const { api } = await import('@/services/api')
    await api.put(`/leads/${task.leadId}/tasks/${task.id}`, {
      status: newStatus,
      completedAt,
    })
    task.status = newStatus as Task['status']
    if (completedAt) task.completedAt = completedAt
    else task.completedAt = undefined
  } catch (err) {
    console.error('Failed to toggle task:', err)
  } finally {
    togglingTasks.value.delete(task.id)
  }
}

// ── Due date helpers ──
function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) < today
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header -->
    <div class="px-4 sm:px-6 py-4 border-b border-slate-200 shrink-0">
      <h2 class="text-xl font-bold text-slate-800">Task Manager</h2>
      <p class="text-sm text-slate-500 mt-0.5">
        {{ pendingCount }} pending · {{ completedCount }} completed
      </p>
    </div>

    <!-- Filters -->
    <div class="px-4 sm:px-6 py-3 border-b border-slate-200 space-y-3 shrink-0">
      <div class="relative">
        <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tasks..."
          class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </div>
      <div class="flex gap-1.5">
        <button
          @click="activeFilter = 'all'"
          class="px-3 py-1.5 text-xs font-medium rounded-lg transition"
          :class="activeFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100'"
        >All ({{ allTasks.length }})</button>
        <button
          @click="activeFilter = 'pending'"
          class="px-3 py-1.5 text-xs font-medium rounded-lg transition"
          :class="activeFilter === 'pending' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'"
        >Pending ({{ pendingCount }})</button>
        <button
          @click="activeFilter = 'completed'"
          class="px-3 py-1.5 text-xs font-medium rounded-lg transition"
          :class="activeFilter === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'"
        >Completed ({{ completedCount }})</button>
      </div>
    </div>

    <!-- Task List -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="filteredTasks.length === 0" class="py-16 text-center">
        <i class="ph-bold ph-check-square text-5xl text-slate-300 mb-3"></i>
        <p class="text-slate-500 font-medium">No tasks found</p>
        <p class="text-xs text-slate-400 mt-1">Tasks will appear here when created on leads</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="px-4 sm:px-6 py-3 hover:bg-slate-50 transition group"
          :class="{ 'opacity-60': task.status === 'completed' }"
        >
          <div class="flex items-start gap-3">
            <!-- Checkbox toggle -->
            <button
              @click="toggleTask(task)"
              class="mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition"
              :class="task.status === 'completed'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 hover:border-primary group-hover:border-primary/50'"
              :disabled="togglingTasks.has(task.id)"
            >
              <i v-if="task.status === 'completed'" class="ph-bold ph-check text-xs"></i>
              <i v-else-if="togglingTasks.has(task.id)" class="ph-bold ph-circle-notch text-xs animate-spin text-primary"></i>
            </button>

            <div class="flex-1 min-w-0" @click="emit('open-lead', task.leadId)">
              <div class="flex items-center gap-2 mb-0.5">
                <span
                  class="text-sm font-semibold"
                  :class="task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'"
                >{{ task.title }}</span>
                <span
                  v-if="task.priority === 'high' || task.priority === 'critical'"
                  class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                  :class="task.priority === 'critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'"
                >{{ task.priority }}</span>
              </div>
              <p class="text-xs text-slate-500 mb-1" v-if="task.leadName">
                <i class="ph-bold ph-user text-[10px]"></i> {{ task.leadName }}
                <span class="text-slate-300">·</span>
                <span class="text-slate-400">{{ task.leadPhone }}</span>
              </p>
              <div class="flex items-center gap-2 text-xs">
                <span
                  v-if="task.dueDate"
                  class="flex items-center gap-1"
                  :class="isOverdue(task.dueDate) && task.status !== 'completed' ? 'text-red-500 font-semibold' : 'text-slate-400'"
                >
                  <i class="ph-bold ph-calendar-blank text-[10px]"></i>
                  {{ formatDate(task.dueDate) }}
                  <span v-if="isOverdue(task.dueDate) && task.status !== 'completed'" class="text-red-500">
                    ({{ Math.abs(daysUntil(task.dueDate)) }}d overdue)
                  </span>
                  <span v-else-if="daysUntil(task.dueDate) <= 3 && daysUntil(task.dueDate) > 0 && task.status !== 'completed'" class="text-amber-500">
                    ({{ daysUntil(task.dueDate) }}d left)
                  </span>
                </span>
                <span v-if="task.assignedTo" class="text-slate-400">
                  <i class="ph-bold ph-user-circle text-[10px]"></i> {{ task.assignedTo }}
                </span>
              </div>
            </div>

            <i class="ph-bold ph-caret-right text-slate-300 mt-2 shrink-0"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
