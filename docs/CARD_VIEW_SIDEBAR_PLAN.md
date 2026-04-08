# Card View Mode — Sidebar Trigger Plan

**Created:** April 8, 2026  
**Goal:** Move card view toggle out of the always-visible bar into the sidebar's Kanban Board button  
**Trigger:**
- **Desktop**: Hamburger → Right-click "Kanban Board" → View picker popover
- **Mobile**: Hamburger → Long-press "Kanban Board" → View picker bottom sheet

---

## Current State

**Card view toggle bar** (in `LeadsManager.vue`, always visible in kanban view):
```
[ Cards | Compact | List ]   ← occupies ~44px in the header area
```

**SideMenu.vue Kanban Board button** (simple tap):
```vue
<button @click="switchView('kanban')">
  <i class="ph-bold ph-kanban"></i>
  <span>Kanban Board</span>
</button>
```

---

## Target Behavior

### Desktop (right-click)
1. User opens hamburger → sidebar slides in
2. User right-clicks "Kanban Board" button
3. **Bottom sheet slides up from bottom** (same as mobile, same as card long-press)
4. Click an option → mode changes + sidebar + sheet both close
5. Normal left-click → switch to kanban without changing view mode (existing behavior)

### Mobile (long-press)
1. User opens hamburger → sidebar slides in
2. User long-presses "Kanban Board" button (500ms threshold)
3. **Bottom sheet slides up from bottom** (same as card long-press)
4. Tap an option → mode changes + sidebar + sheet both close
5. Normal tap → switch to kanban without changing view mode (existing behavior)

### Visual Hint
- Add a small `⋮` or current mode icon on the right side of the "Kanban Board" button
- Indicates "more options available"
- Tooltip on desktop: "Right-click for view options"

---

## What Gets Removed

**The always-visible card view toggle bar** in `LeadsManager.vue`:
```vue
<!-- Card View Mode Toggle (Kanban View Only) --> ← DELETE THIS ENTIRE BLOCK
<div v-if="currentView === 'kanban'" class="bg-white border-b border-slate-200 px-3 py-2">
  ...Cards | Compact | List toggle...
</div>
```

**Space saved:** ~44px from the header area on all devices

---

## Implementation Plan

### Step 1: Add Card View Sheet Component (`CardViewSheet.vue`)

New file: `src/components/CardViewSheet.vue`

**Purpose:** Bottom sheet for selecting card view mode (used on both mobile and desktop)

**Props:**
```typescript
interface Props {
  isOpen: boolean
  currentMode: 'normal' | 'compact' | 'list'
}
interface Emits {
  (e: 'close'): void
  (e: 'select', mode: 'normal' | 'compact' | 'list'): void
}
```

**Template** (full-screen bottom sheet, mobile AND desktop):
```vue
<Teleport to="body">
  <Transition name="sheet">
    <div v-if="isOpen" class="fixed inset-0 z-[70]">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')"></div>
      
      <!-- Sheet Panel -->
      <div class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-w-md mx-auto">
        <!-- Handle Bar -->
        <div class="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
        
        <!-- Title -->
        <h3 class="font-bold text-slate-800 text-lg mb-4">Card View</h3>
        
        <!-- Options -->
        <div class="space-y-2">
          <button 
            @click="emit('select', 'normal')" 
            class="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-slate-50 transition"
            :class="currentMode === 'normal' ? 'border-primary bg-primary/5' : 'border-slate-200'"
          >
            <i class="ph-bold ph-cards text-2xl" :class="currentMode === 'normal' ? 'text-primary' : 'text-slate-600'"></i>
            <div class="flex-1 text-left">
              <div class="font-semibold text-slate-800">Cards</div>
              <div class="text-xs text-slate-500">Full detail, ~70px per card</div>
            </div>
            <i v-if="currentMode === 'normal'" class="ph-bold ph-check text-primary text-xl"></i>
          </button>
          
          <button 
            @click="emit('select', 'compact')" 
            class="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-slate-50 transition"
            :class="currentMode === 'compact' ? 'border-primary bg-primary/5' : 'border-slate-200'"
          >
            <i class="ph-bold ph-rows text-2xl" :class="currentMode === 'compact' ? 'text-primary' : 'text-slate-600'"></i>
            <div class="flex-1 text-left">
              <div class="font-semibold text-slate-800">Compact</div>
              <div class="text-xs text-slate-500">Condensed, ~60px per card</div>
            </div>
            <i v-if="currentMode === 'compact'" class="ph-bold ph-check text-primary text-xl"></i>
          </button>
          
          <button 
            @click="emit('select', 'list')" 
            class="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-slate-50 transition"
            :class="currentMode === 'list' ? 'border-primary bg-primary/5' : 'border-slate-200'"
          >
            <i class="ph-bold ph-list-dashes text-2xl" :class="currentMode === 'list' ? 'text-primary' : 'text-slate-600'"></i>
            <div class="flex-1 text-left">
              <div class="font-semibold text-slate-800">List</div>
              <div class="text-xs text-slate-500">Ultra-compact, ~45px per row</div>
            </div>
            <i v-if="currentMode === 'list'" class="ph-bold ph-check text-primary text-xl"></i>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</Teleport>
```

**Animation CSS** (matches QuickActionsSheet):
```css
.sheet-enter-active, .sheet-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.sheet-enter-from, .sheet-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
```

---

### Step 2: Update SideMenu.vue

**File:** `src/components/SideMenu.vue`

**Props change:**
```typescript
interface Props {
  isOpen: boolean
  cardViewMode?: 'normal' | 'compact' | 'list'  // ADD
}
interface Emits {
  (e: 'close'): void
  (e: 'view-change', view: string): void
  (e: 'open-settings'): void
  (e: 'card-view-change', mode: 'normal' | 'compact' | 'list'): void  // ADD
}
```

**Kanban Board button changes:**

Replace simple button:
```vue
<button @click="switchView('kanban')" ...>
  <i class="ph-bold ph-kanban text-lg"></i>
  <span class="font-medium">Kanban Board</span>
</button>
```

With long-press + right-click aware button that opens the bottom sheet:
```vue
<button
  @click="switchView('kanban')"
  @contextmenu.prevent="isCardViewSheetOpen = true"
  @touchstart="startLongPress"
  @touchend="cancelLongPress"
  @touchcancel="cancelLongPress"
  class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
>
  <i class="ph-bold ph-kanban text-lg"></i>
  <span class="font-medium">Kanban Board</span>
  
  <!-- Hint: current view mode icon + dots -->
  <div class="ml-auto flex items-center gap-1">
    <i :class="modeIcon" class="text-sm text-primary"></i>
    <i class="ph-bold ph-dots-three text-sm text-slate-400"></i>
  </div>
</button>
```

**Script additions:**
```typescript
import { ref, computed } from 'vue'
import CardViewSheet from './CardViewSheet.vue'

const isCardViewSheetOpen = ref(false)
let longPressTimer: number | null = null

const startLongPress = () => {
  longPressTimer = window.setTimeout(() => {
    if ('vibrate' in navigator) navigator.vibrate(50)
    isCardViewSheetOpen.value = true
  }, 500)
}

const cancelLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const handleCardViewSelect = (mode: 'normal' | 'compact' | 'list') => {
  emit('card-view-change', mode)
  isCardViewSheetOpen.value = false
  emit('close')  // also close sidebar
}

const modeIcon = computed(() => {
  const mode = props.cardViewMode || 'normal'
  return {
    'normal': 'ph-bold ph-cards',
    'compact': 'ph-bold ph-rows',
    'list': 'ph-bold ph-list-dashes'
  }[mode]
})
```

**Add CardViewSheet to template** (after the closing `</Transition>` of the sidebar):
```vue
<!-- Card View Selection Sheet (both mobile and desktop) -->
<CardViewSheet
  :is-open="isCardViewSheetOpen"
  :current-mode="cardViewMode || 'normal'"
  @close="isCardViewSheetOpen = false"
  @select="handleCardViewSelect"
/>
```

---

### Step 3: Update LeadsManager.vue

**Pass cardViewMode to SideMenu:**
```vue
<SideMenu
  :is-open="menuOpen"
  :card-view-mode="cardViewMode"
  @card-view-change="setCardViewMode"
  @close="menuOpen = false"
  @view-change="handleMenuViewChange"
  @open-settings="showUserManagement = true"
/>
```

**Remove the always-visible toggle bar:**
```vue
<!-- DELETE THIS ENTIRE BLOCK -->
<div v-if="currentView === 'kanban'" class="bg-white border-b border-slate-200 px-3 py-2 shrink-0">
  ...
</div>
```

---

### Step 4: UX Details

**Visual hint on Kanban Board button:**
- Right side shows: current mode icon (tiny, muted) + `⋯` dots
- Examples:
  - Normal mode: `🃏 ···`
  - Compact mode: `≡ ···`
  - List mode: `☰ ···`
- Tooltip (desktop): `title="Right-click for view options"`

**Discoverability:**
- First-time hint: Show a small animated pulse on the `⋯` icon for first 3 opens of the sidebar
- Store shown state in `localStorage('cardViewHintSeen')`

**Behavior (both platforms use same bottom sheet):**
- Desktop: Right-click → bottom sheet slides up from bottom center (max-w-md)
- Mobile: Long-press → bottom sheet slides up from bottom (full width)
- Both: Same UI, same animation, same pattern as card long-press

---

### Step 5: Implementation Notes

**Z-index:**
- Bottom sheet: `z-[70]` (above sidebar which is `z-[60]`)
- Same as QuickActionsSheet pattern

**Long-press in sidebar vs card long-press:**
- Both use 500ms threshold
- Sidebar long-press triggers view mode sheet
- Card long-press triggers Quick Actions sheet
- No conflict — different DOM elements, different sheets

**Close behavior:**
- Select a mode → sheet closes + sidebar closes (both close)
- Tap backdrop → sheet closes only (sidebar stays open)
- Normal tap on Kanban Board → switches view, doesn't open sheet

**Edge case: User not on Kanban view:**
- User opens hamburger, long-presses Kanban Board → sheet opens → selects Compact mode
- Result: app switches to Kanban view AND applies Compact mode in one action
- `handleCardViewSelect()` emits `card-view-change` + parent handles view switch if needed

---

## Files to Change

| File | Type | Change |
|------|------|--------|
| `src/components/SideMenu.vue` | Modify | Add long-press, right-click, inline picker, emit |
| `src/components/CardViewSheet.vue` | **New** | Mobile bottom sheet for view mode selection |
| `src/views/LeadsManager.vue` | Modify | Remove toggle bar, pass cardViewMode, handle new emit |

---

## Space Savings

**Current:** Always-visible toggle bar takes ~44px
**After:** Zero — toggle hidden in sidebar (only visible when hamburger is open)

**Net gain:** 44px more space for Kanban content on all devices

---

## Estimated Effort

- Step 1 (CardViewSheet.vue): 45 min (simplified — one UI for both platforms)
- Step 2 (SideMenu.vue changes): 30 min (just sheet trigger, no inline picker)
- Step 3 (LeadsManager.vue cleanup): 15 min
- Testing all scenarios: 20 min (fewer test cases)
- Deploy: 15 min

**Total: ~2 hours** (reduced from 2.5hr with simpler approach)

---

## Testing Checklist

- [ ] Desktop: Right-click "Kanban Board" → bottom sheet appears
- [ ] Desktop: Click option → mode changes + sheet closes + sidebar closes
- [ ] Desktop: Click backdrop → sheet closes, sidebar stays open
- [ ] Mobile: Long-press "Kanban Board" → bottom sheet appears with vibration
- [ ] Mobile: Tap option → mode changes + sheet closes + sidebar closes
- [ ] Normal tap/click "Kanban Board" → switches to kanban view, no sheet
- [ ] Mode hint icon (🃏/≡/☰) updates to reflect current mode
- [ ] Edge case: long-press from non-kanban view → switches view + applies mode
- [ ] `cardViewMode` persists to localStorage
- [ ] Compact/List mode still works correctly after mode switch
- [ ] Card long-press still opens Quick Actions sheet (no conflict)
- [ ] Toggle bar is fully removed (44px recovered, no layout shift)
- [ ] Sheet appears centered on desktop (max-w-md), full-width on mobile
- [ ] Verify on 375px, 768px, 1280px viewports
