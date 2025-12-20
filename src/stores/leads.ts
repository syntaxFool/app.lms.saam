import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Lead,
  Activity,
  Task,
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
import { gasApi } from '@/services/api'
import { useAuthStore } from './auth'

export const useLeadsStore = defineStore('leads', () => {
  // ============ STATE ============
  const leads = ref<Lead[]>([])
  const loading = ref(false)
  const lastSyncTime = ref<number>(0)
  const lastServerUpdate = ref<number>(0)
  const editingLeadSnapshot = ref<LeadSnapshot | null>(null)
  const logs = ref<any[]>([])
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

  // ============ MOCK DATA INITIALIZATION ============
  function initializeMockData(): void {
    const mockLeads: Lead[] = [
      {
        id: 'lead_001',
        name: 'Rajesh Kumar',
        phone: '9876543210',
        email: 'rajesh.kumar@email.com',
        status: 'New',
        temperature: 'Hot',
        interest: 'Enterprise Software Solution',
        value: 50000,
        location: 'Mumbai, Maharashtra',
        source: 'LinkedIn',
        assignedTo: 'Akash Singh',
        notes: 'Decision maker, ready to discuss',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        activities: [
          {
            id: 'activity_001',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            type: 'call',
            note: 'Initial discussion about product features',
            createdBy: 'Akash Singh',
            role: 'agent'
          }
        ],
        tasks: [
          {
            id: 'task_001',
            title: 'Send proposal document',
            note: 'Send complete enterprise package details',
            status: 'pending',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'lead_002',
        name: 'Priya Sharma',
        phone: '9123456789',
        email: 'priya.sharma@company.com',
        status: 'Contacted',
        temperature: 'Warm',
        interest: 'CRM Solution',
        value: 35000,
        location: 'Delhi, NCR',
        source: 'Website',
        assignedTo: 'Meera Patel',
        notes: 'Interested in demo, waiting for team approval',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        activities: [
          {
            id: 'activity_002',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'message',
            note: 'Sent product overview and pricing',
            createdBy: 'Meera Patel',
            role: 'agent'
          },
          {
            id: 'activity_003',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'call',
            note: 'Follow-up call, interested in seeing demo',
            createdBy: 'Meera Patel',
            role: 'agent'
          }
        ],
        tasks: []
      },
      {
        id: 'lead_003',
        name: 'Vikram Singh',
        phone: '9988776655',
        email: 'vikram.singh@business.in',
        status: 'Proposal',
        temperature: 'Hot',
        interest: 'Analytics Platform',
        value: 75000,
        location: 'Bangalore, Karnataka',
        source: 'Referral',
        assignedTo: 'Akash Singh',
        notes: 'Strong interest, negotiating pricing',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        activities: [
          {
            id: 'activity_004',
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            type: 'follow_up',
            note: 'Product demo conducted, very positive feedback',
            createdBy: 'Akash Singh',
            role: 'agent'
          }
        ],
        tasks: [
          {
            id: 'task_002',
            title: 'Prepare custom quote',
            note: 'Create pricing for 3-year contract with custom features',
            status: 'completed',
            dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'task_003',
            title: 'Await client decision',
            note: 'Waiting for approval from their executive team',
            status: 'pending',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'lead_004',
        name: 'Anjali Desai',
        phone: '9654321098',
        email: 'anjali.desai@startup.io',
        status: 'Won',
        temperature: 'Hot',
        interest: 'Cloud Migration Service',
        value: 120000,
        location: 'Hyderabad, Telangana',
        source: 'Cold Outreach',
        assignedTo: 'Meera Patel',
        notes: 'Contract signed, implementation starting next month',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        activities: [
          {
            id: 'activity_005',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'status_change',
            note: 'Contract signed by client',
            createdBy: 'Meera Patel',
            role: 'agent'
          }
        ],
        tasks: [
          {
            id: 'task_004',
            title: 'Schedule kickoff meeting',
            note: 'Arrange onboarding call with implementation team',
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'lead_005',
        name: 'Sanjay Patel',
        phone: '9111223344',
        email: 'sanjay.patel@venture.com',
        status: 'Lost',
        temperature: 'Cold',
        interest: 'Legacy System Modernization',
        value: 60000,
        location: 'Ahmedabad, Gujarat',
        source: 'Trade Show',
        assignedTo: 'Akash Singh',
        notes: 'Client chose competitor, pricing was a major factor',
        lostReason: 'Price Sensitivity',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        activities: [],
        tasks: []
      },
      {
        id: 'lead_006',
        name: 'Neha Gupta',
        phone: '9333445566',
        email: 'neha.gupta@education.org',
        status: 'New',
        temperature: 'Warm',
        interest: 'Learning Management System',
        value: 25000,
        location: 'Pune, Maharashtra',
        source: 'Partner Referral',
        assignedTo: 'Meera Patel',
        notes: 'Educational institution, budget approval in progress',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        activities: [
          {
            id: 'activity_006',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'message',
            note: 'Initial inquiry received, sent case studies',
            createdBy: 'Meera Patel',
            role: 'agent'
          }
        ],
        tasks: []
      },
      {
        id: 'lead_007',
        name: 'Rohit Verma',
        phone: '9777889900',
        email: 'rohit.verma@retail.biz',
        status: 'Contacted',
        temperature: 'Warm',
        interest: 'POS System & Inventory',
        value: 45000,
        location: 'Jaipur, Rajasthan',
        source: 'LinkedIn',
        assignedTo: 'Akash Singh',
        notes: 'Store owner, interested but wants to compare options',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        activities: [],
        tasks: [
          {
            id: 'task_005',
            title: 'Send competitive comparison',
            note: 'Prepare comparison document vs main competitors',
            status: 'pending',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    ]

    leads.value = mockLeads
    addLog('Mock data initialized with 7 sample leads')
  }

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
  function addActivity(leadId: string, activity: Omit<Activity, 'id' | 'timestamp' | 'createdBy' | 'role'>, user?: any): void {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead) return

    const authStore = useAuthStore()
    if (!lead.activities) lead.activities = []

    lead.activities.unshift({
      id: generateId(),
      timestamp: formatDateTime(),
      createdBy: user?.name || authStore.user?.name || 'System',
      role: user?.role || authStore.user?.role,
      ...activity
    })
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
  async function fetchLeads(): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    try {
      const response = await gasApi.syncData(lastSyncTime.value)
      if (response.success && response.data) {
        leads.value = response.data.leads || []
        lastSyncTime.value = Date.now()
        lastServerUpdate.value = response.data.lastUpdate || 0
      }
      return { success: response.success, error: response.error }
    } catch (error) {
      console.error('Fetch leads error:', error)
      return { success: false, error: 'Failed to fetch leads' }
    } finally {
      loading.value = false
    }
  }

  async function checkForServerUpdates(): Promise<boolean> {
    if (!gasApi) return false
    try {
      const response = await gasApi.execute('checkUpdates', [lastServerUpdate.value])
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
  async function addNewLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastModified' | 'lastModifiedBy'>, user?: any): Promise<{ success: boolean; data?: Lead; error?: string }> {
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

      // Add initial activity
      addActivity(newLead.id, {
        type: 'lead_created',
        note: `Lead created: ${leadData.name}`
      }, user)

      leads.value.push(newLead)
      addLog(`Created lead ${newLead.name}`, user?.name)

      // Push to server
      await gasApi.execute('createLead', [newLead])
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

      // Log activities for status/assignment changes
      if (updates.status && editingLeadSnapshot.value?.lead.status !== updates.status) {
        addActivity(id, {
          type: 'status_change',
          note: `Status changed from ${editingLeadSnapshot.value?.lead.status} to ${updates.status}`
        }, user)
      }

      if (updates.assignedTo && editingLeadSnapshot.value?.lead.assignedTo !== updates.assignedTo) {
        addActivity(id, {
          type: 'assignment',
          note: `Lead reassigned to ${updates.assignedTo}`
        }, user)
      }

      addLog(`Updated ${lead.name}`, user?.name)
      editingLeadSnapshot.value = null

      // Push to server
      await gasApi.execute('updateLead', [id, lead])
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
      await gasApi.execute('deleteLead', [id])
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
          addActivity(id, { type: 'assignment', note: `Bulk assigned to ${assignToUser}` }, user)
          updateCount++
        }
      }

      addLog(`Bulk assigned ${updateCount} leads`, user?.name)
      await gasApi.execute('bulkUpdate', [leads.value.filter(l => leadIds.includes(l.id))])
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
      await gasApi.execute('bulkDelete', [leadIds])
      return { success: true, count: deleted.length }
    } catch (error) {
      console.error('Bulk delete error:', error)
      return { success: false, error: 'Failed to delete leads' }
    } finally {
      loading.value = false
    }
  }

  // ============ TASK MANAGEMENT ============
  function addTask(leadId: string, task: Omit<Task, 'id' | 'createdAt'>, user?: any): boolean {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead) return false

    if (!lead.tasks) lead.tasks = []
    const newTask: Task = {
      id: generateId(),
      createdAt: formatDateTime(),
      ...task
    }

    lead.tasks.push(newTask)
    addActivity(leadId, {
      type: 'task',
      note: `Task created: ${task.title}${task.dueDate ? ` (Due: ${task.dueDate})` : ''}`,
      relatedTaskId: newTask.id
    }, user)

    return true
  }

  function updateTask(leadId: string, taskId: string, updates: Partial<Task>): boolean {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead || !lead.tasks) return false

    const task = lead.tasks.find(t => t.id === taskId)
    if (!task) return false

    Object.assign(task, updates)
    return true
  }

  function deleteTask(leadId: string, taskId: string, user?: any): boolean {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead || !lead.tasks) return false

    const taskIndex = lead.tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) return false

    const task = lead.tasks[taskIndex]
    lead.tasks.splice(taskIndex, 1)

    addActivity(leadId, {
      type: 'task',
      note: `Task deleted: ${task.title}`,
      relatedTaskId: taskId
    }, user)

    return true
  }

  function toggleTaskStatus(leadId: string, taskId: string, user?: any): boolean {
    const lead = leads.value.find(l => l.id === leadId)
    if (!lead || !lead.tasks) return false

    const task = lead.tasks.find(t => t.id === taskId)
    if (!task) return false

    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed'
    task.status = newStatus
    
    if (newStatus === 'completed') {
      task.completedAt = new Date().toISOString()
    } else {
      task.completedAt = undefined
    }

    addActivity(leadId, {
      type: 'task',
      note: `Task ${newStatus === 'completed' ? 'completed' : 'reopened'}: ${task.title}`,
      relatedTaskId: taskId
    }, user)

    return true
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
    initializeMockData,

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