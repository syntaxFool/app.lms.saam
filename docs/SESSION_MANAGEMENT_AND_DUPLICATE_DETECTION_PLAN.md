# Session Management & Duplicate Detection Plan

**Date**: April 10, 2026  
**Issues**:
1. Multiple concurrent sessions per user (agents open app in multiple tabs via link)
2. Duplicate lead detection logic unclear (8452093228 was accepted without "Create New Anyway" click)

---

## Issue 1: Single Session + Inactivity Logout

### Current State Analysis

**Session Management**:
- JWT-based authentication (stateless)
- Token expiry: 7 days (backend: `expiresIn: '7d'`)
- No session tracking in backend or database
- No restriction on concurrent logins
- No inactivity detection

**Problems**:
1. **Multiple Sessions**: Same user can login from unlimited tabs/devices simultaneously
   - JWT is stateless → backend doesn't track active sessions
   - No session ID or device fingerprinting
   - Each tab has its own localStorage with valid token

2. **No Inactivity Logout**: Users stay logged in indefinitely
   - No idle time tracking
   - No automatic logout after inactivity
   - Security risk: unattended devices remain authenticated

### Root Cause

**Stateless JWT Architecture**:
- JWTs are self-contained → server doesn't know which tokens are "active"
- No session table or Redis store
- Backend cannot invalidate existing tokens (tokens are valid until expiry)

---

## Solution Design: Single Session + 40min Inactivity

### Approach 1: Session Table (Recommended)

**Backend Changes**:
1. Create `sessions` table to track active sessions
2. On login: Generate session ID + JWT containing session ID
3. Store session in DB: `userId, sessionId, token, deviceInfo, lastActivity, createdAt`
4. On any API request: Update `lastActivity` timestamp
5. Before processing request: Check if session is "active" (lastActivity < 40min ago)
6. On new login: Invalidate all previous sessions for that user (single session enforcement)

**Frontend Changes**:
1. Create `useInactivity` composable to track user activity
2. Monitor: mouse movement, keyboard input, scroll, clicks
3. Auto-logout after 40 minutes of inactivity
4. Show warning modal at 38 minutes: "You'll be logged out in 2 minutes"
5. On tab visibility change: check if session is still valid (call `/api/auth/validate`)

**Database Schema**:
```sql
-- Migration: 010_sessions.sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- Auto-cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

**JWT Payload Update**:
```typescript
interface JwtPayload {
  userId: string
  username: string
  role: string
  sessionId: string // NEW: Session identifier
  iat?: number
  exp?: number
}
```

**Backend Implementation**:

1. **POST /api/auth/login**:
```typescript
// After password validation
const sessionId = crypto.randomUUID()

// Invalidate all existing sessions for this user (single session enforcement)
await query('DELETE FROM sessions WHERE user_id = $1', [user.id])

const token = jwt.sign(
  { userId: user.id, username: user.username, role: user.role, sessionId },
  secret,
  { expiresIn: '7d' }
)

// Store new session
await query(
  `INSERT INTO sessions (user_id, session_id, token, device_info, expires_at)
   VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
  [user.id, sessionId, token, { userAgent: req.headers['user-agent'] }]
)
```

2. **Middleware: requireAuth (updated)**:
```typescript
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET not configured')
    const payload = jwt.verify(token, secret) as JwtPayload
    
    // NEW: Validate session exists and is active
    const session = await queryOne(
      `SELECT * FROM sessions 
       WHERE session_id = $1 
       AND user_id = $2 
       AND expires_at > NOW()
       AND last_activity > NOW() - INTERVAL '40 minutes'`,
      [payload.sessionId, payload.userId]
    )
    
    if (!session) {
      res.status(401).json({ success: false, error: 'Session expired or invalid' })
      return
    }
    
    // Update last activity (async - don't wait)
    query('UPDATE sessions SET last_activity = NOW() WHERE session_id = $1', [payload.sessionId])
      .catch(err => console.error('Failed to update session activity:', err))
    
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}
```

3. **POST /api/auth/logout**:
```typescript
router.post('/logout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Delete session from DB
    await query('DELETE FROM sessions WHERE session_id = $1', [req.user!.sessionId])
    res.json({ success: true })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})
```

4. **New Endpoint: GET /api/auth/session-status**:
```typescript
// Check if session is still valid (for tab visibility checks)
router.get('/session-status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await queryOne(
      `SELECT last_activity, expires_at FROM sessions 
       WHERE session_id = $1 AND user_id = $2`,
      [req.user!.sessionId, req.user!.userId]
    )
    
    if (!session) {
      res.status(401).json({ success: false, error: 'Session not found' })
      return
    }
    
    const now = new Date()
    const lastActivity = new Date(session.last_activity)
    const inactiveMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
    
    res.json({
      success: true,
      data: {
        active: inactiveMinutes < 40,
        inactiveMinutes: Math.floor(inactiveMinutes),
        expiresAt: session.expires_at
      }
    })
  } catch (err) {
    console.error('Session status error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})
```

**Frontend Implementation**:

1. **New Composable: `src/composables/useInactivity.ts`**:
```typescript
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useInactivity() {
  const authStore = useAuthStore()
  
  const INACTIVITY_TIMEOUT = 40 * 60 * 1000 // 40 minutes
  const WARNING_TIME = 38 * 60 * 1000 // 38 minutes (2min warning)
  
  let inactivityTimer: number | null = null
  let warningTimer: number | null = null
  
  const showWarning = ref(false)
  const remainingSeconds = ref(120) // 2 minutes = 120 seconds
  let countdownInterval: number | null = null
  
  const resetTimers = () => {
    // Clear existing timers
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (warningTimer) clearTimeout(warningTimer)
    if (countdownInterval) clearInterval(countdownInterval)
    
    showWarning.value = false
    
    // Set warning timer (38 minutes)
    warningTimer = window.setTimeout(() => {
      showWarning.value = true
      remainingSeconds.value = 120
      
      // Start countdown
      countdownInterval = window.setInterval(() => {
        remainingSeconds.value--
        if (remainingSeconds.value <= 0) {
          logout()
        }
      }, 1000)
    }, WARNING_TIME)
    
    // Set logout timer (40 minutes)
    inactivityTimer = window.setTimeout(() => {
      logout()
    }, INACTIVITY_TIMEOUT)
  }
  
  const logout = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (warningTimer) clearTimeout(warningTimer)
    if (countdownInterval) clearInterval(countdownInterval)
    authStore.logout()
  }
  
  const extendSession = () => {
    showWarning.value = false
    resetTimers()
  }
  
  // Activity event handlers
  const handleActivity = () => {
    if (!showWarning.value) {
      resetTimers()
    }
  }
  
  onMounted(() => {
    // Monitor user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    
    // Check session validity on tab visibility change
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && authStore.isAuthenticated) {
        try {
          const response = await authStore.checkSessionStatus()
          if (!response.active) {
            logout()
          } else {
            resetTimers()
          }
        } catch {
          // Session check failed - likely expired
          logout()
        }
      }
    })
    
    // Initial timer setup
    resetTimers()
  })
  
  onUnmounted(() => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    if (warningTimer) clearTimeout(warningTimer)
    if (countdownInterval) clearInterval(countdownInterval)
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.removeEventListener(event, handleActivity)
    })
  })
  
  return {
    showWarning,
    remainingSeconds,
    extendSession,
    logout
  }
}
```

2. **Auth Store Update**:
```typescript
// Add to src/stores/auth.ts
async function checkSessionStatus() {
  try {
    const response = await apiClient.get('/auth/session-status')
    return response.data
  } catch (error) {
    console.error('Session status check failed:', error)
    throw error
  }
}
```

3. **Inactivity Warning Modal: `src/components/InactivityWarningModal.vue`**:
```vue
<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <i class="ph-bold ph-warning text-amber-600 text-3xl"></i>
          </div>
          
          <h3 class="text-xl font-bold text-slate-800 mb-2">Session Expiring Soon</h3>
          <p class="text-slate-600 mb-6">
            You've been inactive. You'll be logged out in:
          </p>
          
          <div class="text-5xl font-bold text-amber-600 mb-6">
            {{ formatTime(remainingSeconds) }}
          </div>
          
          <div class="flex gap-3 w-full">
            <button
              @click="$emit('extend')"
              class="flex-1 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-indigo-600 transition"
            >
              Stay Logged In
            </button>
            <button
              @click="$emit('logout')"
              class="flex-1 bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg hover:bg-slate-300 transition"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  remainingSeconds: number
}>()

defineEmits<{
  extend: []
  logout: []
}>()

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>
```

4. **App.vue Integration**:
```vue
<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <router-view />
    <InactivityWarningModal
      :show="showInactivityWarning"
      :remaining-seconds="inactivityRemainingSeconds"
      @extend="extendSession"
      @logout="handleInactivityLogout"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useInactivity } from '@/composables/useInactivity'
import InactivityWarningModal from '@/components/InactivityWarningModal.vue'

const authStore = useAuthStore()
const {
  showWarning: showInactivityWarning,
  remainingSeconds: inactivityRemainingSeconds,
  extendSession,
  logout: handleInactivityLogout
} = useInactivity()

onMounted(() => {
  authStore.checkAuth()
})
</script>
```

---

## Issue 2: Duplicate Lead Detection

### Current State Analysis

**How Duplicates Are Detected**:
- **Location**: `PhoneEntryModal.vue` (frontend only)
- **Logic**: 
  ```typescript
  const duplicateLeads = computed((): Lead[] => {
    if (!phoneNumber.value) return []
    
    const fullPhone = formatPhoneNumber(phonePrefix.value, phoneNumber.value)
    
    return leadsStore.leads.filter(lead => {
      if (!lead.phone) return false
      
      // Check if lead's phone matches either format
      return lead.phone === phoneNumber.value || // Legacy format
             lead.phone === fullPhone || // Full format with country code
             lead.phone.replace(/\s+/g, '') === `${phonePrefix.value}${phoneNumber.value}` // Stripped spaces
    })
  })
  ```

**Current Flow**:
1. User enters phone number
2. Frontend checks `leadsStore.leads` array for matching phone
3. If duplicate found → shows warning with existing lead info
4. User can:
   - Click lead card → opens existing lead in edit modal
   - Click "Create New Anyway" → creates duplicate lead
   - Click "Cancel" → closes modal

**Problems Identified**:

1. **Frontend-only checking**: 
   - Only checks leads already loaded in frontend
   - If leads haven't been fetched yet → duplicate check fails
   - Agent roles only see assigned leads → can miss duplicates from other agents

2. **No backend validation**:
   - Backend doesn't check for duplicate phones on POST /api/leads
   - Multiple users can create same phone simultaneously
   - Race condition: User A and User B both create +91 8452093228 at the same time

3. **User bypassed "Create New Anyway"**:
   - Possible scenarios:
     a. **Bug**: Duplicate modal shown but "Continue" button still visible
     b. **Race condition**: User clicked "Continue" before duplicate check completed
     c. **Agent scope issue**: Agent couldn't see duplicate (assigned to other agent)
     d. **Data not loaded**: Frontend leads array was empty during check

4. **Phone format inconsistency**:
   - Database has mixed formats: `8452093228`, `+91 8452093228`, `+918452093228`
   - Makes matching harder and error-prone

---

## Solution: Backend Duplicate Validation

### Approach: Database Unique Constraint + Backend Check

**Database Changes**:

1. **Normalize phone numbers** (one-time migration):
```sql
-- Migration: 011_normalize_phone_numbers.sql

-- Function to normalize phone to E.164 format
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-digits
  phone := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- If starts with country code, keep it
  IF length(phone) > 10 THEN
    RETURN '+' || phone;
  END IF;
  
  -- Default to India (+91) for 10-digit numbers
  IF length(phone) = 10 THEN
    RETURN '+91' || phone;
  END IF;
  
  -- Return as-is if format is unclear
  RETURN '+' || phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add normalized_phone column
ALTER TABLE leads ADD COLUMN normalized_phone TEXT;

-- Populate normalized_phone from existing phone column
UPDATE leads SET normalized_phone = normalize_phone(phone) WHERE phone IS NOT NULL;

-- Create unique index on normalized_phone
CREATE UNIQUE INDEX idx_leads_normalized_phone ON leads(normalized_phone) WHERE normalized_phone IS NOT NULL;

-- Add trigger to auto-populate normalized_phone on insert/update
CREATE OR REPLACE FUNCTION set_normalized_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.normalized_phone := normalize_phone(NEW.phone);
  ELSE
    NEW.normalized_phone := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_normalized_phone
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_phone();
```

**Backend Implementation**:

1. **POST /api/leads - Add duplicate check before insert**:
```typescript
router.post('/', requireAuth, requireRole('superuser', 'admin', 'agent'), validate(createLeadSchema), async (req: Request, res: Response): Promise<void> => {
  const d = req.body
  try {
    // Check for duplicate phone number
    if (d.phone) {
      const existing = await queryOne<{ id: string; name: string; status: string; assigned_to: string }>(
        `SELECT id, name, status, assigned_to, phone 
         FROM leads 
         WHERE normalized_phone = normalize_phone($1)
         LIMIT 1`,
        [d.phone]
      )
      
      if (existing) {
        // Duplicate found - return 409 Conflict with existing lead info
        res.status(409).json({
          success: false,
          error: 'Duplicate phone number',
          data: {
            existingLead: {
              id: existing.id,
              name: existing.name,
              phone: existing.phone,
              status: existing.status,
              assignedTo: existing.assigned_to
            }
          }
        })
        return
      }
    }
    
    // Proceed with insert (unchanged from current implementation)
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
        d.assignedTo || req.user!.username,
        d.temperature || '',
        d.value || 0,
        d.notes || null,
        d.followUpDate || null,
        req.user!.username,
      ]
    )
    
    // ... rest of the implementation
  } catch (err) {
    // Handle unique constraint violation (fallback)
    if (err.code === '23505') { // PostgreSQL unique violation
      res.status(409).json({
        success: false,
        error: 'Duplicate phone number detected'
      })
      return
    }
    console.error('Create lead error:', err)
    res.status(500).json({ success: false, error: 'Failed to create lead' })
  }
})
```

2. **New Endpoint: GET /api/leads/check-duplicate/:phone**:
```typescript
// Check if phone number already exists (for frontend validation)
router.get('/check-duplicate/:phone', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params
    
    // For agents, only check leads they can see (assigned to them)
    let whereClause = 'WHERE normalized_phone = normalize_phone($1)'
    const params: any[] = [phone]
    
    if (req.user!.role === 'agent') {
      whereClause += ' AND assigned_to = $2'
      params.push(req.user!.username)
    }
    
    const existing = await query<DbLead>(
      `SELECT id, name, phone, status, assigned_to, temperature, value
       FROM leads ${whereClause}`,
      params
    )
    
    res.json({
      success: true,
      data: {
        exists: existing.length > 0,
        leads: existing.map(l => mapLead(l, [], []))
      }
    })
  } catch (err) {
    console.error('Check duplicate error:', err)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})
```

**Frontend Changes**:

1. **PhoneEntryModal - Call backend for duplicate check**:
```typescript
// Replace computed duplicateLeads with async check
const duplicateLeads = ref<Lead[]>([])
const checkingDuplicate = ref(false)

// Watch phone number and check backend
watch([phoneNumber, phonePrefix], async ([newPhone, newPrefix]) => {
  if (!newPhone || newPhone.length < 5) {
    duplicateLeads.value = []
    return
  }
  
  if (!validatePhoneLength(newPrefix, newPhone)) {
    return
  }
  
  checkingDuplicate.value = true
  try {
    const fullPhone = formatPhoneNumber(newPrefix, newPhone)
    const response = await apiClient.get(`/leads/check-duplicate/${encodeURIComponent(fullPhone)}`)
    
    if (response.success && response.data) {
      duplicateLeads.value = response.data.leads || []
    }
  } catch (error) {
    console.error('Duplicate check failed:', error)
    // Fallback to frontend check if backend fails
    duplicateLeads.value = checkLocalDuplicates()
  } finally {
    checkingDuplicate.value = false
  }
}, { debounce: 300 })

// Fallback: local check (existing logic)
function checkLocalDuplicates(): Lead[] {
  if (!phoneNumber.value) return []
  const fullPhone = formatPhoneNumber(phonePrefix.value, phoneNumber.value)
  return leadsStore.leads.filter(lead => {
    if (!lead.phone) return false
    return lead.phone === phoneNumber.value ||
           lead.phone === fullPhone ||
           lead.phone.replace(/\s+/g, '') === `${phonePrefix.value}${phoneNumber.value}`
  })
}
```

2. **LeadsStore - Handle 409 Conflict on create**:
```typescript
async function addNewLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastModified' | 'lastModifiedBy'>, user?: Pick<import('@/types').AuthUser, 'name' | 'role'>): Promise<{ success: boolean; data?: Lead; error?: string; existingLead?: any }> {
  loading.value = true
  try {
    const authStore = useAuthStore()
    const now = formatDateTime()
    const newLead: Lead = {
      id: generateId(),
      ...leadData,
      createdAt: now,
      updatedAt: now,
      lastModified: now,
      lastModifiedBy: user?.name || authStore.user?.name || 'System',
      activities: [],
      tasks: []
    }

    // Push to server
    const response = await apiClient.post('/leads', newLead)
    
    // Handle duplicate error (409)
    if (response.status === 409 && response.data?.existingLead) {
      return {
        success: false,
        error: 'Duplicate phone number',
        existingLead: response.data.existingLead
      }
    }
    
    if (response.data?.data) {
      Object.assign(newLead, response.data.data)
      leads.value.push(newLead)
      addLog(`Created lead ${newLead.name}`, user?.name)
      return { success: true, data: newLead }
    }
    
    return { success: false, error: 'Failed to create lead' }
  } catch (error: any) {
    // Handle 409 from backend
    if (error.response?.status === 409) {
      return {
        success: false,
        error: 'Duplicate phone number',
        existingLead: error.response.data?.data?.existingLead
      }
    }
    console.error('Create lead error:', error)
    return { success: false, error: 'Failed to create lead' }
  } finally {
    loading.value = false
  }
}
```

3. **LeadsManager - Show duplicate error from backend**:
```typescript
// In handleLeadSaved or wherever addNewLead is called
const result = await leadsStore.addNewLead(leadData, authStore.user)

if (!result.success) {
  if (result.existingLead) {
    // Show modal: "Lead already exists, would you like to open it?"
    const confirmed = await showDuplicateConfirmDialog(result.existingLead)
    if (confirmed) {
      editLead(result.existingLead.id)
    }
  } else {
    // Show generic error
    showErrorToast(result.error || 'Failed to create lead')
  }
}
```

---

## Implementation Plan

### Phase 1: Database Setup (30 minutes)
1. ✅ Create migration `010_sessions.sql`
2. ✅ Create migration `011_normalize_phone_numbers.sql`
3. ✅ Apply migrations to database
4. ✅ Test: Verify unique constraint works

### Phase 2: Backend - Session Management (1 hour)
1. ✅ Update `JwtPayload` interface to include `sessionId`
2. ✅ Update POST `/api/auth/login` to create session + invalidate old ones
3. ✅ Update `requireAuth` middleware to validate session
4. ✅ Update POST `/api/auth/logout` to delete session
5. ✅ Add GET `/api/auth/session-status` endpoint
6. ✅ Test: Login → verify session created, old session invalidated

### Phase 3: Backend - Duplicate Detection (45 minutes)
1. ✅ Update POST `/api/leads` to check duplicates before insert
2. ✅ Add GET `/api/leads/check-duplicate/:phone` endpoint
3. ✅ Test: Try creating duplicate → should return 409

### Phase 4: Frontend - Inactivity Tracking (1 hour)
1. ✅ Create `src/composables/useInactivity.ts`
2. ✅ Create `src/components/InactivityWarningModal.vue`
3. ✅ Update `src/stores/auth.ts` with `checkSessionStatus()`
4. ✅ Update `src/App.vue` to integrate inactivity composable
5. ✅ Test: Wait 38min → warning shown, wait 2min → logout

### Phase 5: Frontend - Backend Duplicate Check (45 minutes)
1. ✅ Update `PhoneEntryModal.vue` to call backend API
2. ✅ Update `leadsStore.addNewLead()` to handle 409 errors
3. ✅ Update `LeadsManager.vue` to show duplicate modal on conflict
4. ✅ Test: Enter existing phone → duplicate shown before clicking Continue

### Phase 6: Testing & Deployment (1 hour)
1. ✅ Test single session: Login twice → first session invalidated
2. ✅ Test inactivity: No activity for 40min → auto-logout
3. ✅ Test inactivity warning: Activity at 39min → warning dismissed
4. ✅ Test duplicate: Backend catches duplicate even if frontend misses
5. ✅ Test tab visibility: Switch tabs after 30min idle → session check
6. ✅ Deploy to production

---

## Testing Checklist

### Session Management
- [ ] **Single Session**: Login on device A → Login on device B → Device A session invalidated
- [ ] **Multi-tab same device**: Login tab 1 → Open tab 2 → Both share same session (OK)
- [ ] **Inactivity logout**: No activity for 40min → Auto-logout
- [ ] **Warning modal**: Inactive for 38min → Warning shown with countdown
- [ ] **Extend session**: Click "Stay Logged In" → Session extended, timer reset
- [ ] **Tab switch**: Idle 30min → Switch to tab → Session validated, refreshed
- [ ] **Session expired**: Backend deletes session → Next API call returns 401

### Duplicate Detection
- [ ] **Backend catches duplicate**: Enter existing phone → 409 error from backend
- [ ] **Frontend shows existing lead**: Duplicate detected → Lead card shown
- [ ] **Open existing lead**: Click lead card → Opens in edit modal
- [ ] **Prevent accidental duplicate**: "Continue" button hidden when duplicate found
- [ ] **Create anyway**: Click "Create New Anyway" → Duplicate created (if needed for legitimate cases)
- [ ] **Agent scope**: Agent A creates lead → Agent B enters same phone → Duplicate shown (even though B can't see A's lead in list)
- [ ] **Phone format normalization**: Enter `8452093228` → Matches `+91 8452093228` in DB

---

## Configuration

### Environment Variables (add to .env)
```bash
# Session settings
SESSION_TIMEOUT_MINUTES=40
SESSION_WARNING_MINUTES=38
```

### Cron Job (optional - cleanup old sessions)
```bash
# Run every hour
0 * * * * psql -U lms -d lmsdb -c "SELECT cleanup_expired_sessions();"
```

---

## Rollback Plan

If issues arise:

1. **Session Management**:
   - Disable session validation in `requireAuth` (comment out session check)
   - Users will continue with JWT-only auth (no single-session enforcement)
   
2. **Duplicate Detection**:
   - Remove unique constraint: `DROP INDEX idx_leads_normalized_phone`
   - Frontend-only duplicate check will still work

---

## Success Metrics

1. **Zero multi-login issues**: Users logged out from old session when logging in elsewhere
2. **40-minute inactivity logout**: 100% automated, no manual monitoring needed
3. **Duplicate prevention rate**: >95% of duplicate attempts caught at backend
4. **User experience**: Warning modal gives user chance to extend session (not jarring logout)

---

## Future Enhancements

1. **Session management dashboard** (admin): View all active sessions, force logout
2. **Device management**: "Trusted devices" - longer session on recognized devices
3. **Refresh tokens**: Auto-renew session before expiry (silent refresh)
4. **Push notifications**: "You were logged out from another device"

---

## Files to Create/Modify

### Backend (5 new + 3 modified)
- `backend/db/migrations/010_sessions.sql` ✅ NEW
- `backend/db/migrations/011_normalize_phone_numbers.sql` ✅ NEW
- `backend/src/routes/auth.ts` ✅ MODIFY (login, logout, session-status)
- `backend/src/middleware/auth.ts` ✅ MODIFY (requireAuth with session check)
- `backend/src/routes/leads.ts` ✅ MODIFY (POST with duplicate check, new endpoint)

### Frontend (3 new + 4 modified)
- `src/composables/useInactivity.ts` ✅ NEW
- `src/components/InactivityWarningModal.vue` ✅ NEW
- `src/App.vue` ✅ MODIFY (integrate inactivity)
- `src/stores/auth.ts` ✅ MODIFY (checkSessionStatus)
- `src/components/PhoneEntryModal.vue` ✅ MODIFY (backend duplicate check)
- `src/stores/leads.ts` ✅ MODIFY (handle 409 conflict)
- `src/views/LeadsManager.vue` ✅ MODIFY (show duplicate modal)

### Documentation
- This plan (SESSION_MANAGEMENT_AND_DUPLICATE_DETECTION_PLAN.md) ✅

---

**Total Estimated Time**: 5-6 hours (includes testing)  
**Priority**: HIGH (security + data integrity)
