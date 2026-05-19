# Activity & Task Sidebar Navs — Implementation Plan

**Date:** 2026-05-19  
**Status:** Draft

## Goal

Add two new navigation items below the "Views" section in the sidebar:
- **Activity** — a global activity log view showing recent activities across all leads
- **Task** — a global task manager view showing all tasks across all leads

## Architecture

```
SideMenu.vue (add 2 buttons)
  └─ emit('view-change', 'activity') → LeadsManager.vue
       └─ currentView = 'activity' → <ActivityLogView /> component
  └─ emit('view-change', 'task') → LeadsManager.vue
       └─ currentView = 'task' → <TaskManagerView /> component
```

No new routes needed — uses existing client-side view switching pattern (same as kanban/table/reports).

## Files to Create/Modify

| # | File | Action | What |
|---|------|--------|------|
| 1 | `src/components/SideMenu.vue` | **Modify** | Add Activity + Task buttons below Views section |
| 2 | `src/views/ActivityLog.vue` | **Create** | Activity log view (filters, timeline, search) |
| 3 | `src/views/TaskManager.vue` | **Create** | Task manager view (filters, status, assign) |
| 4 | `src/views/LeadsManager.vue` | **Modify** | Add `v-else-if` blocks for the two new views |

## Task 1: Modify SideMenu.vue

Add a new section below "Views":

```html
<!-- Activity & Tasks — new section between Views and Quick Stats -->
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

No new emits needed — `view-change` already accepts any string.

## Task 2: Create ActivityLog.vue

A view showing **all activities across all leads**, with filtering.

**Props:** `leads` (from leadsStore)  
**Features:**
- Title: "Activity Log"
- Filter tabs: All | Created | Message | Task | Status Change | Note | WhatsApp
- Search by lead name/phone or activity note
- Infinite scroll paginated list (20 per load)
- Each row shows: icon + lead name + activity note + timestamp + created by
- Clicking a row navigates to that lead (emits `open-lead` event)
- Empty state: "No activities yet" with icon

**Data source:** Computed from `leadsStore.leads` → flatten all `lead.activities` with lead info attached, sorted by timestamp DESC.

## Task 3: Create TaskManager.vue

A view showing **all tasks across all leads**, with filtering.

**Props:** `leads` (from leadsStore)  
**Features:**
- Title: "Task Manager"
- Filter tabs: All | Pending | Completed
- Sort: Due date (ascending) or created date (descending)
- Each row shows: checkbox (complete/incomplete) + task title + lead name + due date + assigned to
- Clicking checkbox toggles task status (calls API)
- Clicking the lead name opens that lead
- Empty state: "No tasks yet" with icon
- Overdue tasks highlighted in red

**Data source:** Computed from `leadsStore.leads` → flatten all `lead.tasks` with lead info attached.

## Task 4: Modify LeadsManager.vue

Add template blocks after the reports view:

```html
<!-- Activity Log View -->
<div v-else-if="currentView === 'activity'" class="h-full w-full overflow-hidden">
  <ActivityLog
    :leads="filteredLeads"
    @open-lead="openLead"
  />
</div>

<!-- Task Manager View -->
<div v-else-if="currentView === 'task'" class="h-full w-full overflow-hidden">
  <TaskManager
    :leads="filteredLeads"
    @open-lead="openLead"
  />
</div>
```

Import the new components.

## Estimated Effort

| Task | Effort | Complexity |
|------|--------|-----------|
| 1. SideMenu buttons | Tiny | Trivial |
| 2. ActivityLog view | Medium | Moderate |
| 3. TaskManager view | Medium | Moderate |
| 4. LeadsManager wiring | Small | Simple |

**Total:** ~2 hours
