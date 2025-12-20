<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="closeModal">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

      <!-- Modal Content -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-6 pt-4 pb-0 border-b border-slate-100 shrink-0">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-slate-800">
              {{ modalMode === 'add' ? 'New Lead' : modalMode === 'view' ? 'View Lead' : 'Edit Lead' }}
            </h3>
            <button @click="closeModal" class="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
              <i class="ph-bold ph-x text-lg"></i>
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex gap-6 overflow-x-auto border-b border-slate-100">
            <button
              @click="currentTab = 'info'"
              :class="[
                'pb-3 font-semibold text-sm transition-colors whitespace-nowrap',
                currentTab === 'info'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-600 border-b-2 border-transparent hover:text-slate-800'
              ]"
            >
              Info
            </button>
            <button
              @click="currentTab = 'activity'"
              :class="[
                'pb-3 font-semibold text-sm transition-colors whitespace-nowrap',
                currentTab === 'activity'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-600 border-b-2 border-transparent hover:text-slate-800'
              ]"
              :disabled="!leadId"
            >
              Activity
            </button>
            <button
              @click="currentTab = 'task'"
              :class="[
                'pb-3 font-semibold text-sm transition-colors whitespace-nowrap',
                currentTab === 'task'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-600 border-b-2 border-transparent hover:text-slate-800'
              ]"
              :disabled="!leadId"
            >
              Task
            </button>
            <button
              @click="currentTab = 'contact'"
              :class="[
                'pb-3 font-semibold text-sm transition-colors whitespace-nowrap',
                currentTab === 'contact'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-600 border-b-2 border-transparent hover:text-slate-800'
              ]"
              :disabled="!leadId"
            >
              Contact
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto bg-slate-50/50">
          <!-- Info Tab -->
          <div v-if="currentTab === 'info'" class="p-6 space-y-5">
            <form @submit.prevent="submitForm">
              <!-- Name -->
              <div class="mb-6">
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Lead Name *</label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  :disabled="modalMode === 'view'"
                  class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <!-- Phone & Email Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Phone *</label>
                  <div class="flex gap-2">
                    <div class="w-28">
                      <label class="block text-xs text-slate-500 mb-1 text-center">Code</label>
                      <CountryCodeSelect 
                        v-model="phonePrefix" 
                        size="sm"
                        :disabled="modalMode === 'view'"
                      />
                    </div>
                    <div class="flex-1">
                      <label class="block text-xs text-slate-500 mb-1">Number</label>
                      <input
                        v-model="phoneNumber"
                        type="tel"
                        required
                        :disabled="modalMode === 'view'"
                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                        :placeholder="getPhoneInputPlaceholder(phonePrefix)"
                        :maxlength="getPhoneInputMaxLength(phonePrefix)"
                        @input="handlePhoneInput"
                      />
                    </div>
                  </div>
                  <p v-if="phoneError" class="mt-1 text-sm text-red-600">{{ phoneError }}</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    v-model="formData.email"
                    type="email"
                    :disabled="modalMode === 'view'"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <!-- Status & Temperature Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Status *</label>
                  <select
                    v-model="formData.status"
                    required
                    :disabled="modalMode === 'view'"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed appearance-none"
                    @change="handleStatusChange"
                  >
                    <option value="">Select Status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Temperature</label>
                  <select
                    v-model="formData.temperature"
                    :disabled="modalMode === 'view'"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed appearance-none"
                  >
                    <option value="">Not Set</option>
                    <option value="Hot">🔴 Hot</option>
                    <option value="Warm">🟠 Warm</option>
                    <option value="Cold">🔵 Cold</option>
                  </select>
                </div>
              </div>

              <!-- Interest & Value Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="relative">
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Interest</label>
                  <input
                    v-model="formData.interest"
                    type="text"
                    :disabled="modalMode === 'view'"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="e.g. Software"
                    @input="handleInterestInput"
                    @focus="showInterestSuggestions = true"
                    @blur="hideInterestSuggestions"
                  />
                  <!-- Autocomplete Dropdown -->
                  <div
                    v-if="showInterestSuggestions && filteredInterests.length > 0"
                    class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    <button
                      v-for="interest in filteredInterests"
                      :key="interest"
                      type="button"
                      @mousedown.prevent="selectInterest(interest)"
                      class="w-full text-left px-4 py-2 hover:bg-primary/10 transition text-sm"
                    >
                      {{ interest }}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Value (₹)</label>
                  <input
                    v-model="formData.value"
                    type="number"
                    min="0"
                    :disabled="modalMode === 'view'"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="0"
                  />
                </div>
              </div>

              <!-- Location & Source Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="relative">
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
                  <input
                    v-model="formData.location"
                    type="text"
                    :disabled="modalMode === 'view'"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="City, Area"
                    @input="handleLocationInput"
                    @focus="showLocationSuggestions = true"
                    @blur="hideLocationSuggestions"
                  />
                  <!-- Autocomplete Dropdown -->
                  <div
                    v-if="showLocationSuggestions && filteredLocations.length > 0"
                    class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    <button
                      v-for="location in filteredLocations"
                      :key="location"
                      type="button"
                      @mousedown.prevent="selectLocation(location)"
                      class="w-full text-left px-4 py-2 hover:bg-primary/10 transition text-sm"
                    >
                      {{ location }}
                    </button>
                  </div>
                </div>
                <div class="relative">
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">Source</label>
                  <input
                    v-model="formData.source"
                    type="text"
                    :disabled="modalMode === 'view'"
                    class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="e.g. LinkedIn"
                    @input="handleSourceInput"
                    @focus="showSourceSuggestions = true"
                    @blur="hideSourceSuggestions"
                  />
                  <!-- Autocomplete Dropdown -->
                  <div
                    v-if="showSourceSuggestions && filteredSources.length > 0"
                    class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    <button
                      v-for="source in filteredSources"
                      :key="source"
                      type="button"
                      @mousedown.prevent="selectSource(source)"
                      class="w-full text-left px-4 py-2 hover:bg-primary/10 transition text-sm"
                    >
                      {{ source }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Assigned To -->
              <div class="mb-6">
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Assigned To</label>
                <select
                  v-model="formData.assignedTo"
                  :disabled="modalMode === 'view'"
                  class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="">Unassigned</option>
                  <option value="agent1">Agent 1</option>
                  <option value="agent2">Agent 2</option>
                </select>
              </div>

              <!-- Notes -->
              <div class="mb-6">
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  v-model="formData.notes"
                  :disabled="modalMode === 'view'"
                  rows="3"
                  class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed resize-none"
                  placeholder="Any additional notes..."
                ></textarea>
              </div>

              <!-- Form Error -->
              <div v-if="formError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {{ formError }}
              </div>
            </form>
          </div>

          <!-- Activity Tab -->
          <div v-else-if="currentTab === 'activity'" class="p-6">
            <div v-if="!leadId" class="text-center py-8">
              <i class="ph-duotone ph-activity text-4xl text-slate-300 mb-2"></i>
              <p class="text-slate-400">Create a lead to see activities</p>
            </div>
            
            <div v-else>
              <!-- Add Activity Form -->
              <div class="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <textarea
                  v-model="newActivity"
                  rows="3"
                  class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none mb-3"
                  placeholder="Add activity note..."
                ></textarea>
                <div class="flex gap-2">
                  <button
                    @click="addActivity('note')"
                    :disabled="!newActivity.trim()"
                    class="flex-1 bg-blue-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                  >
                    <i class="ph-bold ph-note mr-1"></i> Add Note
                  </button>
                  <button
                    @click="addActivity('call')"
                    :disabled="!newActivity.trim()"
                    class="flex-1 bg-green-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                  >
                    <i class="ph-bold ph-phone mr-1"></i> Log Call
                  </button>
                </div>
              </div>

              <!-- Activity Timeline -->
              <div v-if="leadActivities.length === 0" class="text-center py-8">
                <i class="ph-duotone ph-clock-countdown text-4xl text-slate-300 mb-2"></i>
                <p class="text-slate-400 text-sm">No activities yet</p>
              </div>
              
              <div v-else class="space-y-3">
                <div
                  v-for="activity in leadActivities"
                  :key="activity.id"
                  class="bg-white border border-slate-200 rounded-lg p-4 relative pl-12"
                >
                  <!-- Icon -->
                  <div class="absolute left-4 top-4 w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    :class="getActivityIconClass(activity.type)">
                    <i :class="getActivityIcon(activity.type)"></i>
                  </div>
                  
                  <!-- Content -->
                  <div>
                    <div class="flex justify-between items-start mb-1">
                      <h4 class="font-semibold text-slate-800 text-sm">{{ getActivityTitle(activity.type) }}</h4>
                      <span class="text-xs text-slate-500">{{ formatActivityTime(activity.timestamp) }}</span>
                    </div>
                    <p class="text-sm text-slate-600 mb-1">{{ activity.note }}</p>
                    <p class="text-xs text-slate-500">by {{ activity.createdBy }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Task Tab -->
          <div v-else-if="currentTab === 'task'" class="p-6">
            <div v-if="!leadId" class="text-center py-8">
              <i class="ph-duotone ph-check-square text-4xl text-slate-300 mb-2"></i>
              <p class="text-slate-400">Create a lead to add tasks</p>
            </div>
            
            <div v-else>
              <!-- Add Task Form -->
              <div class="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <input
                  v-model="newTaskTitle"
                  type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none mb-2"
                  placeholder="Task title..."
                  @keyup.enter="addTask"
                />
                <textarea
                  v-model="newTaskNote"
                  rows="2"
                  class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none mb-3"
                  placeholder="Task note (optional)..."
                ></textarea>
                <div class="flex gap-2">
                  <input
                    v-model="newTaskDueDate"
                    type="date"
                    class="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                  <button
                    @click="addTask"
                    :disabled="!newTaskTitle.trim()"
                    class="px-4 bg-primary text-white text-sm font-semibold py-2 rounded-lg hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                  >
                    <i class="ph-bold ph-plus mr-1"></i> Add Task
                  </button>
                </div>
              </div>

              <!-- Task List -->
              <div v-if="leadTasks.length === 0" class="text-center py-8">
                <i class="ph-duotone ph-clipboard-text text-4xl text-slate-300 mb-2"></i>
                <p class="text-slate-400 text-sm">No tasks yet</p>
              </div>
              
              <div v-else class="space-y-2">
                <div
                  v-for="task in leadTasks"
                  :key="task.id"
                  class="bg-white border border-slate-200 rounded-lg p-4 hover:border-primary/50 transition"
                  :class="{ 'opacity-60': task.status === 'completed' }"
                >
                  <div class="flex items-start gap-3">
                    <!-- Checkbox -->
                    <input
                      type="checkbox"
                      :checked="task.status === 'completed'"
                      @change="toggleTaskStatus(task.id)"
                      class="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <h4 class="font-semibold text-slate-800 text-sm mb-1"
                        :class="{ 'line-through': task.status === 'completed' }">
                        {{ task.title }}
                      </h4>
                      <p v-if="task.note" class="text-sm text-slate-600 mb-2">{{ task.note }}</p>
                      <div class="flex items-center gap-3 text-xs text-slate-500">
                        <span v-if="task.dueDate">
                          <i class="ph ph-calendar-blank mr-1"></i>
                          {{ formatDate(task.dueDate) }}
                        </span>
                        <span v-if="task.priority"
                          :class="getPriorityClass(task.priority)">
                          {{ task.priority }}
                        </span>
                        <span v-if="task.status === 'completed'" class="text-green-600 font-medium">
                          ✓ Completed
                        </span>
                      </div>
                    </div>
                    
                    <!-- Actions -->
                    <button
                      @click="deleteTask(task.id)"
                      class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Tab -->
          <div v-else-if="currentTab === 'contact'" class="p-6">
            <div class="text-slate-600 text-sm">
              <p v-if="!formData.phone" class="text-slate-400">No phone number available</p>
              <div v-else class="space-y-3">
                <a
                  :href="`tel:+91${formData.phone}`"
                  class="block w-full bg-green-500 text-white rounded-xl py-4 text-center font-bold hover:bg-green-600 transition"
                >
                  <i class="ph-bold ph-phone mr-2"></i> Call
                </a>
                <a
                  :href="`https://wa.me/91${formData.phone}`"
                  target="_blank"
                  class="block w-full bg-[#25D366] text-white rounded-xl py-4 text-center font-bold hover:bg-[#20BA5D] transition"
                >
                  <i class="ph-bold ph-whatsapp-logo mr-2"></i> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-300 transition"
          >
            Cancel
          </button>
          <button
            v-if="modalMode !== 'view'"
            @click="submitForm"
            class="flex-1 bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-indigo-600 transition"
          >
            {{ modalMode === 'add' ? 'Create Lead' : 'Update Lead' }}
          </button>
          <button
            v-else
            @click="switchToEdit"
            class="flex-1 bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-indigo-600 transition"
          >
            Edit
          </button>
        </div>
      </div>
    </div>

    <!-- Lost Reason Modal -->
    <LostReasonModal
      :is-open="isLostReasonModalOpen"
      @close="handleLostReasonClose"
      @submit="handleLostReasonSubmit"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import { useCountryCodes } from '@/composables/useCountryCodes'
import type { Lead, ActivityType, LostReasonType } from '@/types'
import LostReasonModal from './LostReasonModal.vue'
import CountryCodeSelect from './CountryCodeSelect.vue'

const leadsStore = useLeadsStore()

const { 
  validatePhoneLength, 
  getPhoneInputPlaceholder, 
  getPhoneInputMaxLength 
} = useCountryCodes()

interface Props {
  isOpen: boolean
  leadId?: string
  mode?: 'add' | 'edit' | 'view'
  prefillPhone?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'saved', lead: Lead): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'add'
})

const emit = defineEmits<Emits>()

const currentTab = ref('info')
const modalMode = ref<'add' | 'edit' | 'view'>(props.mode)
const formError = ref('')

// Phone handling
const phonePrefix = ref('+91')
const phoneNumber = ref('')
const phoneError = ref('')

// Lost Reason modal state
const isLostReasonModalOpen = ref(false)
const previousStatus = ref<string>('')

// Activity & Task state
const newActivity = ref('')
const newTaskTitle = ref('')
const newTaskNote = ref('')
const newTaskDueDate = ref('')

// Autocomplete state
const showInterestSuggestions = ref(false)
const showLocationSuggestions = ref(false)
const showSourceSuggestions = ref(false)

// Autocomplete data
const interests = [
  'Software Development',
  'Mobile App Development',
  'Web Development',
  'Digital Marketing',
  'SEO Services',
  'Social Media Marketing',
  'Graphic Design',
  'UI/UX Design',
  'Cloud Services',
  'Data Analytics',
  'AI/ML Solutions',
  'Cybersecurity',
  'E-commerce Platform',
  'CRM Software',
  'ERP System',
  'Business Consulting'
]

const locations = [
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Surat',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Coimbatore',
  'Kochi'
]

const sources = [
  'LinkedIn',
  'Facebook',
  'Instagram',
  'Google Ads',
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'WhatsApp',
  'Trade Show',
  'Partner',
  'Direct',
  'YouTube',
  'Twitter'
]

const formData = ref({
  name: '',
  phone: '',
  email: '',
  status: 'New',
  temperature: '',
  interest: '',
  value: 0,
  location: '',
  source: '',
  assignedTo: '',
  notes: '',
  lostReason: '',
  lostReasonType: undefined as LostReasonType | undefined
})

const existingLead = computed(() => props.leadId ? leadsStore.getLeadById(props.leadId) : null)

// Activity & Task computed
const leadActivities = computed(() => existingLead.value?.activities || [])
const leadTasks = computed(() => existingLead.value?.tasks || [])

// Autocomplete computed
const filteredInterests = computed(() => {
  if (!formData.value.interest) return interests
  const search = formData.value.interest.toLowerCase()
  return interests.filter(i => i.toLowerCase().includes(search))
})

const filteredLocations = computed(() => {
  if (!formData.value.location) return locations
  const search = formData.value.location.toLowerCase()
  return locations.filter(l => l.toLowerCase().includes(search))
})

const filteredSources = computed(() => {
  if (!formData.value.source) return sources
  const search = formData.value.source.toLowerCase()
  return sources.filter(s => s.toLowerCase().includes(search))
})

// Phone handling function
const handlePhoneInput = () => {
  // Clean the phone number (remove non-digits)
  phoneNumber.value = phoneNumber.value.replace(/\D/g, '')
  
  // Validate phone length based on country code
  if (phoneNumber.value.length > 0) {
    const isValid = validatePhoneLength(phonePrefix.value, phoneNumber.value)
    if (!isValid) {
      phoneError.value = `Invalid phone number length for ${phonePrefix.value}`
    } else {
      phoneError.value = ''
    }
  } else {
    phoneError.value = ''
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    currentTab.value = 'info'
    modalMode.value = props.mode || 'add'
    formError.value = ''

    if (existingLead.value) {
      formData.value = {
        name: existingLead.value.name || '',
        phone: existingLead.value.phone || '',
        email: existingLead.value.email || '',
        status: existingLead.value.status || 'New',
        temperature: existingLead.value.temperature || '',
        interest: existingLead.value.interest || '',
        value: existingLead.value.value || 0,
        location: existingLead.value.location || '',
        source: existingLead.value.source || '',
        assignedTo: existingLead.value.assignedTo || '',
        notes: existingLead.value.notes || '',
        lostReason: existingLead.value.lostReason || '',
        lostReasonType: existingLead.value.lostReasonType
      }
      // Parse existing phone number
      if (existingLead.value.phone) {
        const parts = existingLead.value.phone.split(' ')
        if (parts.length >= 2) {
          phonePrefix.value = parts[0]
          phoneNumber.value = parts.slice(1).join('')
        } else {
          // Assume it's just the number without country code
          phonePrefix.value = '+91'
          phoneNumber.value = existingLead.value.phone
        }
      }
      previousStatus.value = existingLead.value.status || 'New'
    } else {
      resetForm()
      // Prefill phone if provided
      if (props.prefillPhone) {
        phoneNumber.value = props.prefillPhone
      }
    }
  }
})

const resetForm = () => {
  formData.value = {
    name: '',
    phone: '',
    email: '',
    status: 'New',
    temperature: '',
    interest: '',
    value: 0,
    location: '',
    source: '',
    assignedTo: '',
    notes: '',
    lostReason: '',
    lostReasonType: undefined
  }
  phonePrefix.value = '+91'
  phoneNumber.value = ''
  phoneError.value = ''
  formError.value = ''
  previousStatus.value = 'New'
}

const submitForm = async () => {
  formError.value = ''

  if (!formData.value.name?.trim()) {
    formError.value = 'Lead name is required'
    return
  }

  if (!phoneNumber.value || !validatePhoneLength(phonePrefix.value, phoneNumber.value)) {
    formError.value = `Valid phone number is required for ${phonePrefix.value}`
    return
  }

  // Combine country code and phone number
  const fullPhoneNumber = `${phonePrefix.value} ${phoneNumber.value}`

  try {
    if (modalMode.value === 'add') {
      const result = await leadsStore.addNewLead({
        name: formData.value.name,
        phone: fullPhoneNumber,
        email: formData.value.email,
        status: formData.value.status as any,
        temperature: formData.value.temperature as any,
        interest: formData.value.interest,
        value: formData.value.value,
        location: formData.value.location,
        source: formData.value.source,
        assignedTo: formData.value.assignedTo,
        notes: formData.value.notes,
        lostReason: formData.value.lostReason || undefined,
        lostReasonType: formData.value.lostReasonType
      })
      if (result.success && result.data) {
        emit('saved', result.data)
      }
    } else if (modalMode.value === 'edit' && props.leadId) {
      const result = await leadsStore.updateLeadData(props.leadId, {
        name: formData.value.name,
        phone: fullPhoneNumber,
        email: formData.value.email,
        status: formData.value.status as any,
        temperature: formData.value.temperature as any,
        interest: formData.value.interest,
        value: formData.value.value,
        location: formData.value.location,
        source: formData.value.source,
        assignedTo: formData.value.assignedTo,
        notes: formData.value.notes,
        lostReason: formData.value.lostReason || undefined,
        lostReasonType: formData.value.lostReasonType
      })
      if (result.success && result.data) {
        emit('saved', result.data)
      }
    }
    closeModal()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Failed to save lead'
  }
}

const closeModal = () => {
  resetForm()
  emit('close')
}

const switchToEdit = () => {
  modalMode.value = 'edit'
}

// Status change handler
const handleStatusChange = () => {
  // If changing to Lost status, open lost reason modal
  if (formData.value.status === 'Lost' && previousStatus.value !== 'Lost') {
    isLostReasonModalOpen.value = true
  }
  previousStatus.value = formData.value.status
}

const handleLostReasonClose = () => {
  // Revert status if modal was cancelled
  if (previousStatus.value !== 'Lost') {
    formData.value.status = previousStatus.value
  }
  isLostReasonModalOpen.value = false
}

const handleLostReasonSubmit = (data: { reasonType: LostReasonType; details: string }) => {
  // Store the lost reason in form data
  formData.value.lostReason = data.details || data.reasonType
  formData.value.lostReasonType = data.reasonType
  isLostReasonModalOpen.value = false
}

// Activity functions
const addActivity = async (type: ActivityType) => {
  if (!newActivity.value.trim() || !props.leadId) return
  
  try {
    await leadsStore.addActivity(props.leadId, {
      type,
      note: newActivity.value.trim()
    })
    newActivity.value = ''
  } catch (error) {
    console.error('Failed to add activity:', error)
  }
}

const getActivityIcon = (type: ActivityType): string => {
  const icons: Record<ActivityType, string> = {
    lead_created: 'ph-bold ph-plus-circle',
    status_change: 'ph-bold ph-arrows-left-right',
    assignment: 'ph-bold ph-user-switch',
    task: 'ph-bold ph-check-square',
    follow_up: 'ph-bold ph-clock',
    field_update: 'ph-bold ph-pencil-simple',
    lost_reason: 'ph-bold ph-x-circle',
    note: 'ph-bold ph-note',
    call: 'ph-bold ph-phone',
    message: 'ph-bold ph-chat-circle'
  }
  return icons[type] || 'ph-bold ph-info'
}

const getActivityIconClass = (type: ActivityType): string => {
  const classes: Record<ActivityType, string> = {
    lead_created: 'bg-blue-100 text-blue-600',
    status_change: 'bg-purple-100 text-purple-600',
    assignment: 'bg-indigo-100 text-indigo-600',
    task: 'bg-green-100 text-green-600',
    follow_up: 'bg-orange-100 text-orange-600',
    field_update: 'bg-slate-100 text-slate-600',
    lost_reason: 'bg-red-100 text-red-600',
    note: 'bg-blue-100 text-blue-600',
    call: 'bg-green-100 text-green-600',
    message: 'bg-yellow-100 text-yellow-600'
  }
  return classes[type] || 'bg-slate-100 text-slate-600'
}

const getActivityTitle = (type: ActivityType): string => {
  const titles: Record<ActivityType, string> = {
    lead_created: 'Lead Created',
    status_change: 'Status Changed',
    assignment: 'Assignment Changed',
    task: 'Task Added',
    follow_up: 'Follow-up Set',
    field_update: 'Field Updated',
    lost_reason: 'Lead Lost',
    note: 'Note Added',
    call: 'Call Logged',
    message: 'Message Sent'
  }
  return titles[type] || 'Activity'
}

const formatActivityTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

// Task functions
const addTask = async () => {
  if (!newTaskTitle.value.trim() || !props.leadId) return
  
  try {
    await leadsStore.addTask(props.leadId, {
      title: newTaskTitle.value.trim(),
      note: newTaskNote.value.trim() || undefined,
      dueDate: newTaskDueDate.value || undefined,
      status: 'pending'
    })
    newTaskTitle.value = ''
    newTaskNote.value = ''
    newTaskDueDate.value = ''
  } catch (error) {
    console.error('Failed to add task:', error)
  }
}

const toggleTaskStatus = async (taskId: string) => {
  if (!props.leadId) return
  
  try {
    await leadsStore.toggleTaskStatus(props.leadId, taskId)
  } catch (error) {
    console.error('Failed to toggle task:', error)
  }
}

const deleteTask = async (taskId: string) => {
  if (!props.leadId || !confirm('Delete this task?')) return
  
  try {
    await leadsStore.deleteTask(props.leadId, taskId)
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

const getPriorityClass = (priority?: string): string => {
  const classes: Record<string, string> = {
    critical: 'text-red-600 font-semibold',
    high: 'text-orange-600 font-semibold',
    medium: 'text-yellow-600',
    low: 'text-slate-500'
  }
  return classes[priority || 'low'] || 'text-slate-500'
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString()
}

// Autocomplete handlers
const handleInterestInput = () => {
  showInterestSuggestions.value = true
}

const handleLocationInput = () => {
  showLocationSuggestions.value = true
}

const handleSourceInput = () => {
  showSourceSuggestions.value = true
}

const selectInterest = (interest: string) => {
  formData.value.interest = interest
  showInterestSuggestions.value = false
}

const selectLocation = (location: string) => {
  formData.value.location = location
  showLocationSuggestions.value = false
}

const selectSource = (source: string) => {
  formData.value.source = source
  showSourceSuggestions.value = false
}

const hideInterestSuggestions = () => {
  setTimeout(() => {
    showInterestSuggestions.value = false
  }, 200)
}

const hideLocationSuggestions = () => {
  setTimeout(() => {
    showLocationSuggestions.value = false
  }, 200)
}

const hideSourceSuggestions = () => {
  setTimeout(() => {
    showSourceSuggestions.value = false
  }, 200)
}
</script>
