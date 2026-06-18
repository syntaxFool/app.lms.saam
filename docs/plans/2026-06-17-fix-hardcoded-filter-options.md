# Fix Hard-Coded Filter Options in Lead Table

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Replace all hard-coded `<option>` values in FilterSheet.vue (source, interest, location) with dynamic data from the app store, unify the two conflicting location lists, and extract shared status/temperature constants to eliminate duplication across 9+ files.

**Architecture:** FilterSheet will consume `appStore.sourcesList` / `appStore.interestsList` (already synced from `/settings` API) via `v-for` instead of hard-coded `<option>` tags. Locations will move to a single shared constants file used by both FilterSheet and LeadModal. Status and temperature enums will be extracted to the same constants file for single-source-of-truth across all components.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Pinia, Tailwind CSS

**Risk:** Low. No behavioral changes — dropdowns render the same data at runtime, just from a dynamic source. Admin-configured lists will now flow into filters correctly.

---

## Phase 1: Dynamic Source & Interest Dropdowns (Critical Fix)

### Current State (Bug)
FilterSheet.vue has 9 hard-coded source options and 9 hard-coded interest options as literal `<option>` tags. These are completely independent from the admin-configurable lists managed via Settings → `/api/settings`. When an admin adds/removes sources or interests, the filter dropdowns never reflect the changes.

LeadModal.vue correctly uses `appStore.sourcesList` / `appStore.interestsList` for its autocomplete — FilterSheet is the only component that's out of sync.

### Target State
FilterSheet.vue uses `v-for` over `appStore.sourcesList` and `appStore.interestsList`, matching LeadModal's behavior.

---

### Task 1: Import appStore in FilterSheet and wire dynamic source dropdown

**TDD scenario:** Modifying tested code — no existing tests for FilterSheet. Manual verification: open filter sheet, verify source dropdown shows the same options as LeadModal autocomplete.

**Files:**
- Modify: `src/components/FilterSheet.vue`

**Step 1: Add appStore import**

In the `<script setup>` section, add:
```typescript
import { useAppStore } from '@/stores/app'
const appStore = useAppStore()
```

After the existing `import { useAuthStore } from '@/stores/auth'` and `const authStore = useAuthStore()`.

**Step 2: Replace hard-coded source `<option>`s with `v-for`**

Find the source `<select>` (currently lines ~114-125) and replace the hard-coded options:

```html
<!-- BEFORE -->
<option value="">All Sources</option>
<option value="Website">Website</option>
<option value="Facebook">Facebook</option>
<option value="Instagram">Instagram</option>
<option value="LinkedIn">LinkedIn</option>
<option value="Referral">Referral</option>
<option value="WhatsApp">WhatsApp</option>
<option value="Walk-in">Walk-in</option>
<option value="Call">Call</option>
<option value="Other">Other</option>

<!-- AFTER -->
<option value="">All Sources</option>
<option v-for="src in appStore.sourcesList" :key="src" :value="src">{{ src }}</option>
```

**Step 3: Replace hard-coded interest `<option>`s with `v-for`**

Find the interest `<select>` (currently lines ~137-147) and replace:

```html
<!-- BEFORE -->
<option value="">All Interests</option>
<option value="Full Stack Development">Full Stack Development</option>
<option value="Data Science">Data Science</option>
<option value="UI/UX Design">UI/UX Design</option>
<option value="Digital Marketing">Digital Marketing</option>
<option value="Mobile App Development">Mobile App Development</option>
<option value="Cloud Computing">Cloud Computing</option>
<option value="Cybersecurity">Cybersecurity</option>
<option value="Business Analytics">Business Analytics</option>
<option value="Other">Other</option>

<!-- AFTER -->
<option value="">All Interests</option>
<option v-for="interest in appStore.interestsList" :key="interest" :value="interest">{{ interest }}</option>
```

**Step 4: Verify TypeScript compilation**

Run: `npx vue-tsc --noEmit`
Expected: No new type errors.

**Step 5: Commit**

```bash
git add src/components/FilterSheet.vue
git commit -m "fix: use dynamic source/interest lists in FilterSheet from app store

Previously FilterSheet had hard-coded source and interest dropdown options
that never reflected admin changes made via Settings API. Now uses
appStore.sourcesList and appStore.interestsList (same as LeadModal)."
```

---

## Phase 2: Centralize Location Options (Medium Fix)

### Current State (Inconsistency)
- **FilterSheet.vue**: 9 hard-coded cities (`Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Other`)
- **LeadModal.vue**: 16 hard-coded cities (`Bangalore, Mumbai, Delhi, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad, Jaipur, Surat, Lucknow, Kanpur, Nagpur, Indore, Coimbatore, Kochi`)

These are two completely independent lists with different entries. There is no `locations_list` in the backend Settings API.

### Target State
A single shared `LEAD_LOCATIONS` constant in `src/constants/leadOptions.ts` used by both components. The merged list will include all unique entries from both (24 cities). No backend changes needed.

---

### Task 2: Create shared constants file

**Files:**
- Create: `src/constants/leadOptions.ts`

**Step 1: Create `src/constants/` directory**

```bash
mkdir -p src/constants
```

**Step 2: Create `src/constants/leadOptions.ts`**

```typescript
// ==================== LEAD FILTER OPTIONS ====================

// Merged from FilterSheet (9) + LeadModal (16) = unique entries
export const LEAD_LOCATIONS = [
  'Ahmedabad',
  'Bangalore',
  'Chennai',
  'Coimbatore',
  'Delhi',
  'Hyderabad',
  'Indore',
  'Jaipur',
  'Kanpur',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Mumbai',
  'Nagpur',
  'Pune',
  'Surat',
  'Other',
] as const

export type LeadLocation = typeof LEAD_LOCATIONS[number]

// Lead status options (from LeadStatus type)
export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Proposal',
  'Won',
  'Lost',
] as const

export type LeadStatus = typeof LEAD_STATUSES[number]

// Temperature options (from Temperature type)
export const TEMPERATURE_OPTIONS = [
  { value: 'Hot', label: '🔴 Hot' },
  { value: 'Warm', label: '🟠 Warm' },
  { value: 'Cold', label: '🔵 Cold' },
] as const

export type Temperature = typeof TEMPERATURE_OPTIONS[number]['value']
```

**Step 3: Commit**

```bash
git add src/constants/leadOptions.ts
git commit -m "feat: add shared lead option constants (locations, statuses, temperatures)"
```

---

### Task 3: Update FilterSheet.vue to use shared location constant

**Files:**
- Modify: `src/components/FilterSheet.vue`

**Step 1: Import the constant**

Add to the `<script setup>` imports:
```typescript
import { LEAD_LOCATIONS } from '@/constants/leadOptions'
```

**Step 2: Replace hard-coded location `<option>`s with `v-for`**

```html
<!-- BEFORE -->
<option value="">All Locations</option>
<option value="Mumbai">Mumbai</option>
<option value="Delhi">Delhi</option>
<option value="Bangalore">Bangalore</option>
<option value="Hyderabad">Hyderabad</option>
<option value="Chennai">Chennai</option>
<option value="Kolkata">Kolkata</option>
<option value="Pune">Pune</option>
<option value="Ahmedabad">Ahmedabad</option>
<option value="Other">Other</option>

<!-- AFTER -->
<option value="">All Locations</option>
<option v-for="loc in LEAD_LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
```

**Step 3: Commit**

```bash
git add src/components/FilterSheet.vue
git commit -m "fix: use shared LEAD_LOCATIONS constant in FilterSheet"
```

---

### Task 4: Update LeadModal.vue to use shared location constant

**Files:**
- Modify: `src/components/LeadModal.vue`

**Step 1: Replace hard-coded locations array**

Find the hard-coded `const locations = [...]` (currently line 759) and replace with:
```typescript
// BEFORE (line 759):
const locations = [
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Surat',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Coimbatore',
  'Kochi'
]

// AFTER:
import { LEAD_LOCATIONS } from '@/constants/leadOptions'
// ... (add import at top of <script setup>)
const locations = LEAD_LOCATIONS
```

**Step 2: Commit**

```bash
git add src/components/LeadModal.vue
git commit -m "fix: use shared LEAD_LOCATIONS constant in LeadModal"
```

---

## Phase 3: Extract Status & Temperature Constants (Low Priority — Optional)

### Current State
Status values (`New`, `Contacted`, `Proposal`, `Won`, `Lost`) and temperature values (`Hot`, `Warm`, `Cold`) are hard-coded as literal strings across 9+ files. The TypeScript type definitions live in `src/types/index.ts`.

### Target State
Components import `LEAD_STATUSES` and `TEMPERATURE_OPTIONS` from `src/constants/leadOptions.ts` instead of repeating literal strings. The type definitions in `src/types/index.ts` are updated to derive from the constants.

### Important Note
This phase is **lowest priority**. Status and temperature are core domain concepts that rarely change, and changing them requires database migrations. The DRY benefit is real but the practical impact is small. Consider skipping this phase if time is tight.

---

### Task 5: Update types to derive from constants

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/constants/leadOptions.ts`

**Step 1: Re-export types from constants in types/index.ts**

In `src/types/index.ts`, find the existing type definitions (lines 4-5):
```typescript
export type LeadStatus = 'New' | 'Contacted' | 'Proposal' | 'Won' | 'Lost'
export type Temperature = 'Hot' | 'Warm' | 'Cold' | ''
```

Replace with:
```typescript
import type { LeadStatus as LS, Temperature as T } from '@/constants/leadOptions'
export type LeadStatus = LS | 'New' | 'Contacted' | 'Proposal' | 'Won' | 'Lost'  // keep for backward compat
export type Temperature = T | ''  // keep '' for backward compat
```

Actually, to avoid breaking changes, just keep the types as-is in types/index.ts and use the constants only for UI rendering. The type system and the constants coexist without conflict.

Simpler approach — no changes to types/index.ts needed. The constants are purely for UI `<option>` rendering.

**Step 2: Update FilterSheet.vue status `<option>`s**

```html
<!-- BEFORE -->
<option value="New">New</option>
<option value="Contacted">Contacted</option>
<option value="Proposal">Proposal</option>
<option value="Won">Won</option>
<option value="Lost">Lost</option>

<!-- AFTER -->
<option v-for="status in LEAD_STATUSES" :key="status" :value="status">{{ status }}</option>
```

**Step 3: Update FilterSheet.vue temperature `<option>`s**

```html
<!-- BEFORE -->
<option value="Hot">🔴 Hot</option>
<option value="Warm">🟠 Warm</option>
<option value="Cold">🔵 Cold</option>

<!-- AFTER -->
<option v-for="temp in TEMPERATURE_OPTIONS" :key="temp.value" :value="temp.value">{{ temp.label }}</option>
```

**Files to update for status/temperature constants (each as a separate commit):**
1. `src/components/FilterSheet.vue` — status and temperature dropdowns
2. `src/components/LeadsTable.vue` — status badge classes, temperature emoji/color mapping, filter chip emoji
3. `src/views/LeadsManager.vue` — `statusConfig` array
4. `src/components/LeadForm.vue` — status and temperature dropdowns
5. `src/components/LeadModal.vue` — status and temperature dropdowns
6. `src/components/KanbanBoard.vue` — status column definitions
7. `src/components/LeadCard.vue` — status rendering
8. `src/components/QuickActionsSheet.vue` — status dropdown
9. `src/views/ReportsView.vue` — status/temperature filter rendering

**For status badge styling** (used in LeadsTable and elsewhere), extract a shared mapping:
```typescript
// Add to src/constants/leadOptions.ts:
export const STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  New: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Proposal: 'bg-purple-100 text-purple-800',
  Won: 'bg-green-100 text-green-800',
  Lost: 'bg-red-100 text-red-800',
}
```

**Step N: Commit after each file**

```bash
git add <file>
git commit -m "refactor: use shared status/temperature constants in <Component>"
```

---

## Phase 4: Verification

### Task 6: Manual verification checklist

Run TypeScript compilation across the project:
```bash
cd "/Drive/codeProject/Shanuzz/saLab-server/webApp x LMS"
npx vue-tsc --noEmit
```

Manual testing in browser:
1. [ ] Open FilterSheet — source dropdown shows admin-configured sources
2. [ ] Open FilterSheet — interest dropdown shows admin-configured interests
3. [ ] Open FilterSheet — location dropdown shows all 17 merged cities
4. [ ] Open LeadModal — location autocomplete uses same shared list
5. [ ] Apply a source filter — leads filter correctly
6. [ ] Apply an interest filter — leads filter correctly
7. [ ] Apply a location filter — leads filter correctly
8. [ ] Clear all filters — filter state resets correctly
9. [ ] Test on mobile — bottom sheet renders correctly
10. [ ] Verify no console errors

---

## Summary

| Phase | What | Files Changed | Impact |
|-------|------|--------------|--------|
| 1 | Dynamic source/interest dropdowns in FilterSheet | `FilterSheet.vue` | **Critical** — fixes admin sync |
| 2 | Centralize location constants | `leadOptions.ts`, `FilterSheet.vue`, `LeadModal.vue` | **Medium** — unifies two conflicting lists |
| 3 | Extract status/temperature constants | `leadOptions.ts` + 9 component files | **Low** — DRY, optional |
| 4 | Verification | — | Required |

**Estimated effort:** 2-3 hours (Phases 1-2), +2-3 hours (Phase 3 optional)

**Rollback:** All changes are additive or UX-only. No API contracts change. Git revert restores previous state.
