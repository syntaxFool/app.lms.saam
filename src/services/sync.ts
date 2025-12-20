import type { Lead, Activity, Task } from '@/types'
import { gasApi } from './api'

export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'lead' | 'task' | 'activity'
  entityId: string
  data: any
  timestamp: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retries: number
  error?: string
}

export interface SyncConflict {
  operation: SyncOperation
  serverData: any
  localData: any
  resolution: 'local' | 'server' | 'merge'
}

export interface SyncState {
  lastSyncTime: number
  isSyncing: boolean
  conflicts: SyncConflict[]
  pendingOperations: SyncOperation[]
}

/**
 * Advanced sync service for managing data synchronization
 * Handles offline-first operations, conflict detection, and automatic retry
 */
export const syncService = {
  syncState: {
    lastSyncTime: localStorage.getItem('lms_last_sync_time') 
      ? parseInt(localStorage.getItem('lms_last_sync_time')!) 
      : 0,
    isSyncing: false,
    conflicts: [] as SyncConflict[],
    pendingOperations: [] as SyncOperation[]
  } as SyncState,

  /**
   * Initialize sync service from localStorage
   */
  async initialize(): Promise<void> {
    try {
      const savedOps = localStorage.getItem('lms_pending_operations')
      if (savedOps) {
        this.syncState.pendingOperations = JSON.parse(savedOps)
      }
    } catch (error) {
      console.error('Failed to initialize sync service:', error)
    }
  },

  /**
   * Create a new sync operation
   */
  createOperation(
    type: 'create' | 'update' | 'delete',
    entity: 'lead' | 'task' | 'activity',
    entityId: string,
    data: any
  ): SyncOperation {
    const operation: SyncOperation = {
      id: `${entity}_${entityId}_${Date.now()}`,
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    }

    this.syncState.pendingOperations.push(operation)
    this.savePendingOperations()

    return operation
  },

  /**
   * Queue a lead operation
   */
  queueLeadOperation(
    _type: 'create' | 'update' | 'delete',
    lead: Lead | Partial<Lead>
  ): SyncOperation {
    return this.createOperation(_type, 'lead', lead.id || Date.now().toString(), lead)
  },

  /**
   * Queue a task operation
   */
  queueTaskOperation(
    _type: 'create' | 'update' | 'delete',
    task: Task | Partial<Task>,
    leadId: string
  ): SyncOperation {
    return this.createOperation(_type, 'task', task.id || Date.now().toString(), {
      ...task,
      leadId
    })
  },

  /**
   * Queue an activity operation
   */
  queueActivityOperation(
    _type: 'create' | 'update' | 'delete',
    activity: Activity | Partial<Activity>,
    leadId: string
  ): SyncOperation {
    return this.createOperation(_type, 'activity', activity.id || Date.now().toString(), {
      ...activity,
      leadId
    })
  },

  /**
   * Sync all pending operations to server
   */
  async syncPendingOperations(): Promise<{
    synced: SyncOperation[]
    failed: SyncOperation[]
    conflicts: SyncConflict[]
  }> {
    this.syncState.isSyncing = true
    const synced: SyncOperation[] = []
    const failed: SyncOperation[] = []
    const conflicts: SyncConflict[] = []

    for (const operation of this.syncState.pendingOperations) {
      if (operation.status === 'synced') continue

      try {
        operation.status = 'syncing'
        const result = await this.applyOperation(operation)

        if (result.conflict) {
          conflicts.push(result.conflict)
          operation.status = 'pending'
        } else {
          operation.status = 'synced'
          synced.push(operation)
        }
      } catch (error) {
        operation.retries++
        operation.error = error instanceof Error ? error.message : 'Unknown error'

        if (operation.retries < 3) {
          operation.status = 'pending'
        } else {
          operation.status = 'failed'
          failed.push(operation)
        }
      }
    }

    // Remove synced operations
    this.syncState.pendingOperations = this.syncState.pendingOperations.filter(
      op => op.status !== 'synced'
    )

    this.syncState.isSyncing = false
    this.syncState.conflicts = conflicts
    this.syncState.lastSyncTime = Date.now()
    this.savePendingOperations()
    this.saveSyncState()

    return { synced, failed, conflicts }
  },

  /**
   * Apply a single operation to the server
   */
  async applyOperation(
    operation: SyncOperation
  ): Promise<{ conflict?: SyncConflict }> {
    const functionName = this.getOperationFunctionName(operation)

    const response = await gasApi.execute(functionName, {
      ...operation.data,
      _operation: operation.type,
      _entity: operation.entity
    })

    if (!response.success) {
      throw new Error(response.error || 'Operation failed')
    }

    // Check for conflicts in response
    const responseAny = response as any
    if (responseAny.conflict) {
      return {
        conflict: {
          operation,
          serverData: responseAny.conflict.server,
          localData: responseAny.conflict.local,
          resolution: 'local'
        }
      }
    }

    return {}
  },

  /**
   * Get the appropriate GAS function name for the operation
   */
  getOperationFunctionName(operation: SyncOperation): string {
    const prefix = operation.type === 'delete' ? 'delete' : operation.type === 'create' ? 'create' : 'update'
    const entity = operation.entity.charAt(0).toUpperCase() + operation.entity.slice(1)
    return `${prefix}${entity}`
  },

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflict: SyncConflict,
    resolution: 'local' | 'server' | 'merge'
  ): Promise<boolean> {
    try {
      conflict.resolution = resolution

      if (resolution === 'local') {
        // Re-queue the operation
        conflict.operation.status = 'pending'
        conflict.operation.retries = 0
      } else if (resolution === 'server') {
        // Remove the operation, accept server version
        this.syncState.pendingOperations = this.syncState.pendingOperations.filter(
          op => op.id !== conflict.operation.id
        )
      } else {
        // Merge: combine local and server changes
        const merged = this.mergeConflict(conflict)
        conflict.operation.data = merged
        conflict.operation.status = 'pending'
        conflict.operation.retries = 0
      }

      this.syncState.conflicts = this.syncState.conflicts.filter(c => c !== conflict)
      this.savePendingOperations()
      return true
    } catch (error) {
      console.error('Error resolving conflict:', error)
      return false
    }
  },

  /**
   * Merge conflicted data
   */
  mergeConflict(conflict: SyncConflict): any {
    const merged = { ...conflict.serverData }

    // Recursively merge objects
    const merge = (target: any, source: any) => {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = merge(target[key] || {}, source[key])
        } else if (source[key] !== undefined && source[key] !== null) {
          // Prefer local changes unless they're older
          if (conflict.operation.timestamp > (conflict.serverData.updatedAt || 0)) {
            target[key] = source[key]
          }
        }
      })
      return target
    }

    return merge(merged, conflict.localData)
  },

  /**
   * Full sync from server
   */
  async fullSync(): Promise<{
    leads: Lead[]
    tasks: Task[]
    activities: Activity[]
  }> {
    try {
      this.syncState.isSyncing = true
      const response = await gasApi.execute('getAllData', {
        lastSyncTime: this.syncState.lastSyncTime
      })

      if (!response.success) {
        throw new Error(response.error || 'Full sync failed')
      }

      const data = response.data || {}
      this.syncState.lastSyncTime = Date.now()
      this.saveSyncState()

      return {
        leads: data.leads || [],
        tasks: data.tasks || [],
        activities: data.activities || []
      }
    } catch (error) {
      console.error('Full sync error:', error)
      throw error
    } finally {
      this.syncState.isSyncing = false
    }
  },

  /**
   * Incremental sync since last sync time
   */
  async incrementalSync(): Promise<{
    created: any[]
    updated: any[]
    deleted: any[]
  }> {
    try {
      this.syncState.isSyncing = true
      const response = await gasApi.execute('getChanges', {
        since: this.syncState.lastSyncTime
      })

      if (!response.success) {
        throw new Error(response.error || 'Incremental sync failed')
      }

      const changes = response.data || {}
      this.syncState.lastSyncTime = Date.now()
      this.saveSyncState()

      return {
        created: changes.created || [],
        updated: changes.updated || [],
        deleted: changes.deleted || []
      }
    } catch (error) {
      console.error('Incremental sync error:', error)
      throw error
    } finally {
      this.syncState.isSyncing = false
    }
  },

  /**
   * Save pending operations to localStorage
   */
  savePendingOperations(): void {
    try {
      localStorage.setItem(
        'lms_pending_operations',
        JSON.stringify(this.syncState.pendingOperations)
      )
    } catch (error) {
      console.error('Failed to save pending operations:', error)
    }
  },

  /**
   * Save sync state to localStorage
   */
  saveSyncState(): void {
    try {
      localStorage.setItem('lms_last_sync_time', this.syncState.lastSyncTime.toString())
    } catch (error) {
      console.error('Failed to save sync state:', error)
    }
  },

  /**
   * Clear all pending operations
   */
  clearPendingOperations(): void {
    this.syncState.pendingOperations = []
    this.syncState.conflicts = []
    this.savePendingOperations()
  },

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.syncState.isSyncing,
      lastSyncTime: this.syncState.lastSyncTime,
      pendingCount: this.syncState.pendingOperations.length,
      failedCount: this.syncState.pendingOperations.filter(op => op.status === 'failed').length,
      conflictCount: this.syncState.conflicts.length
    }
  }
}
