<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleClose"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          <!-- Header -->
          <div class="flex items-start justify-between p-6 border-b border-slate-200 flex-shrink-0">
            <div>
              <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i class="ph-bold ph-users text-primary"></i>
                User Management
              </h2>
              <p class="text-xs text-slate-400 mt-1">{{ roleLimitsSummary }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="canManageUsers && !showForm"
                @click="startCreate"
                class="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                <i class="ph-bold ph-user-plus"></i> Add User
              </button>
              <button
                @click="handleClose"
                class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <i class="ph-bold ph-x text-lg"></i>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6">

            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <i class="ph-bold ph-spinner-gap animate-spin text-3xl"></i>
              <span class="text-sm">Loading users…</span>
            </div>

            <template v-else>

              <!-- Create / Edit Form -->
              <Transition name="form-slide">
                <div v-if="showForm" class="mb-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <h3 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <i :class="formMode === 'create' ? 'ph-bold ph-user-plus text-primary' : 'ph-bold ph-pencil text-amber-500'"></i>
                    {{ formMode === 'create' ? 'Create New User' : `Edit ${editingUsername}` }}
                  </h3>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <!-- Username (create only) -->
                    <div v-if="formMode === 'create'">
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                        Username <span class="text-red-500">*</span>
                      </label>
                      <input
                        v-model="form.username"
                        type="text"
                        placeholder="e.g. john_doe"
                        autocomplete="off"
                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                      />
                      <p class="text-xs text-slate-400 mt-1">Letters, numbers, _ . - only</p>
                    </div>

                    <!-- Full Name -->
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                        Full Name <span class="text-red-500">*</span>
                      </label>
                      <input
                        v-model="form.name"
                        type="text"
                        placeholder="Full name"
                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                      />
                    </div>

                    <!-- Mobile Number -->
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Number</label>
                      <input
                        v-model="form.mobile"
                        type="tel"
                        placeholder="e.g. +60 12-345 6789"
                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                      />
                    </div>

                    <!-- Role -->
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                        Role <span class="text-red-500">*</span>
                      </label>
                      <select
                        v-model="form.role"
                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                      >
                        <option value="user">User (read-only)</option>
                        <option value="agent">Agent</option>
                        <option value="admin">Admin</option>
                        <option v-if="authStore.isSuperuser" value="superuser">Superuser</option>
                      </select>
                      <p class="text-xs mt-1" :class="roleLimitForSelected.atLimit ? 'text-red-500' : 'text-slate-400'">
                        {{ roleLimitForSelected.label }}
                      </p>
                    </div>

                    <!-- Password -->
                    <div class="sm:col-span-2">
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                        Password
                        <span v-if="formMode === 'create'" class="text-red-500">*</span>
                        <span v-else class="text-xs font-normal text-slate-400 ml-1">(leave blank to keep current)</span>
                      </label>
                      <input
                        v-model="form.password"
                        type="password"
                        :placeholder="formMode === 'create' ? 'Min 6 characters' : '••••••••'"
                        autocomplete="new-password"
                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                      />
                    </div>
                  </div>

                  <!-- Error -->
                  <p v-if="formError" class="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <i class="ph-bold ph-warning-circle flex-shrink-0"></i>
                    {{ formError }}
                  </p>

                  <!-- Form actions -->
                  <div class="flex gap-3 mt-4 justify-end">
                    <button
                      @click="cancelForm"
                      class="px-4 py-2 text-sm bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      @click="submitForm"
                      :disabled="formSubmitting || (formMode === 'create' && roleLimitForSelected.atLimit)"
                      class="px-4 py-2 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5"
                    >
                      <i v-if="formSubmitting" class="ph-bold ph-spinner-gap animate-spin"></i>
                      {{ formMode === 'create' ? 'Create User' : 'Save Changes' }}
                    </button>
                  </div>
                </div>
              </Transition>

              <!-- Empty state -->
              <div v-if="users.length === 0 && !showForm" class="text-center py-16 text-slate-400">
                <i class="ph-bold ph-users text-4xl mb-3 block"></i>
                <p class="font-medium">No users found</p>
                <p class="text-sm mt-1">Click "Add User" to create the first account.</p>
              </div>

              <!-- User list -->
              <div v-else class="space-y-2">
                <div
                  v-for="user in users"
                  :key="user.id"
                  :class="[
                    'flex items-center gap-3 p-4 rounded-xl border transition',
                    confirmDeleteId === user.id
                      ? 'border-red-200 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  ]"
                >
                  <!-- Avatar -->
                  <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 uppercase select-none">
                    {{ (user.name || user.username).charAt(0) }}
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-slate-800 text-sm">{{ user.name || user.username }}</span>
                      <span class="text-xs text-slate-400">@{{ user.username }}</span>
                      <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', roleClass(user.role)]">{{ user.role }}</span>
                      <span
                        v-if="user.id === authStore.user?.id"
                        class="text-xs text-green-600 font-medium border border-green-200 bg-green-50 px-1.5 py-0.5 rounded-full"
                      >You</span>
                    </div>
                    <p v-if="user.mobile" class="text-xs text-slate-400 mt-0.5 truncate">{{ user.mobile }}</p>
                    <p v-if="confirmDeleteId === user.id" class="text-xs text-red-600 font-semibold mt-1">
                      Click the trash icon again to confirm deletion
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button
                      v-if="canManageUsers"
                      @click="startEdit(user)"
                      class="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                      title="Edit user"
                    >
                      <i class="ph-bold ph-pencil text-base"></i>
                    </button>

                    <button
                      v-if="authStore.isSuperuser && user.id !== authStore.user?.id"
                      @click="onDeleteClick(user.id)"
                      :class="[
                        'p-1.5 rounded-lg transition',
                        confirmDeleteId === user.id
                          ? 'text-white bg-red-500 hover:bg-red-600'
                          : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                      ]"
                      :title="confirmDeleteId === user.id ? 'Confirm delete' : 'Delete user'"
                    >
                      <i class="ph-bold ph-trash text-base"></i>
                    </button>

                    <button
                      v-if="confirmDeleteId === user.id"
                      @click="confirmDeleteId = null"
                      class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition font-bold text-xs"
                      title="Cancel"
                    >
                      <i class="ph-bold ph-x text-base"></i>
                    </button>
                  </div>
                </div>
              </div>

            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/services/api'
import type { ApiResponse } from '@/types'
import { ROLE_LIMITS } from '@/constants/roleLimits'

interface ManagedUser {
  id: string
  username: string
  name: string
  mobile: string | null
  role: string
  created_at?: string
}

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthStore()

// ─── State ────────────────────────────────────────────────────────────────────
const users = ref<ManagedUser[]>([])
const loading = ref(false)

const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingUserId = ref<string | null>(null)
const editingUsername = ref('')
const confirmDeleteId = ref<string | null>(null)

const formError = ref('')
const formSubmitting = ref(false)

const form = ref({
  username: '',
  password: '',
  name: '',
  mobile: '',
  role: 'agent',
})

// ─── Computed ─────────────────────────────────────────────────────────────────
const canManageUsers = computed(() => authStore.canManageUsers())

const roleCounts = computed(() => {
  const counts: Record<string, number> = { superuser: 0, admin: 0, agent: 0, user: 0 }
  users.value.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1 })
  return counts
})

const roleLimitsSummary = computed(() => {
  const c = roleCounts.value
  return [
    `Superusers ${c.superuser}/${ROLE_LIMITS.superuser}`,
    `Admins ${c.admin}/${ROLE_LIMITS.admin}`,
    `Agents ${c.agent}/${ROLE_LIMITS.agent}`,
    `Users ${c.user}`,
  ].join(' · ')
})

const roleLimitForSelected = computed(() => {
  const role = form.value.role
  const current = roleCounts.value[role] ?? 0
  const limit = ROLE_LIMITS[role]
  const adjustedCurrent = formMode.value === 'edit' ? current - 1 : current
  if (limit === Infinity) return { label: `${current} ${role}(s) — no limit`, atLimit: false }
  const atLimit = adjustedCurrent >= limit
  const available = limit - adjustedCurrent
  return {
    label: atLimit
      ? `Limit reached (${current}/${limit})`
      : `${adjustedCurrent}/${limit} used — ${available} slot(s) available`,
    atLimit,
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roleClass(role: string): string {
  const map: Record<string, string> = {
    superuser: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    agent: 'bg-green-100 text-green-700',
    user: 'bg-slate-100 text-slate-600',
  }
  return map[role] ?? 'bg-slate-100 text-slate-600'
}

function resetForm() {
  form.value = { username: '', password: '', name: '', mobile: '', role: 'agent' }
  formError.value = ''
  editingUserId.value = null
  editingUsername.value = ''
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function loadUsers() {
  loading.value = true
  try {
    const response = await apiClient.get('/users') as ApiResponse<ManagedUser[]>
    if (response.success && response.data) {
      users.value = response.data
    }
  } catch (err) {
    console.error('Failed to load users:', err)
  } finally {
    loading.value = false
  }
}

// ─── Form actions ─────────────────────────────────────────────────────────────
function startCreate() {
  resetForm()
  formMode.value = 'create'
  showForm.value = true
  confirmDeleteId.value = null
}

function startEdit(user: ManagedUser) {
  resetForm()
  formMode.value = 'edit'
  editingUserId.value = user.id
  editingUsername.value = user.username
  form.value = {
    username: user.username,
    password: '',
    name: user.name ?? '',
    mobile: user.mobile ?? '',
    role: user.role,
  }
  showForm.value = true
  confirmDeleteId.value = null
}

function cancelForm() {
  showForm.value = false
  resetForm()
}

async function submitForm() {
  formError.value = ''

  if (formMode.value === 'create') {
    if (!form.value.username.trim()) { formError.value = 'Username is required'; return }
    if (!/^[a-zA-Z0-9_.-]+$/.test(form.value.username)) {
      formError.value = 'Username may only contain letters, numbers, _ . -'
      return
    }
    if (!form.value.name.trim()) { formError.value = 'Full name is required'; return }
    if (!form.value.password || form.value.password.length < 6) {
      formError.value = 'Password must be at least 6 characters'
      return
    }
  } else {
    if (!form.value.name.trim()) { formError.value = 'Full name is required'; return }
    if (form.value.password && form.value.password.length < 6) {
      formError.value = 'New password must be at least 6 characters'
      return
    }
  }

  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      const payload: Record<string, string> = {
        username: form.value.username.trim().toLowerCase(),
        password: form.value.password,
        name: form.value.name.trim(),
        role: form.value.role,
      }
      if (form.value.mobile.trim()) payload.mobile = form.value.mobile.trim()

      const response = await apiClient.post('/users', payload) as ApiResponse<ManagedUser>
      if (!response.success) { formError.value = response.error ?? 'Failed to create user'; return }
      users.value.push(response.data!)

    } else {
      const payload: Record<string, string> = {
        name: form.value.name.trim(),
        role: form.value.role,
      }
      if (form.value.mobile.trim()) payload.mobile = form.value.mobile.trim()
      if (form.value.password) payload.password = form.value.password

      const response = await apiClient.put(`/users/${editingUserId.value}`, payload) as ApiResponse<ManagedUser>
      if (!response.success) { formError.value = response.error ?? 'Failed to update user'; return }

      const idx = users.value.findIndex(u => u.id === editingUserId.value)
      if (idx !== -1 && response.data) users.value[idx] = { ...users.value[idx], ...response.data }

      if (editingUserId.value === authStore.user?.id) {
        await authStore.checkAuth()
      }
    }

    showForm.value = false
    resetForm()
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'An error occurred'
  } finally {
    formSubmitting.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
function onDeleteClick(id: string) {
  if (confirmDeleteId.value === id) {
    handleDelete(id)
  } else {
    confirmDeleteId.value = id
    showForm.value = false
    resetForm()
  }
}

async function handleDelete(id: string) {
  try {
    const response = await apiClient.delete(`/users/${id}`) as ApiResponse<void>
    if (response.success) {
      users.value = users.value.filter(u => u.id !== id)
    }
  } catch (err) {
    console.error('Delete user error:', err)
  } finally {
    confirmDeleteId.value = null
  }
}

// ─── Close ────────────────────────────────────────────────────────────────────
function handleClose() {
  showForm.value = false
  resetForm()
  confirmDeleteId.value = null
  emit('close')
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
watch(() => props.isOpen, (open) => {
  if (open) {
    loadUsers()
  } else {
    showForm.value = false
    resetForm()
    confirmDeleteId.value = null
  }
})
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .relative,
.modal-fade-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}

.form-slide-enter-active,
.form-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
