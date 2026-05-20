<template>
  <div class="relative">
    <!-- Bell Icon with Badge -->
    <button
      @click="isOpen = !isOpen"
      class="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
    >
      <i class="ph-bold ph-bell text-xl"></i>
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50"
        @click.self="isOpen = false"
      >
        <div
          class="fixed right-4 top-14 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col"
        >
          <!-- Header -->
          <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <h3 class="text-lg font-bold text-slate-800">Notifications</h3>
            <div class="flex items-center gap-2">
              <button
                v-if="unreadCount > 0"
                @click="markAllAsRead"
                class="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Mark all read
              </button>
              <button
                @click="isOpen = false"
                class="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i class="ph-bold ph-x text-lg"></i>
              </button>
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="px-4 py-2 border-b border-slate-200 flex gap-2 shrink-0">
            <button
              v-for="filter in filters"
              :key="filter"
              @click="activeFilter = filter"
              class="px-3 py-1 text-sm font-medium rounded-lg transition-colors"
              :class="activeFilter === filter ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'"
            >
              {{ filter }}
            </button>
          </div>

          <!-- Notifications List -->
          <div class="flex-1 overflow-y-auto">
            <div v-if="filteredNotifications.length === 0" class="py-12 text-center">
              <i class="ph-bold ph-check-circle text-6xl text-slate-300 mb-3"></i>
              <p class="text-slate-500 font-medium">No notifications</p>
            </div>

            <div v-else class="divide-y divide-slate-100">
              <div
                v-for="notification in filteredNotifications"
                :key="notification.id"
                class="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                :class="{ 'bg-blue-50/50': !notification.read }"
                @click="handleNotificationClick(notification)"
              >
                <div class="flex items-start gap-3">
                  <div class="shrink-0 mt-1">
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center"
                      :class="getNotificationIconClass(notification.type)"
                    >
                      <i :class="getNotificationIcon(notification.type)" class="text-lg"></i>
                    </div>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <p class="text-sm font-semibold text-slate-800 line-clamp-1">
                        {{ notification.title }}
                      </p>
                      <button
                        v-if="!notification.read"
                        @click.stop="markAsRead(notification.id)"
                        class="shrink-0 w-2 h-2 bg-blue-500 rounded-full"
                        title="Mark as read"
                      ></button>
                    </div>
                    <p class="text-sm text-slate-600 line-clamp-2 mt-1">
                      {{ notification.message }}
                    </p>
                    <p class="text-xs text-slate-400 mt-2">
                      {{ getRelativeTime(notification.createdAt) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import { api } from '@/services/api'

type NotificationType = 'overdue-follow-up' | 'overdue-task' | 'upcoming-follow-up' | 'new-lead' | 'lead-won' | 'lead-lost'

interface ServerNotification {
  id: string
  title: string
  message: string
  type: string
  leadId: string | null
  read: boolean
  createdBy: string
  createdAt: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  leadId?: string
  createdAt: Date
  read: boolean
}

const emit = defineEmits<{
  'open-lead': [leadId: string]
}>()

const leadsStore = useLeadsStore()

const isOpen = ref(false)
const activeFilter = ref('All')
const filters = ['All', 'Follow-ups', 'Tasks', 'Leads', 'Server']

// Persistent read state for local notifications (computed recreates objects, so we track read status here)
const localReadState = reactive<Set<string>>(new Set())

// ── Server notification state ──────────────────────────────────────────────
const serverNotifications = ref<ServerNotification[]>([])
const serverUnreadCount = ref(0)
let pollInterval: number | null = null

async function pollServerNotifications() {
  try {
    const response = await api.get('/notifications', {
      params: { unread: true, limit: 20 }
    }) as any
    if (response.success && response.data) {
      serverNotifications.value = response.data.notifications || []
      serverUnreadCount.value = response.data.unreadCount || 0
    }
  } catch {
    // Silently fail — not critical
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  pollServerNotifications()
  pollInterval = window.setInterval(pollServerNotifications, 30000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

// ── Mark read helpers (server) ────────────────────────────────────────────
async function markServerRead(serverId: string) {
  try {
    await api.put(`/notifications/${serverId}`, { read: true }) as any
    const sn = serverNotifications.value.find(n => n.id === serverId)
    if (sn) sn.read = true
    serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1)
  } catch {
    console.error('Failed to mark notification read')
  }
}

async function markAllServerRead() {
  try {
    await api.put('/notifications/read-all', {}) as any
    serverNotifications.value.forEach(n => n.read = true)
    serverUnreadCount.value = 0
  } catch {
    console.error('Failed to mark all notifications read')
  }
}

// ── Local notifications (computed from leads store) ───────────────────────
const localNotifications = computed<Notification[]>(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const notifs: Notification[] = []

  // Overdue follow-ups
  leadsStore.leads
    .filter(lead => {
      if (!lead.followUpDate) return false
      const followUpDate = new Date(lead.followUpDate)
      followUpDate.setHours(0, 0, 0, 0)
      return followUpDate < today && lead.status !== 'Won' && lead.status !== 'Lost'
    })
    .forEach(lead => {
      const daysOverdue = Math.floor((today.getTime() - new Date(lead.followUpDate!).getTime()) / (1000 * 60 * 60 * 24))
      const id = `overdue-${lead.id}`
      notifs.push({
        id,
        type: 'overdue-follow-up',
        title: 'Overdue Follow-up',
        message: `${lead.name || lead.phone} - ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
        leadId: lead.id,
        createdAt: new Date(lead.followUpDate!),
        read: localReadState.has(id)
      })
    })

  // Upcoming follow-ups (tomorrow)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  leadsStore.leads
    .filter(lead => {
      if (!lead.followUpDate) return false
      const followUpDate = new Date(lead.followUpDate)
      followUpDate.setHours(0, 0, 0, 0)
      return followUpDate.getTime() === tomorrow.getTime()
    })
    .forEach(lead => {
      const id = `upcoming-${lead.id}`
      notifs.push({
        id,
        type: 'upcoming-follow-up',
        title: 'Upcoming Follow-up Tomorrow',
        message: `${lead.name || lead.phone} - Call scheduled`,
        leadId: lead.id,
        createdAt: new Date(),
        read: localReadState.has(id)
      })
    })

  // Overdue tasks
  leadsStore.leads.forEach(lead => {
    if (!lead.tasks) return
    lead.tasks
      .filter(task => task.status !== 'completed' && task.dueDate)
      .forEach(task => {
        const dueDate = new Date(task.dueDate!)
        dueDate.setHours(0, 0, 0, 0)
        if (dueDate < today) {
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          const id = `task-${lead.id}-${task.id}`
          notifs.push({
            id,
            type: 'overdue-task',
            title: 'Overdue Task',
            message: `"${task.title}" for ${lead.name || lead.phone} - ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
            leadId: lead.id,
            createdAt: dueDate,
            read: localReadState.has(id)
          })
        }
      })
  })

  return notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
})

// ── Merged notifications (local + server) ──────────────────────────────────
const notifications = computed<Notification[]>(() => {
  const local = [...localNotifications.value]
  const server: Notification[] = serverNotifications.value.map(s => ({
    id: `srv-${s.id}`,
    type: s.type,
    title: s.title,
    message: s.message,
    leadId: s.leadId || undefined,
    createdAt: new Date(s.createdAt),
    read: s.read,
  }))
  return [...server, ...local].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
})

const filteredNotifications = computed(() => {
  if (activeFilter.value === 'All') return notifications.value
  if (activeFilter.value === 'Follow-ups') {
    return notifications.value.filter(n => n.type === 'overdue-follow-up' || n.type === 'upcoming-follow-up')
  }
  if (activeFilter.value === 'Tasks') {
    return notifications.value.filter(n => n.type === 'overdue-task')
  }
  if (activeFilter.value === 'Leads') {
    return notifications.value.filter(n => n.type === 'new-lead' || n.type === 'lead-won' || n.type === 'lead-lost')
  }
  if (activeFilter.value === 'Server') {
    return notifications.value.filter(n => n.id.startsWith('srv-'))
  }
  return notifications.value
})

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    'overdue-follow-up': 'ph-bold ph-warning-circle',
    'overdue-task': 'ph-bold ph-warning',
    'upcoming-follow-up': 'ph-bold ph-calendar-check',
    'new-lead': 'ph-bold ph-user-plus',
    'lead-won': 'ph-bold ph-trophy',
    'lead-lost': 'ph-bold ph-x-circle',
    'whatsapp-new-lead': 'ph-bold ph-whatsapp-logo',
    'whatsapp-message': 'ph-bold ph-whatsapp-logo',
  }
  return icons[type] || 'ph-bold ph-bell'
}

function getNotificationIconClass(type: string): string {
  const classes: Record<string, string> = {
    'overdue-follow-up': 'bg-red-100 text-red-600',
    'overdue-task': 'bg-orange-100 text-orange-600',
    'upcoming-follow-up': 'bg-blue-100 text-blue-600',
    'new-lead': 'bg-green-100 text-green-600',
    'lead-won': 'bg-emerald-100 text-emerald-600',
    'lead-lost': 'bg-slate-100 text-slate-600',
    'whatsapp-new-lead': 'bg-emerald-100 text-emerald-600',
    'whatsapp-message': 'bg-emerald-100 text-emerald-600',
  }
  return classes[type] || 'bg-slate-100 text-slate-600'
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function handleNotificationClick(notification: Notification) {
  if (notification.leadId) {
    emit('open-lead', notification.leadId)
    isOpen.value = false
  }

  // Server notifications → mark read via API
  if (notification.id.startsWith('srv-')) {
    const serverId = notification.id.slice(4)
    markServerRead(serverId)
  } else {
    markAsRead(notification.id)
  }
}

function markAsRead(id: string) {
  localReadState.add(id)
}

function markAllAsRead() {
  // Mark all local notifications as read
  for (const n of localNotifications.value) {
    localReadState.add(n.id)
  }
  // Mark all server notifications as read
  markAllServerRead()
}
</script>
