import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Lead,
  Activity,
  Task,
  Log,
  TaskStatus,
  LeadStatus,
  LeadSnapshot,
  Temperature,
  FilterOptions,
  SortConfig,
  ConflictField,
  LeadScore,
  PipelineMetrics,
  LeadStatistics
} from '@/types'
import { apiClient } from '@/services/api'
import { useAuthStore } from './auth'

export const useLeadsStore = defineStore('leads', () => {
  // ============ STATE ============
  const leads = ref<Lead[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSyncTime = ref<number>(0)
  const lastServerUpdate = ref<number>(0)
  const serverTotalCount = ref<number>(0)
  const editingLeadSnapshot = ref<LeadSnapshot | null>(null)
  const logs = ref<Log[]>([])
  const filters = ref<FilterOptions>({
    search: '',
    status: '',
    assignedTo: '',
    noTask: false,
    noAction: false,
    temperature: ''
  })
  const sortConfig = ref<SortConfig>({
    column: null,
    direction: 'asc'
  })
  const selectedLeadIds = ref<string[]>([])

  // ============ COMPUTED ============
  const totalLeads = computed(() => leads.value.length)
  const activeLeads = computed(() => leads.value.filter(l => !['Won', 'Lost'].includes(l.status)))
  const totalValue = computed(() => leads.value.reduce((sum, l) => sum + (l.value || 0), 0))
  const wonValue = computed(() => leads.value.filter(l => l.status === 'Won').reduce((sum, l) => sum + (l.value || 0), 0))
  const conversionRate = computed(() => totalLeads.value > 0 ? ((leads.value.filter(l => l.status === 'Won').length / totalLeads.value) * 100).toFixed(2) : '0')
  
  const leadsByStatus = computed(() => {
    const statuses: Record<LeadStatus, Lead[]> = {
      New: [],
      Contacted: [],
      Proposal: [],
      Won: [],
      Lost: []
    }
    leads.value.forEach(lead => {
      if (statuses[lead.status]) {
        statuses[lead.status].push(lead)
      }
    })
    return statuses
  })

  const leadsByTemperature = computed(() => {
    return {
      hot: leads.value.filter(l => l.temperature === 'Hot'),
      warm: leads.value.filter(l => l.temperature === 'Warm'),
      cold: leads.value.filter(l => l.temperature === 'Cold'),
      unset: leads.value.filter(l => !l.temperature)
    }
  })

  const getLeadById = computed(() => (id: string) => leads.value.find(l => l.id === id))

  const filteredLeads = computed(() => {
    let result = [...leads.value]

    // Search filter
    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(lead =>
        lead.name?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search) ||
        lead.phone?.toLowerCase().includes(search) ||
        lead.notes?.toLowerCase().includes(search)
      )
    }

    // Status filter
    if (filters.value.status) {
      result = result.filter(lead => lead.status === filters.value.status)
    }

    // Temperature filter
    if (filters.value.temperature) {
      result = result.filter(lead => lead.temperature === filters.value.temperature)
    }

    // Assigned to filter
    if (filters.value.assignedTo) {
      result = result.filter(lead => lead.assignedTo === filters.value.assignedTo)
    }

    // No task filter
    if (filters.value.noTask) {
      result = result.filter(lead => {
        const isActive = !['Won', 'Lost'].includes(lead.status)
        const hasTasks = lead.tasks && lead.tasks.length > 0
        const hasPending = lead.tasks?.some(t => t.status === 'pending')
        return isActive && hasTasks && !hasPending
      })
    }

    // No action filter
    if (filters.value.noAction) {
      result = result.filter(lead => {
        const isActive = !['Won', 'Lost'].includes(lead.status)
        const hasTasks = lead.tasks && lead.tasks.length > 0
        return isActive && !hasTasks
      })
    }

    // Sorting
    if (sortConfig.value.column) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.value.column as keyof Lead]
        const bVal = b[sortConfig.value.column as keyof Lead]

        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortConfig.value.direction === 'asc' ? 1 : -1
        if (bVal == null) return sortConfig.value.direction === 'asc' ? -1 : 1

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.value.direction === 'asc' ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        return sortConfig.value.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    }

    return result
  })

  const statistics = computed((): LeadStatistics => {
    return {
      total: totalLeads.value,
      new: leadsByStatus.value.New.length,
      contacted: leadsByStatus.value.Contacted.length,
      proposal: leadsByStatus.value.Proposal.length,
      won: leadsByStatus.value.Won.length,
      lost: leadsByStatus.value.Lost.length,
      activeCount: activeLeads.value.length,
      avgValue: totalLeads.value > 0 ? totalValue.value / totalLeads.value : 0,
      totalValue: totalValue.value,
      hotCount: leadsByTemperature.value.hot.length,
      warmCount: leadsByTemperature.value.warm.length,
      coldCount: leadsByTemperature.value.cold.length,
      lastUpdated: new Date().toISOString()
    }
  })

  const pipeline = computed((): PipelineMetrics => {
    return {
      total: totalLeads.value,
      byStatus: {
        New: leadsByStatus.value.New.length,
        Contacted: leadsByStatus.value.Contacted.length,
        Proposal: leadsByStatus.value.Proposal.length,
        Won: leadsByStatus.value.Won.length,
        Lost: leadsByStatus.value.Lost.length
      },
      totalValue: totalValue.value,
      wonValue: wonValue.value,
      conversionRate: parseFloat(conversionRate.value),
      averageValue: totalLeads.value > 0 ? totalValue.value / totalLeads.value : 0,
      hotLeads: leadsByTemperature.value.hot.length,
      warmLeads: leadsByTemperature.value.warm.length,
      coldLeads: leadsByTemperature.value.cold.length
    }
  })

  // ============ HELPER FUNCTIONS ============
  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  function formatDateTime(date: Date = new Date()): string {
    return date.toISOString()
  }

  function addLog(message: string, user?: string): void {
    logs.value.unshift({
      id: generateId(),
      timestamp: formatDateTime(),
      message: `${user ? user + ': ' : ''}${message}`
    })
    if (logs.value.length > 50) logs.value.pop()
  }

  // ============ ACTIVITY MANAGEMENT ============
  async function addActivity(leadId: string, activity: Omit<Activity, 'id' | 'timestamp' | 'createdBy' | 'role'>): Promise<boolean> {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead) return false

    try {
      // Call backend API to persist activity
      const response = await apiClient.post(`/leads/${leadId}/activities`, {
        type: activity.type,
        note: activity.note
      })

      if (!response.data?.data) return false

      // Add the backend-created activity to local state
      if (!lead.activities) lead.activities = []
      
      const newActivity: Activity = {
        id: response.data.data.id,
        timestamp: response.data.data.created_at,
        createdBy: response.data.data.created_by,
        role: response.data.data.role,
        type: response.data.data.type,
        note: response.data.data.note
      }
      
      lead.activities.unshift(newActivity)
      return true
    } catch (error) {
      console.error('Add activity error:', error)
      return false
    }
  }

  // ============ LEAD SCORING & METRICS ============
  function calculateQualityScore(lead: Lead): number {
    let score = 0

    // Data completeness (40 points)
    if (lead.name) score += 8
    if (lead.email) score += 8
    if (lead.phone) score += 8
    if (lead.location) score += 8
    if (lead.interest) score += 8

    // Engagement signals (30 points)
    if (lead.activities && lead.activities.length > 0) score += 10
    if (lead.tasks && lead.tasks.filter(t => t.status === 'pending').length > 0) score += 10
    if (lead.value && lead.value > 0) score += 10

    // Status quality (20 points)
    if (lead.status === 'Proposal') score += 10
    if (lead.status === 'Won') score += 20
    if (lead.status === 'Lost') score = Math.max(0, score - 10)

    // Temperature bonus (10 points)
    if (lead.temperature === 'Hot') score += 10
    else if (lead.temperature === 'Warm') score += 5

    return Math.min(100, score)
  }

  function getPriorityLevel(lead: Lead): 'critical' | 'high' | 'medium' | 'low' {
    const score = calculateQualityScore(lead)
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  function getLeadScore(lead: Lead): LeadScore {
    const tempConfig: Record<Temperature, { color: string; icon: string }> = {
      Hot: { color: 'bg-red-200 text-red-700', icon: 'ph-thermometer-hot' },
      Warm: { color: 'bg-amber-200 text-amber-700', icon: 'ph-thermometer-simple' },
      Cold: { color: 'bg-blue-200 text-blue-700', icon: 'ph-thermometer-cold' },
      '': { color: 'bg-slate-200 text-slate-700', icon: 'ph-thermometer' }
    }

    const temp = lead.temperature || ''
    const config = tempConfig[temp as Temperature]

    return {
      temperature: temp as Temperature,
      tempColor: config.color,
      tempIcon: config.icon,
      qualityScore: calculateQualityScore(lead),
      priorityLevel: getPriorityLevel(lead)
    }
  }

  // ============ CONFLICT DETECTION & SMART MERGE ============
  function storeLeadSnapshot(lead: Lead): void {
    editingLeadSnapshot.value = {
      lead: JSON.parse(JSON.stringify(lead)),
      timestamp: Date.now()
    }
  }

  function detectFieldConflicts(snapshot: Lead, current: Lead, userChanges: Partial<Lead>): ConflictField[] {
    const fieldsToCheck = [
      'name', 'email', 'phone', 'status', 'temperature', 'interest', 'value',
      'location', 'source', 'assignedTo', 'notes', 'lostReason'
    ]

    const conflicts: ConflictField[] = []
    fieldsToCheck.forEach(field => {
      const snapshotVal = snapshot[field as keyof Lead]
      const currentVal = current[field as keyof Lead]

      if (snapshotVal !== currentVal) {
        conflicts.push({
          field,
          yours: userChanges[field as keyof Lead] ?? snapshotVal,
          theirs: currentVal,
          current: currentVal
        })
      }
    })

    return conflicts
  }

  function detectConflict(currentSnapshot: Lead, serverLead: Lead): boolean {
    const fieldsToCheck = ['name', 'email', 'phone', 'status', 'temperature', 'interest', 'value', 'location', 'source', 'assignedTo', 'notes', 'lostReason']
    return fieldsToCheck.some(field => currentSnapshot[field as keyof Lead] !== serverLead[field as keyof Lead])
  }

  function smartMergeLead(serverLead: Lead, formData: Partial<Lead>): Lead {
    const merged = { ...serverLead }
    const fieldsToMerge = ['name', 'email', 'phone', 'status', 'temperature', 'interest', 'value', 'location', 'source', 'assignedTo', 'notes', 'lostReason']

    // Apply user's changes
    fieldsToMerge.forEach(field => {
      const value = formData[field as keyof Lead]
      if (value !== undefined && value !== null) {
        Object.assign(merged, { [field]: value })
      }
    })

    return merged
  }

  // ============ FILTERING & SORTING ============
  function updateFilters(newFilters: Partial<FilterOptions>) {
    Object.assign(filters.value, newFilters)
  }

  function clearFilters() {
    filters.value = {
      search: '',
      status: '',
      assignedTo: '',
      noTask: false,
      noAction: false,
      temperature: ''
    }
  }

  function setSortConfig(column: keyof Lead | null, direction: 'asc' | 'desc' = 'asc') {
    sortConfig.value = { column, direction }
  }

  // ============ LEAD SELECTION ============
  function toggleLeadSelection(leadId: string) {
    const index = selectedLeadIds.value.indexOf(leadId)
    if (index > -1) {
      selectedLeadIds.value.splice(index, 1)
    } else {
      selectedLeadIds.value.push(leadId)
    }
  }

  function selectAllLeads() {
    selectedLeadIds.value = filteredLeads.value.map(l => l.id)
  }

  function deselectAllLeads() {
    selectedLeadIds.value = []
  }

  function isLeadSelected(leadId: string): boolean {
    return selectedLeadIds.value.includes(leadId)
  }

  // ============ FETCH & SYNC ============
  async function fetchLeads(page = 1, limit = 200): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/leads', {
        params: {
          ...(lastSyncTime.value ? { since: lastSyncTime.value } : {}),
          page,
          limit
        }
      }) as import('@/types').ApiResponse
      if (response.success && response.data) {
        leads.value = response.data.leads || []
        lastSyncTime.value = Date.now()
        lastServerUpdate.value = response.data.lastUpdate || 0
        serverTotalCount.value = response.data.total ?? leads.value.length
        return { success: true }
      }
      error.value = response.error || 'Failed to load leads'
      return { success: false, error: error.value }
    } catch (err) {
      console.error('Fetch leads error:', err)
      error.value = 'Network error: Could not connect to server'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function checkForServerUpdates(): Promise<boolean> {
    try {
      const response = await apiClient.get('/leads/check-updates', {
        params: { since: lastServerUpdate.value }
      }) as import('@/types').ApiResponse
      if (response.success && response.data?.lastUpdate > lastServerUpdate.value) {
        lastServerUpdate.value = response.data.lastUpdate
        return true
      }
      return false
    } catch (error) {
      console.error('Check updates error:', error)
      return false
    }
  }

  // ============ CREATE ============
  async function addNewLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastModified' | 'lastModifiedBy'>, user?: Pick<import('@/types').AuthUser, 'name' | 'role'>): Promise<{ success: boolean; data?: Lead; error?: string }> {
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

      leads.value.push(newLead)
      addLog(`Created lead ${newLead.name}`, user?.name)

      // Push to server (backend auto-creates 'lead_created' activity and returns full lead)
      const response = await apiClient.post('/leads', newLead)
      
      // Use backend-created lead data (includes activities)
      if (response.data?.data) {
        Object.assign(newLead, response.data.data)
      }
      
      return { success: true, data: newLead }
    } catch (error) {
      console.error('Create lead error:', error)
      return { success: false, error: 'Failed to create lead' }
    } finally {
      loading.value = false
    }
  }

  // ============ UPDATE ============
  async function updateLeadData(id: string, updates: Partial<Lead>, user?: any): Promise<{ success: boolean; data?: Lead; error?: string }> {
    loading.value = true
    try {
      const lead = leads.value.find(l => l.id === id)
      if (!lead) return { success: false, error: 'Lead not found' }

      // Check for conflicts if snapshot exists
      if (editingLeadSnapshot.value && detectConflict(editingLeadSnapshot.value.lead, lead)) {
        const merged = smartMergeLead(lead, updates)
        Object.assign(lead, merged)
      } else {
        Object.assign(lead, updates)
      }

      lead.updatedAt = formatDateTime()
      lead.lastModified = formatDateTime()
      lead.lastModifiedBy = user?.name || 'System'

      // Log activities for status/assignment changes (don't await - fire and forget)
      if (updates.status && editingLeadSnapshot.value?.lead.status !== updates.status) {
        addActivity(id, {
          type: 'status_change',
          note: `Status changed from ${editingLeadSnapshot.value?.lead.status} to ${updates.status}`
        }).catch(err => console.error('Failed to log status change activity:', err))
      }

      if (updates.assignedTo && editingLeadSnapshot.value?.lead.assignedTo !== updates.assignedTo) {
        addActivity(id, {
          type: 'assignment',
          note: `Lead reassigned to ${updates.assignedTo}`
        }).catch(err => console.error('Failed to log assignment activity:', err))
      }

      addLog(`Updated ${lead.name}`, user?.name)
      editingLeadSnapshot.value = null

      // Push to server - send only the fields that the backend schema expects
      const payload = {
        id: lead.id,
        name: lead.name || undefined,
        phone: lead.phone || undefined,
        email: lead.email || undefined,
        location: lead.location || undefined,
        interest: lead.interest || undefined,
        source: lead.source || undefined,
        status: lead.status,
        assignedTo: lead.assignedTo || undefined,
        temperature: lead.temperature || undefined,
        value: lead.value,
        lostReason: lead.lostReason || undefined,
        lostReasonType: lead.lostReasonType || undefined,
        notes: lead.notes || undefined,
        followUpDate: lead.followUpDate || undefined,
      }
      
      await apiClient.put(`/leads/${id}`, payload)
      return { success: true, data: lead }
    } catch (error) {
      console.error('Update lead error:', error)
      return { success: false, error: 'Failed to update lead' }
    } finally {
      loading.value = false
    }
  }

  // ============ DELETE ============
  async function deleteLead(id: string, user?: any): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    try {
      const lead = leads.value.find(l => l.id === id)
      if (!lead) return { success: false, error: 'Lead not found' }

      leads.value = leads.value.filter(l => l.id !== id)
      addLog(`Deleted ${lead.name}`, user?.name)

      // Push to server
      await apiClient.delete(`/leads/${id}`)
      return { success: true }
    } catch (error) {
      console.error('Delete lead error:', error)
      return { success: false, error: 'Failed to delete lead' }
    } finally {
      loading.value = false
    }
  }

  // ============ BULK OPERATIONS ============
  async function bulkAssignLeads(leadIds: string[], assignToUser: string, user?: any): Promise<{ success: boolean; count?: number; error?: string }> {
    loading.value = true
    try {
      let updateCount = 0
      for (const id of leadIds) {
        const lead = leads.value.find(l => l.id === id)
        if (lead) {
          lead.assignedTo = assignToUser
          lead.lastModified = formatDateTime()
          lead.lastModifiedBy = user?.name || 'System'
          addActivity(id, { type: 'assignment', note: `Bulk assigned to ${assignToUser}` })
            .catch(err => console.error('Failed to log bulk assignment activity:', err))
          updateCount++
        }
      }

      addLog(`Bulk assigned ${updateCount} leads`, user?.name)
      await apiClient.put('/leads/bulk', { leadIds, updates: { assignedTo: assignToUser } })
      return { success: true, count: updateCount }
    } catch (error) {
      console.error('Bulk assign error:', error)
      return { success: false, error: 'Failed to assign leads' }
    } finally {
      loading.value = false
    }
  }

  async function bulkDeleteLeads(leadIds: string[], user?: any): Promise<{ success: boolean; count?: number; error?: string }> {
    loading.value = true
    try {
      const deleted = leads.value.filter(l => leadIds.includes(l.id))
      leads.value = leads.value.filter(l => !leadIds.includes(l.id))
      addLog(`Deleted ${deleted.length} leads`, user?.name)
      await apiClient.delete('/leads/bulk', { data: { leadIds } })
      return { success: true, count: deleted.length }
    } catch (error) {
      console.error('Bulk delete error:', error)
      return { success: false, error: 'Failed to delete leads' }
    } finally {
      loading.value = false
    }
  }

  // ============ TASK MANAGEMENT ============
  async function addTask(leadId: string, task: Omit<Task, 'id' | 'createdAt'>): Promise<boolean> {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead) return false

    try {
      // Call backend API to persist task
      const response = await apiClient.post(`/leads/${leadId}/tasks`, {
        title: task.title,
        note: task.note,
        dueDate: task.dueDate,
        priority: task.priority,
        assignedTo: task.assignedTo
      })

      if (!response.data?.data) return false

      // Add the backend-created task to local state
      if (!lead.tasks) lead.tasks = []
      const newTask: Task = {
        id: response.data.data.id,
        title: response.data.data.title,
        note: response.data.data.note,
        dueDate: response.data.data.due_date,
        status: response.data.data.status,
        priority: response.data.data.priority,
        assignedTo: response.data.data.assigned_to,
        createdAt: response.data.data.created_at,
        completedAt: response.data.data.completed_at
      }

      lead.tasks.push(newTask)
      return true
    } catch (error) {
      console.error('Add task error:', error)
      return false
    }
  }

  function updateTask(leadId: string, taskId: string, updates: Partial<Task>): boolean {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead || !lead.tasks) return false

    const task = lead.tasks.find(t => t.id === taskId)
    if (!task) return false

    Object.assign(task, updates)
    return true
  }

  async function deleteTask(leadId: string, taskId: string): Promise<boolean> {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead || !lead.tasks) return false

    const taskIndex = lead.tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) return false

    try {
      // Call backend API to delete task
      await apiClient.delete(`/leads/${leadId}/tasks/${taskId}`)

      // Remove from local state
      lead.tasks.splice(taskIndex, 1)
      return true
    } catch (error) {
      console.error('Delete task error:', error)
      return false
    }
  }

  async function toggleTaskStatus(leadId: string, taskId: string, resolution?: string): Promise<boolean> {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead || !lead.tasks) return false

    const task = lead.tasks.find(t => t.id === taskId)
    if (!task) return false

    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed'
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null

    try {
      // Call backend API to update task status
      await apiClient.put(`/leads/${leadId}/tasks/${taskId}`, {
        status: newStatus,
        completedAt: completedAt,
        resolution: newStatus === 'completed' ? resolution : null
      })

      // Update local state
      task.status = newStatus
      task.completedAt = completedAt || undefined
      if (newStatus === 'completed') {
        task.resolution = resolution
      } else {
        task.resolution = undefined
      }

      return true
    } catch (error) {
      console.error('Toggle task status error:', error)
      return false
    }
  }

  // ============ UTILITY ============
  function clearAll(): void {
    leads.value = []
    logs.value = []
    lastSyncTime.value = 0
  }

  return {
    // State
    leads,
    loading,
    lastSyncTime,
    lastServerUpdate,
    serverTotalCount,
    logs,
    filters,
    sortConfig,
    selectedLeadIds,

    // Computed Statistics & Metrics
    totalLeads,
    activeLeads,
    totalValue,
    wonValue,
    conversionRate,
    statistics,
    pipeline,

    // Computed Lead Groupings
    leadsByStatus,
    leadsByTemperature,
    getLeadById,
    filteredLeads,

    // Helpers
    generateId,
    formatDateTime,

    // Activity
    addActivity,
    addLog,

    // Scoring
    calculateQualityScore,
    getPriorityLevel,
    getLeadScore,

    // Conflict Management
    storeLeadSnapshot,
    detectConflict,
    detectFieldConflicts,
    smartMergeLead,

    // Filtering & Sorting
    updateFilters,
    clearFilters,
    setSortConfig,

    // Lead Selection
    toggleLeadSelection,
    selectAllLeads,
    deselectAllLeads,
    isLeadSelected,

    // Sync
    fetchLeads,
    checkForServerUpdates,

    // CRUD
    addNewLead,
    updateLeadData,
    deleteLead,

    // Bulk
    bulkAssignLeads,
    bulkDeleteLeads,

    // Tasks
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,

    // Utility
    clearAll
  }
})