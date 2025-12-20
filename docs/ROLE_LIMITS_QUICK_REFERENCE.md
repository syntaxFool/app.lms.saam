# Role Management - Quick Reference

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│           ROLE MANAGEMENT SYSTEM ARCHITECTURE           │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   FRONTEND (Vue 3)   │         │  BACKEND (GAS)       │
├──────────────────────┤         ├──────────────────────┤
│ Auth Store           │         │ Google Apps Script   │
│ - ROLE_LIMITS        │         │ - ROLE_LIMITS const  │
│ - getRoleStats()     │◄──────►│ - getRoleStats()     │
│ - checkRoleLimits()  │         │ - checkRoleLimits()  │
│ - getRoleLimitsDispl │         │ - validateUserRoles()│
│                      │         │                      │
│ Composable           │         │ POST /save_all       │
│ - useRoleManagement()│         │ - Validates before   │
│ - getRoleLabel()     │         │   persisting users   │
│ - getRoleColor()     │         │                      │
│ - getRoleIcon()      │         │                      │
└──────────────────────┘         └──────────────────────┘
       │                                  │
       └──────────────────┬───────────────┘
                          │
                     Shared Types
                  (src/types/index.ts)
                  - RoleStats
                  - RoleLimitCheck
                  - UserValidationResult
```

## Role Limits Table

| Role | Limit | Purpose | Key Permissions |
|------|-------|---------|-----------------|
| **Superuser** | 1 | System Administrator | Create/Read/Update/Delete all resources |
| **Admin** | 5 | Team Manager | Manage leads, users (limited), reports |
| **Agent** | 10 | Sales/Support Staff | Manage assigned leads & tasks |
| **User** | ∞ | Basic Access | Read assigned leads only |

## Code Locations

### Frontend
- **Auth Store**: `src/stores/auth.ts` (lines 103-170)
- **Composable**: `src/composables/useRoleManagement.ts`
- **Types**: `src/types/index.ts` (lines ~455-485)
- **Export**: `src/composables/index.ts`

### Backend  
- **Configuration**: `code.gs` (lines 4-13)
- **Helper Functions**: `code.gs` (lines ~260-295)
- **Validation**: `code.gs` (lines ~300-340)
- **Save Action**: `code.gs` (line ~125-145)

## Usage in Components

### Check Before Adding User
```typescript
<script setup lang="ts">
import { useRoleManagement } from '@/composables'

const { canAddRole } = useRoleManagement()

function handleAddAdmin(users) {
  const check = canAddRole('admin', users)
  
  if (!check.allowed) {
    showError(check.message)  // "Max 5 admins allowed"
    return
  }
  
  openAddUserForm()
}
</script>
```

### Display Role Information
```typescript
<script setup lang="ts">
import { useRoleManagement } from '@/composables'

const { getRoleLabel, getRoleColor, getRoleIcon } = useRoleManagement()
</script>

<template>
  <div :class="getRoleColor('admin')">
    <i :class="getRoleIcon('admin')"></i>
    <span>{{ getRoleLabel('admin') }}</span>
  </div>
</template>
```

### Show Role Limits Display
```typescript
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// In component, watch users
const roleLimitsText = computed(() => 
  authStore.getRoleLimitsDisplay(allUsers.value)
)
</script>

<template>
  <div>{{ roleLimitsText }}</div>
  <!-- Output: "Superuser: 0/1 | Admins: 3/5 | Agents: 8/10" -->
</template>
```

## API Response Examples

### Frontend: checkRoleLimits()
```javascript
// When adding is allowed
{
  allowed: true,
  message: "3 slots remaining for admins",
  remainingSlots: 3,
  current: 2,
  limit: 5
}

// When adding is NOT allowed
{
  allowed: false,
  message: "Maximum 5 admins allowed. Current: 5/5",
  remainingSlots: 0
}
```

### Backend: validateUserRoleLimits()
```javascript
// Success
{
  success: true
}

// Failure
{
  success: false,
  message: "Role limit violation: Too many admins: 6 > 5",
  violations: [
    {
      role: "admin",
      current: 6,
      limit: 5,
      message: "Too many admins: 6 > 5"
    }
  ]
}
```

## Error Messages

| Scenario | Message |
|----------|---------|
| Adding 2nd superuser | "Maximum 1 superuser allowed. Current: 1/1" |
| Adding 6th admin | "Maximum 5 admins allowed. Current: 5/5" |
| Adding 11th agent | "Maximum 10 agents allowed. Current: 10/10" |
| Adding when slots available | "3 slots remaining for admins" |

## Security Notes

✅ **Dual Validation**: Frontend AND backend checks prevent bypass
✅ **Type Safe**: TypeScript prevents incorrect role assignments  
✅ **Atomic Operations**: GAS lock service prevents race conditions
✅ **Audit Ready**: All user changes logged in Activities sheet

## Testing Checklist

- [ ] Cannot create 2nd superuser (blocked on frontend)
- [ ] Cannot create 6th admin (blocked on frontend)
- [ ] Cannot create 11th agent (blocked on frontend)
- [ ] Backend rejects if role limits exceeded (API test)
- [ ] Role display shows correct labels/colors
- [ ] Role limits display updates correctly
- [ ] Error messages are clear and helpful

