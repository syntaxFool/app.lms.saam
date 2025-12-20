<template>
  <div class="h-[100dvh] w-full flex flex-col bg-slate-50 overflow-hidden">
    <!-- HEADER -->
    <header class="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center shadow-sm z-20 shrink-0">
      <!-- Left Side: Menu + Brand -->
      <div class="flex items-center gap-1 sm:gap-3 overflow-hidden">
        <button @click="isMenuOpen = !isMenuOpen" class="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg active:bg-slate-200 transition flex-shrink-0">
          <i class="ph-bold ph-list text-2xl"></i>
        </button>
        <div class="flex items-center gap-1 sm:gap-2 overflow-hidden">
          <div class="bg-primary/10 p-1.5 rounded-lg flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h24v20c0 0-2-3-4-3s-2 3-4 3-2-3-4-3-2 3-4 3-2-3-4-3-2 3-4 3V4z" fill="#FFD700"/>
              <circle cx="10" cy="12" r="2.5" fill="#000"/>
              <circle cx="22" cy="12" r="2.5" fill="#000"/>
              <circle cx="10" cy="11" r="1" fill="#fff"/>
              <circle cx="22" cy="11" r="1" fill="#fff"/>
            </svg>
          </div>
          <h1 class="text-lg font-bold tracking-tight text-slate-900 hidden sm:block whitespace-nowrap">LeadFlow</h1>
          <h1 class="text-base font-bold tracking-tight text-slate-900 sm:hidden whitespace-nowrap">LMS</h1>
        </div>
      </div>

      <!-- Right Side: Actions -->
      <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button @click="isFollowUpsSidebarOpen = !isFollowUpsSidebarOpen" class="p-2 text-primary hover:bg-primary/10 rounded-full transition">
          <i class="ph-bold ph-calendar-check text-lg sm:text-xl"></i>
        </button>
        <button @click="isSearchOpen = !isSearchOpen" class="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition">
          <i class="ph-bold ph-magnifying-glass text-lg sm:text-xl"></i>
        </button>
        <NotificationDropdown @open-lead="editLead" />
        <button @click="syncData" class="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition relative group">
          <i class="ph-bold ph-arrows-clockwise text-lg sm:text-xl"></i>
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
    <nav v-if="showMobileTabs" class="md:hidden bg-white border-b border-slate-200 py-2 overflow-x-auto no-scrollbar shrink-0 z-10">
      <div class="flex px-4 gap-3 min-w-max">
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
      <!-- KANBAN VIEW -->
      <div v-if="currentView === 'kanban'" class="h-full w-full">
        <KanbanBoard
          :leads="filteredLeads"
          :get-user-name="getUserName"
          :active-mobile-tab="activeMobileTab"
          @open="(id) => editLead(id, undefined, true)"
          @edit-activity="(id) => editLead(id, 'activity')"
          @edit-task="(id) => editLead(id, 'task')"
          @move="handleMove"
        />
      </div>

      <!-- TABLE VIEW -->
      <div v-else-if="currentView === 'table'" class="h-full w-full overflow-hidden">
        <LeadsTable
          :leads="filteredLeads"
          @open="editLead"
        />
      </div>

      <!-- REPORTS VIEW -->
      <div v-else-if="currentView === 'reports'" class="h-full w-full overflow-hidden">
        <ReportsView
          :leads="filteredLeads"
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
    <nav class="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center gap-1 z-40 h-20">
      <button
        @click="currentView = 'kanban'; showMobileTabs = true"
        :class="['flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition w-16', currentView === 'kanban' ? 'bg-slate-100 text-primary' : 'text-slate-600 hover:bg-slate-50']"
      >
        <i class="ph-bold ph-kanban text-2xl"></i>
        <span class="text-xs font-semibold">Board</span>
      </button>
      <button
        @click="currentView = 'table'; showMobileTabs = false"
        :class="['flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition w-16', currentView === 'table' ? 'bg-slate-100 text-primary' : 'text-slate-600 hover:bg-slate-50']"
      >
        <i class="ph-bold ph-table text-2xl"></i>
        <span class="text-xs font-semibold">Leads</span>
      </button>
      <button
        @click="isMenuOpen = true"
        class="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition w-16"
      >
        <i class="ph-bold ph-gear text-2xl"></i>
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
      @close="isMenuOpen = false"
      @view-change="handleMenuViewChange"
    />

    <!-- PWA Install Prompt -->
    <InstallPWA />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLeadsStore } from '@/stores/leads'
import type { LeadStatus } from '@/types'
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

const authStore = useAuthStore()
const leadsStore = useLeadsStore()

const currentUser = computed(() => authStore.user)
const activeStatus = ref<LeadStatus>('New')
const activeMobileTab = ref<LeadStatus>('New')
const currentView = ref('kanban')
const showMobileTabs = ref(true)
const isMdScreen = ref(window.innerWidth >= 768)

const statusConfig = [
  { id: 'New', color: 'bg-blue-500' },
  { id: 'Contacted', color: 'bg-yellow-500' },
  { id: 'Proposal', color: 'bg-purple-500' },
  { id: 'Won', color: 'bg-green-500' },
  { id: 'Lost', color: 'bg-red-500' }
]

// Apply filters from store
const filteredLeads = computed(() => leadsStore.filteredLeads)

const getUserName = (id?: string) => {
  if (!id) return ''
  // Simple username display - in real app would lookup from users list
  return id
}

// Modal state
const isMenuOpen = ref(false)
const isSearchOpen = ref(false)
const isPhoneModalOpen = ref(false)
const isLeadModalOpen = ref(false)
const isFollowUpsSidebarOpen = ref(false)
const leadModalMode = ref<'add' | 'edit' | 'view'>('add')
const selectedLeadId = ref<string>('')
const pendingPhoneNumber = ref<string>('')

// Initialize on first load  
onMounted(() => {
  // Handle window resize
  const handleResize = () => {
    isMdScreen.value = window.innerWidth >= 768
  }
  window.addEventListener('resize', handleResize)

  // Adaptive polling setup
  setupAdaptivePolling()
})

// Adaptive Polling
const isUserActive = ref(true)
const lastSyncTime = ref<Date>(new Date())
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
  const interval = isUserActive.value ? 5000 : 40000 // 5s active, 40s idle
  
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

const editLead = (leadId?: string, _tab?: string, viewOnly?: boolean) => {
  // Guard against undefined leadId
  if (!leadId || leadId === 'undefined') {
    return
  }
  selectedLeadId.value = leadId
  leadModalMode.value = viewOnly ? 'view' : 'edit'
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

const handleMenuViewChange = (view: string) => {
  currentView.value = view
  if (view === 'kanban') {
    showMobileTabs.value = true
  } else {
    showMobileTabs.value = false
  }
}

const handleMove = async (leadId: string, newStatus: LeadStatus) => {
  try {
    await leadsStore.updateLeadData(leadId, { status: newStatus })
  } catch (error) {
    console.error('Failed to move lead:', error)
  }
}

const syncData = async () => {
  try {
    await leadsStore.fetchLeads()
  } catch (error) {
    console.error('Sync failed:', error)
  }
}
</script>

<style scoped>
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
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
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
