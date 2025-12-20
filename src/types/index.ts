// ==================== ENUMS & TYPES ====================

// Lead Status Types
export type LeadStatus = 'New' | 'Contacted' | 'Proposal' | 'Won' | 'Lost'
export type Temperature = 'Hot' | 'Warm' | 'Cold' | ''
export type TaskStatus = 'pending' | 'completed' | 'dropped'
export type ActivityType = 'lead_created' | 'status_change' | 'assignment' | 'task' | 'follow_up' | 'field_update' | 'lost_reason' | 'note' | 'call' | 'message'
export type UserRole = 'superuser' | 'admin' | 'agent' | 'user'
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'
export type FollowUpCategory = 'overdue' | 'today' | 'upcoming'
export type LostReasonType = 'price' | 'not_interested' | 'competitor' | 'invalid_number' | 'duplicate' | 'other'
export type ReportType = 'pipeline' | 'lost_reasons' | 'agent_performance' | 'conversion_funnel' | 'revenue' | 'activity'

// ==================== CORE ENTITIES ====================

// Core Lead type with all properties from vanilla JS version
export interface Lead {
  id: string
  name: string
  phone: string
  email: string
  location?: string
  interest?: string
  source?: string
  status: LeadStatus
  assignedTo?: string
  temperature?: Temperature
  value?: number
  lostReason?: string
  lostReasonType?: LostReasonType
  notes?: string
  followUpDate?: string
  createdAt: string
  updatedAt: string
  lastModified: string
  lastModifiedBy?: string
  activities?: Activity[]
  tasks?: Task[]
}

// Activity tracking
export interface Activity {
  id: string
  type: ActivityType
  note: string
  timestamp: string
  createdBy: string
  role?: UserRole
  relatedTaskId?: string
  changes?: Record<string, { old: any; new: any }>
}

// Task management
export interface Task {
  id: string
  title: string
  note?: string
  dueDate?: string
  status: TaskStatus
  priority?: PriorityLevel
  createdAt: string
  completedAt?: string
  createdBy?: string
  assignedTo?: string
}

// User with password support
export interface User {
  id: string
  username: string
  password: string
  name: string
  email?: string
  role: UserRole
  createdAt?: string
}

// System logs
export interface Log {
  id: string
  timestamp: string
  message: string
  user?: string
  action?: string
  leadId?: string
  changes?: Record<string, { old: any; new: any }>
}

// Interest with value
export interface Interest {
  Name: string
  Value: number
}

// Source configuration
export interface Source {
  name: string
  label: string
}

// App configuration
export interface AppSettings {
  locations: string[]
  sources: string[]
  taskTitles: string[]
  interests?: string[]
  lostReasons?: LostReasonConfig[]
  agents?: string[]
  appTitle?: string
  scriptUrl?: string
}

export interface AppConfig {
  appTitle: string
  dbUrl: string
}

// ==================== LEAD SCORING & METRICS ====================

// Lead Score with quality metrics
export interface LeadScore {
  temperature: Temperature
  tempColor: string
  tempIcon: string
  qualityScore: number
  priorityLevel: PriorityLevel
}

// Temperature configuration
export interface TemperatureConfig {
  color: string
  icon: string
  label: string
  description?: string
}

// Pipeline metrics
export interface PipelineMetrics {
  total: number
  byStatus: Record<LeadStatus, number>
  totalValue: number
  wonValue: number
  conversionRate: number
  averageValue: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
}

// Status metrics
export interface StatusMetrics {
  New: number
  Contacted: number
  Proposal: number
  Won: number
  Lost: number
}

// ==================== LEAD FILTERING & SEARCHING ====================

// Filter options
export interface FilterOptions {
  search: string
  status: LeadStatus | ''
  assignedTo: string | ''
  noTask: boolean
  noAction: boolean
  temperature?: Temperature | ''
  source?: string | ''
  location?: string | ''
  dateRange?: DateRange
}

// Sort configuration
export interface SortConfig {
  column: keyof Lead | null
  direction: 'asc' | 'desc'
}

// Date range for filtering
export interface DateRange {
  startDate: string
  endDate: string
}

// ==================== CONFLICT DETECTION & RESOLUTION ====================

// Conflict field details
export interface ConflictField {
  field: string
  yours: any
  theirs: any
  current: any
  description?: string
}

// Conflict info for display
export interface ConflictInfo {
  detected: boolean
  conflicts: ConflictField[]
  leadId: string
  leadName: string
  timestamp?: number
}

// Resolution choice
export interface ConflictResolution {
  leadId: string
  choice: 'yours' | 'theirs' | 'merged'
  merged?: Lead
}

// Lead snapshot for conflict detection
export interface LeadSnapshot {
  lead: Lead
  timestamp: number
}

// ==================== FOLLOW-UP TRACKING ====================

// Follow-up information
export interface FollowUp {
  leadId: string
  leadName: string
  leadEmail: string
  leadPhone: string
  dueDate: string
  category: FollowUpCategory
  priority: PriorityLevel
  assignedTo: string
  lastActivityDate?: string
  nextTaskTitle?: string
  status: LeadStatus
}

// Follow-up summary
export interface FollowUpSummary {
  overdue: FollowUp[]
  today: FollowUp[]
  upcoming: FollowUp[]
  totalCount: number
}

// ==================== LOST REASON TRACKING ====================

// Lost reason configuration
export interface LostReasonConfig {
  id: LostReasonType
  label: string
  emoji: string
  description?: string
}

// Lost reason statistics
export interface LostReasonStats {
  reason: LostReasonType
  count: number
  percentage: number
  label: string
  emoji: string
}

// ==================== REPORTING & ANALYTICS ====================

// Report data structure
export interface ReportData<T = any> {
  type: ReportType
  title: string
  generatedAt: string
  dateRange?: DateRange
  data: T
  summary?: Record<string, any>
}

// Pipeline report data
export interface PipelineReport {
  metrics: PipelineMetrics
  byStatus: Record<LeadStatus, Lead[]>
  topLeads: Lead[]
  conversionFunnel: ConversionFunnel
}

// Conversion funnel
export interface ConversionFunnel {
  New: number
  Contacted: number
  Proposal: number
  Won: number
  conversionPercentage: Record<string, number>
}

// Agent performance report
export interface AgentPerformance {
  agentName: string
  totalLeads: number
  wonLeads: number
  conversionRate: number
  totalValue: number
  averageValue: number
  activeLeads: number
  lostLeads: number
  lostReasons: LostReasonStats[]
}

// Revenue report
export interface RevenueReport {
  totalValue: number
  wonValue: number
  byStatus: Record<LeadStatus, number>
  bySource: Record<string, number>
  byInterest: Record<string, number>
  trend: RevenueDataPoint[]
}

// Revenue data point for trends
export interface RevenueDataPoint {
  date: string
  amount: number
  leadsWon: number
}

// Activity report
export interface ActivityReport {
  totalActivities: number
  byType: Record<ActivityType, number>
  topAgents: { agentName: string; count: number }[]
  timeline: ActivityDataPoint[]
}

// Activity data point
export interface ActivityDataPoint {
  date: string
  count: number
  type: ActivityType
}

// ==================== COMMUNICATION ====================

// Communication/Contact information
export interface CommunicationLog {
  id: string
  leadId: string
  type: 'call' | 'whatsapp' | 'email' | 'meeting'
  timestamp: string
  duration?: number
  notes?: string
  outcome?: string
  nextFollowUp?: string
}

// ==================== BULK OPERATIONS ====================

// Bulk action request
export interface BulkActionRequest {
  leadIds: string[]
  action: 'assign' | 'status' | 'temperature' | 'delete' | 'export'
  assignedTo?: string
  status?: LeadStatus
  temperature?: Temperature
}

// Bulk action result
export interface BulkActionResult {
  success: boolean
  affected: number
  errors: BulkError[]
}

// Bulk error
export interface BulkError {
  leadId: string
  message: string
}

// ==================== API & SYNC ====================

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  timestamp?: string
}

// Sync data structure
export interface SyncData {
  leads: Lead[]
  activities: Activity[]
  tasks: Task[]
  users: User[]
  logs: Log[]
  interests: Interest[]
  settings: AppSettings
  lastUpdate: number
}

// Sync status
export interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  syncInProgress: boolean
  hasUnsyncedChanges: boolean
  lastError?: string
}

// Server update check response
export interface ServerUpdate {
  hasUpdates: boolean
  lastUpdate: number
  changes?: {
    leads?: string[]
    activities?: string[]
    tasks?: string[]
  }
}

// ==================== AUTHENTICATION ====================

// Authenticated user
export interface AuthUser {
  id: string
  name: string
  email: string
  username?: string
  picture?: string
  role: UserRole
  createdAt?: string
}

// Authentication state
export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  token: string | null
  lastLogin?: string
  refreshToken?: string
}

// Login credentials
export interface LoginCredentials {
  username: string
  password: string
}

// ==================== ROLE MANAGEMENT & LIMITS ====================

// Role statistics and limits
export interface RoleStats {
  superuser: number
  admin: number
  agent: number
  user: number
}

// Role limit check result
export interface RoleLimitCheck {
  allowed: boolean
  message: string
  remainingSlots: number
  current?: number
  limit?: number
}

// User role validation response
export interface UserValidationResult {
  success: boolean
  message?: string
  violations?: Array<{
    role: UserRole
    current: number
    limit: number
    message: string
  }>
}

// ==================== UI & VISUALIZATION ====================

// Chart data types
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
    fill?: boolean
  }[]
}

// Chart options
export interface ChartOptions {
  responsive?: boolean
  maintainAspectRatio?: boolean
  plugins?: Record<string, any>
  scales?: Record<string, any>
}

// UI State types
export interface UIState {
  loading: boolean
  sidebarOpen: boolean
  activeModal: string | null
  notifications: Notification[]
  selectedLead?: string
  editingLead?: string
  confirmDialogOpen: boolean
  confirmAction?: {
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
  }
}

// Notification
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
}

// Modal types
export interface ModalState {
  isOpen: boolean
  title: string
  data?: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// ==================== FORM & VALIDATION ====================

// Form validation error
export interface FormError {
  field: string
  message: string
  type: 'error' | 'warning'
}

// Form state
export interface FormState {
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  errors: FormError[]
  touched: Record<string, boolean>
}

// Lead form data
export interface LeadFormData extends Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastModified' | 'lastModifiedBy' | 'activities' | 'tasks'> {
  // Extended form-specific fields can go here
}

// ==================== EXPORT & IMPORT ====================

// Export options
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  includeArchived: boolean
  dateRange?: DateRange
  selectedFields?: (keyof Lead)[]
}

// Import result
export interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: ImportError[]
  warnings?: string[]
}

// Import error
export interface ImportError {
  row: number
  field: string
  value: any
  reason: string
}

// ==================== PAGINATION & LISTING ====================

// Pagination info
export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationInfo
}

// List query
export interface ListQuery {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

// ==================== STATISTICS & AGGREGATIONS ====================

// Lead statistics
export interface LeadStatistics {
  total: number
  new: number
  contacted: number
  proposal: number
  won: number
  lost: number
  activeCount: number
  avgValue: number
  totalValue: number
  hotCount: number
  warmCount: number
  coldCount: number
  lastUpdated: string
}

// Source statistics
export interface SourceStatistics {
  source: string
  count: number
  percentage: number
  value: number
  conversionRate: number
}

// Agent statistics
export interface AgentStatistics {
  agentName: string
  leadsAssigned: number
  leadsWon: number
  leadsLost: number
  totalValue: number
  winRate: number
  avgValue: number
}

// Trend data point
export interface TrendDataPoint {
  date: string
  value: number
  label?: string
}

// Time series data
export interface TimeSeriesData {
  period: 'daily' | 'weekly' | 'monthly'
  data: TrendDataPoint[]
}

// ==================== SYSTEM & AUDIT ====================

// Audit log entry
export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: UserRole
  action: string
  resourceType: 'lead' | 'task' | 'activity' | 'user' | 'settings'
  resourceId: string
  changes: Record<string, { old: any; new: any }>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failure'
  errorMessage?: string
}

// System health check
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  components: {
    database: 'ok' | 'error'
    api: 'ok' | 'error'
    storage: 'ok' | 'error'
    authentication: 'ok' | 'error'
  }
  lastChecked: string
  uptime: number
  responseTime: number
}

// ==================== BATCH OPERATIONS ====================

// Batch request
export interface BatchRequest<T> {
  operations: BatchOperation<T>[]
  returnResults: boolean
}

// Batch operation
export interface BatchOperation<T> {
  id: string
  method: 'create' | 'update' | 'delete'
  resource: 'lead' | 'task' | 'activity'
  data: T
}

// Batch response
export interface BatchResponse<T> {
  results: BatchOperationResult<T>[]
  hasErrors: boolean
  totalOperations: number
  successCount: number
  failureCount: number
}

// Batch operation result
export interface BatchOperationResult<T> {
  operationId: string
  success: boolean
  data?: T
  error?: string
  status: number
}

// ==================== NOTIFICATION & EVENTS ====================

// Event types for real-time updates
export type EventType = 
  | 'lead_created'
  | 'lead_updated'
  | 'lead_deleted'
  | 'task_created'
  | 'task_updated'
  | 'activity_created'
  | 'user_assigned'
  | 'status_changed'
  | 'sync_started'
  | 'sync_completed'

// Real-time event
export interface RealTimeEvent<T = any> {
  id: string
  type: EventType
  timestamp: string
  userId: string
  data: T
  source?: string
}

// ==================== PERMISSION & ACCESS CONTROL ====================

// Permission definition
export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'export'
  granted: boolean
}

// Role permissions
export interface RolePermissions {
  role: UserRole
  permissions: Permission[]
}

// Access control list
export interface AccessControlList {
  leadId: string
  accessLevel: 'none' | 'view' | 'edit' | 'owner'
  grantedTo: string[]
  expiresAt?: string
}