# Leads Persistence & Auto-Assignment Fix Plan

**Date**: April 10, 2026  
**Issues**: 
1. Leads disappearing on page refresh (users must open new tab/incognito to see leads)
2. New leads not auto-assigned to creator

---

## Issue 1: Leads Disappearing on Refresh

### Root Cause Analysis

**Symptoms:**
- User refreshes the page → leads disappear
- Opening in new tab or incognito mode and logging in again → leads appear
- Data is in the database, but not loading in the UI

**Identified Problems:**

1. **Token Validation Race Condition**
   - `App.vue` onMounted calls `checkAuth()` to validate saved token
   - `LeadsManager.vue` onMounted simultaneously calls `fetchLeads()`
   - If token is expired/invalid:
     - API returns 401 → interceptor clears localStorage → redirects to login
     - But leads array remains empty (no error shown to user)

2. **Silent Failure in fetchLeads**
   - Current implementation catches errors but doesn't inform the user
   - No retry mechanism
   - No visual feedback for failed fetch

3. **localStorage Persistence Issues**
   - Token stored separately from user data
   - Possible mismatch: `lms_user` exists but `lms_auth_token` is expired
   - Router guard checks `isAuthenticated` (based on token + user), but doesn't validate token freshness

4. **No Token Refresh Mechanism**
   - JWTs expire after 7 days (backend: `expiresIn: '7d'`)
   - No automatic refresh or extension
   - No proactive expiry detection

5. **Auth Store Initialization**
   - Reads from localStorage on store creation
   - But doesn't persist user data to localStorage in checkAuth() if missing
   - Line in auth.ts: `const storedUser = localStorage.getItem('lms_user')` — but user data is never SET to `lms_user` after login/validation

**Critical Bug Found:**
In `src/stores/auth.ts`, the `login()` function saves the token but **NOT the user object** to localStorage:
```typescript
localStorage.setItem('lms_auth_token', token.value)
localStorage.setItem('lms_last_login', lastLogin.value)
// ❌ MISSING: localStorage.setItem('lms_user', JSON.stringify(user.value))
```

Similarly, `checkAuth()` validates the token and sets `user.value`, but doesn't persist it:
```typescript
if (response.success && response.data) {
  user.value = response.data
  lastLogin.value = localStorage.getItem('lms_last_login')
  loadPermissions()
  // ❌ MISSING: localStorage.setItem('lms_user', JSON.stringify(user.value))
}
```

This means:
- On first login: token is saved, user is NOT saved
- On refresh: auth store reads `lms_user` from localStorage (which is null) → `user.value = null` → `isAuthenticated` returns false → router redirects to login
- The token is valid, but the user object is missing, breaking authentication state

---

## Issue 2: New Leads Not Auto-Assigned to Creator

### Root Cause Analysis

**Current Flow:**
1. User clicks "Add Lead" → opens LeadModal/LeadForm
2. LeadForm initializes `formData.assignedTo = ''` (empty string)
3. User fills form, clicks Save
4. Frontend sends lead data with `assignedTo: ''` to backend
5. Backend accepts empty/null assignedTo → lead created with no owner
6. Admin must manually assign later

**Problem:**
- No default value set to current user's username
- Backend doesn't auto-assign if field is empty

---

## Solution Design

### Fix 1: Persist User to localStorage (Critical)

**Files to Edit:**
- `src/stores/auth.ts` (login, checkAuth functions)

**Changes:**
1. **In `login()` function**: Save user to localStorage after successful login
2. **In `checkAuth()` function**: Save/update user to localStorage after token validation
3. **In `logout()` function**: Remove `lms_user` from localStorage

**Code Changes:**
```typescript
// In login() after setting user.value:
localStorage.setItem('lms_user', JSON.stringify(user.value))

// In checkAuth() after setting user.value:
localStorage.setItem('lms_user', JSON.stringify(user.value))

// In logout():
localStorage.removeItem('lms_user')
```

### Fix 2: Better Error Handling in fetchLeads

**Files to Edit:**
- `src/stores/leads.ts` (fetchLeads function)
- `src/views/LeadsManager.vue` (onMounted)

**Changes:**
1. Add error state to leads store
2. Show error banner/toast if fetch fails
3. Add retry button
4. Log detailed error info

**New State:**
```typescript
const error = ref<string | null>(null)
```

**Updated fetchLeads:**
```typescript
async function fetchLeads() {
  loading.value = true
  error.value = null
  try {
    const response = await apiClient.get('/leads')
    if (response.success && response.data) {
      leads.value = response.data.leads || []
      return { success: true }
    }
    error.value = response.error || 'Failed to load leads'
    return { success: false, error: error.value }
  } catch (err) {
    console.error('Fetch leads error:', err)
    error.value = 'Network error: Could not connect to server'
    return { success: false, error: error.value }
  } finally {
    loading.value = false
  }
}
```

### Fix 3: Validate Auth Before Fetching Leads

**Files to Edit:**
- `src/views/LeadsManager.vue` (onMounted)

**Changes:**
1. Wait for auth check to complete before fetching leads
2. Only fetch if authenticated

**Updated onMounted:**
```typescript
onMounted(async () => {
  // Ensure auth is validated first
  await authStore.checkAuth()
  
  // Only fetch if authenticated
  if (authStore.isAuthenticated) {
    const result = await leadsStore.fetchLeads()
    
    // Show error banner if fetch failed
    if (!result.success) {
      console.error('Failed to load leads:', result.error)
      // Could add a toast/banner here
    }
    
    // Fetch users and settings
    if (authStore.canManageUsers()) {
      appStore.fetchUsers()
    }
    appStore.fetchAppSettings()
    
    setupAdaptivePolling()
  }
})
```

### Fix 4: Add Token Expiry Detection

**Files to Edit:**
- `src/stores/auth.ts` (add isTokenExpired check)
- `src/services/api.ts` (check before requests)

**New Helper Function:**
```typescript
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000 // Convert to milliseconds
    return Date.now() > exp
  } catch {
    return true
  }
}
```

**Update checkAuth:**
```typescript
async function checkAuth() {
  const savedToken = localStorage.getItem('lms_auth_token')
  
  if (!savedToken) {
    logout()
    return
  }
  
  // Check if token is expired before making API call
  if (isTokenExpired(savedToken)) {
    console.warn('Token expired, logging out')
    logout()
    return
  }
  
  token.value = savedToken
  try {
    const response = await authService.validateToken(savedToken)
    if (response.success && response.data) {
      user.value = response.data
      localStorage.setItem('lms_user', JSON.stringify(user.value))
      lastLogin.value = localStorage.getItem('lms_last_login')
      loadPermissions()
    } else {
      logout()
    }
  } catch (error) {
    console.error('Token validation error:', error)
    logout()
  }
}
```

### Fix 5: Auto-Assign Lead to Creator

**Files to Edit:**
- `src/components/LeadForm.vue` (set default assignedTo)
- `backend/src/routes/leads.ts` (fallback to req.user.username if empty)

**Frontend Changes:**

**In LeadForm.vue - resetForm():**
```typescript
function resetForm() {
  const authStore = useAuthStore()
  formData.value = {
    name: '',
    email: '',
    phone: '',
    location: '',
    interest: '',
    source: '',
    status: 'New',
    temperature: '',
    value: 0,
    notes: '',
    assignedTo: authStore.user?.username || '' // ✅ Auto-assign to current user
  }
  // ... rest
}
```

**Watch for lead prop - preserve auto-assign for new leads:**
```typescript
watch(
  () => props.lead,
  (newLead) => {
    if (newLead) {
      formData.value = { ...newLead }
      // ... phone and interest parsing
    } else {
      resetForm() // Will set assignedTo to current user
    }
  }
)
```

**Backend Changes (Safety Net):**

**In backend/src/routes/leads.ts - POST '/' handler:**
```typescript
router.post('/', requireAuth, requireRole('superuser', 'admin', 'agent'), validate(createLeadSchema), async (req: Request, res: Response): Promise<void> => {
  const d = req.body
  try {
    const row = await queryOne<DbLead>(
      `INSERT INTO leads
         (id, name, phone, email, location, interest, source, status, assigned_to,
          temperature, value, notes, follow_up_date, last_modified_by)
       VALUES (COALESCE($1::uuid, gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        d.id || null,
        d.name || null, d.phone,
        d.email || null, d.location || null, d.interest || null, d.source || null,
        d.status || 'New',
        d.assignedTo || req.user!.username, // ✅ Fallback to authenticated user
        d.temperature || '',
        d.value || 0,
        d.notes || null,
        d.followUpDate || null,
        req.user!.username,
      ]
    )
    
    // ... rest of the handler
  }
})
```

---

## Implementation Order

### Phase 1: Critical Fix (Leads Persistence)
**Priority: URGENT** - This breaks basic functionality

1. ✅ Add `localStorage.setItem('lms_user', ...)` to `login()` in auth.ts
2. ✅ Add `localStorage.setItem('lms_user', ...)` to `checkAuth()` in auth.ts
3. ✅ Add `localStorage.removeItem('lms_user')` to `logout()` in auth.ts
4. ✅ Test: Login → Refresh → Leads should appear
5. ✅ Test: Login → Close tab → Reopen → Leads should appear

### Phase 2: Token Expiry Detection
**Priority: HIGH** - Prevents confusing failures

1. ✅ Add `isTokenExpired()` helper to auth.ts
2. ✅ Update `checkAuth()` to check expiry before API call
3. ✅ Test: Manually expire token (change exp in JWT) → Refresh → Should auto-logout

### Phase 3: Better Error Handling
**Priority: MEDIUM** - Improves user experience

1. ✅ Add `error` state to leads store
2. ✅ Update `fetchLeads()` with detailed error handling
3. ✅ Update `LeadsManager.vue` to check auth before fetching
4. ✅ Add error banner/toast component (optional)
5. ✅ Test: Kill backend → Refresh → Should show error message

### Phase 4: Auto-Assign to Creator
**Priority: MEDIUM** - Quality of life improvement

1. ✅ Update LeadForm `resetForm()` to set assignedTo to current user
2. ✅ Update backend POST /leads to fallback to req.user.username
3. ✅ Test: Create lead without selecting assignee → Should default to current user
4. ✅ Test: Create lead with explicit assignee → Should respect selection

---

## Testing Checklist

### Persistence Tests
- [ ] Login → Refresh page → Leads visible ✅
- [ ] Login → Close browser → Reopen → Leads visible ✅
- [ ] Login → Open new tab → Leads visible ✅
- [ ] Login in incognito → Leads visible ✅
- [ ] Multi-device: Login on device 1 → Login on device 2 → Both show leads ✅

### Token Expiry Tests
- [ ] Login → Wait 7 days → Refresh → Auto-logout with message ✅
- [ ] Login → Manually corrupt token in localStorage → Refresh → Auto-logout ✅
- [ ] Login → Delete token but keep user → Refresh → Auto-logout ✅

### Error Handling Tests
- [ ] Stop backend → Refresh → Error message shown ✅
- [ ] Network offline → Refresh → Error message shown ✅
- [ ] Invalid API response → Error handled gracefully ✅

### Auto-Assign Tests
- [ ] Agent creates lead → Lead assigned to agent ✅
- [ ] Admin creates lead → Lead assigned to admin ✅
- [ ] Admin creates lead with explicit assignee → Respects selection ✅
- [ ] Admin edits unassigned lead → Can reassign ✅

---

## Rollback Plan

If issues arise after deployment:

1. **Code Rollback**: Revert commits for auth.ts and leads.ts changes
2. **Database Rollback**: No schema changes, safe to rollback code only
3. **User Impact**: Users will need to re-login (clear localStorage manually if needed)

---

## Files Modified

### Frontend
- `src/stores/auth.ts` - Add localStorage persistence for user object
- `src/stores/leads.ts` - Better error handling in fetchLeads
- `src/views/LeadsManager.vue` - Wait for auth before fetching leads
- `src/components/LeadForm.vue` - Auto-assign to current user

### Backend
- `backend/src/routes/leads.ts` - Fallback to authenticated user for assignedTo

### Documentation
- This plan (LEADS_PERSISTENCE_FIX_PLAN.md)

---

## Estimated Time

- Phase 1 (Critical): 30 minutes (code + test)
- Phase 2 (Token Expiry): 20 minutes
- Phase 3 (Error Handling): 30 minutes
- Phase 4 (Auto-Assign): 15 minutes
- **Total**: ~2 hours (including testing)

---

## Success Metrics

1. **Zero refresh failures**: Users can refresh and see their leads 100% of the time
2. **Clear error messages**: If fetch fails, users see why (network, auth, etc.)
3. **Auto-assignment rate**: 100% of new leads have an assignedTo value
4. **Reduced support tickets**: Fewer "my leads disappeared" reports

---

## Next Steps

1. Review this plan with team
2. Implement Phase 1 (URGENT)
3. Deploy to staging
4. Test thoroughly
5. Deploy to production
6. Monitor error logs for 24 hours
7. Implement remaining phases
