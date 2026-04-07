<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleClose"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          <!-- Header -->
          <div class="flex-shrink-0 border-b border-slate-200">
            <div class="flex items-center justify-between p-4 sm:p-6">
              <div class="flex-1 min-w-0">
                <h2 class="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <i class="ph-bold ph-users text-primary text-xl"></i>
                  <span>User Management</span>
                </h2>
                <p class="text-[10px] sm:text-xs text-slate-500 mt-1.5 font-medium">{{ roleLimitsSummary }}</p>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <button
                  v-if="canManageUsers && !showForm && activeTab === 'users'"
                  @click="startCreate"
                  class="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm"
                >
                  <i class="ph-bold ph-user-plus text-base"></i>
                  <span class="hidden xs:inline">Add User</span>
                </button>
                <button
                  @click="handleClose"
                  class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <i class="ph-bold ph-x text-xl"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6">

            <!-- Tabs (admin/superuser only) -->
            <div v-if="canManageUsers" class="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
              <button
                @click="activeTab = 'users'"
                :class="['flex-1 flex items-center justify-center gap-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition', activeTab === 'users' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700']"
              >
                <i class="ph-bold ph-users text-base"></i>
                <span class="hidden sm:inline">Users</span>
              </button>
              <button
                @click="activeTab = 'appearance'"
                :class="['flex-1 flex items-center justify-center gap-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition', activeTab === 'appearance' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700']"
              >
                <i class="ph-bold ph-paint-brush text-base"></i>
                <span class="hidden sm:inline">Appearance</span>
              </button>
              <button
                @click="activeTab = 'interests'"
                :class="['flex-1 flex items-center justify-center gap-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition', activeTab === 'interests' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700']"
              >
                <i class="ph-bold ph-list-bullets text-base"></i>
                <span class="hidden sm:inline">Interests</span>
              </button>
            </div>

            <!-- USERS TAB -->
            <template v-if="activeTab === 'users'">

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
                      <span
                        v-if="user.username === 'superuser'"
                        class="text-xs text-purple-600 font-medium border border-purple-200 bg-purple-50 px-1.5 py-0.5 rounded-full"
                      ><i class="ph-bold ph-lock-key text-xs"></i> Default</span>
                    </div>
                    <p v-if="user.mobile" class="text-xs text-slate-400 mt-0.5 truncate">{{ user.mobile }}</p>
                    <p v-if="confirmDeleteId === user.id" class="text-xs text-red-600 font-semibold mt-1">
                      Click the trash icon again to confirm deletion
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button
                      v-if="canManageUsers && user.username !== 'superuser'"
                      @click="startEdit(user)"
                      class="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                      title="Edit user"
                    >
                      <i class="ph-bold ph-pencil text-base"></i>
                    </button>

                    <button
                      v-if="authStore.isSuperuser && user.id !== authStore.user?.id && user.username !== 'superuser'"
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

            </template> <!-- end v-else -->
            </template> <!-- end users tab -->

            <!-- APPEARANCE TAB -->
            <template v-else-if="activeTab === 'appearance'">
              <div class="space-y-6">

                <!-- Live Preview -->
                <div class="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Preview</p>
                  <div class="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center gap-2">
                    <div class="bg-primary/10 p-1.5 rounded-lg flex-shrink-0">
                      <span v-if="brandLogo" class="text-xl leading-none select-none">{{ brandLogo }}</span>
                      <svg v-else width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4h24v20c0 0-2-3-4-3s-2 3-4 3-2-3-4-3-2 3-4 3-2-3-4-3-2 3-4 3V4z" fill="#FFD700"/>
                        <circle cx="10" cy="12" r="2.5" fill="#000"/><circle cx="22" cy="12" r="2.5" fill="#000"/>
                        <circle cx="10" cy="11" r="1" fill="#fff"/><circle cx="22" cy="11" r="1" fill="#fff"/>
                      </svg>
                    </div>
                    <span class="text-base font-bold text-slate-900">{{ brandName || 'LeadFlow India' }}</span>
                  </div>
                </div>

                <!-- App Name -->
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-2">App Name</label>
                  <input
                    v-model="brandName"
                    type="text"
                    maxlength="40"
                    placeholder="LeadFlow India"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                  />
                  <p class="text-xs text-slate-400 mt-1">Shown in the header bar.</p>
                </div>

                <!-- App Logo (Emoji Picker) -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm font-bold text-slate-700">App Logo (Emoji)</label>
                    <button
                      v-if="brandLogo"
                      @click="brandLogo = ''"
                      class="text-xs text-red-500 hover:text-red-700 transition"
                    >
                      Remove logo
                    </button>
                  </div>

                  <!-- Category filter -->
                  <div class="flex gap-1.5 overflow-x-auto pb-1.5 mb-2 no-scrollbar">
                    <button
                      v-for="(cat, idx) in EMOJI_CATEGORIES"
                      :key="idx"
                      @click="emojiCategory = idx"
                      :class="['flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-full transition', emojiCategory === idx ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"
                    >
                      {{ cat.name }}
                    </button>
                  </div>

                  <!-- Emoji grid -->
                  <div class="h-44 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-2">
                    <div class="grid grid-cols-8 sm:grid-cols-10 gap-0.5">
                      <button
                        v-for="emoji in EMOJI_CATEGORIES[emojiCategory].emojis"
                        :key="emoji"
                        @click="brandLogo = emoji"
                        :class="['text-xl p-1.5 rounded-lg hover:bg-primary/10 transition leading-none flex items-center justify-center', brandLogo === emoji ? 'bg-primary/20 ring-2 ring-primary ring-offset-1' : '']"
                      >
                        {{ emoji }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Save Branding -->
                <div class="flex items-center gap-3 justify-end">
                  <Transition name="form-slide">
                    <span v-if="brandSaved" class="text-sm text-green-600 font-semibold flex items-center gap-1">
                      <i class="ph-bold ph-check-circle"></i> Saved!
                    </span>
                  </Transition>
                  <button
                    @click="saveBranding"
                    :disabled="brandSaving"
                    class="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    <i v-if="brandSaving" class="ph-bold ph-spinner-gap animate-spin"></i>
                    <i v-else class="ph-bold ph-floppy-disk"></i>
                    {{ brandSaving ? 'Saving…' : 'Save Changes' }}
                  </button>
                </div>

              </div>
            </template> <!-- end appearance tab -->

            <!-- INTEREST OPTIONS TAB -->
            <template v-else-if="activeTab === 'interests'">
              <div class="space-y-6">

                <!-- Header -->
                <div>
                  <h3 class="text-lg font-bold text-slate-800 mb-1">Interest Options</h3>
                  <p class="text-sm text-slate-500">Configure the interest options shown in lead forms.</p>
                </div>

                <!-- Add new interest -->
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-2">Add New Interest</label>
                  <div class="flex gap-2">
                    <input
                      v-model="newInterest"
                      @keydown.enter="addInterest"
                      type="text"
                      placeholder="e.g., Cloud Services, AI Solutions..."
                      class="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition"
                    />
                    <button
                      @click="addInterest"
                      :disabled="!newInterest.trim()"
                      class="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 font-semibold"
                    >
                      <i class="ph-bold ph-plus text-lg"></i>
                      Add
                    </button>
                  </div>
                </div>

                <!-- Current interests list -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <label class="text-sm font-bold text-slate-700">Current Options</label>
                    <span class="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">{{ interestsList.length }} total</span>
                  </div>
                  <div class="bg-slate-50 rounded-xl border border-slate-200 p-3 max-h-96 overflow-y-auto">
                    <div v-if="interestsList.length === 0" class="text-center py-12 text-slate-400">
                      <i class="ph-bold ph-list-dashes text-4xl mb-2 block"></i>
                      <p class="text-sm font-medium">No interests configured yet</p>
                      <p class="text-xs mt-1">Add your first interest option above</p>
                    </div>
                    <div v-else class="space-y-2">
                      <div
                        v-for="(interest, idx) in interestsList"
                        :key="idx"
                        class="flex items-center justify-between bg-white rounded-lg px-4 py-3 group hover:shadow-sm transition"
                      >
                        <div class="flex items-center gap-3">
                          <span class="text-xs font-bold text-slate-400 w-6">{{ idx + 1 }}</span>
                          <span class="text-sm font-medium text-slate-800">{{ interest }}</span>
                        </div>
                        <button
                          @click="removeInterest(idx)"
                          class="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1"
                          title="Remove this interest"
                        >
                          <i class="ph-bold ph-trash text-lg"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Save button -->
                <div class="flex items-center gap-3 justify-end pt-4 border-t border-slate-200">
                  <Transition name="form-slide">
                    <span v-if="interestsSaved" class="text-sm text-green-600 font-semibold flex items-center gap-1.5">
                      <i class="ph-bold ph-check-circle text-lg"></i> Saved!
                    </span>
                  </Transition>
                  <button
                    @click="saveInterests"
                    :disabled="interestsSaving"
                    class="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
                  >
                    <i v-if="interestsSaving" class="ph-bold ph-spinner-gap animate-spin text-lg"></i>
                    <i v-else class="ph-bold ph-floppy-disk text-lg"></i>
                    {{ interestsSaving ? 'Saving…' : 'Save Changes' }}
                  </button>
                </div>

              </div>
            </template> <!-- end interests tab -->

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
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
const appStore = useAppStore()

// ─── Emoji Categories ─────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  { name: '😊 Smileys', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😋','😛','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😵','🤐','🥴','🤢','🤧','😷','🤒','🤕','💀','👻','👽','🤖','💩','😸','😹','😺','😻','😼','😽','🙀','😿','😾'] },
  { name: '🐶 Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🦅','🦆','🦉','🦇','🐺','🐴','🦄','🐝','🦋','🐛','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🐊','🐸','🐉','🦕','🦖','🐳','🐬','🦭','🐟','🦈','🐙','🦑','🦐','🦞','🦀','🦜','🦢','🦩','🦚','🦃','🐓','🦤','🕊','🐇','🦝','🦨','🦦','🦥','🐿','🦔','🐾'] },
  { name: '🌿 Nature', emojis: ['🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎋','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','☀️','🌤','⛅','☁️','🌧','⛈','🌩','🌨','❄️','🌊','💧','💦','🌈','🔥','⚡','🌪','🌀','🌍','🌎','🌏','🗺'] },
  { name: '🍕 Food', emojis: ['🍕','🍔','🌮','🌯','🍜','🍣','🍱','🍛','🍲','🥘','🍝','🥩','🍗','🍖','🌭','🍟','🥪','🧀','🍳','🥚','🥞','🧇','🥓','🥐','🍞','🥖','🧆','🌰','🍫','🍬','🍭','🍦','🍧','🍨','🍰','🎂','🍮','🍯','☕','🍵','🧋','🥤','🍹','🍸','🥂','🍾','🥛','🍺','🍻','🍷','🫖','🧃','🍎','🍊','🍋','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅'] },
  { name: '🏀 Sports', emojis: ['⚽','🏀','🏈','⚾','🥎','🏐','🏉','🥏','🎾','🏸','🏒','🏓','🥊','🥋','🎯','🏹','🎱','🛹','⛸','🥌','⛷','🏂','🏋️','🤸','🏊','🏄','🚵','🧘','🏆','🥇','🥈','🥉','🎖','🎯','🎳','🎣','🤿','🧗','🤺','⛳','🎮','🕹','🎲','♟','🎭','🎨','🪁','🏇','🤾','🏌','🪃','🥅','🛷','🎿','🏔','🧩'] },
  { name: '🚀 Travel', emojis: ['🚀','✈️','🛸','🚁','🚗','🚕','🚙','🚌','🏎','🚓','🚑','🚒','🛻','🚚','🚜','🏍','🛵','🚲','🛴','🛹','⛵','🚤','🛥','🛳','🚢','⚓','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏟','🏛','🗼','🗽','🗿','🏰','🏯','🕌','🕍','⛩','🛤','🛣','🌁','🎡','🎢','🎠','🌃','🌉','🌆','🌇','🌌','🌠','🎑','🏙'] },
  { name: '💼 Business', emojis: ['💼','📊','📈','📉','📋','📌','📍','📎','🖇','📏','📐','✂️','🗃','🗄','🗑','🔒','🔓','🔑','🗝','🔨','🔧','🪛','🔩','🔗','📱','💻','🖥','🖨','⌨️','🖱','💽','💾','☎️','📞','📟','📺','📻','📷','📸','🎙','🎚','🎛','⏱','⏰','🕰','⌚','⏳','🔭','🔬','💊','🩺','🩻','⚗️','🧪','🧫','🧬','📡','🛰','☢️','⚡','🧲','💡','🔦','🕯'] },
  { name: '💎 Symbols', emojis: ['💎','👑','🏅','🎗','🎀','🎁','🎊','🎉','🎈','🎆','🎇','🧨','✨','💫','⭐','🌟','🔥','💥','❄️','🌈','☀️','🌙','💧','🌊','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💝','💟','♾','✅','❎','⭕','❌','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','♻️','🔰','⚜','🏮','💲','💱','🔱'] },
]

// ─── State ────────────────────────────────────────────────────────────────────
const users = ref<ManagedUser[]>([])
const loading = ref(false)

const activeTab = ref<'users' | 'appearance' | 'interests'>('users')
const brandName = ref(appStore.appName)
const brandLogo = ref(appStore.appLogo)
const emojiCategory = ref(0)
const brandSaved = ref(false)
const brandSaving = ref(false)

// Interests management
const interestsList = ref<string[]>([...(appStore.interestsList || [])])
const newInterest = ref('')
const interestsSaved = ref(false)
const interestsSaving = ref(false)

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

function saveBranding() {
  brandSaving.value = true
  appStore.saveAppBranding(brandName.value, brandLogo.value).then(() => {
    brandSaving.value = false
    brandSaved.value = true
    setTimeout(() => { brandSaved.value = false }, 2000)
  })
}

function addInterest() {
  const interest = newInterest.value.trim()
  if (interest && !interestsList.value.includes(interest)) {
    interestsList.value.push(interest)
    newInterest.value = ''
  }
}

function removeInterest(idx: number) {
  interestsList.value.splice(idx, 1)
}

async function saveInterests() {
  interestsSaving.value = true
  try {
    await appStore.saveInterestsList(interestsList.value)
    interestsSaved.value = true
    setTimeout(() => { interestsSaved.value = false }, 2000)
  } catch (err) {
    console.error('Failed to save interests:', err)
  } finally {
    interestsSaving.value = false
  }
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
    brandName.value = appStore.appName
    brandLogo.value = appStore.appLogo
    // Refresh interestsList from store when modal opens
    interestsList.value = [...(appStore.interestsList || [])]
  } else {
    showForm.value = false
    resetForm()
    confirmDeleteId.value = null
    activeTab.value = 'users'
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
