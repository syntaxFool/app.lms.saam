import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, AuthState, UserRole, Permission } from '@/types'
import { authService } from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(localStorage.getItem('lms_auth_token'))
  const loading = ref(false)
  const lastLogin = ref<string | null>(localStorage.getItem('lms_last_login'))
  const permissions = ref<Permission[]>([])

  // Permission matrices based on role
  const rolePermissions: Record<UserRole, Record<string, string[]>> = {
    superuser: {
      lead: ['create', 'read', 'update', 'delete', 'export'],
      task: ['create', 'read', 'update', 'delete'],
      activity: ['read', 'delete'],
      report: ['read', 'export'],
      user: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update']
    },
    admin: {
      lead: ['create', 'read', 'update', 'delete', 'export'],
      task: ['create', 'read', 'update', 'delete'],
      activity: ['read'],
      report: ['read', 'export'],
      user: ['read', 'update'],
      settings: ['read', 'update']
    },
    agent: {
      lead: ['create', 'read', 'update', 'export'],
      task: ['create', 'read', 'update'],
      activity: ['read'],
      report: ['read'],
      user: [],
      settings: []
    },
    user: {
      lead: ['read'],
      task: ['read'],
      activity: ['read'],
      report: [],
      user: [],
      settings: []
    }
  }

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role || 'user')
  const isSuperuser = computed(() => userRole.value === 'superuser')
  const isAdmin = computed(() => ['superuser', 'admin'].includes(userRole.value))
  const isAgent = computed(() => ['superuser', 'admin', 'agent'].includes(userRole.value))

  // ============ PERMISSION CHECKING ============
  function loadPermissions() {
    const role = user.value?.role || 'user'
    const perms = rolePermissions[role] || rolePermissions.user
    permissions.value = []

    Object.entries(perms).forEach(([resource, actions]) => {
      actions.forEach(action => {
        permissions.value.push({
          resource,
          action: action as 'create' | 'read' | 'update' | 'delete' | 'export',
          granted: true
        })
      })
    })
  }

  function hasPermission(resource: string, action: string): boolean {
    return permissions.value.some(
      p => p.resource === resource && p.action === action && p.granted
    )
  }

  function canCreateLead(): boolean {
    return hasPermission('lead', 'create')
  }

  function canEditLead(): boolean {
    return hasPermission('lead', 'update')
  }

  function canDeleteLead(): boolean {
    return hasPermission('lead', 'delete')
  }

  function canExportLeads(): boolean {
    return hasPermission('lead', 'export')
  }

  function canViewReports(): boolean {
    return hasPermission('report', 'read')
  }

  function canManageUsers(): boolean {
    return hasPermission('user', 'update') || hasPermission('user', 'delete')
  }

  function canManageSettings(): boolean {
    return hasPermission('settings', 'update')
  }

  // ============ ROLE LIMIT ENFORCEMENT ============
  /**
   * Role limits configuration
   * Superuser: max 1 (system administrator)
   * Admin: max 5 (team managers)
   * Agent: max 10 (sales/support team)
   */
  const ROLE_LIMITS: Record<UserRole, number> = {
    superuser: 1,
    admin: 5,
    agent: 10,
    user: Infinity // Unlimited user accounts
  }

  /**
   * Get current count of users by role from the leads store
   * This is called when checking if a new user can be created
   */
  function getRoleStats(allUsers: AuthUser[]): Record<UserRole, number> {
    const stats: Record<UserRole, number> = {
      superuser: 0,
      admin: 0,
      agent: 0,
      user: 0
    }

    allUsers.forEach(u => {
      const role = u.role || 'user'
      if (stats.hasOwnProperty(role)) {
        stats[role]++
      }
    })

    return stats
  }

  /**
   * Check if a new user can be created with the given role
   * Returns { allowed: boolean, message: string, remainingSlots: number }
   */
  function checkRoleLimits(role: UserRole, allUsers: AuthUser[]): { allowed: boolean; message: string; remainingSlots: number } {
    const stats = getRoleStats(allUsers)
    const limit = ROLE_LIMITS[role]
    const current = stats[role]
    const remainingSlots = limit - current

    if (current >= limit) {
      const messages: Record<UserRole, string> = {
        superuser: `Maximum 1 superuser allowed. Current: ${current}/1`,
        admin: `Maximum 5 admins allowed. Current: ${current}/5`,
        agent: `Maximum 10 agents allowed. Current: ${current}/10`,
        user: `User accounts cannot exceed system limits. Current: ${current}`
      }
      return {
        allowed: false,
        message: messages[role] || `Maximum ${limit} ${role}s allowed`,
        remainingSlots: 0
      }
    }

    return {
      allowed: true,
      message: `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining for ${role}s`,
      remainingSlots
    }
  }

  /**
   * Get formatted role limits display (e.g., "Superuser: 0/1 | Admins: 3/5 | Agents: 8/10")
   */
  function getRoleLimitsDisplay(allUsers: AuthUser[]): string {
    const stats = getRoleStats(allUsers)
    return [
      `Superuser: ${stats.superuser}/${ROLE_LIMITS.superuser}`,
      `Admins: ${stats.admin}/${ROLE_LIMITS.admin}`,
      `Agents: ${stats.agent}/${ROLE_LIMITS.agent}`
    ].join(' | ')
  }

  // ============ ACTIONS ============
  async function login(credentials: { uid: string; password: string }) {
    loading.value = true
    try {
      const response = await authService.login(credentials)
      if (response.success && response.data) {
        user.value = response.data.user
        token.value = response.data.token
        lastLogin.value = new Date().toISOString()

        localStorage.setItem('lms_auth_token', token.value)
        localStorage.setItem('lms_last_login', lastLogin.value)

        // Load permissions for the user
        loadPermissions()

        return { success: true }
      }
      return { success: false, error: response.error || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    permissions.value = []
    lastLogin.value = null
    localStorage.removeItem('lms_auth_token')
    localStorage.removeItem('lms_last_login')
    // Redirect to login will be handled by router guard
  }

  async function checkAuth() {
    const savedToken = localStorage.getItem('lms_auth_token')
    if (savedToken) {
      token.value = savedToken
      try {
        const response = await authService.validateToken(savedToken)
        if (response.success && response.data) {
          user.value = response.data
          lastLogin.value = localStorage.getItem('lms_last_login')
          loadPermissions()
        } else {
          // Token is invalid, clear it
          logout()
        }
      } catch (error) {
        console.error('Token validation error:', error)
        logout()
      }
    }
  }

  async function updateProfile(profileData: Partial<AuthUser>) {
    loading.value = true
    try {
      const response = await authService.updateProfile(profileData)
      if (response.success && response.data) {
        user.value = { ...user.value!, ...response.data }
        return { success: true }
      }
      return { success: false, error: response.error || 'Profile update failed' }
    } catch (error) {
      console.error('Profile update error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    } finally {
      loading.value = false
    }
  }

  async function changePassword(_oldPassword: string, _newPassword: string) {
    loading.value = true
    try {
      // TODO: Implement changePassword in authService when available
      // For now, this is a placeholder
      return { success: false, error: 'Password change not yet implemented' }
    } catch (error) {
      console.error('Password change error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    } finally {
      loading.value = false
    }
  }

  // Export state
  const state = computed<AuthState>(() => ({
    user: user.value,
    isAuthenticated: isAuthenticated.value,
    token: token.value,
    lastLogin: lastLogin.value || undefined
  }))

  return {
    // State
    user,
    token,
    loading,
    lastLogin,
    permissions,
    state,
    
    // Getters
    isAuthenticated,
    userRole,
    isSuperuser,
    isAdmin,
    isAgent,
    
    // Permission Checks
    hasPermission,
    canCreateLead,
    canEditLead,
    canDeleteLead,
    canExportLeads,
    canViewReports,
    canManageUsers,
    canManageSettings,
    
    // Role Limits
    ROLE_LIMITS,
    getRoleStats,
    checkRoleLimits,
    getRoleLimitsDisplay,
    
    // Actions
    login,
    logout,
    checkAuth,
    updateProfile,
    changePassword,
    loadPermissions
  }
})