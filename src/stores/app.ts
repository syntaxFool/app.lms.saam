import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AppSettings,
  UIState,
  Notification,
  SyncStatus,
  BatchOperationResult,
  AuditLogEntry
} from '@/types'

export const useAppStore = defineStore('app', () => {
  // State
  const settings = ref<AppSettings>({
    locations: [],
    sources: [],
    taskTitles: [],
    scriptUrl: '',
    appTitle: 'LeadFlow India',
    interests: [],
    agents: []
  })

  const ui = ref<UIState>({
    loading: false,
    sidebarOpen: false,
    activeModal: null,
    notifications: [],
    selectedLead: undefined,
    editingLead: undefined,
    confirmDialogOpen: false,
    confirmAction: undefined
  })

  const syncStatus = ref<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null as Date | null,
    syncInProgress: false,
    hasUnsyncedChanges: false,
    lastError: undefined
  })

  const batchOperations = ref<Map<string, BatchOperationResult<any>>>(new Map())
  const auditLog = ref<AuditLogEntry[]>([])
  const appVersion = ref('1.0.0')
  const theme = ref<'light' | 'dark'>(localStorage.getItem('app_theme') as 'light' | 'dark' || 'light')

  // Getters
  const isLoading = computed(() => ui.value.loading)
  const hasNotifications = computed(() => ui.value.notifications.length > 0)
  const latestNotification = computed(() => ui.value.notifications[0] || null)
  const successNotifications = computed(() => ui.value.notifications.filter(n => n.type === 'success'))
  const errorNotifications = computed(() => ui.value.notifications.filter(n => n.type === 'error'))
  const warningNotifications = computed(() => ui.value.notifications.filter(n => n.type === 'warning'))
  const infoNotifications = computed(() => ui.value.notifications.filter(n => n.type === 'info'))
  const isDarkMode = computed(() => theme.value === 'dark')
  const isOnline = computed(() => syncStatus.value.isOnline)
  const isSyncingAllowed = computed(() => syncStatus.value.isOnline && !syncStatus.value.syncInProgress)
  const activeBatchOperations = computed(() => Array.from(batchOperations.value.values()).filter(op => !op.success))

  // Actions
  function setLoading(loading: boolean) {
    ui.value.loading = loading
  }

  function toggleSidebar() {
    ui.value.sidebarOpen = !ui.value.sidebarOpen
  }

  function setSidebar(open: boolean) {
    ui.value.sidebarOpen = open
  }

  function showModal(modalId: string) {
    ui.value.activeModal = modalId
  }

  function hideModal() {
    ui.value.activeModal = null
  }

  function addNotification(notification: Omit<Notification, 'id'>) {
    const id = Date.now().toString()
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    }

    ui.value.notifications.unshift(newNotification)

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
  }

  function removeNotification(id: string) {
    const index = ui.value.notifications.findIndex(n => n.id === id)
    if (index !== -1) {
      ui.value.notifications.splice(index, 1)
    }
  }

  function clearNotifications() {
    ui.value.notifications = []
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...newSettings }
  }

  function setSyncStatus(status: Partial<typeof syncStatus.value>) {
    syncStatus.value = { ...syncStatus.value, ...status }
  }

  // Online/offline detection
  function handleOnlineStatus() {
    syncStatus.value.isOnline = navigator.onLine
    
    if (navigator.onLine) {
      addNotification({
        type: 'success',
        title: 'Back Online',
        message: 'Connection restored. Syncing data...'
      })
    } else {
      addNotification({
        type: 'warning',
        title: 'Offline',
        message: 'Working offline. Changes will sync when connection is restored.',
        duration: 0 // Persistent notification
      })
    }
  }

  // ============ BATCH OPERATIONS ============
  function addBatchOperation<T>(operationId: string, result: BatchOperationResult<T>) {
    batchOperations.value.set(operationId, result)
  }

  function getBatchOperation(operationId: string) {
    return batchOperations.value.get(operationId)
  }

  function completeBatchOperation(operationId: string) {
    const op = batchOperations.value.get(operationId)
    if (op) {
      op.success = true
      batchOperations.value.set(operationId, op)
    }
  }

  function clearBatchOperation(operationId: string) {
    batchOperations.value.delete(operationId)
  }

  function clearAllBatchOperations() {
    batchOperations.value.clear()
  }

  // ============ AUDIT LOGGING ============
  function addAuditLog(entry: AuditLogEntry) {
    auditLog.value.unshift(entry)
    // Keep only last 500 entries
    if (auditLog.value.length > 500) {
      auditLog.value = auditLog.value.slice(0, 500)
    }
  }

  function getAuditLog(filters?: {
    userId?: string
    action?: string
    resourceType?: string
  }): AuditLogEntry[] {
    let result = [...auditLog.value]

    if (filters?.userId) {
      result = result.filter(e => e.userId === filters.userId)
    }
    if (filters?.action) {
      result = result.filter(e => e.action === filters.action)
    }
    if (filters?.resourceType) {
      result = result.filter(e => e.resourceType === filters.resourceType)
    }

    return result
  }

  function clearAuditLog() {
    auditLog.value = []
  }

  // ============ THEME & APPEARANCE ============
  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
    localStorage.setItem('app_theme', newTheme)
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  // ============ UI STATE MANAGEMENT ============
  function selectLead(leadId: string) {
    ui.value.selectedLead = leadId
  }

  function editLead(leadId: string) {
    ui.value.editingLead = leadId
  }

  function stopEditingLead() {
    ui.value.editingLead = undefined
  }

  function openConfirmDialog(config: {
    title: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
  }) {
    ui.value.confirmDialogOpen = true
    ui.value.confirmAction = {
      title: config.title,
      message: config.message,
      onConfirm: config.onConfirm,
      onCancel: config.onCancel || (() => closeConfirmDialog())
    }
  }

  function closeConfirmDialog() {
    ui.value.confirmDialogOpen = false
    ui.value.confirmAction = undefined
  }

  // ============ SYNC MANAGEMENT ENHANCED ============
  function startSync() {
    syncStatus.value.syncInProgress = true
  }

  function completeSync(success: boolean = true, error?: string) {
    syncStatus.value.syncInProgress = false
    syncStatus.value.lastSync = new Date()
    syncStatus.value.lastError = error
    syncStatus.value.hasUnsyncedChanges = false

    if (success) {
      addNotification({
        type: 'success',
        title: 'Sync Complete',
        message: 'All changes have been synced successfully',
        duration: 3000
      })
    } else if (error) {
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: error,
        duration: 5000
      })
    }
  }

  function markHasUnsyncedChanges() {
    syncStatus.value.hasUnsyncedChanges = true
  }

  // Initialize online/offline listeners
  function initializeApp() {
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)
    
    // Set initial online status
    syncStatus.value.isOnline = navigator.onLine

    // Apply saved theme
    setTheme(theme.value)
  }

  function destroy() {
    window.removeEventListener('online', handleOnlineStatus)
    window.removeEventListener('offline', handleOnlineStatus)
  }

  return {
    // State
    settings,
    ui,
    syncStatus,
    batchOperations,
    auditLog,
    appVersion,
    theme,
    
    // Getters
    isLoading,
    hasNotifications,
    latestNotification,
    successNotifications,
    errorNotifications,
    warningNotifications,
    infoNotifications,
    isDarkMode,
    isOnline,
    isSyncingAllowed,
    activeBatchOperations,
    
    // Notification Actions
    setLoading,
    toggleSidebar,
    setSidebar,
    showModal,
    hideModal,
    addNotification,
    removeNotification,
    clearNotifications,

    // Settings
    updateSettings,
    setSyncStatus,

    // Batch Operations
    addBatchOperation,
    getBatchOperation,
    completeBatchOperation,
    clearBatchOperation,
    clearAllBatchOperations,

    // Audit Logging
    addAuditLog,
    getAuditLog,
    clearAuditLog,

    // Theme & Appearance
    setTheme,
    toggleTheme,

    // UI State
    selectLead,
    editLead,
    stopEditingLead,
    openConfirmDialog,
    closeConfirmDialog,

    // Sync Management
    startSync,
    completeSync,
    markHasUnsyncedChanges,

    // Initialization
    initializeApp,
    destroy,
    handleOnlineStatus
  }
})