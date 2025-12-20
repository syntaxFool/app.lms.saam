# Sync Services Integration Examples

Practical examples of how to integrate advanced sync services with your Vue components and Pinia stores.

## 1. Initialize Services in App

### main.ts

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initializeServices, cleanupServices } from '@/services'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// Initialize all services first
initializeServices({
  enableAutoSync: true,
  autoSyncInterval: 30000,
  offline: {
    checkInterval: 5000,
    enableNotifications: true
  },
  queue: {
    maxConcurrent: 3,
    retryStrategy: 'exponential'
  },
  cache: {
    defaultTTL: 5 * 60 * 1000,
    maxSize: 100
  }
})

// Setup cleanup on app unmount
window.addEventListener('beforeunload', () => {
  cleanupServices()
})

app.use(createPinia())
app.use(router)
app.mount('#app')
```

## 2. Enhanced Pinia Store with Sync

### stores/leads.ts

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { leadsService, isOnline } from '@/services'
import type { Lead, ApiResponse } from '@/types'

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref<Lead[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pendingCount = ref(0)

  const activeLead = ref<Lead | null>(null)

  // Computed
  const leadCount = computed(() => leads.value.length)
  const hasPending = computed(() => pendingCount.value > 0)

  // Load all leads
  async function loadLeads() {
    isLoading.value = true
    error.value = null

    try {
      const response = await leadsService.getLeads()

      if (response.success && response.data) {
        leads.value = response.data
      } else {
        error.value = response.error || 'Failed to load leads'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
      updatePendingCount()
    }
  }

  // Load single lead
  async function loadLead(leadId: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await leadsService.getLead(leadId)

      if (response.success && response.data) {
        activeLead.value = response.data

        // Update in list if exists
        const index = leads.value.findIndex(l => l.id === leadId)
        if (index !== -1) {
          leads.value[index] = response.data
        }
      } else {
        error.value = response.error || 'Failed to load lead'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  // Create lead
  async function createLead(lead: Partial<Lead>) {
    isLoading.value = true
    error.value = null

    try {
      const response = await leadsService.createLead(lead)

      if (response.success && response.data) {
        leads.value.push(response.data)
        updatePendingCount()
        return response.data
      } else {
        error.value = response.error || 'Failed to create lead'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update lead
  async function updateLead(leadId: string, updates: Partial<Lead>) {
    isLoading.value = true
    error.value = null

    try {
      const response = await leadsService.updateLead(leadId, updates)

      if (response.success && response.data) {
        const index = leads.value.findIndex(l => l.id === leadId)
        if (index !== -1) {
          leads.value[index] = response.data
        }

        if (activeLead.value?.id === leadId) {
          activeLead.value = response.data
        }

        updatePendingCount()
        return response.data
      } else {
        error.value = response.error || 'Failed to update lead'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete lead
  async function deleteLead(leadId: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await leadsService.deleteLead(leadId)

      if (response.success) {
        leads.value = leads.value.filter(l => l.id !== leadId)

        if (activeLead.value?.id === leadId) {
          activeLead.value = null
        }

        updatePendingCount()
        return true
      } else {
        error.value = response.error || 'Failed to delete lead'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Batch update
  async function batchUpdate(updates: Array<{ id: string; changes: Partial<Lead> }>) {
    isLoading.value = true
    error.value = null

    try {
      const response = await leadsService.batchUpdateLeads(updates)

      if (response.success) {
        // Re-load leads
        await loadLeads()
        updatePendingCount()
        return true
      } else {
        error.value = response.error || 'Batch update failed'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Search leads
  async function searchLeads(query: string, filters?: Record<string, any>) {
    isLoading.value = true
    error.value = null

    try {
      const response = await leadsService.searchLeads(query, filters)

      if (response.success && response.data) {
        return response.data
      } else {
        error.value = response.error || 'Search failed'
        return []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Sync pending operations
  async function syncPending() {
    try {
      const result = await leadsService.syncPending()

      if (result.conflicts.length > 0) {
        console.warn('Conflicts detected:', result.conflicts)
        // Show conflict resolution UI
      }

      await loadLeads()
      updatePendingCount()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sync failed'
      return null
    }
  }

  // Update pending count
  function updatePendingCount() {
    const status = leadsService.getSyncStatus()
    pendingCount.value = status.pendingCount
  }

  return {
    // State
    leads,
    activeLead,
    isLoading,
    error,
    pendingCount,

    // Computed
    leadCount,
    hasPending,

    // Methods
    loadLeads,
    loadLead,
    createLead,
    updateLead,
    deleteLead,
    batchUpdate,
    searchLeads,
    syncPending,
    updatePendingCount
  }
})
```

## 3. Vue Component Using Services

### components/LeadForm.vue

```typescript
<template>
  <div class="lead-form">
    <!-- Loading state -->
    <div v-if="isLoading" class="spinner">Loading...</div>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label for="name">Name *</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="input"
          :disabled="isSubmitting"
        />
        <div v-if="errors.name" class="error">{{ errors.name }}</div>
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="input"
          :disabled="isSubmitting"
        />
        <div v-if="errors.email" class="error">{{ errors.email }}</div>
      </div>

      <div class="form-group">
        <label for="phone">Phone</label>
        <input
          id="phone"
          v-model="form.phone"
          type="tel"
          class="input"
          :disabled="isSubmitting"
        />
      </div>

      <div class="form-group">
        <label for="status">Status</label>
        <select v-model="form.status" class="input" :disabled="isSubmitting">
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Proposal">Proposal</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>
      </div>

      <!-- Offline indicator -->
      <div v-if="!isOnline" class="offline-warning">
        <span>⚠️ You are offline. Changes will sync when online.</span>
      </div>

      <div class="actions">
        <button
          type="submit"
          :disabled="isSubmitting || !isFormValid"
          class="btn-primary"
        >
          {{ isSubmitting ? 'Saving...' : 'Save Lead' }}
        </button>
        <button type="button" @click="handleReset" class="btn-secondary">
          Reset
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useFormValidation } from '@/composables'
import { useNotification } from '@/composables'
import { useLeadsStore } from '@/stores/leads'
import { isOnline } from '@/services'
import type { Lead } from '@/types'

const leadsStore = useLeadsStore()
const { success, error: showError } = useNotification()
const { values: form, errors, validate } = useFormValidation({
  name: '',
  email: '',
  phone: '',
  status: 'New'
})

const isSubmitting = ref(false)
const isLoading = ref(false)

const isFormValid = computed(() => {
  return form.name && (form.email || form.phone)
})

const validationRules = {
  name: { required: true, minLength: 2 },
  email: { email: true },
  phone: { phone: true }
}

const handleSubmit = async () => {
  // Validate
  if (!validate(validationRules)) {
    showError('Please fix validation errors')
    return
  }

  isSubmitting.value = true

  try {
    const result = await leadsStore.createLead(form)

    if (result) {
      success(
        isOnline()
          ? 'Lead created and synced!'
          : 'Lead created. Will sync when online.'
      )

      // Reset form
      Object.assign(form, {
        name: '',
        email: '',
        phone: '',
        status: 'New'
      })
    } else {
      showError(leadsStore.error || 'Failed to create lead')
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Unknown error')
  } finally {
    isSubmitting.value = false
  }
}

const handleReset = () => {
  Object.assign(form, {
    name: '',
    email: '',
    phone: '',
    status: 'New'
  })
}
</script>

<style scoped>
.lead-form {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.offline-warning {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  color: #856404;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.spinner {
  text-align: center;
  padding: 2rem;
}
</style>
```

## 4. Offline Status Indicator Component

### components/OfflineIndicator.vue

```vue
<template>
  <div v-if="!isOnline" class="offline-banner">
    <div class="offline-content">
      <span class="offline-icon">⚠️</span>
      <div class="offline-info">
        <p class="offline-title">You are offline</p>
        <p class="offline-message">
          Changes will be synced automatically when you're back online.
        </p>
      </div>
      <div v-if="pendingCount > 0" class="pending-badge">
        {{ pendingCount }} pending
      </div>
    </div>

    <button v-if="hasPending" @click="handleManualSync" class="sync-btn">
      {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { isOnline, onOfflineStatusChange } from '@/services'
import { leadsService } from '@/services'

const isOnlineState = ref(isOnline())
const pendingCount = ref(0)
const isSyncing = ref(false)

const hasPending = ref(false)

onMounted(() => {
  // Subscribe to status changes
  const unsubscribe = onOfflineStatusChange((online) => {
    isOnlineState.value = online

    if (online) {
      // Auto-sync when coming online
      handleAutoSync()
    }
  })

  // Update pending count periodically
  const interval = setInterval(() => {
    updatePendingCount()
  }, 5000)

  // Cleanup
  return () => {
    unsubscribe()
    clearInterval(interval)
  }
})

function updatePendingCount() {
  const status = leadsService.getSyncStatus()
  pendingCount.value = status.pendingCount
  hasPending.value = status.pendingCount > 0
}

async function handleAutoSync() {
  isSyncing.value = true
  try {
    const result = await leadsService.syncPending()
    console.log('Auto-sync completed:', result)
  } catch (err) {
    console.error('Auto-sync failed:', err)
  } finally {
    isSyncing.value = false
    updatePendingCount()
  }
}

async function handleManualSync() {
  isSyncing.value = true
  try {
    const result = await leadsService.syncPending()
    console.log('Manual sync completed:', result)
  } catch (err) {
    console.error('Manual sync failed:', err)
  } finally {
    isSyncing.value = false
    updatePendingCount()
  }
}
</script>

<style scoped>
.offline-banner {
  background-color: #fff3cd;
  border-bottom: 2px solid #ffc107;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.offline-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.offline-icon {
  font-size: 1.5rem;
}

.offline-info {
  flex: 1;
}

.offline-title {
  font-weight: 600;
  margin: 0;
  color: #856404;
}

.offline-message {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #856404;
}

.pending-badge {
  background-color: #ff6b6b;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.sync-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.sync-btn:hover {
  background-color: #218838;
}

.sync-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
</style>
```

## 5. Usage in Layout

### App.vue

```vue
<template>
  <div id="app">
    <!-- Offline indicator -->
    <OfflineIndicator />

    <!-- Main content -->
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { cleanupServices } from '@/services'
import OfflineIndicator from '@/components/OfflineIndicator.vue'
import { RouterView } from 'vue-router'

onMounted(() => {
  console.log('App mounted - services ready')
})

onUnmounted(() => {
  cleanupServices()
})
</script>
```

## Summary

These examples show:

1. ✅ Service initialization in main.ts
2. ✅ Enhanced Pinia store with sync integration
3. ✅ Form component with offline support
4. ✅ Offline status indicator with manual sync
5. ✅ Proper cleanup and lifecycle management

For more details, refer to [ADVANCED_SYNC_GUIDE.md](./ADVANCED_SYNC_GUIDE.md)
