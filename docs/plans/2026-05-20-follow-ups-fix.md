# Follow-ups Fix — Filtered Leads, Mandatory Fields & Notifications

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Fix Follow-ups sidebar (pending-tasks-only, exclude Won/Lost), sync pulse indicator to composable, make task resolution + task note + lost reason details mandatory, fix "Mark all read" not working in notifications.

**Architecture:** Six files. FollowUpsSidebar filteredLeads tightened. LeadsManager pulse returns to useFollowUpTracking composable. Three modals/fields enforce non-empty input. NotificationDropdown stores read state in a persistent reactive Set instead of ephemeral computed objects.

**Tech Stack:** Vue 3 (Composition API), Pinia, Tailwind CSS

---

## Tasks

### Task 1: Fix FollowUpsSidebar filteredLeads

**Files:** `src/components/FollowUpsSidebar.vue:226-232`

Old:
```typescript
const filteredLeads = computed(() => {
  let leads = leadsStore.leads.filter(lead => {
    const hasFollowUp = !!lead.followUpDate
    const hasPendingTasks = lead.tasks?.some(t => t.status === 'pending' && t.dueDate)
    return hasFollowUp || hasPendingTasks
  })
  ...
})
```

New:
```typescript
const filteredLeads = computed(() => {
  let leads = leadsStore.leads.filter(lead => {
    if (lead.status === 'Won' || lead.status === 'Lost') return false
    return lead.tasks?.some(t => t.status === 'pending' && t.dueDate) ?? false
  })
  ...
})
```

Commit: `fix(follow-ups): only show leads with pending tasks, exclude Won/Lost`

---

### Task 2: Sync LeadsManager pulse indicator with composable

**Files:** `src/views/LeadsManager.vue`

- Add import: `import { useFollowUpTracking } from '@/composables/useFollowUpTracking'` after line 265
- Delete inline `getEarliestDate` function (lines 289-302)
- Replace `urgentFollowUpsCount` computed (lines 312-324) with:
```typescript
const { isFollowUpOverdue, isFollowUpToday } = useFollowUpTracking()

const urgentFollowUpsCount = computed(() => {
  return leadsStore.leads.filter(lead =>
    lead.status !== 'Won' &&
    lead.status !== 'Lost' &&
    (isFollowUpOverdue(lead) || isFollowUpToday(lead))
  ).length
})
```

Commit: `fix(pulse): sync pulse indicator with useFollowUpTracking composable, exclude Won/Lost`

---

### Task 3: Make task resolution mandatory

**Files:** `src/components/TaskResolutionModal.vue`

- Line 33: `placeholder="Task resolution (optional)..."` → `placeholder="Describe what was done..."`
- Line 43: Add `:disabled="!resolution.trim()"` + `disabled:bg-slate-300 disabled:cursor-not-allowed` classes

Commit: `fix(task): make resolution mandatory before marking task complete`

---

### Task 4: Make lost reason details mandatory

**Files:** `src/components/LostReasonModal.vue`

- Lines 50-51: `(Optional)` → `<span class="text-red-500">*</span>`
- Line 79: `:disabled="!selectedReason"` → `:disabled="!selectedReason || !details.trim()"`

Commit: `fix(lost-reason): make additional details mandatory before marking lead as lost`

---

### Task 5: Make task note mandatory in LeadModal

**Files:** `src/components/LeadModal.vue` (around lines 445-465)

- Placeholder: `placeholder="Task note (optional)..."` → `placeholder="Describe the task..."`
- Button disabled: `:disabled="!newTaskTitle.trim() || isAddingTask"` → `:disabled="!newTaskTitle.trim() || !newTaskNote.trim() || isAddingTask"`

Commit: `fix(task): make task note mandatory before adding a task`

---

### Task 6: Fix "Mark all read" in NotificationDropdown

**Bug:** `localNotifications` is a computed that recreates objects with `read: false` every evaluation. `markAllAsRead()` sets `read = true` on the current array's objects, but next computed re-evaluation resets them to `false`. Read state is lost.

**Fix:** Store local read state in a persistent `reactive Set<string>`.

**Files:** `src/components/NotificationDropdown.vue`

Step 1 — Add import and state:
```typescript
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

// After const filters = [...]
const localReadState = reactive<Set<string>>(new Set())
```

Step 2 — In `localNotifications` computed, change all three `read: false` to check the Set:

In overdue follow-ups block (~line 220):
```typescript
read: localReadState.has(`overdue-${lead.id}`)
```

In upcoming follow-ups block (~line 243):
```typescript
read: localReadState.has(`upcoming-${lead.id}`)
```

In overdue tasks block (~line 258):
```typescript
read: localReadState.has(`task-${lead.id}-${task.id}`)
```

Step 3 — Replace `markAsRead`:
```typescript
function markAsRead(id: string) {
  localReadState.add(id)
}
```

Step 4 — Replace `markAllAsRead`:
```typescript
function markAllAsRead() {
  for (const n of localNotifications.value) {
    localReadState.add(n.id)
  }
  markAllServerRead()
}
```

Commit: `fix(notifications): persist read state in reactive Set so Mark all read works`

---

### Task 7: Build & verify

```bash
npm run build
npm run type-check
```

Checklist:
- [ ] Sidebar: only pending-task leads, no Won/Lost
- [ ] Pulse badge matches sidebar count
- [ ] "Mark Complete" disabled until resolution typed
- [ ] "Add Task" disabled until note typed
- [ ] "Mark as Lost" disabled until reason + details
- [ ] "Mark all read" clears badge + persists

Commit: `chore: final verification after follow-ups fix`

---

## Summary

| # | Task | File | Effort |
|---|------|------|--------|
| 1 | Fix filteredLeads | `FollowUpsSidebar.vue` | 3m |
| 2 | Sync pulse indicator | `LeadsManager.vue` | 5m |
| 3 | Mandatory task resolution | `TaskResolutionModal.vue` | 2m |
| 4 | Mandatory lost reason details | `LostReasonModal.vue` | 2m |
| 5 | Mandatory task note | `LeadModal.vue` | 2m |
| 6 | Fix Mark all read | `NotificationDropdown.vue` | 8m |
| 7 | Build & verify | — | 5m |

**Total:** ~27 minutes
