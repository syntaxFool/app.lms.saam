# Advanced Sync Services Guide

This guide covers the advanced synchronization features that enable offline-first functionality, automatic retry logic, caching, and conflict resolution.

## Overview

The LMS now includes several advanced services for managing data synchronization:

- **Sync Service** - Core sync engine with conflict detection and offline queuing
- **Offline Service** - Detects online/offline status and handles connectivity
- **Queue Service** - Request queuing with priority and retry logic
- **Cache Service** - Data caching with TTL and tag-based invalidation
- **Leads Service** - High-level API for lead management with all sync features integrated

## Quick Start

### 1. Initialize Services in main.ts

```typescript
import { createApp } from 'vue'
import { initializeServices } from '@/services'
import App from './App.vue'

const app = createApp(App)

// Initialize all services before mounting
initializeServices({
  enableAutoSync: true,
  autoSyncInterval: 30000 // 30 seconds
})

app.mount('#app')
```

### 2. Use Services in Your Components

```typescript
import { leadsService } from '@/services'
import { useNotification } from '@/composables'

export default {
  setup() {
    const { success, error } = useNotification()

    const createLead = async () => {
      const response = await leadsService.createLead({
        name: 'John Doe',
        email: 'john@example.com'
      })

      if (response.success) {
        success('Lead created!')
      } else {
        error('Failed to create lead')
      }
    }

    return { createLead }
  }
}
```

## Service Details

### Offline Service

Handles online/offline status detection with connectivity verification.

#### Features

- Browser online/offline event detection
- Periodic connectivity checks with configurable timeout
- Automatic retry with exponential backoff
- Status change notifications

#### Usage

```typescript
import {
  isOnline,
  isOffline,
  onOfflineStatusChange,
  waitForOnline,
  retryWithBackoff
} from '@/services'

// Check status
if (isOnline()) {
  console.log('Device is online')
}

// Subscribe to status changes
const unsubscribe = onOfflineStatusChange((isOnline) => {
  console.log('Online status:', isOnline)
})

// Wait for online status
await waitForOnline(5000) // Optional timeout

// Retry with backoff
const result = await retryWithBackoff(
  () => fetchData(),
  3, // max retries
  1000 // initial delay in ms
)
```

#### Configuration

```typescript
initializeServices({
  offline: {
    checkInterval: 5000, // Check connectivity every 5s
    onlineThreshold: 3000, // 3s timeout for connectivity check
    enableNotifications: true
  }
})
```

### Queue Service

Manages request queuing with priority, retry logic, and persistence.

#### Features

- Priority-based request queuing
- Configurable concurrency limits
- Automatic retry with exponential/linear backoff
- Persistent queue (survives page refreshes)
- Request prioritization

#### Usage

```typescript
import {
  enqueue,
  getQueueStatus,
  batchEnqueue,
  pauseQueue,
  resumeQueue
} from '@/services'

// Queue a single request
const result = await enqueue(
  () => fetchLeads(),
  1, // priority (higher = earlier)
  3 // max retries
)

// Batch queue multiple requests
const results = await batchEnqueue([
  { fn: () => fetchLeads(), priority: 1 },
  { fn: () => fetchTasks(), priority: 2 },
  { fn: () => fetchActivities(), priority: 0 }
])

// Get queue status
const status = getQueueStatus()
console.log(`${status.pendingItems} pending, ${status.failedItems} failed`)

// Pause/Resume processing
pauseQueue()
resumeQueue()
```

#### Configuration

```typescript
initializeServices({
  queue: {
    maxConcurrent: 3, // Max 3 concurrent requests
    maxQueueSize: 100,
    retryStrategy: 'exponential', // or 'linear', 'immediate'
    initialRetryDelay: 1000,
    persistToStorage: true
  }
})
```

### Cache Service

Intelligent caching with TTL, tag-based invalidation, and storage persistence.

#### Features

- Automatic expiration with TTL
- Tag-based cache invalidation
- Configurable max size with LRU eviction
- Persistent cache (survives refreshes)
- Statistics and cleanup utilities

#### Usage

```typescript
import {
  set,
  get,
  has,
  invalidateByTag,
  getByTag,
  cleanup,
  getStats
} from '@/services'

// Set cache entry with TTL and tags
set('users:list', users, 5 * 60 * 1000, ['users', 'lists'])

// Get cached value
const cached = get('users:list')

// Check if exists
if (has('users:list')) {
  console.log('Cache hit')
}

// Invalidate by tag
invalidateByTag('users') // Invalidates all 'users' tagged entries

// Get all entries with tag
const allUsers = getByTag('users')

// Get statistics
const stats = getStats()
console.log(`Cache utilization: ${stats.utilization}`)

// Clean up expired entries
const cleaned = cleanup()
```

### Sync Service

Core synchronization engine with conflict detection and offline operations.

#### Features

- Operation queuing (create/update/delete)
- Conflict detection with resolution strategies
- Incremental and full sync
- Automatic conflict merging
- Retry on failure

#### Usage

```typescript
import { syncService } from '@/services'

// Queue operations
syncService.queueLeadOperation('create', lead)
syncService.queueLeadOperation('update', updates)
syncService.queueTaskOperation('create', task, leadId)

// Sync all pending
const result = await syncService.syncPendingOperations()
console.log(`Synced: ${result.synced.length}, Failed: ${result.failed.length}`)

// Handle conflicts
if (result.conflicts.length > 0) {
  const conflict = result.conflicts[0]
  await syncService.resolveConflict(conflict, 'merge') // or 'local', 'server'
}

// Full sync from server
const data = await syncService.fullSync()

// Incremental sync (since last sync)
const changes = await syncService.incrementalSync()

// Get sync status
const status = syncService.getSyncStatus()
console.log(`Pending: ${status.pendingCount}, Last sync: ${status.lastSyncTime}`)
```

### Leads Service

High-level API for lead management with all sync features integrated.

#### Features

- Full CRUD operations for leads, tasks, activities
- Automatic caching with smart invalidation
- Offline operation queuing
- Batch operations
- Search with filtering
- Conflict detection and resolution

#### Usage

```typescript
import { leadsService } from '@/services'

// Create lead (works offline)
const response = await leadsService.createLead({
  name: 'John Doe',
  email: 'john@example.com'
})

// Update lead
await leadsService.updateLead('lead_123', {
  status: 'Contacted',
  temperature: 'Hot'
})

// Delete lead
await leadsService.deleteLead('lead_123')

// Batch update
await leadsService.batchUpdateLeads([
  { id: 'lead_1', changes: { status: 'Won' } },
  { id: 'lead_2', changes: { status: 'Lost' } }
])

// Add task to lead
await leadsService.addTask('lead_123', {
  title: 'Follow-up call',
  dueDate: '2025-12-25',
  priority: 'high'
})

// Update task
await leadsService.updateTask('lead_123', 'task_456', {
  status: 'completed'
})

// Add activity log
await leadsService.addActivity('lead_123', {
  type: 'call',
  note: 'Called about proposal'
})

// Get activities
const activities = await leadsService.getActivities('lead_123')

// Search leads
const results = await leadsService.searchLeads('john', {
  status: 'Contacted',
  temperature: 'Hot'
})

// Get sync status
const status = leadsService.getSyncStatus()

// Manually sync pending
await leadsService.syncPending()
```

## Advanced Scenarios

### Handling Offline Operations

```typescript
import { leadsService } from '@/services'
import { useNotification } from '@/composables'
import { isOnline } from '@/services'

export default {
  setup() {
    const { info, success } = useNotification()

    const createLead = async (lead) => {
      const response = await leadsService.createLead(lead)

      if (!isOnline()) {
        info('You are offline. Changes will sync when online.')
      } else if (response.success) {
        success('Lead created and synced!')
      }
    }

    return { createLead }
  }
}
```

### Resolving Conflicts

```typescript
import { leadsService } from '@/services'

const handleSync = async () => {
  const result = await leadsService.syncPending()

  if (result.conflicts.length > 0) {
    for (let i = 0; i < result.conflicts.length; i++) {
      const resolved = await leadsService.resolveConflict(
        i,
        'merge' // or 'local', 'server'
      )

      if (resolved) {
        console.log(`Conflict ${i} resolved`)
      }
    }

    // Re-sync after resolving
    await leadsService.syncPending()
  }
}
```

### Monitoring Sync Status

```typescript
import { leadsService } from '@/services'
import { onOfflineStatusChange } from '@/services'

// Monitor sync status
const checkSyncStatus = () => {
  const status = leadsService.getSyncStatus()
  console.log(`Pending: ${status.pendingCount}`)
  console.log(`Failed: ${status.failedCount}`)
  console.log(`Conflicts: ${status.conflictCount}`)
}

// Auto-check when coming online
onOfflineStatusChange((isOnline) => {
  if (isOnline) {
    checkSyncStatus()
  }
})
```

## Performance Tips

1. **Use Cache Tags Strategically**
   ```typescript
   // Tag related data
   set('lead_1', lead, ttl, ['leads', 'lead_1', 'active'])
   
   // Invalidate together
   invalidateByTag('active')
   ```

2. **Configure Queue Concurrency**
   - Higher concurrency = faster but more resource usage
   - Lower concurrency = slower but less network overhead

3. **Set Appropriate TTL Values**
   ```typescript
   // Lists: longer TTL
   set('leads:all', leads, 10 * 60 * 1000, ['leads'])
   
   // Details: medium TTL
   set('lead:123', lead, 5 * 60 * 1000, ['lead_123'])
   
   // User-specific: shorter TTL
   set('user:profile', profile, 1 * 60 * 1000, ['profile'])
   ```

4. **Clean Up Regularly**
   ```typescript
   // In a timer or on app startup
   setInterval(() => {
     const cleaned = cleanup()
     if (cleaned > 0) {
       console.log(`Cleaned ${cleaned} expired entries`)
     }
   }, 5 * 60 * 1000) // Every 5 minutes
   ```

## Troubleshooting

### Sync Not Working
```typescript
// Check service initialization
const status = getServiceStatus()
console.log('Service status:', status)

// Check pending operations
const pending = leadsService.getPendingOperations()
console.log('Pending operations:', pending)

// Manually trigger sync
await leadsService.syncPending()
```

### High Memory Usage
```typescript
import { getStats, cleanup } from '@/services'

const stats = getStats()
if (stats.entriesCount > 40) {
  cleanup() // Remove expired entries
}
```

### Stale Cache
```typescript
// Clear specific tags
invalidateByTag('leads')

// Or clear all
clear()

// Re-fetch after clearing
const fresh = await leadsService.getLeads()
```

## Best Practices

1. **Always handle both success and offline states**
   ```typescript
   const response = await leadsService.createLead(lead)
   if (response.success) {
     if (isOnline()) {
       success('Created and synced')
     } else {
       info('Created locally, will sync when online')
     }
   }
   ```

2. **Use batching for multiple operations**
   ```typescript
   // Good: single batch call
   await leadsService.batchUpdateLeads(updates)

   // Avoid: multiple individual calls
   for (const update of updates) {
     await leadsService.updateLead(update.id, update.changes)
   }
   ```

3. **Monitor and log sync operations**
   ```typescript
   const result = await leadsService.syncPending()
   console.log(`Sync completed: ${result.synced.length}/${result.synced.length + result.failed.length}`)
   ```

4. **Clean up on unmount**
   ```typescript
   import { cleanupServices } from '@/services'

   onUnmounted(() => {
     cleanupServices()
   })
   ```

## API Reference

See the source files for complete API documentation:
- `src/services/sync.ts` - Sync operations and conflict handling
- `src/services/offline.ts` - Online/offline detection
- `src/services/queue.ts` - Request queuing
- `src/services/cache.ts` - Data caching
- `src/services/leads.ts` - Lead management
