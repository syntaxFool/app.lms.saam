# Missing Features Implementation Plan
**Project**: LeadFlow India LMS  
**Date**: April 9, 2026  
**Status**: Phase 1 - Planning

---

## Overview

This document outlines the implementation plan for 4 critical missing features identified during the codebase audit.

## Features Summary

| # | Feature | Priority | Impact | Complexity |
|---|---------|----------|--------|------------|
| 1 | Pull-Down Refresh (Mobile) | Medium | UX Enhancement | Low |
| 2 | Superuser Password Visibility | Low | Admin Convenience | Low |
| 3 | **Agent Role-Based Filtering** | **CRITICAL** | **Security** | **Medium** |
| 4 | Kanban "All/Me" Toggle | High | UX Enhancement | Medium |

---

## Feature 1: Pull-Down Refresh (Mobile)

### Requirements
- Native mobile pull-to-refresh gesture on LeadsManager view
- Visual feedback: pull indicator with distance threshold
- Trigger sync on release (>80px pull distance)
- Prevent simultaneous pulls during active sync

### Technical Design

**Files to Modify:**
- `src/views/LeadsManager.vue`

**Implementation:**

```typescript
// Add to LeadsManager.vue <script setup>
const pullToRefresh = {
  startY: 0,
  currentY: 0,
  pulling: false,
  threshold: 80
}

function handleTouchStart(e: TouchEvent) {
  if (window.scrollY === 0 && !syncFeedbackStatus.value) {
    pullToRefresh.startY = e.touches[0].clientY
    pullToRefresh.pulling = true
  }
}

function handleTouchMove(e: TouchEvent) {
  if (!pullToRefresh.pulling) return
  pullToRefresh.currentY = e.touches[0].clientY
  const distance = pullToRefresh.currentY - pullToRefresh.startY
  
  if (distance > 0 && distance < 120) {
    // Show visual indicator (transform header or add pull indicator)
    // Prevent default scroll
    e.preventDefault()
  }
}

async function handleTouchEnd() {
  if (!pullToRefresh.pulling) return
  const distance = pullToRefresh.currentY - pullToRefresh.startY
  
  if (distance > pullToRefresh.threshold) {
    await syncData() // Trigger sync
    if ('vibrate' in navigator) navigator.vibrate(30)
  }
  
  pullToRefresh.pulling = false
  pullToRefresh.startY = 0
  pullToRefresh.currentY = 0
}
```

**Template Changes:**
```vue
<!-- Add to main wrapper in LeadsManager.vue -->
<div 
  @touchstart="handleTouchStart"
  @touchmove="handleTouchMove"
  @touchend="handleTouchEnd"
  class="h-[100dvh] w-full flex flex-col bg-slate-50 overflow-hidden"
>
```

**Visual Indicator:**
```vue
<!-- Add below header, before main content -->
<div 
  v-if="pullToRefresh.pulling" 
  class="flex justify-center py-2 bg-blue-50 transition-all"
  :style="{ opacity: Math.min(1, pullDistance / threshold) }"
>
  <i class="ph-bold ph-arrows-clockwise text-blue-600" 
     :class="pullDistance > threshold ? 'animate-spin' : ''"
  ></i>
</div>
```

### Testing Checklist
- [ ] Pull gesture triggers on scroll Y = 0 only
- [ ] Visual feedback matches pull distance
- [ ] Release >80px triggers sync
- [ ] Release <80px cancels (no sync)
- [ ] Blocked during active sync
- [ ] Works on iOS Safari and Android Chrome
- [ ] No interference with native scroll behavior

---

## Feature 2: Superuser Password Visibility

### Requirements
- Superuser role can view passwords in User Management modal
- Show password as plain text for existing users (view-only)
- Password reveal toggle (eye icon) for superuser only
- Non-superuser always sees `••••••••`

### Technical Design

**Files to Modify:**
- `src/components/UserManagementModal.vue`
- `backend/src/routes/users.ts` (add password field to GET response for superuser)

**Frontend Implementation:**

```typescript
// Add to UserManagementModal.vue <script setup>
const showPasswords = ref<Record<string, boolean>>({})

function togglePasswordVisibility(userId: string) {
  showPasswords.value[userId] = !showPasswords.value[userId]
}
```

**Template Changes (User List):**
```vue
<!-- Add password display in user list item -->
<p v-if="authStore.isSuperuser && user.password" class="text-xs text-slate-500 mt-1 flex items-center gap-2">
  <span class="font-mono">
    {{ showPasswords[user.id] ? user.password : '••••••••' }}
  </span>
  <button 
    @click.stop="togglePasswordVisibility(user.id)"
    class="p-0.5 hover:bg-slate-200 rounded"
  >
    <i :class="showPasswords[user.id] ? 'ph-bold ph-eye-slash' : 'ph-bold ph-eye'" 
       class="text-xs text-slate-400"
    ></i>
  </button>
</p>
```

**Backend Changes:**

```typescript
// backend/src/routes/users.ts - GET /api/users
// Add password to response ONLY for superuser

router.get('/', requireAuth, requireRole('admin', 'superuser'), async (req, res) => {
  const users = await query('SELECT * FROM users ORDER BY created_at DESC')
  
  const response = users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    mobile: u.mobile,
    role: u.role,
    createdAt: u.created_at,
    // Only include password for superuser
    ...(req.user?.role === 'superuser' && { password: u.password_hash })
  }))
  
  res.json({ success: true, data: response })
})
```

### Security Considerations
⚠️ **WARNING**: This exposes password hashes to superuser. Consider:
- Alternative: Password reset functionality instead of viewing
- Log all password views in audit trail
- Add RBAC check before sending password data

### Testing Checklist
- [ ] Superuser sees password field with toggle
- [ ] Admin/Agent/User do NOT see password field
- [ ] Eye icon toggles between plain text and dots
- [ ] Backend only sends password to superuser role
- [ ] Password field shows actual password (not hash) ← **REQUIRES DISCUSSION**

⚠️ **BLOCKER**: Backend stores `password_hash` (bcrypt). Cannot reverse to plain text. Options:
1. **Store plain text passwords** (INSECURE - not recommended)
2. **Show password hash** (not useful for superuser)
3. **Implement password reset** (recommended - separate feature)

**RECOMMENDATION**: Replace password visibility with **Password Reset** feature:
- Superuser can reset any user's password
- Generates temporary password or sends reset link
- User must change on first login

---

## Feature 3: Agent Role-Based Lead Filtering ⚠️ **CRITICAL SECURITY**

### Requirements
- **Backend**: Agent role MUST only see leads assigned to them
- **Backend**: Admin/Superuser see ALL leads
- **Backend**: User role (read-only) sees ALL leads (policy decision needed)
- **Frontend**: Display filtered leads based on backend response
- **Frontend**: Hide "Assigned To" filter for agents (they only see their leads)

### Current Security Vulnerability

```typescript
// backend/src/routes/leads.ts - Line 81
// ISSUE: No role-based filtering - agents see ALL leads
router.get('/', requireAuth, async (req, res) => {
  // Missing: WHERE assigned_to = $1 for agent role
  const leadsRows = await query('SELECT * FROM leads ORDER BY updated_at DESC')
  // ^^^ Returns ALL leads to ANY authenticated user
})
```

### Technical Design

**Backend Changes (CRITICAL):**

```typescript
// backend/src/routes/leads.ts - GET /api/leads

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const since = req.query.since ? new Date(parseInt(req.query.since as string)).toISOString() : null
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 200))

    // ✅ SECURITY: Role-based WHERE clause
    let whereClause = since ? 'WHERE updated_at > $1' : ''
    const baseParams: any[] = since ? [since] : []

    // Agent role: ONLY see assigned leads
    if (req.user!.role === 'agent') {
      whereClause = since 
        ? 'WHERE updated_at > $1 AND assigned_to = $2'
        : 'WHERE assigned_to = $1'
      baseParams.push(req.user!.username)
    }

    // Total count (respects WHERE clause)
    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM leads ${whereClause}`,
      baseParams
    )
    const total = countRow?.count ?? 0

    const offset = (page - 1) * limit
    const paginatedParams = [...baseParams, limit, offset]
    const paramOffset = baseParams.length

    const leadsRows = await query<DbLead>(
      `SELECT * FROM leads ${whereClause} 
       ORDER BY updated_at DESC 
       LIMIT $${paramOffset + 1} 
       OFFSET $${paramOffset + 2}`,
      paginatedParams
    )

    // ... rest of function unchanged
  } catch (err) {
    console.error('Get leads error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch leads' })
  }
})
```

**Frontend Changes:**

```typescript
// src/stores/auth.ts - Add utility computed
export const canSeeAllLeads = computed(() => 
  ['superuser', 'admin', 'user'].includes(userRole.value)
)

export const canFilterByAssignedTo = computed(() => 
  ['superuser', 'admin'].includes(userRole.value)
)
```

```vue
<!-- src/components/FilterSheet.vue - Hide assignedTo filter for agents -->
<div v-if="authStore.canFilterByAssignedTo">
  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Assigned To</label>
  <select v-model="localFilters.assignedTo" class="...">
    <option value="">All Users</option>
    <option v-for="user in users" :key="user" :value="user">{{ user }}</option>
  </select>
</div>
```

### Database Schema Validation
```sql
-- Verify assigned_to column exists and is indexed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'assigned_to';

-- Add index for performance (if missing)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
```

### Migration Required
**File**: `backend/db/migrations/009_agent_filtering_index.sql`

```sql
-- Add index for agent role filtering performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Add index for combined filtering (since + assigned_to)
CREATE INDEX IF NOT EXISTS idx_leads_updated_assigned 
ON leads(updated_at DESC, assigned_to);
```

### Testing Checklist
- [ ] Superuser: Sees ALL leads (no filter)
- [ ] Admin: Sees ALL leads (no filter)
- [ ] Agent: ONLY sees `assigned_to = username` leads
- [ ] Agent: Cannot see leads assigned to others
- [ ] Agent: assignedTo filter hidden in UI
- [ ] User (read-only): Policy decision - all or assigned? ← **REQUIRES DECISION**
- [ ] Performance: Query uses index on `assigned_to`
- [ ] Edge case: Agent with `assigned_to = NULL` leads (should see or not?)

### Security Test Scenarios

| Role | Username | Should See | Should NOT See |
|------|----------|------------|----------------|
| superuser | superuser | All 100 leads | - |
| admin | admin1 | All 100 leads | - |
| agent | agent1 | 12 leads (assigned_to='agent1') | 88 other leads |
| agent | agent2 | 8 leads (assigned_to='agent2') | 92 other leads |
| user | user1 | TBD (policy decision) | TBD |

**API Test (Postman/curl):**
```bash
# Login as agent1
curl -X POST https://sa0lms.myaddr.tools/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"agent1","password":"test123"}'

# Get leads (should return ONLY agent1's assigned leads)
curl -X GET https://sa0lms.myaddr.tools/api/leads \
  -H "Authorization: Bearer {token}"

# Verify count matches assigned_to count in DB
docker exec lms_db psql -U lms -d lmsdb -c \
  "SELECT COUNT(*) FROM leads WHERE assigned_to = 'agent1';"
```

---

## Feature 4: Kanban "All/Me" Toggle

### Requirements
- Admin/Superuser can toggle between "All Leads" and "My Leads" in Kanban view
- Accessible via right-click or long-press on Kanban Board menu item (similar to card view mode)
- Agent role always sees "My Leads" (toggle hidden)
- Persisted to localStorage: `kanban_filter_mode`
- Visual indicator on Kanban Board button (icon: all = users-three, me = user)

### Technical Design

**Files to Modify:**
- `src/views/LeadsManager.vue` (state management)
- `src/components/SideMenu.vue` (toggle trigger)
- `src/components/FilterSheet.vue` (new "Lead Scope" sheet - optional, or reuse pattern)
- `src/stores/leads.ts` (add filter logic)

**State Management:**

```typescript
// LeadsManager.vue
const kanbanFilterMode = ref<'all' | 'me'>(
  localStorage.getItem('kanban_filter_mode') as 'all' | 'me' || 'all'
)

watch(kanbanFilterMode, (newMode) => {
  localStorage.setItem('kanban_filter_mode', newMode)
})

// Computed filtered leads
const scopedLeads = computed(() => {
  if (authStore.isAgent) {
    // Agent ALWAYS sees only their leads (enforced by backend)
    return filteredLeads.value
  }
  
  if (kanbanFilterMode.value === 'me') {
    return filteredLeads.value.filter(
      lead => lead.assignedTo === authStore.user?.username
    )
  }
  
  return filteredLeads.value // All leads
})
```

**UI Component: LeadScopeSheet.vue**

```vue
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-end md:items-center md:justify-center" @click="close">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <div @click.stop class="relative w-full md:w-auto md:min-w-[320px] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl">
          <!-- Handle -->
          <div class="flex justify-center pt-3 pb-2">
            <div class="w-12 h-1.5 bg-slate-300 rounded-full"></div>
          </div>

          <!-- Header -->
          <div class="px-5 pb-3 border-b border-slate-200">
            <h3 class="text-lg font-bold text-slate-800">Lead Scope</h3>
            <p class="text-sm text-slate-500 mt-0.5">Choose which leads to display</p>
          </div>

          <!-- Options -->
          <div class="py-2">
            <button
              @click="select('all')"
              class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
              :class="currentMode === 'all' ? 'bg-blue-50' : ''"
            >
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <i class="ph-bold ph-users-three text-blue-600 text-xl"></i>
              </div>
              <div class="flex-1 text-left">
                <div class="font-semibold text-slate-800">All Leads</div>
                <div class="text-xs text-slate-500">Show all leads in the system</div>
              </div>
              <i v-if="currentMode === 'all'" class="ph-bold ph-check text-blue-600 text-xl"></i>
            </button>

            <button
              @click="select('me')"
              class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
              :class="currentMode === 'me' ? 'bg-purple-50' : ''"
            >
              <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <i class="ph-bold ph-user text-purple-600 text-xl"></i>
              </div>
              <div class="flex-1 text-left">
                <div class="font-semibold text-slate-800">My Leads</div>
                <div class="text-xs text-slate-500">Only leads assigned to me</div>
              </div>
              <i v-if="currentMode === 'me'" class="ph-bold ph-check text-purple-600 text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  currentMode: 'all' | 'me'
}

interface Emits {
  (e: 'close'): void
  (e: 'select', mode: 'all' | 'me'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function close() {
  emit('close')
}

function select(mode: 'all' | 'me') {
  emit('select', mode)
  close()
}
</script>
```

**SideMenu.vue Integration:**

```vue
<!-- Add second long-press handler to Kanban Board button -->
<button
  @click="switchView('kanban')"
  @contextmenu.prevent="openLeadScopeSheet"
  @touchstart="startLeadScopeLongPress"
  @touchend="cancelLeadScopeLongPress"
  class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition"
>
  <i class="ph-bold ph-kanban text-lg"></i>
  <span class="font-medium">Kanban Board</span>
  
  <div class="ml-auto flex items-center gap-1">
    <!-- Lead scope indicator -->
    <i v-if="!authStore.isAgent" 
       :class="kanbanFilterMode === 'all' ? 'ph-bold ph-users-three' : 'ph-bold ph-user'"
       class="text-sm text-indigo-600"
    ></i>
    
    <!-- Card view mode indicator -->
    <i :class="modeIcon" class="text-sm text-primary"></i>
    
    <i class="ph-bold ph-dots-three text-sm text-slate-400"></i>
  </div>
</button>

<!-- Sheet component -->
<LeadScopeSheet
  v-if="!authStore.isAgent"
  :is-open="isLeadScopeSheetOpen"
  :current-mode="kanbanFilterMode"
  @close="isLeadScopeSheetOpen = false"
  @select="handleLeadScopeSelect"
/>
```

**Alternative: Inline Toggle (Simpler)**

Instead of a sheet, add a quick toggle button in LeadsManager header (Kanban view only):

```vue
<!-- LeadsManager.vue - Add to header after sync button -->
<button
  v-if="currentView === 'kanban' && authStore.canFilterByAssignedTo"
  @click="toggleLeadScope"
  class="p-2 rounded-full transition flex items-center gap-1.5 text-sm font-semibold"
  :class="kanbanFilterMode === 'me' 
    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'"
>
  <i :class="kanbanFilterMode === 'all' ? 'ph-bold ph-users-three' : 'ph-bold ph-user'"></i>
  <span class="hidden sm:inline">{{ kanbanFilterMode === 'all' ? 'All' : 'Me' }}</span>
</button>
```

### Testing Checklist
- [ ] Admin/Superuser sees toggle (both modes work)
- [ ] Agent does NOT see toggle (always "My Leads")
- [ ] Toggle persists to localStorage
- [ ] "All" mode shows all leads
- [ ] "Me" mode filters to `assignedTo === currentUser.username`
- [ ] Visual indicator updates (users-three vs user icon)
- [ ] Works in both Kanban and Table views (or Kanban only?)
- [ ] Right-click opens sheet (desktop)
- [ ] Long-press opens sheet (mobile)

---

## Implementation Order (Recommended)

### Phase 1: Security Fix (CRITICAL - Deploy ASAP)
1. ✅ **Feature 3: Agent Role-Based Filtering**
   - Backend WHERE clause
   - Database index migration
   - Frontend filter hiding
   - Security testing

**Deploy immediately after testing** - this is a data leak vulnerability.

### Phase 2: UX Enhancements
2. ✅ **Feature 4: Kanban "All/Me" Toggle**
   - LeadScopeSheet component
   - SideMenu integration
   - localStorage persistence
   - Testing

3. ✅ **Feature 1: Pull-Down Refresh**
   - Touch event handlers
   - Visual feedback
   - Testing on mobile devices

### Phase 3: Admin Tools
4. ✅ **Feature 2: Password Reset** (Alternative to password visibility)
   - OR skip if not critical

---

## Testing Strategy

### Unit Tests
- [ ] Agent filtering logic (stores/leads.ts)
- [ ] Lead scope toggle state management
- [ ] Pull-to-refresh gesture detection

### Integration Tests
- [ ] Backend API: Role-based lead filtering
- [ ] Frontend: Filtered leads match backend response
- [ ] LocalStorage persistence

### Security Tests
- [ ] Agent cannot see unassigned leads (API test)
- [ ] Agent cannot bypass filter via URL params
- [ ] SQL injection test on assigned_to parameter

### E2E Tests (Manual)
- [ ] Pull-down refresh on iOS Safari
- [ ] Pull-down refresh on Android Chrome
- [ ] Lead scope toggle on mobile/desktop
- [ ] Password visibility (superuser only)

---

## Deployment Checklist

### Pre-Deployment
- [ ] Run `tsc --noEmit` (frontend)
- [ ] Run `tsc --noEmit` (backend)
- [ ] Run `npm run build` locally
- [ ] Test on local dev server
- [ ] Review all file changes

### Backend Deployment
```bash
# 1. Sync migration file
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  backend/db/migrations/009_agent_filtering_index.sql \
  nas@154.84.215.26:/home/nas/lms-app/backend/db/migrations/

# 2. Run migration
ssh nas-office "docker exec -i lms_db psql -U lms -d lmsdb" < \
  backend/db/migrations/009_agent_filtering_index.sql

# 3. Sync backend source
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  backend/src/ \
  nas@154.84.215.26:/home/nas/lms-app/backend/src/

# 4. Rebuild backend
ssh nas-office "cd /home/nas/lms-app && docker compose build backend && docker compose up -d backend"
```

### Frontend Deployment
```bash
# 1. Sync components
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  src/components/ \
  nas@154.84.215.26:/home/nas/lms-app/src/components/

# 2. Sync views
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  src/views/ \
  nas@154.84.215.26:/home/nas/lms-app/src/views/

# 3. Sync stores
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  src/stores/ \
  nas@154.84.215.26:/home/nas/lms-app/src/stores/

# 4. Rebuild frontend
ssh nas-office "cd /home/nas/lms-app && docker compose build frontend && docker compose up -d frontend"
```

### Post-Deployment
- [ ] Smoke test: `docker exec lms_api wget -qO- http://127.0.0.1:8080/api/leads`
- [ ] Verify containers running: `docker ps | grep lms_`
- [ ] Check logs: `docker logs lms_api --tail 30`
- [ ] Test live URL: https://sa0lms.myaddr.tools
- [ ] **Hard refresh browser (Ctrl+Shift+R)** - PWA cache bust
- [ ] Security test: Login as agent, verify filtered leads

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Agent filtering breaks existing agent workflows | High | Thorough testing with test agent accounts |
| Pull-to-refresh conflicts with scroll | Medium | Only trigger at scrollY === 0 |
| Performance degradation (WHERE clause) | Medium | Add database index on `assigned_to` |
| Password visibility security concern | High | Implement password reset instead of viewing |
| localStorage not syncing across devices | Low | Document as known limitation |

---

## Open Questions / Decisions Needed

1. **User role policy**: Should read-only "user" role see:
   - All leads? (current behavior)
   - Only assigned leads? (consistent with agent)
   
   **Recommendation**: All leads (read-only analyst use case)

2. **Password visibility**: Should we:
   - Expose password hashes to superuser? (not useful)
   - Store plain text passwords? (INSECURE)
   - Implement password reset instead? ✅ **RECOMMENDED**

3. **Lead scope toggle**: Should it apply to:
   - Kanban view only?
   - Table view also? ✅ **RECOMMENDED**
   - Reports view? (separate filter)

4. **Unassigned leads**: Should agents see leads where `assigned_to IS NULL`?
   - Yes: Agents can pick up unassigned leads
   - No: Only see explicitly assigned leads ✅ **RECOMMENDED (current spec)**

---

## Success Criteria

### Feature 1: Pull-Down Refresh
- ✅ Works on iOS Safari and Android Chrome
- ✅ >80px pull triggers sync
- ✅ Visual feedback smooth and responsive
- ✅ No conflicts with native scroll

### Feature 2: Password Management
- ✅ Superuser can reset any user password
- ✅ Temporary password generated
- ✅ User must change on first login
- ✅ All password actions logged

### Feature 3: Agent Filtering (CRITICAL)
- ✅ Agent sees ONLY assigned leads (verified via API test)
- ✅ Admin/Superuser see ALL leads
- ✅ Query performance acceptable (<100ms for 10k leads)
- ✅ No security bypass possible

### Feature 4: Kanban Toggle
- ✅ Toggle persists across sessions
- ✅ "All" and "Me" modes work correctly
- ✅ Visual indicator clear
- ✅ Mobile and desktop UX smooth

---

## Appendix

### Related Documentation
- [ROLE_LIMITS_IMPLEMENTATION.md](./ROLE_LIMITS_IMPLEMENTATION.md)
- [DEPLOYMENT_SELF_HOSTED.md](./DEPLOYMENT_SELF_HOSTED.md)
- [Project Master Agent](./.github/agents/project-master.agent.md)

### Database Schema Reference

**leads table:**
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  location VARCHAR(255),
  interest VARCHAR(255),
  source VARCHAR(100),
  status lead_status DEFAULT 'New',
  assigned_to VARCHAR(100), -- Username, not FK
  temperature VARCHAR(20),
  value NUMERIC(10,2) DEFAULT 0,
  lost_reason TEXT,
  lost_reason_type VARCHAR(50),
  notes TEXT,
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_updated_assigned ON leads(updated_at DESC, assigned_to);
```

### API Endpoints Affected

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/leads` | GET | Add WHERE clause for agent role |
| `/api/leads/check-updates` | GET | Add WHERE clause for agent role |
| `/api/users` | GET | Add password field for superuser (optional) |
| `/api/users/:id/reset-password` | POST | New endpoint (Feature 2 alternative) |

---

**End of Plan**

**Next Steps**: 
1. Review and approve plan
2. Create git branch: `feature/missing-features`
3. Implement Phase 1 (Security Fix) ASAP
4. Deploy and test
5. Proceed to Phase 2 & 3
