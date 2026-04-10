<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[60]" role="dialog">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="closeMenu"></div>

      <!-- Menu Panel -->
      <div class="menu-panel absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 bg-slate-50">
          <h2 class="text-2xl font-bold text-slate-800 mb-1">Menu</h2>
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <i class="ph-fill ph-user"></i>
            <span>{{ currentUser?.username || 'User' }}</span>
            <span class="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">
              {{ currentUser?.role || 'User' }}
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <!-- Views Section -->
          <div>
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <i class="ph-bold ph-squares-four"></i> Views
            </h3>
            <div class="space-y-1">
              <button
                @click="switchView('kanban')"
                @contextmenu.prevent="isCardViewSheetOpen = true"
                @touchstart="startCardViewLongPress"
                @touchend="cancelCardViewLongPress"
                @touchcancel="cancelCardViewLongPress"
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-kanban text-lg"></i>
                <span class="font-medium">Kanban Board</span>
                
                <!-- Visual hint: lead scope + card view mode icons + dots -->
                <div class="ml-auto flex items-center gap-1">
                  <!-- Lead scope indicator (admin only) -->
                  <button
                    v-if="authStore.canFilterByAssignedTo"
                    @click.stop="isLeadScopeSheetOpen = true"
                    :class="[
                      'p-1 rounded hover:bg-slate-200 transition',
                      kanbanFilterMode === 'me' ? 'text-purple-600' : 'text-indigo-600'
                    ]"
                    :title="kanbanFilterMode === 'all' ? 'Showing all leads' : 'Showing my leads'"
                  >
                    <i :class="scopeIcon" class="text-sm"></i>
                  </button>
                  
                  <!-- Card view mode indicator -->
                  <i :class="modeIcon" class="text-sm text-primary"></i>
                  <i class="ph-bold ph-dots-three text-sm text-slate-400"></i>
                </div>
              </button>
              <button
                @click="switchView('table')"
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-table text-lg"></i>
                <span class="font-medium">Leads Table</span>
              </button>
              <button
                @click="switchView('reports')"
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-chart-bar text-lg"></i>
                <span class="font-medium">Reports</span>
              </button>
            </div>
          </div>

          <!-- Quick Stats -->
          <div>
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <i class="ph-bold ph-chart-line"></i> Quick Stats
            </h3>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-blue-50 rounded-lg p-3 text-center">
                <div class="text-xs text-blue-600 font-semibold">Total Leads</div>
                <div class="text-lg font-bold text-blue-700">{{ stats.total }}</div>
              </div>
              <div class="bg-green-50 rounded-lg p-3 text-center">
                <div class="text-xs text-green-600 font-semibold">Won</div>
                <div class="text-lg font-bold text-green-700">{{ stats.won }}</div>
              </div>
              <div class="bg-yellow-50 rounded-lg p-3 text-center">
                <div class="text-xs text-yellow-600 font-semibold">New</div>
                <div class="text-lg font-bold text-yellow-700">{{ stats.new }}</div>
              </div>
              <div class="bg-purple-50 rounded-lg p-3 text-center">
                <div class="text-xs text-purple-600 font-semibold">Active</div>
                <div class="text-lg font-bold text-purple-700">{{ stats.active }}</div>
              </div>
            </div>
          </div>

          <!-- Admin Section -->
          <div v-if="isAdmin">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <i class="ph-bold ph-gear"></i> Admin
            </h3>
            <div class="space-y-1">
              <button
                @click="openSettings"
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-user-gear text-lg"></i>
                <span class="font-medium">Settings</span>
              </button>
              <button
                @click="openLogs"
                disabled
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 text-slate-400 cursor-not-allowed"
                title="Coming soon"
              >
                <i class="ph-bold ph-scroll text-lg"></i>
                <span class="font-medium">Session Logs</span>
                <span class="ml-auto text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Soon</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer — pb-20 clears the fixed mobile bottom nav (h-20 / z-40) -->
        <div class="p-4 border-t border-slate-100 md:pb-4 pb-20">
          <button
            @click="handleLogout"
            class="w-full text-red-500 font-bold text-sm hover:text-red-600 flex items-center justify-center gap-2 py-2"
          >
            <i class="ph-bold ph-sign-out"></i> Sign Out
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Card View Selection Sheet (both mobile and desktop) -->
  <CardViewSheet
    :is-open="isCardViewSheetOpen"
    :current-mode="cardViewMode || 'normal'"
    @close="isCardViewSheetOpen = false"
    @select="handleCardViewSelect"
  />
  
  <!-- Lead Scope Selection Sheet (admin/superuser only) -->
  <LeadScopeSheet
    v-if="authStore.canFilterByAssignedTo"
    :is-open="isLeadScopeSheetOpen"
    :current-mode="kanbanFilterMode || 'all'"
    @close="isLeadScopeSheetOpen = false"
    @select="handleLeadScopeSelect"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLeadsStore } from '@/stores/leads'
import CardViewSheet from './CardViewSheet.vue'
import LeadScopeSheet from './LeadScopeSheet.vue'

const router = useRouter()
const authStore = useAuthStore()
const leadsStore = useLeadsStore()

interface Props {
  isOpen: boolean
  cardViewMode?: 'normal' | 'compact' | 'list'
  kanbanFilterMode?: 'all' | 'me'
}

interface Emits {
  (e: 'close'): void
  (e: 'view-change', view: string): void
  (e: 'open-settings'): void
  (e: 'card-view-change', mode: 'normal' | 'compact' | 'list'): void
  (e: 'lead-scope-change', mode: 'all' | 'me'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const currentUser = computed(() => authStore.user)
const isAdmin = computed(() => currentUser.value?.role === 'admin' || currentUser.value?.role === 'superuser')

const stats = computed(() => {
  const leads = leadsStore.leads
  return {
    total: leads.length,
    new: leads.filter(l => l.status === 'New').length,
    won: leads.filter(l => l.status === 'Won').length,
    active: leads.filter(l => !['Won', 'Lost'].includes(l.status)).length
  }
})

// Card view sheet state
const isCardViewSheetOpen = ref(false)
const isLeadScopeSheetOpen = ref(false)
let cardViewLongPressTimer: number | null = null

// Mode icons for visual hint
const modeIcon = computed(() => {
  const mode = props.cardViewMode || 'normal'
  return {
    'normal': 'ph-bold ph-cards',
    'compact': 'ph-bold ph-rows',
    'list': 'ph-bold ph-list-dashes'
  }[mode]
})

const scopeIcon = computed(() => {
  const mode = props.kanbanFilterMode || 'all'
  return mode === 'all' ? 'ph-bold ph-users-three' : 'ph-bold ph-user'
})

// Long-press handlers for card view (mobile)
const startCardViewLongPress = () => {
  cardViewLongPressTimer = window.setTimeout(() => {
    if ('vibrate' in navigator) navigator.vibrate(50)
    isCardViewSheetOpen.value = true
  }, 500)
}

const cancelCardViewLongPress = () => {
  if (cardViewLongPressTimer) {
    clearTimeout(cardViewLongPressTimer)
    cardViewLongPressTimer = null
  }
}

// Handle card view mode selection
const handleCardViewSelect = (mode: 'normal' | 'compact' | 'list') => {
  emit('card-view-change', mode)
  isCardViewSheetOpen.value = false
  emit('close')  // also close sidebar
}

// Handle lead scope selection
const handleLeadScopeSelect = (mode: 'all' | 'me') => {
  emit('lead-scope-change', mode)
  isLeadScopeSheetOpen.value = false
  emit('close')  // also close sidebar
}

const closeMenu = () => {
  emit('close')
}

const switchView = (view: string) => {
  emit('view-change', view)
  closeMenu()
}

const openSettings = () => {
  emit('open-settings')
  closeMenu()
}

const openLogs = () => {
  // TODO: Implement logs viewer
  closeMenu()
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>
