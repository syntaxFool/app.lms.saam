# Auto-Task Contact Buttons Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** When Call or WhatsApp buttons are clicked in the Contact tab, automatically log an activity and create a pending task with "Auto" prefix and 30-minute due date, with deduplication to skip if a matching pending task already exists.

**Architecture:** All logic lives in `LeadModal.vue` — two async click handlers (`handleCallClick`, `handleWhatsAppClick`) that call `leadsStore.addActivity()` and `leadsStore.addTask()`. No new files or dependencies. Deduplication checks `existingLead.value?.tasks` for a pending task with matching title prefix before creating the auto task.

**Tech Stack:** Vue 3 Composition API, TypeScript, Pinia store, Phosphor icons, MoonLoading composable

---

## Design Summary

| Aspect | Decision |
|--------|----------|
| Activity note | Includes phone number: `"Call initiated from Contact tab — +91 XXXXX XXXXX"` |
| Task title (Call) | `"Auto Task Call — {lead name}"` |
| Task title (WhatsApp) | `"Auto Task WhatsApp — {lead name}"` |
| Task note | `"Auto-generated follow-up after initiating {call WhatsApp message}"` |
| Due date | `now + 30 minutes` (ISO 8601) |
| Deduplication | Skip task creation if a pending task with matching title prefix exists |
| Offline / API fail | Link still opens, error logged to console |
| No confirmation dialog | Not needed — actions are non-destructive |

---

## Current State (pre-existing changes)

`LeadModal.vue` already has:
- Template: `<button>` tags replacing `<a>` tags for Call/WhatsApp with click handlers
- Template: moon loading animation with `isContactActionloading` ref
- Script: `contactMoon` composable, `isContactActionloading` ref
- Script: `handleCallClick` and `handleWhatsAppClick` async functions (basic version)

**What needs to change from current state:**
1. Activity notes: add phone number
2. Task titles: change to new format
3. Task notes: update wording
4. Add `dueDate` calculation (now + 30 min)
5. Add deduplication check before `addTask`

---

### Task 1: Refine `handleCallClick`

**TDD scenario:** Modifying tested code — manually verify behavior

**Files:**
- Modify: `src/components/LeadModal.vue` — `handleCallClick` function (around line 681)

**Step 1: Update activity note to include phone number**

Replace:
```ts
await leadsStore.addActivity(props.leadId, { type: 'call', note: 'Call initiated from Contact tab' })
```
With:
```ts
const phone = existingLead.value?.phone || formData.value.phone || ''
await leadsStore.addActivity(props.leadId, { type: 'call', note: `Call initiated from Contact tab — ${phone}` })
```

**Step 2: Add deduplication check before creating task**

Insert before the `await leadsStore.addTask(...)` line:
```ts
// Deduplication: skip if a pending "Auto Task Call" task already exists
const existingAutoTask = existingLead.value?.tasks?.find(
  t => t.status === 'pending' && t.title.startsWith('Auto Task Call —')
)
if (!existingAutoTask) {
  // create the task
}
```

**Step 3: Update task title and add due date**

Replace:
```ts
await leadsStore.addTask(props.leadId, { title: `Auto Call Back - ${leadName}`, note: 'Automatic follow-up task created after initiating call', status: 'pending' })
```
With:
```ts
const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
await leadsStore.addTask(props.leadId, {
  title: `Auto Task Call — ${leadName}`,
  note: 'Auto-generated follow-up after initiating call',
  dueDate,
  status: 'pending'
})
```

**Step 4: Final function should look like:**

```ts
const handleCallClick = async () => {
  if (!props.leadId || isContactActionloading.value) return
  isContactActionloading.value = 'call'
  contactMoon.start()
  try {
    const leadName = existingLead.value?.name || formData.value.name || 'Unknown'
    const phone = existingLead.value?.phone || formData.value.phone || ''
    // Log activity (always)
    await leadsStore.addActivity(props.leadId, {
      type: 'call',
      note: `Call initiated from Contact tab — ${phone}`
    })
    // Deduplication: skip if pending Auto Task Call already exists
    const existingAutoTask = existingLead.value?.tasks?.find(
      t => t.status === 'pending' && t.title.startsWith('Auto Task Call —')
    )
    if (!existingAutoTask) {
      const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      await leadsStore.addTask(props.leadId, {
        title: `Auto Task Call — ${leadName}`,
        note: 'Auto-generated follow-up after initiating call',
        dueDate,
        status: 'pending'
      })
    }
    window.location.href = callLink.value
  } catch (error) {
    console.error('Failed to log call:', error)
    window.location.href = callLink.value
  } finally {
    isContactActionloading.value = null
    contactMoon.stop()
  }
}
```

**Step 5: Verify with a git diff**

Run: `git diff src/components/LeadModal.vue`
Expected: Only `handleCallClick` block changed as described

---

### Task 2: Refine `handleWhatsAppClick`

**TDD scenario:** Modifying tested code — manually verify behavior

**Files:**
- Modify: `src/components/LeadModal.vue` — `handleWhatsAppClick` function (around line 699)

**Step 1: Update activity note to include phone number**

Replace:
```ts
await leadsStore.addActivity(props.leadId, { type: 'message', note: 'WhatsApp message initiated from Contact tab' })
```
With:
```ts
const phone = existingLead.value?.phone || formData.value.phone || ''
await leadsStore.addActivity(props.leadId, { type: 'message', note: `WhatsApp message initiated from Contact tab — ${phone}` })
```

**Step 2: Add deduplication check + update task title + add due date**

Replace:
```ts
await leadsStore.addTask(props.leadId, { title: `Auto WhatsApp Follow Up - ${leadName}`, note: 'Automatic follow-up task created after initiating WhatsApp message', status: 'pending' })
```
With:
```ts
// Deduplication: skip if a pending "Auto Task WhatsApp" task already exists
const existingAutoTask = existingLead.value?.tasks?.find(
  t => t.status === 'pending' && t.title.startsWith('Auto Task WhatsApp —')
)
if (!existingAutoTask) {
  const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  await leadsStore.addTask(props.leadId, {
    title: `Auto Task WhatsApp — ${leadName}`,
    note: 'Auto-generated follow-up after initiating WhatsApp message',
    dueDate,
    status: 'pending'
  })
}
```

**Step 3: Final function should look like:**

```ts
const handleWhatsAppClick = async () => {
  if (!props.leadId || isContactActionloading.value) return
  isContactActionloading.value = 'whatsapp'
  contactMoon.start()
  try {
    const leadName = existingLead.value?.name || formData.value.name || 'Unknown'
    const phone = existingLead.value?.phone || formData.value.phone || ''
    // Log activity (always)
    await leadsStore.addActivity(props.leadId, {
      type: 'message',
      note: `WhatsApp message initiated from Contact tab — ${phone}`
    })
    // Deduplication: skip if pending Auto Task WhatsApp already exists
    const existingAutoTask = existingLead.value?.tasks?.find(
      t => t.status === 'pending' && t.title.startsWith('Auto Task WhatsApp —')
    )
    if (!existingAutoTask) {
      const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      await leadsStore.addTask(props.leadId, {
        title: `Auto Task WhatsApp — ${leadName}`,
        note: 'Auto-generated follow-up after initiating WhatsApp message',
        dueDate,
        status: 'pending'
      })
    }
    window.open(whatsappLink.value, '_blank')
  } catch (error) {
    console.error('Failed to log WhatsApp:', error)
    window.open(whatsappLink.value, '_blank')
  } finally {
    isContactActionloading.value = null
    contactMoon.stop()
  }
}
```

**Step 4: Verify complete diff**

Run: `git diff src/components/LeadModal.vue`
Expected: Both handler functions match the final versions above

---

### Task 3: Verify TypeScript compiles

**TDD scenario:** Trivial change — use judgment

**Files:** None (read-only check)

**Step 1: Run TypeScript check**

Run: `npx vue-tsc --noEmit 2>&1 | head -30`
Expected: No errors related to `LeadModal.vue`

**Step 2: Vite build dry-run**

Run: `npx vite build --mode production 2>&1 | tail -10`
Expected: Build succeeds

---

### Task 4: Manual verification checklist

**TDD scenario:** Manual testing required (no automated tests for this component)

Test these scenarios in browser:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Open lead with phone, click Call | Activity logged, task created, dialer opens |
| 2 | Click Call again on same lead (pending task exists) | Activity logged, NO duplicate task, dialer opens |
| 3 | Complete the "Auto Task Call" task, then click Call again | Activity logged, NEW task created, dialer opens |
| 4 | Open lead with phone, click WhatsApp | Activity logged, task created, WhatsApp opens in new tab |
| 5 | Click WhatsApp again (pending task exists) | Activity logged, NO duplicate task |
| 6 | Lead with no phone number | Contact tab shows "No phone number available" |
| 7 | New lead (add mode, no leadId) | Contact tab button is disabled |
| 8 | Check activity timeline | Note includes phone number |
| 9 | Check task list | Due date is 30 minutes from click time |

**Step 5: Commit**

```bash
git add src/components/LeadModal.vue
git commit -m "feat(contact): auto-log activity + task on Call/WhatsApp click with dedup and 30min due date"
```

---

## Edge Cases Covered

| Scenario | Handling |
|----------|----------|
| Rapid double-click | Button disabled during `isContactActionloading` |
| Pending auto task exists | `status === 'pending'` gating via `.find()` |
| Completed auto task exists | New task created (previous one done) |
| No phone number | `v-if` guard hides buttons |
| API fails (offline) | Link still opens, error caught in `catch` block |
| Empty lead name | Falls back to `'Unknown'` |
