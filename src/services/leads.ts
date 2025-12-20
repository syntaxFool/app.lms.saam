import type { Lead, Task, Activity, ApiResponse } from '@/types'
import { gasApi } from './api'
import { syncService } from './sync'
import { isOnline } from './offline'
import { get as getCached, set as setCached, invalidateByTag } from './cache'

/**
 * Leads service - comprehensive lead management with advanced sync
 */
export const leadsService = {
  /**
   * Get all leads with caching
   */
  async getLeads(): Promise<ApiResponse<Lead[]>> {
    const cacheKey = 'leads:all'
    const cached = getCached<ApiResponse<Lead[]>>(cacheKey)

    if (cached) {
      return cached
    }

    const response = await gasApi.execute('getAllLeads')

    if (response.success) {
      setCached(cacheKey, response, 5 * 60 * 1000, ['leads', 'lists'])
    }

    return response as ApiResponse<Lead[]>
  },

  /**
   * Get single lead by ID
   */
  async getLead(leadId: string): Promise<ApiResponse<Lead>> {
    const cacheKey = `leads:${leadId}`
    const cached = getCached<ApiResponse<Lead>>(cacheKey)

    if (cached) {
      return cached
    }

    const response = await gasApi.execute('getLeadById', { leadId })

    if (response.success) {
      setCached(cacheKey, response, 5 * 60 * 1000, ['leads', leadId])
    }

    return response as ApiResponse<Lead>
  },

  /**
   * Create lead with offline support
   */
  async createLead(lead: Partial<Lead>): Promise<ApiResponse<Lead>> {
    const newLead = {
      ...lead,
      id: lead.id || `lead_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    // Queue sync operation
    syncService.queueLeadOperation('create', newLead)

    // Try to execute immediately if online
    if (isOnline()) {
      try {
        const response = await gasApi.execute('createLead', newLead)

        if (response.success) {
          // Invalidate cache
          invalidateByTag('leads')
          return response as ApiResponse<Lead>
        }
      } catch (error) {
        console.error('Failed to create lead, queued for sync:', error)
      }
    }

    return {
      success: true,
      data: newLead as Lead,
      message: isOnline() ? 'Lead created' : 'Lead queued for sync'
    }
  },

  /**
   * Update lead with conflict detection
   */
  async updateLead(leadId: string, updates: Partial<Lead>): Promise<ApiResponse<Lead>> {
    const updateData = {
      id: leadId,
      ...updates,
      updatedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      lastModifiedBy: localStorage.getItem('lms_user_id') || 'unknown'
    }

    // Queue sync operation
    syncService.queueLeadOperation('update', updateData)

    // Try to execute immediately if online
    if (isOnline()) {
      try {
        const response = await gasApi.execute('updateLead', updateData)

        if (response.success) {
          // Invalidate relevant caches
          invalidateByTag('leads')
          invalidateByTag(leadId)
          return response as ApiResponse<Lead>
        }

        // Check for conflicts
        if ((response as any).conflict) {
          console.warn('Conflict detected in lead update')
        }
      } catch (error) {
        console.error('Failed to update lead, queued for sync:', error)
      }
    }

    return {
      success: true,
      data: updateData as Lead,
      message: isOnline() ? 'Lead updated' : 'Lead update queued for sync'
    }
  },

  /**
   * Delete lead
   */
  async deleteLead(leadId: string): Promise<ApiResponse<void>> {
    // Queue sync operation
    syncService.queueLeadOperation('delete', { id: leadId })

    if (isOnline()) {
      try {
        const response = await gasApi.execute('deleteLead', { leadId })

        if (response.success) {
          invalidateByTag('leads')
          invalidateByTag(leadId)
          return response
        }
      } catch (error) {
        console.error('Failed to delete lead, queued for sync:', error)
      }
    }

    return {
      success: true,
      message: isOnline() ? 'Lead deleted' : 'Lead deletion queued for sync'
    }
  },

  /**
   * Batch update leads
   */
  async batchUpdateLeads(
    updates: Array<{ id: string; changes: Partial<Lead> }>
  ): Promise<ApiResponse> {
    const batch = updates.map(u => ({
      id: u.id,
      ...u.changes,
      updatedAt: new Date().toISOString()
    }))

    if (isOnline()) {
      try {
        const response = await gasApi.execute('batchUpdateLeads', { updates: batch })

        if (response.success) {
          invalidateByTag('leads')
          updates.forEach(u => invalidateByTag(u.id))
          return response
        }
      } catch (error) {
        console.error('Batch update failed, queuing for sync:', error)
      }
    }

    // Queue individual operations
    batch.forEach(lead => {
      syncService.queueLeadOperation('update', lead)
    })

    return {
      success: true,
      message: isOnline() ? 'Leads updated' : 'Bulk update queued for sync'
    }
  },

  /**
   * Add task to lead
   */
  async addTask(
    leadId: string,
    task: Partial<Task>
  ): Promise<ApiResponse<Task>> {
    const newTask = {
      ...task,
      id: task.id || `task_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: task.status || 'pending'
    }

    // Queue sync operation
    syncService.queueTaskOperation('create', newTask, leadId)

    if (isOnline()) {
      try {
        const response = await gasApi.execute('createTask', {
          ...newTask,
          leadId
        })

        if (response.success) {
          invalidateByTag('tasks')
          invalidateByTag(leadId)
          return response as ApiResponse<Task>
        }
      } catch (error) {
        console.error('Failed to add task, queued for sync:', error)
      }
    }

    return {
      success: true,
      data: newTask as Task,
      message: isOnline() ? 'Task added' : 'Task queued for sync'
    }
  },

  /**
   * Update task
   */
  async updateTask(
    leadId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<ApiResponse<Task>> {
    const updateData = {
      id: taskId,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    syncService.queueTaskOperation('update', updateData, leadId)

    if (isOnline()) {
      try {
        const response = await gasApi.execute('updateTask', {
          ...updateData,
          leadId
        })

        if (response.success) {
          invalidateByTag('tasks')
          invalidateByTag(leadId)
          return response as ApiResponse<Task>
        }
      } catch (error) {
        console.error('Failed to update task, queued for sync:', error)
      }
    }

    return {
      success: true,
      data: updateData as Task,
      message: isOnline() ? 'Task updated' : 'Task update queued for sync'
    }
  },

  /**
   * Delete task
   */
  async deleteTask(leadId: string, taskId: string): Promise<ApiResponse<void>> {
    syncService.queueTaskOperation('delete', { id: taskId }, leadId)

    if (isOnline()) {
      try {
        const response = await gasApi.execute('deleteTask', { taskId, leadId })

        if (response.success) {
          invalidateByTag('tasks')
          invalidateByTag(leadId)
          return response
        }
      } catch (error) {
        console.error('Failed to delete task, queued for sync:', error)
      }
    }

    return {
      success: true,
      message: isOnline() ? 'Task deleted' : 'Task deletion queued for sync'
    }
  },

  /**
   * Add activity to lead
   */
  async addActivity(
    leadId: string,
    activity: Partial<Activity>
  ): Promise<ApiResponse<Activity>> {
    const newActivity = {
      ...activity,
      id: activity.id || `activity_${Date.now()}`,
      timestamp: new Date().toISOString(),
      createdBy: localStorage.getItem('lms_user_id') || 'unknown'
    }

    syncService.queueActivityOperation('create', newActivity, leadId)

    if (isOnline()) {
      try {
        const response = await gasApi.execute('createActivity', {
          ...newActivity,
          leadId
        })

        if (response.success) {
          invalidateByTag('activities')
          invalidateByTag(leadId)
          return response as ApiResponse<Activity>
        }
      } catch (error) {
        console.error('Failed to add activity, queued for sync:', error)
      }
    }

    return {
      success: true,
      data: newActivity as Activity,
      message: isOnline() ? 'Activity logged' : 'Activity queued for sync'
    }
  },

  /**
   * Get activities for lead
   */
  async getActivities(leadId: string): Promise<ApiResponse<Activity[]>> {
    const cacheKey = `activities:${leadId}`
    const cached = getCached<ApiResponse<Activity[]>>(cacheKey)

    if (cached) {
      return cached
    }

    const response = await gasApi.execute('getActivitiesByLeadId', { leadId })

    if (response.success) {
      setCached(cacheKey, response, 5 * 60 * 1000, ['activities', leadId])
    }

    return response as ApiResponse<Activity[]>
  },

  /**
   * Get tasks for lead
   */
  async getTasks(leadId: string): Promise<ApiResponse<Task[]>> {
    const cacheKey = `tasks:${leadId}`
    const cached = getCached<ApiResponse<Task[]>>(cacheKey)

    if (cached) {
      return cached
    }

    const response = await gasApi.execute('getTasksByLeadId', { leadId })

    if (response.success) {
      setCached(cacheKey, response, 5 * 60 * 1000, ['tasks', leadId])
    }

    return response as ApiResponse<Task[]>
  },

  /**
   * Search leads with advanced filtering
   */
  async searchLeads(query: string, filters?: Record<string, any>): Promise<ApiResponse<Lead[]>> {
    const cacheKey = `leads:search:${query}:${JSON.stringify(filters || {})}`
    const cached = getCached<ApiResponse<Lead[]>>(cacheKey)

    if (cached) {
      return cached
    }

    const response = await gasApi.execute('searchLeads', {
      query,
      filters
    })

    if (response.success) {
      setCached(cacheKey, response, 10 * 60 * 1000, ['leads', 'search'])
    }

    return response as ApiResponse<Lead[]>
  },

  /**
   * Sync all pending operations
   */
  async syncPending(): Promise<any> {
    const result = await syncService.syncPendingOperations()

    if (result.conflicts.length > 0) {
      console.warn('Conflicts detected during sync:', result.conflicts)
    }

    // Refresh cache on sync
    invalidateByTag('leads')
    invalidateByTag('tasks')
    invalidateByTag('activities')

    return result
  },

  /**
   * Get sync status
   */
  getSyncStatus() {
    return syncService.getSyncStatus()
  },

  /**
   * Get pending operations
   */
  getPendingOperations() {
    return syncService.syncState.pendingOperations
  },

  /**
   * Resolve conflict
   */
  async resolveConflict(conflictIndex: number, resolution: 'local' | 'server' | 'merge') {
    const conflict = syncService.syncState.conflicts[conflictIndex]
    if (conflict) {
      return syncService.resolveConflict(conflict, resolution)
    }
    return false
  }
}
