<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-60" role="dialog">
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
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-kanban text-lg"></i>
                <span class="font-medium">Kanban Board</span>
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
                class="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition text-slate-700"
              >
                <i class="ph-bold ph-scroll text-lg"></i>
                <span class="font-medium">Session Logs</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100">
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLeadsStore } from '@/stores/leads'

const router = useRouter()
const authStore = useAuthStore()
const leadsStore = useLeadsStore()

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'view-change', view: string): void
}

defineProps<Props>()
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

const closeMenu = () => {
  emit('close')
}

const switchView = (view: string) => {
  emit('view-change', view)
  closeMenu()
}

const openSettings = () => {
  // TODO: Implement settings modal
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
