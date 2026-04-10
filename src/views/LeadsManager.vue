<template>
  <div 
    @touchstart="handlePullStart"
    @touchmove="handlePullMove"
    @touchend="handlePullEnd"
    class="h-[100dvh] w-full flex flex-col bg-slate-50 overflow-hidden"
  >
    <!-- Pull-to-refresh indicator -->
    <Transition name="fade">
      <div 
        v-if="pullState.pulling && pullState.distance > 0" 
        class="absolute top-0 left-0 right-0 flex justify-center items-center bg-gradient-to-b from-blue-50 to-transparent z-30 pointer-events-none"
        :style="{ height: `${Math.min(pullState.distance, 120)}px`, opacity: Math.min(pullState.distance / 80, 1) }"
      >
        <div class="flex flex-col items-center gap-1 mt-2">
          <i 
            class="ph-bold ph-arrows-clockwise text-blue-600 transition-transform text-2xl"
            :class="{ 'animate-spin': pullState.distance > pullState.threshold }"
            :style="{ transform: `rotate(${pullState.distance * 2}deg)` }"
          ></i>
          <span class="text-xs font-semibold text-blue-600">
            {{ pullState.distance > pullState.threshold ? 'Release to refresh' : 'Pull to refresh' }}
          </span>
        </div>
      </div>
    </Transition>
    
    <!-- HEADER -->
    <header class="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center shadow-sm z-20 shrink-0">
      <!-- Left Side: Menu + Brand -->
      <div class="flex items-center gap-1 sm:gap-3 overflow-hidden">
        <button @click="isMenuOpen = !isMenuOpen" class="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg active:bg-slate-200 transition flex-shrink-0">
          <i class="ph-bold ph-list text-2xl"></i>
        </button>
        <div class="flex items-center gap-1 sm:gap-2 overflow-hidden">
          <div class="bg-primary/10 p-1.5 rounded-lg flex-shrink-0">
            <span v-if="appStore.appLogo" class="text-xl leading-none select-none">{{ appStore.appLogo }}</span>
            <svg v-else width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h24v20c0 0-2-3-4-3s-2 3-4 3-2-3-4-3-2 3-4 3-2-3-4-3-2 3-4 3V4z" fill="#FFD700"/>
              <circle cx="10" cy="12" r="2.5" fill="#000"/>
              <circle cx="22" cy="12" r="2.5" fill="#000"/>
              <circle cx="10" cy="11" r="1" fill="#fff"/>
              <circle cx="22" cy="11" r="1" fill="#fff"/>
            </svg>
          </div>
          <h1 class="text-lg font-bold tracking-tight text-slate-900 hidden sm:block whitespace-nowrap">{{ appStore.appName }}</h1>
          <h1 class="text-base font-bold tracking-tight text-slate-900 sm:hidden whitespace-nowrap">{{ appStore.appName.split(' ')[0] }}</h1>
        </div>
      </div>

      <!-- Right Side: Actions -->
      <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button 
          @click="isFollowUpsSidebarOpen = !isFollowUpsSidebarOpen" 
          class="relative p-2 rounded-full transition"
          :class="hasUrgentFollowUps ? 'text-red-500 hover:bg-red-50' : 'text-primary hover:bg-primary/10'"
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
        <button @click="isSearchOpen = !isSearchOpen" class="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition">
          <i class="ph-bold ph-magnifying-glass text-lg sm:text-xl"></i>
        </button>
        <NotificationDropdown @open-lead="editLead" />
        <button @click="syncData" class="p-2 rounded-full transition relative group"
          :class="syncFeedbackStatus === 'success' ? 'text-green-600 hover:bg-green-50' : syncFeedbackStatus === 'error' ? 'text-red-500 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'"
        >
          <span v-if="syncFeedbackStatus === 'syncing'" class="text-2xl">{{ syncMoon.getCurrentMoon() }}</span>
          <i v-else-if="syncFeedbackStatus === 'success'" class="ph-bold ph-check-circle text-lg sm:text-xl"></i>
          <i v-else-if="syncFeedbackStatus === 'error'" class="ph-bold ph-warning-circle text-lg sm:text-xl"></i>
          <i v-else class="ph-bold ph-arrows-clockwise text-lg sm:text-xl"></i>
          <!-- Sync tooltip -->
          <div class="absolute right-0 top-full mt-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Last sync: {{ getTimeSinceSync() }}
          </div>
        </button>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded hidden md:block">
          {{ currentUser?.username || 'User' }}
        </span>
      </div>
    </header>

    <!-- Mobile Tabs -->
    <nav v-if="showMobileTabs" class="md:hidden bg-white border-b border-slate-200 py-2 shrink-0 z-10">
      <div class="flex px-3 gap-1.5 w-full">
        <button
          v-for="status in statusConfig"
          :key="status.id"
          @click="activeStatus = status.id as LeadStatus; activeMobileTab = status.id as LeadStatus"
          :class="[
            'mobile-tab-btn',
            activeStatus === status.id ? 'active' : ''
          ]"
        >
          {{ status.id }}
        </button>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-hidden relative w-full">
      <!-- Loading Overlay -->
      <div v-if="leadsStore.loading" class="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
        <i class="ph-bold ph-spinner-gap animate-spin text-4xl text-primary"></i>
      </div>
      <!-- KANBAN VIEW -->
      <div v-if="currentView === 'kanban'" class="h-full w-full">
        <KanbanBoard
          :leads="scopedLeads"
          :get-user-name="getUserName"
          :active-mobile-tab="activeMobileTab"
          :view-mode="cardViewMode"
          @open="(id) => editLead(id, undefined, true)"
          @edit-activity="(id) => editLead(id, 'activity')"
          @edit-task="(id) => editLead(id, 'task')"
          @move="handleMove"
        />
      </div>

      <!-- TABLE VIEW -->
      <div v-else-if="currentView === 'table'" class="h-full w-full overflow-hidden">
        <LeadsTable
          :leads="scopedLeads"
          @open="editLead"
        />
      </div>

      <!-- REPORTS VIEW -->
      <div v-else-if="currentView === 'reports'" class="h-full w-full overflow-hidden">
        <ReportsView
          :leads="scopedLeads"
        />
      </div>
    </main>

    <!-- Follow-ups Sidebar -->
    <FollowUpsSidebar
      :is-open="isFollowUpsSidebarOpen"
      @close="isFollowUpsSidebarOpen = false"
      @open-lead="editLead"
    />

    <!-- Mobile Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-slate-200 px-1 py-2 flex justify-around items-center z-40 h-20">
      <button
        @click="currentView = 'kanban'; showMobileTabs = true"
        :class="['flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition w-14', currentView === 'kanban' ? 'bg-slate-100 text-primary' : 'text-slate-600 hover:bg-slate-50']"
      >
        <i class="ph-bold ph-kanban text-2xl"></i>
        <span class="text-xs font-semibold">Board</span>
      </button>
      <button
        @click="currentView = 'table'; showMobileTabs = false"
        :class="['flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition w-14', currentView === 'table' ? 'bg-slate-100 text-primary' : 'text-slate-600 hover:bg-slate-50']"
      >
        <i class="ph-bold ph-table text-2xl"></i>
        <span class="text-xs font-semibold">Leads</span>
      </button>
      <button
        @click="currentView = 'reports'; showMobileTabs = false"
        :class="['flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition w-14', currentView === 'reports' ? 'bg-slate-100 text-primary' : 'text-slate-600 hover:bg-slate-50']"
      >
        <i class="ph-bold ph-chart-bar text-2xl"></i>
        <span class="text-xs font-semibold">Reports</span>
      </button>
      <button
        @click="isMenuOpen = true"
        class="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition w-14"
      >
        <i class="ph-bold ph-list text-2xl"></i>
        <span class="text-xs font-semibold">More</span>
      </button>
    </nav>

    <!-- FAB Button -->
    <div class="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50">
      <button
        @click="openAddLead"
        class="bg-primary hover:bg-indigo-600 text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition transform active:scale-95"
      >
        <i class="ph-bold ph-plus text-2xl"></i>
      </button>
    </div>

    <!-- MODALS -->
    <PhoneEntryModal
      :is-open="isPhoneModalOpen"
      @close="isPhoneModalOpen = false"
      @submit="handlePhoneSubmit"
      @open-existing="editLead"
    />

    <LeadModal
      :is-open="isLeadModalOpen"
      :mode="leadModalMode"
      :lead-id="selectedLeadId"
      :prefill-phone="pendingPhoneNumber"
      :initial-tab="leadInitialTab"
      @close="closeLeadModal"
      @saved="handleLeadSaved"
    />

    <SearchModal
      :is-open="isSearchOpen"
      @close="isSearchOpen = false"
      @select="handleSearchSelect"
    />

    <SideMenu
      :is-open="isMenuOpen"
      :card-view-mode="cardViewMode"
      :kanban-filter-mode="kanbanFilterMode"
      @close="isMenuOpen = false"
      @view-change="handleMenuViewChange"
      @card-view-change="setCardViewMode"
      @lead-scope-change="setLeadScope"
      @open-settings="isUserManagementOpen = true"
    />

    <UserManagementModal
      :is-open="isUserManagementOpen"
      @close="isUserManagementOpen = false"
    />

    <!-- PWA Install Prompt -->
    <InstallPWA />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLeadsStore } from '@/stores/leads'
import { useAppStore } from '@/stores/app'
import { useMoonLoading } from '@/composables/useMoonLoading'
import type { LeadStatus, Lead } from '@/types'
import LeadModal from '@/components/LeadModal.vue'
import SearchModal from '@/components/SearchModal.vue'
import SideMenu from '@/components/SideMenu.vue'
import LeadsTable from '@/components/LeadsTable.vue'
import ReportsView from '@/components/ReportsView.vue'
import KanbanBoard from '@/components/KanbanBoard.vue'
import PhoneEntryModal from '@/components/PhoneEntryModal.vue'
import FollowUpsSidebar from '@/components/FollowUpsSidebar.vue'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import InstallPWA from '@/components/InstallPWA.vue'
import UserManagementModal from '@/components/UserManagementModal.vue'

const authStore = useAuthStore()
const leadsStore = useLeadsStore()
const appStore = useAppStore()
const syncMoon = useMoonLoading()

const currentUser = computed(() => authStore.user)

// Helper: Get the earliest relevant date from followUpDate or pending tasks (same as sidebar)
const getEarliestDate = (lead: Lead): Date | null => {
  const dates: Date[] = []
  
  // Add followUpDate if exists
  if (lead.followUpDate) {
    dates.push(new Date(lead.followUpDate))
  }
  
  // Add pending task due dates
  if (lead.tasks) {
    lead.tasks
      .filter(task => task.status === 'pending' && task.dueDate)
      .forEach(task => dates.push(new Date(task.dueDate!)))
  }
  
  if (dates.length === 0) return null
  return new Date(Math.min(...dates.map(d => d.getTime())))
}

// Urgent follow-ups tracking (using same logic as sidebar)
const urgentFollowUpsCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return leadsStore.leads.filter(lead => {
    const earliestDate = getEarliestDate(lead)
    if (!earliestDate) return false
    earliestDate.setHours(0, 0, 0, 0)
    
    // Is overdue or is today
    return earliestDate.getTime() <= today.getTime()
  }).length
})

const hasUrgentFollowUps = computed(() => urgentFollowUpsCount.value > 0)
const activeStatus = ref<LeadStatus>('New')
const activeMobileTab = ref<LeadStatus>('New')
const currentView = ref('kanban')
const showMobileTabs = ref(true)
const isMdScreen = ref(window.innerWidth >= 768)
const cardViewMode = ref<'normal' | 'compact' | 'list'>(
  (localStorage.getItem('cardViewMode') as 'normal' | 'compact' | 'list') || 'normal'
)

// Lead scope filter mode (All/Me toggle)
const kanbanFilterMode = ref<'all' | 'me'>(
  (localStorage.getItem('kanban_filter_mode') as 'all' | 'me') || 'all'
)

// Pull-to-refresh state
const pullState = ref({
  pulling: false,
  startY: 0,
  currentY: 0,
  distance: 0,
  threshold: 80
})

const statusConfig = [
  { id: 'New', color: 'bg-blue-500' },
  { id: 'Contacted', color: 'bg-yellow-500' },
  { id: 'Proposal', color: 'bg-purple-500' },
  { id: 'Won', color: 'bg-green-500' },
  { id: 'Lost', color: 'bg-red-500' }
]

// Apply filters from store
const filteredLeads = computed(() => leadsStore.filteredLeads)

// Scoped leads: respect both role permissions and user-selected All/Me toggle
const scopedLeads = computed(() => {
  // Agent role: backend already filters, always see only their leads
  if (!authStore.canSeeAllLeads) {
    return filteredLeads.value
  }
  
  // Admin/Superuser: respect the All/Me toggle
  if (kanbanFilterMode.value === 'me') {
    return filteredLeads.value.filter(
      lead => lead.assignedTo === authStore.user?.username
    )
  }
  
  return filteredLeads.value // All leads
})

const getUserName = (id?: string) => {
  if (!id) return ''
  // Simple username display - in real app would lookup from users list
  return id
}

// Modal state
const isMenuOpen = ref(false)
const isUserManagementOpen = ref(false)
const isSearchOpen = ref(false)
const isPhoneModalOpen = ref(false)
const isLeadModalOpen = ref(false)
const isFollowUpsSidebarOpen = ref(false)
const leadModalMode = ref<'add' | 'edit' | 'view'>('add')
const selectedLeadId = ref<string>('')
const pendingPhoneNumber = ref<string>('')

// Initialize on first load  
onMounted(async () => {
  // Ensure auth is validated first
  await authStore.checkAuth()
  
  // Only proceed if authenticated
  if (authStore.isAuthenticated) {
    // Load leads, users and app settings
    const result = await leadsStore.fetchLeads()
    
    // Log error if fetch failed (error banner could be added here)
    if (!result.success) {
      console.error('Failed to load leads:', result.error)
    }
    
    // Only fetch users if user has permission (admin/superuser)
    // Agent and user roles don't have access to /api/users
    if (authStore.canManageUsers()) {
      appStore.fetchUsers()
    }
    
    appStore.fetchAppSettings()

    // Adaptive polling setup
    setupAdaptivePolling()
  }

  // Handle window resize
  const handleResize = () => {
    isMdScreen.value = window.innerWidth >= 768
  }
  window.addEventListener('resize', handleResize)
})

// Adaptive Polling
const isUserActive = ref(true)
const lastSyncTime = ref<Date>(new Date())
const syncFeedbackStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')
let syncIntervalId: number | null = null

function setupAdaptivePolling() {
  // Detect user activity
  const handleVisibilityChange = () => {
    isUserActive.value = !document.hidden
    
    // Restart polling with appropriate interval
    if (syncIntervalId) {
      clearInterval(syncIntervalId)
    }
    startPolling()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Initial polling start
  startPolling()
}

function startPolling() {
  // Increased intervals to reduce API calls: 10s active, 60s idle
  // Prevents hitting rate limit (1000 req/15min)
  const interval = isUserActive.value ? 10000 : 60000 // 10s active, 60s idle
  
  syncIntervalId = window.setInterval(async () => {
    try {
      await leadsStore.checkForServerUpdates()
      lastSyncTime.value = new Date()
    } catch (error) {
      console.error('Sync error:', error)
    }
  }, interval)
}

function getTimeSinceSync(): string {
  const now = new Date()
  const diffMs = now.getTime() - lastSyncTime.value.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  
  if (diffSecs < 10) return 'just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h ago`
}

// Modal handlers
const openAddLead = () => {
  // Open phone entry modal first
  isPhoneModalOpen.value = true
}

const handlePhoneSubmit = (phone: string) => {
  // Store phone and open lead modal
  pendingPhoneNumber.value = phone
  leadModalMode.value = 'add'
  selectedLeadId.value = ''
  isLeadModalOpen.value = true
}

const leadInitialTab = ref<'info' | 'activity' | 'task' | 'contact'>('info')

const editLead = (leadId?: string, tab?: string, viewOnly?: boolean) => {
  // Guard against undefined leadId
  if (!leadId || leadId === 'undefined') {
    return
  }
  selectedLeadId.value = leadId
  leadModalMode.value = viewOnly ? 'view' : 'edit'
  leadInitialTab.value = (tab as 'info' | 'activity' | 'task' | 'contact') || 'info'
  isLeadModalOpen.value = true
  isPhoneModalOpen.value = false // Close phone modal if open
}

const closeLeadModal = () => {
  isLeadModalOpen.value = false
  pendingPhoneNumber.value = '' // Clear pending phone
}

const handleLeadSaved = () => {
  isLeadModalOpen.value = false
  pendingPhoneNumber.value = '' // Clear pending phone
}

const handleSearchSelect = (lead: any) => {
  if (!lead?.id) return
  editLead(lead.id, undefined, true)
  isSearchOpen.value = false
}

const setCardViewMode = (mode: 'normal' | 'compact' | 'list') => {
  cardViewMode.value = mode
  localStorage.setItem('cardViewMode', mode)
}

const setLeadScope = (mode: 'all' | 'me') => {
  kanbanFilterMode.value = mode
  localStorage.setItem('kanban_filter_mode', mode)
}

const handleMenuViewChange = (view: string) => {
  currentView.value = view
  if (view === 'kanban') {
    showMobileTabs.value = true
  } else {
    showMobileTabs.value = false
  }
}

const handleMove = async (leadId: string, newStatus: LeadStatus) => {
  // Prevent moving to Lost status via kanban board
  // Lost status requires Lost Reason Modal
  if (newStatus === 'Lost') {
    console.warn('Cannot move lead to Lost status via kanban. Use edit modal to provide lost reason.')
    return
  }
  
  try {
    await leadsStore.updateLeadData(leadId, { status: newStatus })
  } catch (error) {
    console.error('Failed to move lead:', error)
  }
}

// Pull-to-refresh handlers
function handlePullStart(e: TouchEvent) {
  // Only activate if scrolled to top and not already syncing
  const mainElement = e.currentTarget as HTMLElement
  if (mainElement.scrollTop === 0 && syncFeedbackStatus.value !== 'syncing') {
    pullState.value.startY = e.touches[0].clientY
    pullState.value.pulling = true
  }
}

function handlePullMove(e: TouchEvent) {
  if (!pullState.value.pulling) return
  
  pullState.value.currentY = e.touches[0].clientY
  pullState.value.distance = Math.max(0, pullState.value.currentY - pullState.value.startY)
  
  // Prevent default scroll if pulling down (distance > 0 and < 120px)
  if (pullState.value.distance > 0 && pullState.value.distance < 120) {
    e.preventDefault()
  }
}

async function handlePullEnd() {
  if (!pullState.value.pulling) return
  
  const distance = pullState.value.distance
  
  // If pulled beyond threshold, trigger sync
  if (distance > pullState.value.threshold) {
    await syncData()
    if ('vibrate' in navigator) navigator.vibrate(30)
  }
  
  // Reset state
  pullState.value.pulling = false
  pullState.value.startY = 0
  pullState.value.currentY = 0
  pullState.value.distance = 0
}

const syncData = async () => {
  if (syncFeedbackStatus.value === 'syncing') return
  syncFeedbackStatus.value = 'syncing'
  syncMoon.start()
  try {
    await leadsStore.fetchLeads()
    syncFeedbackStatus.value = 'success'
  } catch (error) {
    console.error('Sync failed:', error)
    syncFeedbackStatus.value = 'error'
  } finally {
    syncMoon.stop()
    setTimeout(() => { syncFeedbackStatus.value = 'idle' }, 2000)
  }
}
</script>

<style scoped>
/* Fade transition for pull-to-refresh indicator */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.mobile-tab-btn {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  padding: 0.5rem 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #4b5563;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  flex: 1;
  text-align: center;
}

.mobile-tab-btn.active {
  background-color: #1f2937;
  color: white;
  border-color: #1f2937;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.kanban-board {
  display: flex;
  overflow-x: auto;
  height: 100%;
  width: 100%;
}
</style>
