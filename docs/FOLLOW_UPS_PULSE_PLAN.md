# Follow Ups Button Pulse Indicator Plan

## Current State

**Follow Ups Button Location:** Header right side (LeadsManager.vue line 28)
```vue
<button @click="isFollowUpsSidebarOpen = !isFollowUpsSidebarOpen" 
  class="p-2 text-primary hover:bg-primary/10 rounded-full transition">
  <i class="ph-bold ph-calendar-check text-lg sm:text-xl"></i>
</button>
```

**Existing Infrastructure:**
- `useFollowUpTracking()` composable with:
  - `isFollowUpOverdue(lead)` - checks if follow-up date < today
  - `isFollowUpToday(lead)` - checks if follow-up date === today
  - `getFollowUpDate(lead)` - gets follow-up from activities/tasks
- `FollowUpsSidebar.vue` already categorizes into Overdue/Today/Upcoming
- LeadsManager already imports leads from store

**Current Visual State:** Static icon, no urgency indicator

---

## Target Behavior

**Urgent Follow-ups Definition:**
- **Overdue:** Follow-up date is in the past
- **Today:** Follow-up date is today (current day in IST)

**Visual Effect When Urgent Items Exist:**
1. **Red pulsing ring animation** around the button
2. **Red badge with count** of urgent items (Today + Overdue)
3. **Button icon changes to red** instead of primary color
4. **Animation stops** when sidebar is opened (acknowledgment)

**Visual Effect When No Urgent Items:**
- Normal state: primary color icon, no pulse, no badge
- Hover: bg-primary/10 (unchanged)

---

## Implementation Plan

### Step 1: Add Urgent Count Logic (LeadsManager.vue)

**Import composable:**
```typescript
import { useFollowUpTracking } from '@/composables/useFollowUpTracking'
```

**Add computed for urgent count:**
```typescript
const { isFollowUpOverdue, isFollowUpToday } = useFollowUpTracking()

const urgentFollowUpsCount = computed(() => {
  return leadsStore.leads.filter(lead => 
    isFollowUpOverdue(lead) || isFollowUpToday(lead)
  ).length
})

const hasUrgentFollowUps = computed(() => urgentFollowUpsCount.value > 0)
```

---

### Step 2: Update Button Template

**Replace existing button with:**
```vue
<button 
  @click="handleFollowUpsClick" 
  class="relative p-2 rounded-full transition"
  :class="hasUrgentFollowUps 
    ? 'text-red-500 hover:bg-red-50' 
    : 'text-primary hover:bg-primary/10'"
>
  <!-- Pulsing ring animation (only when urgent AND sidebar closed) -->
  <span 
    v-if="hasUrgentFollowUps && !isFollowUpsSidebarOpen" 
    class="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping"
  ></span>
  
  <!-- Icon -->
  <i class="ph-bold ph-calendar-check text-lg sm:text-xl relative z-10"></i>
  
  <!-- Count badge -->
  <span 
    v-if="hasUrgentFollowUps" 
    class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center z-20"
  >
    {{ urgentFollowUpsCount > 99 ? '99+' : urgentFollowUpsCount }}
  </span>
</button>
```

**Add click handler:**
```typescript
const handleFollowUpsClick = () => {
  isFollowUpsSidebarOpen.value = !isFollowUpsSidebarOpen.value
  // Pulse stops naturally when sidebar opens (v-if condition)
}
```

---

### Step 3: Add Animation CSS (if not already in Tailwind)

Tailwind's `animate-ping` utility should work out-of-box. If customization needed:

```css
@keyframes ping-slow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.75;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.5;
  }
}

.animate-ping-slow {
  animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
```

---

## Visual Design Spec

### Normal State (No Urgent Items)
```
┌─────────┐
│  📅     │  ← Primary color (#4f46e5)
│         │     No badge, no pulse
└─────────┘
```

### Urgent State (Overdue or Today items exist, sidebar closed)
```
┌─────────┐
│ (💫)    │  ← Red pulsing ring (animate-ping)
│  📅  ③  │  ← Red icon + red badge with count
│         │     Badge shows total urgent count
└─────────┘
```

### Urgent State (Sidebar open - acknowledgment)
```
┌─────────┐
│  📅  ③  │  ← Red icon + badge, NO pulse
│         │     User has acknowledged by opening
└─────────┘
```

---

## Edge Cases

1. **Count > 99:** Show "99+" in badge
2. **Zero urgent but sidebar open:** Normal state (primary color, no badge)
3. **New urgent item arrives while sidebar open:** Badge appears but no pulse (user is already viewing)
4. **Sidebar closed → urgent count drops to 0:** Pulse stops, transitions to normal state
5. **Mobile vs Desktop:** Same behavior on all screen sizes

---

## Behavior Summary

| Urgent Count | Sidebar Open | Button Color | Pulse | Badge |
|--------------|--------------|--------------|-------|-------|
| 0            | No           | Primary      | No    | No    |
| 0            | Yes          | Primary      | No    | No    |
| 1+           | No           | Red          | Yes   | Yes   |
| 1+           | Yes          | Red          | No    | Yes   |

**Pulse stops when:**
- User opens sidebar (acknowledgment)
- Urgent count drops to 0

**Pulse resumes when:**
- Sidebar is closed AND urgent count > 0

---

## Files to Change

| File | Type | Change |
|------|------|--------|
| `src/views/LeadsManager.vue` | Modify | Import composable, add computed, update button template |

---

## Testing Checklist

- [ ] No urgent items → button is primary color, no badge, no pulse
- [ ] 1 overdue item → red button, badge "1", pulsing ring
- [ ] 1 today item → red button, badge "1", pulsing ring
- [ ] 5 overdue + 3 today → badge shows "8", pulsing
- [ ] 100+ urgent → badge shows "99+"
- [ ] Open sidebar → pulse stops, badge remains
- [ ] Close sidebar (urgent still exist) → pulse resumes
- [ ] Create new task due today → count increments, pulse visible
- [ ] Complete overdue task → count decrements, pulse stops if 0
- [ ] Mobile viewport (375px) → badge visible, doesn't overflow
- [ ] Desktop viewport (1280px) → animation smooth, no jank

---

## Estimated Effort

- Step 1 (Logic): 10 minutes
- Step 2 (Template): 15 minutes
- Step 3 (CSS - if needed): 5 minutes
- Testing: 10 minutes

**Total: ~40 minutes**

---

## Alternative Approach (Simpler)

If the full pulsing effect is too aggressive, a minimal approach:

**Minimal Red Dot Indicator:**
```vue
<button class="relative">
  <i class="ph-bold ph-calendar-check"></i>
  <!-- Just a static red dot, no pulse -->
  <span 
    v-if="hasUrgentFollowUps" 
    class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
  ></span>
</button>
```

This is less intrusive but might be missed by users. The pulsing ring is more attention-grabbing for urgent items.

---

## Recommended: Full Pulsing Implementation

The full pulsing ring + badge approach is recommended because:
1. **Cannot be missed** - animation draws eye
2. **Shows count** - user knows volume of urgent items
3. **Stops when acknowledged** - not annoying (pulse ends on open)
4. **Consistent with urgency** - red color + motion = requires action
5. **Mobile-friendly** - large enough touch target with visual feedback
