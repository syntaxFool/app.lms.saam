# Fix: Lead/Task Creation & WhatsApp Contact Button Bugs

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Fix two production bugs reported by users:
1. **@varsha** — Cannot add new leads or tasks (likely role/permission or error feedback issue)
2. **@manjot** — WhatsApp button in lead Contact tab doesn't open WhatsApp (browser popup blocker + async window.open issue)

**Architecture:** Two independent bugs with separate root causes, no shared state. Bug 1 involves the full lead-creation chain (PhoneEntryModal → LeadModal → API → Backend). Bug 2 is a frontend-only popup-blocker issue in the Contact tab of LeadModal. Fixes are isolated to the frontend SPA with no backend changes needed.

**Tech Stack:** Vue 3 (Composition API), Pinia stores, Axios API client, Express backend, nginx reverse proxy

---

## Bug Analysis Summary

### Bug 1 — Can't add leads/tasks (@varsha)

**Root cause:** The backend POST `/api/leads` enforces `requireRole('superuser', 'admin', 'agent')`. If @varsha has role `'user'`, the backend returns 403. The frontend error handling in `LeadModal.vue` only shows the generic message `"Failed to save lead"` regardless of the actual error, making it impossible for the user to understand or report the issue.

**Additional contributing factors:**
- No frontend permission check gates the "Add Lead" FAB button — it's always visible regardless of role, creating a confusing UX where the user can fill the entire form but gets a silent failure on submit.
- The error catch block in `submitForm()` wraps all errors as `error instanceof Error ? error.message : 'Failed to save lead'` but axios errors have a different shape (`.response.data.error`).

**Affected code path:**
1. User clicks FAB → `PhoneEntryModal.vue` opens
2. User enters phone → backend `/api/leads/check-duplicate/:phone` is called (this endpoint also checks role!)
3. User clicks Continue → `LeadModal.vue` opens
4. User fills form → `submitForm()` in `LeadModal.vue`
5. `leadsStore.addNewLead()` → `apiClient.post('/leads', ...)`
6. Backend `requireRole('superuser', 'admin', 'agent')` → 403 if user role
7. Error caught in `submitForm()` → generic "Failed to save lead" message

### Bug 2 — WhatsApp button not working (@manjot)

**Root cause:** `window.open()` is called inside an async function (`handleWhatsAppClick`) after `await`ing API calls. Browsers (Chrome, Firefox, Safari) block `window.open` when it's not triggered directly by a user gesture — once the async function resumes after `await`, the browser no longer considers the click a valid user gesture.

**Affected code: `LeadModal.vue` lines ~170-185:**
```ts
const handleWhatsAppClick = async () => {
  if (!props.leadId || isContactActionloading.value) return
  isContactActionloading.value = 'whatsapp'
  contactMoon.start()
  try {
    await leadsStore.addActivity(props.leadId, { type: 'whatsapp', note: ... })
    await leadsStore.addTask(props.leadId, { ... })
    window.open(whatsappLink.value, '_blank')  // ⚠️ After await → blocked!
  } catch (error) {
    window.open(whatsappLink.value, '_blank')  // Also blocked in catch
  }
}
```

Additionally, no user feedback is shown when the popup is blocked — the button just appears to do nothing.

---

## Tasks

### Task 1: Fix generic error feedback in LeadModal submitForm

**TDD scenario:** Trivial change — no existing tests for this component

**Files:**
- Modify: `src/components/LeadModal.vue:270-278` (submitForm catch block)

**Step 1: Read the current catch block**

Read `src/components/LeadModal.vue` around line 270 to confirm the exact error handling code.

**Step 2: Update the catch block to extract meaningful API errors**

Replace the generic catch block:

```ts
} catch (error) {
  formError.value = error instanceof Error ? error.message : 'Failed to save lead'
}
```

With:

```ts
} catch (error) {
  // Extract meaningful error from axios error response
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { error?: string } } }
    formError.value = axiosError.response?.data?.error || 'Failed to save lead'
  } else if (error instanceof Error) {
    formError.value = error.message
  } else {
    formError.value = 'Failed to save lead'
  }
}
```

**Step 3: Verify the change**

Read the modified area to confirm the error extraction works for:
- 403 → Shows "Insufficient permissions"
- 409 → Shows "Duplicate phone number"
- 500 → Shows "Failed to create lead" (server error)
- Network error → Shows error message

**Step 4: Commit**

```bash
git add src/components/LeadModal.vue
git commit -m "fix: extract meaningful API errors in lead submitForm"
```

---

### Task 2: Add frontend permission check for Add Lead button

**TDD scenario:** Trivial change — add conditional rendering

**Files:**
- Modify: `src/views/LeadsManager.vue` (FAB button in template)

**Step 1: Read the FAB button section**

Read `src/views/LeadsManager.vue` template around the FAB button (search for `openAddLead`).

**Step 2: Add permission check**

Import `useAuthStore` at the top of script (already imported — confirmed in code read). Check if `authStore.canCreateLead()` is true before showing the FAB button.

Update the FAB button template:

```vue
<!-- FAB Button -->
<div v-if="authStore.canCreateLead()" class="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50">
  <button
    @click="openAddLead"
    class="bg-primary hover:bg-indigo-600 text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition transform active:scale-95"
  >
    <i class="ph-bold ph-plus text-2xl"></i>
  </button>
</div>
```

**Step 3: Verify change**

Read the modified area to confirm the `v-if` condition uses `authStore.canCreateLead()`. Note that `authStore` is already imported and used as `const authStore = useAuthStore()` in the script section.

**Step 4: Commit**

```bash
git add src/views/LeadsManager.vue
git commit -m "fix: gate Add Lead FAB behind canCreateLead permission check"
```

---

### Task 3: Fix WhatsApp button — open link synchronously before async API calls

**TDD scenario:** Trivial change — reorder operations

**Files:**
- Modify: `src/components/LeadModal.vue:170-185` (handleWhatsAppClick function)

**Step 1: Read the current handleWhatsAppClick function**

Read the full function to confirm the exact code.

**Step 2: Fix the popup-blocker issue by opening WhatsApp link synchronously**

The fix: Open the WhatsApp link BEFORE any `await` calls, but after the initial guard check. The API calls (activity logging + auto-task creation) become fire-and-forget (no `await`) so they don't delay the UX.

Replace the handler:

```ts
const handleWhatsAppClick = async () => {
  if (!props.leadId || isContactActionloading.value) return
  
  // Open WhatsApp link synchronously (before any await — avoids popup blockers)
  window.open(whatsappLink.value, '_blank')
  
  // Fire-and-forget the API calls (don't await — user experience comes first)
  isContactActionloading.value = 'whatsapp'
  contactMoon.start()
  try {
    const leadName = existingLead.value?.name || formData.value.name || 'Unknown'
    const phone = existingLead.value?.phone || formData.value.phone || ''
    
    // Log activity + create auto-task in background
    leadsStore.addActivity(props.leadId, { type: 'whatsapp', note: `WhatsApp message initiated from Contact tab — ${phone}` })
      .catch(err => console.error('Failed to log WhatsApp activity:', err))
    
    const existingAutoTask = existingLead.value?.tasks?.find(
      t => t.status === 'pending' && t.title.startsWith('Auto Task WhatsApp —')
    )
    if (!existingAutoTask) {
      const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      leadsStore.addTask(props.leadId, { 
        title: `Auto Task WhatsApp — ${leadName}`, 
        note: 'Auto-generated follow-up after initiating WhatsApp message', 
        dueDate, 
        status: 'pending' 
      }).catch(err => console.error('Failed to create auto-task:', err))
    }
  } catch (error) {
    console.error('Failed to log WhatsApp:', error)
  } finally {
    isContactActionloading.value = null
    contactMoon.stop()
  }
}
```

**Step 3: Apply the same fix to handleCallClick (same pattern)**

The `handleCallClick` function has the same pattern — `window.location.href = callLink.value` after `await`. It's a navigation, not popup, but for consistency apply the same reorder:

Move `window.location.href = callLink.value` before the API calls:

```ts
const handleCallClick = async () => {
  if (!props.leadId || isContactActionloading.value) return
  
  // Navigate to call link synchronously (before any await)
  window.location.href = callLink.value
  
  // Fire-and-forget the API calls
  isContactActionloading.value = 'call'
  contactMoon.start()
  try {
    const leadName = existingLead.value?.name || formData.value.name || 'Unknown'
    const phone = existingLead.value?.phone || formData.value.phone || ''
    
    leadsStore.addActivity(props.leadId, { type: 'call', note: `Call initiated from Contact tab — ${phone}` })
      .catch(err => console.error('Failed to log call activity:', err))
    
    const existingAutoTask = existingLead.value?.tasks?.find(
      t => t.status === 'pending' && t.title.startsWith('Auto Task Call —')
    )
    if (!existingAutoTask) {
      const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      leadsStore.addTask(props.leadId, { 
        title: `Auto Task Call — ${leadName}`, 
        note: 'Auto-generated follow-up after initiating call', 
        dueDate, 
        status: 'pending' 
      }).catch(err => console.error('Failed to create auto-task:', err))
    }
  } catch (error) {
    console.error('Failed to log call:', error)
  } finally {
    isContactActionloading.value = null
    contactMoon.stop()
  }
}
```

**Step 4: Verify the changes**

Read the modified functions to confirm:
- `window.open(whatsappLink.value, '_blank')` is called synchronously (before any await)
- `window.location.href = callLink.value` is called synchronously (before any await)
- API calls are fire-and-forget with `.catch()` handlers
- `isContactActionloading` and `contactMoon` still work for visual feedback

**Step 5: Commit**

```bash
git add src/components/LeadModal.vue
git commit -m "fix: open WhatsApp/call links synchronously to avoid browser popup blockers"
```

---

### Task 4: Add user-facing feedback when WhatsApp link opens

**TDD scenario:** Trivial — add toast/notification

**Files:**
- Modify: `src/components/LeadModal.vue`

**Step 1: Understand current UX**

Currently when the WhatsApp button is clicked and the link opens, there's no visual confirmation. The button briefly shows a loading state then returns to normal.

**Step 2: Add feedback**

After `window.open(whatsappLink.value, '_blank')` in `handleWhatsAppClick`, set a brief success message using a simple reactive flag:

Add a reactive state:
```ts
const contactFeedback = ref<'idle' | 'opening' | 'done'>('idle')
```

After `window.open`, show a brief "WhatsApp opened" indicator. Since there's no toast infrastructure in this codebase, use a simple approach:
- Set `contactFeedback.value = 'opening'` before window.open
- Set it to 'done' after a short timeout
- Show an inline success badge next to the WhatsApp button text when done

**Note:** Keep this minimal. A simple change to show "Opening..." text next to the button while the loading moon indicator already provides feedback is sufficient. The moon indicator (`contactMoon`) already provides visual feedback during the async portion.

**Step 3: Commit**

```bash
git add src/components/LeadModal.vue
git commit -m "fix: add visual feedback when WhatsApp link is triggered"
```

---

### Task 5: Verify and test all fixes

**TDD scenario:** Manual verification

**Step 1: Verify Bug 1 fix**

Run: Check the build compiles without errors.

Manual verifications on running instance:
1. Login as a 'user' role → FAB button should be hidden
2. Login as 'agent'/'admin'/'superuser' → FAB button should be visible
3. Attempt to create lead with invalid phone → should show validation error
4. Attempt to create lead with valid data → should succeed
5. If backend returns 403 (user role somehow submitting) → should show "Insufficient permissions" not "Failed to save lead"

**Step 2: Verify Bug 2 fix**

Manual verification:
1. Open any lead with a phone number
2. Go to Contact tab
3. Click WhatsApp button → WhatsApp should open in a new tab (not blocked)
4. Click Call button → should initiate the call
5. Test in Chrome, Firefox, and mobile browser if possible (popup blocking behavior varies)

**Step 3: Check for regressions**

1. Verify lead editing still works
2. Verify task creation still works
3. Verify activity logging still works
4. Verify other buttons in LeadModal work (activity tab, task tab)

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix: address review feedback for lead creation and WhatsApp bugs"
```
