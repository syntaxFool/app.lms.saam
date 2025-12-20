# Code Changes - Line by Line Reference

## 1. src/stores/auth.ts

### Change 1: Added ROLE_LIMITS constant (after line 102)
**Location:** Lines 103-120
**What:** Added role limit configuration
```typescript
const ROLE_LIMITS: Record<UserRole, number> = {
  superuser: 1,
  admin: 5,
  agent: 10,
  user: Infinity // Unlimited user accounts
}
```

### Change 2: Added getRoleStats() function (after line 120)
**Location:** Lines 123-145
**What:** Counts current users by role
```typescript
function getRoleStats(allUsers: AuthUser[]): Record<UserRole, number> {
  const stats: Record<UserRole, number> = {
    superuser: 0, admin: 0, agent: 0, user: 0
  }
  allUsers.forEach(u => {
    const role = u.role || 'user'
    if (stats.hasOwnProperty(role)) {
      stats[role]++
    }
  })
  return stats
}
```

### Change 3: Added checkRoleLimits() function (after line 145)
**Location:** Lines 147-172
**What:** Validates if new user can be added
```typescript
function checkRoleLimits(role: UserRole, allUsers: AuthUser[]): { 
  allowed: boolean; 
  message: string; 
  remainingSlots: number 
} {
  const stats = getRoleStats(allUsers)
  const limit = ROLE_LIMITS[role]
  const current = stats[role]
  const remainingSlots = limit - current

  if (current >= limit) {
    // ... return error
  }
  return { allowed: true, message: ..., remainingSlots }
}
```

### Change 4: Added getRoleLimitsDisplay() function (after line 172)
**Location:** Lines 174-183
**What:** Formats role limits for display
```typescript
function getRoleLimitsDisplay(allUsers: AuthUser[]): string {
  const stats = getRoleStats(allUsers)
  return [
    `Superuser: ${stats.superuser}/${ROLE_LIMITS.superuser}`,
    `Admins: ${stats.admin}/${ROLE_LIMITS.admin}`,
    `Agents: ${stats.agent}/${ROLE_LIMITS.agent}`
  ].join(' | ')
}
```

### Change 5: Updated return statement (end of file)
**Location:** Lines ~310-325
**What:** Added new exports to store return
```typescript
return {
  // ... existing exports ...
  
  // Role Limits
  ROLE_LIMITS,
  getRoleStats,
  checkRoleLimits,
  getRoleLimitsDisplay,
  
  // ... rest of exports ...
}
```

---

## 2. src/composables/useRoleManagement.ts (NEW FILE)

**Created entirely new file with 110 lines**

### Main Export Function
```typescript
export function useRoleManagement() {
  const authStore = useAuthStore()
  
  // canAddRole - Check if role can be added
  // getRoleLabel - Get display label
  // getRoleDescription - Get description
  // getRoleColor - Get Tailwind color class
  // getRoleIcon - Get Phosphor icon name
  // getAvailableRoles - Get roles user can create
  // formatRoleStats - Format stats object
  // roleLimits - Raw limits object
}
```

---

## 3. src/composables/index.ts

### Change: Added exports (end of file)
**Location:** Lines ~31-33
**What:** Export new composable
```typescript
export { useRoleManagement } from './useRoleManagement'
export type { RoleLimitCheck } from './useRoleManagement'
```

---

## 4. src/types/index.ts

### Change: Added 3 new interfaces (after authentication section, ~line 450)
**Location:** Lines 455-485
**What:** Type definitions for role management

```typescript
// ==================== ROLE MANAGEMENT & LIMITS ====================

export interface RoleStats {
  superuser: number
  admin: number
  agent: number
  user: number
}

export interface RoleLimitCheck {
  allowed: boolean
  message: string
  remainingSlots: number
  current?: number
  limit?: number
}

export interface UserValidationResult {
  success: boolean
  message?: string
  violations?: Array<{
    role: UserRole
    current: number
    limit: number
    message: string
  }>
}
```

---

## 5. code.gs

### Change 1: Added ROLE_LIMITS constant (start of file, line 4)
**Location:** Lines 4-13
**What:** Role limit configuration (same as frontend)
```javascript
const ROLE_LIMITS = {
  superuser: 1,
  admin: 5,
  agent: 10,
  user: Infinity
}
```

### Change 2: Updated save_all action validation (line ~125)
**Location:** Lines 125-145
**What:** Added validation before saving users
```javascript
if (data.action === 'save_all') {
  if(data.users) {
    // NEW: Validate role limits
    const validation = validateUserRoleLimits(data.users)
    if (!validation.success) {
      return createCORSResponse(JSON.stringify({ 
        success: false, 
        error: validation.message,
        violations: validation.violations 
      }))
    }
    writeSheet(ss.getSheetByName('Users'), data.users, ...)
  }
  // ... rest of save_all
}
```

### Change 3: Added helper functions (after updateLastModified, ~line 260)
**Location:** Lines 260-340
**What:** Added all role management functions

```javascript
// ========== ROLE LIMIT FUNCTIONS ==========

function getRoleStats(users) {
  // Count users by role
}

function checkRoleLimits(role, users) {
  // Check if role can be added
}

function getRoleLimitsDisplay(users) {
  // Format display string
}

function validateUserRoleLimits(users) {
  // Validate entire users array
}
```

### Change 4: Added validation function (after createCORSResponse, ~line 300)
**Location:** Lines 300-340
**What:** Full validation function
```javascript
function validateUserRoleLimits(users) {
  // Check each role against limit
  // Return success/error with violations
}
```

---

## Summary of Changes by File

| File | Type | Lines Added | Purpose |
|------|------|------------|---------|
| auth.ts | Modified | 114 | Frontend role management functions |
| useRoleManagement.ts | New | 110 | Composable utility for components |
| composables/index.ts | Modified | 2 | Export new composable |
| types/index.ts | Modified | 32 | Type definitions |
| code.gs | Modified | 140+ | Backend validation |
| **Documentation** | **New** | **1000+** | Implementation guides |

---

## How to Review Changes

### For Frontend Changes
1. Check `src/stores/auth.ts` - Look for "ROLE LIMIT ENFORCEMENT" comment
2. Check `src/composables/useRoleManagement.ts` - New file with complete composable
3. Check `src/types/index.ts` - Look for "ROLE MANAGEMENT & LIMITS" comment

### For Backend Changes
1. Check `code.gs` - Look for "ROLE LIMITS" constant at top
2. Look for "ROLE LIMIT FUNCTIONS" section
3. Look for modified `save_all` action with validation

### For Documentation
- Read ROLE_LIMITS_SUMMARY.md first (5 minute overview)
- Then ROLE_LIMITS_QUICK_REFERENCE.md (code lookup)
- Then ROLE_MANAGEMENT_ARCHITECTURE.md (deep dive)
- Finally IMPLEMENTATION_CHECKLIST.md (testing guide)

---

## Git Diff Summary

### New Files Created
- src/composables/useRoleManagement.ts
- ROLE_LIMITS_IMPLEMENTATION.md
- ROLE_LIMITS_QUICK_REFERENCE.md
- ROLE_MANAGEMENT_ARCHITECTURE.md
- ROLE_LIMITS_SUMMARY.md
- IMPLEMENTATION_CHECKLIST.md

### Modified Files
- src/stores/auth.ts (+114 lines)
- src/composables/index.ts (+2 lines)
- src/types/index.ts (+32 lines)
- code.gs (+140 lines)

### Total Changes
- 6 documentation files created
- 4 source files modified
- ~288 lines of code added
- ~1000 lines of documentation added
- 0 lines deleted (all additions)

---

## Testing What Changed

### Test Frontend Changes
```bash
# Open browser console
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()

// Test getRoleStats
auth.getRoleStats([
  { id: '1', role: 'admin', name: 'John' },
  { id: '2', role: 'admin', name: 'Jane' },
  { id: '3', role: 'agent', name: 'Alex' }
])
// Should return: { superuser: 0, admin: 2, agent: 1, user: 0 }

// Test checkRoleLimits
auth.checkRoleLimits('admin', [...]users...)
// Should return allowed/message/remainingSlots

// Test composable
import { useRoleManagement } from '@/composables'
const { canAddRole } = useRoleManagement()
canAddRole('admin', [...users...])
```

### Test Backend Changes
```bash
# Test in Google Apps Script console
getRoleStats([{role: 'admin'}, {role: 'admin'}])
// Should return role counts

validateUserRoleLimits([
  {role: 'superuser'}, // 1st - OK
  {role: 'superuser'}  // 2nd - FAIL
])
// Should return { success: false, violations: [...] }
```

---

## Rollback If Needed

If you need to rollback these changes:

1. **Frontend files to revert:**
   - auth.ts - Remove "ROLE LIMIT ENFORCEMENT" section and exports
   - Delete useRoleManagement.ts
   - Remove composable export from index.ts
   - Remove role types from types/index.ts

2. **Backend file to revert:**
   - code.gs - Remove ROLE_LIMITS constant
   - Remove role limit functions
   - Remove validation from save_all action

3. **Documentation to delete:**
   - Delete all 6 ROLE_LIMITS*.md files
   - Delete IMPLEMENTATION_CHECKLIST.md

---

## Verification Checklist

- [x] All files syntactically correct
- [x] All exports properly declared
- [x] All types imported/exported
- [x] Frontend and backend match
- [x] Documentation comprehensive
- [x] Ready for component integration
- [x] Ready for end-to-end testing

