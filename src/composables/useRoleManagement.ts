import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRole, RoleLimitCheck, RoleStats } from '@/types'

/**
 * Composable for managing user roles and enforcing role limits
 * Provides utilities to:
 * - Check if a new user can be created with a specific role
 * - Get role statistics and display
 * - Validate role constraints
 */
export function useRoleManagement() {
  const authStore = useAuthStore()

  /**
   * Get role limit display string
   * Example: "Superuser: 0/1 | Admins: 3/5 | Agents: 8/10"
   */
  const roleLimitsDisplay = computed(() => {
    // Get all users from leads store to calculate stats
    const leadsStore = authStore.canManageUsers() ? null : null
    // For now, we'll return a formatted display
    // In production, fetch actual user list from your data source
    return authStore.getRoleLimitsDisplay([])
  })

  /**
   * Check if a specific role can be added
   * @param role - The role to check
   * @param allUsers - Array of all existing users
   * @returns RoleLimitCheck object with allowed status and message
   */
  function canAddRole(role: UserRole, allUsers: any[] = []): RoleLimitCheck {
    const result = authStore.checkRoleLimits(role, allUsers)
    return result
  }

  /**
   * Get human-readable role label
   */
  function getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      superuser: 'Superuser (System Admin)',
      admin: 'Admin (Manager)',
      agent: 'Agent (Sales/Support)',
      user: 'User (Limited Access)'
    }
    return labels[role] || role
  }

  /**
   * Get role description
   */
  function getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      superuser: 'Full system access - manages users, settings, and all leads',
      admin: 'Team management - manages leads, users, and reports (5 max)',
      agent: 'Lead management - manages assigned leads and tasks (10 max)',
      user: 'Limited access - can only view assigned leads (read-only)'
    }
    return descriptions[role] || ''
  }

  /**
   * Get role color for UI badges
   */
  function getRoleColor(role: UserRole): string {
    const colors: Record<UserRole, string> = {
      superuser: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      agent: 'bg-green-100 text-green-700',
      user: 'bg-gray-100 text-gray-700'
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  /**
   * Get role icon
   */
  function getRoleIcon(role: UserRole): string {
    const icons: Record<UserRole, string> = {
      superuser: 'ph-crown',
      admin: 'ph-person-gear',
      agent: 'ph-person-simple',
      user: 'ph-person'
    }
    return icons[role] || 'ph-person'
  }

  /**
   * Get role limits for all roles
   */
  const roleLimits: Record<UserRole, number> = {
    superuser: 1,
    admin: 5,
    agent: 10,
    user: Infinity
  }

  /**
   * Get all available roles for selection (admin only)
   */
  function getAvailableRoles(): UserRole[] {
    return authStore.canManageUsers() 
      ? ['superuser', 'admin', 'agent', 'user'] 
      : ['agent']
  }

  /**
   * Format role stats for display
   */
  function formatRoleStats(stats: RoleStats): string {
    return [
      `Superuser: ${stats.superuser}/${roleLimits.superuser}`,
      `Admins: ${stats.admin}/${roleLimits.admin}`,
      `Agents: ${stats.agent}/${roleLimits.agent}`
    ].join(' | ')
  }

  return {
    // Computed properties
    roleLimitsDisplay,
    
    // Methods
    canAddRole,
    getRoleLabel,
    getRoleDescription,
    getRoleColor,
    getRoleIcon,
    getAvailableRoles,
    formatRoleStats,
    
    // Data
    roleLimits
  }
}
