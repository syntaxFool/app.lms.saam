# Activity & Task Views Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Add "Activity" and "Task" navigation items in the sidebar below "Views", with two new full-page views showing global activity logs and task management across all leads.

**Architecture:** Uses existing client-side view switching (`currentView` ref in LeadsManager), same pattern as kanban/table/reports. Two new Vue components (`ActivityLog.vue`, `TaskManager.vue`) compute their data from `leadsStore.leads` by flattening each lead's `activities` and `tasks` arrays with lead metadata attached. SideMenu.vue gets two new buttons.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Pinia stores, Tailwind CSS, Phosphor icons

---

## Tasks

### Task 1: Add Activity & Task buttons to SideMenu.vue

**TDD scenario:** Trivial template change — use judgment, no test needed.

**Files:**
- Modify: `src/components/SideMenu.vue:87`

**Step 1: Insert new "Timeline" section between Views and Quick Stats**

Insert after line 87 (closing `</div>` of Views section) and before line 89 (`<!-- Quick Stats -->`):

```html
          <!-- Timeline Section -->
          <div>
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <i class="ph-bold ph-clock-countdown"></i> Timeline
            </h3>
            <div class="space-y-1">
              <button
                @click="switchView('activity')"
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-activity text-lg"></i>
                <span class="font-medium">Activity</span>
              </button>
              <button
                @click="switchView('task')"
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-check-square text-lg"></i>
                <span class="font-medium">Task</span>
              </button>
            </div>
          </div>
```

No new emits needed — `view-change` emit accepts any string, and `switchView` already calls `emit('view-change', view)`.

**Step 2: Verify**

Open SideMenu in browser — both buttons should appear below Views, with correct icons.

**Step 3: Commit**

```bash
git add src/components/SideMenu.vue
git commit -m "feat(sidebar): add Activity and Task nav items below Views"
```

---

### Task 2: Create ActivityLog.vue

**TDD scenario:** New feature — use judgment; no existing test infrastructure.

**Files:**
- Create: `src/views/ActivityLog.vue`

**Step 1: Create the component**

Create `src/views/ActivityLog.vue` with the following structure:

```vue
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
      <!-- Search -->
      <div class="relative">
        <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search activities..."
          class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </div>
      <!-- Filter Tabs -->
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

      <!-- Load More -->
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
```

**Step 2: Commit**

```bash
git add src/views/ActivityLog.vue
git commit -m "feat(activity): add ActivityLog view with filters, search, pagination"
```

---

### Task 3: Create TaskManager.vue

**TDD scenario:** New feature — use judgment.

**Files:**
- Create: `src/views/TaskManager.vue`

**Step 1: Create the component**

Create `src/views/TaskManager.vue`:

```vue
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
    // Sort by due date ascending (null dates last)
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
```

**Step 2: Commit**

```bash
git add src/views/TaskManager.vue
git commit -m "feat(task): add TaskManager view with status toggle, filters, search"
```

---

### Task 4: Wire up new views in LeadsManager.vue

**TDD scenario:** Modifying existing file — verify existing views still work.

**Files:**
- Modify: `src/views/LeadsManager.vue:144` (after Reports view block)
- Modify: `src/views/LeadsManager.vue:515` (imports section)
- Modify: `src/views/LeadsManager.vue:645` (imports) or wherever component imports are

**Step 1: Import the two new components**

Add imports in the `<script>` section (near other component imports at ~line 515-535):

```typescript
import ActivityLog from '@/views/ActivityLog.vue'
import TaskManager from '@/views/TaskManager.vue'
```

The import section should look like:
```typescript
import KanbanBoard from '@/components/KanbanBoard.vue'
import LeadsTable from '@/components/LeadsTable.vue'
import ReportsView from '@/components/ReportsView.vue'
import ActivityLog from '@/views/ActivityLog.vue'      // ADD
import TaskManager from '@/views/TaskManager.vue'      // ADD
```

**Step 2: Add template blocks for the two new views**

After the Reports view block (after `</div>` at line ~148), before the `</main>` closing tag:

```html
      <!-- ACTIVITY VIEW -->
      <div v-else-if="currentView === 'activity'" class="h-full w-full overflow-hidden">
        <ActivityLog
          :leads="scopedLeads"
          @open-lead="editLead"
        />
      </div>

      <!-- TASK VIEW -->
      <div v-else-if="currentView === 'task'" class="h-full w-full overflow-hidden">
        <TaskManager
          :leads="scopedLeads"
          @open-lead="editLead"
        />
      </div>
```

**Step 3: Add mobile bottom nav buttons (optional)**

Add in the mobile bottom nav section (~line 161-176, after Reports button):

```html
<button
  @click="currentView = 'activity'; showMobileTabs = false"
  :class="['flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition w-14', currentView === 'activity' ? 'bg-slate-100 text-primary' : 'text-slate-600 hover:bg-slate-50']"
>
  <i class="ph-bold ph-activity text-lg"></i>
  <span class="text-[10px] font-medium">Activity</span>
</button>
<button
  @click="currentView = 'task'; showMobileTabs = false"
  :class="['flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition w-14', currentView === 'task' ? 'bg-slate-100 text-primary' : 'text-slate-600 hover:bg-slate-50']"
>
  <i class="ph-bold ph-check-square text-lg"></i>
  <span class="text-[10px] font-medium">Task</span>
</button>
```

**Step 4: Verify**

- Navigate between all 5 views (kanban, table, reports, activity, task) — each should render correctly
- ActivityLog: filter tabs work, search filters, infinite scroll
- TaskManager: filter tabs work, checkbox toggle updates API, overdue tasks show in red

**Step 5: Commit**

```bash
git add src/views/LeadsManager.vue
git commit -m "feat(views): wire up ActivityLog and TaskManager in LeadsManager"
```

---

## Task 5: Push master (optional)

If you want these changes on the server:

```bash
/git-guardrails allow-next push
git push origin master
```

Then Coolify auto-deploys.

---

## Summary

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | SideMenu buttons | `SideMenu.vue` | 2 min |
| 2 | ActivityLog view | `ActivityLog.vue` (NEW) | 15 min |
| 3 | TaskManager view | `TaskManager.vue` (NEW) | 15 min |
| 4 | LeadsManager wiring | `LeadsManager.vue` | 5 min |
| 5 | Push (optional) | — | 2 min |

**Total:** ~40 min
