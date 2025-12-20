<template>
  <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto flex flex-col">
      <!-- Header -->
      <div class="px-6 pt-4 pb-0 border-b border-slate-100 shrink-0">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-slate-800">
            {{ lead?.id ? 'Edit Lead' : 'New Lead' }}
          </h3>
          <button
            @click="closeModal"
            class="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"
          >
            <i class="ph-bold ph-x text-lg"></i>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-6 overflow-x-auto no-scrollbar border-b border-slate-200 -mx-6 px-6">
          <button
            v-for="tab in tabs"
            :key="tab"
            @click="activeTab = tab"
            :class="[
              'pb-3 font-semibold text-sm transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 hover:text-slate-700'
            ]"
          >
            {{ tab }}
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Info Tab -->
        <div v-if="activeTab === 'Info'" class="space-y-5">
          <!-- Name -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Lead Name</label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="e.g. Acme Corp"
              required
            />
          </div>

          <!-- Email & Phone -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                v-model="formData.email"
                type="email"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
              <div class="flex gap-2">
                <div class="w-28">
                  <CountryCodeSelect 
                    v-model="phonePrefix" 
                    size="sm"
                  />
                </div>
                <input
                  v-model="phoneNumber"
                  type="tel"
                  class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition"
                  :placeholder="getPhoneInputPlaceholder(phonePrefix)"
                  :maxlength="getPhoneInputMaxLength(phonePrefix)"
                  @input="handlePhoneInput"
                />
              </div>
              <p v-if="phoneError" class="mt-1 text-sm text-red-600">{{ phoneError }}</p>
            </div>
          </div>

          <!-- Interest & Status -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Interest</label>
              <input
                v-model="interestInput"
                type="text"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition"
                placeholder="Search interest..."
                @keydown.enter="addInterest"
              />
              <div v-if="selectedInterests.length > 0" class="flex flex-wrap gap-2 mt-2">
                <span
                  v-for="interest in selectedInterests"
                  :key="interest"
                  class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {{ interest }}
                  <button
                    type="button"
                    @click="removeInterest(interest)"
                    class="ml-1.5 text-indigo-400 hover:text-indigo-600"
                  >
                    <i class="ph-bold ph-x"></i>
                  </button>
                </span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                v-model="formData.status"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Proposal">Proposal</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          <!-- Temperature, Value, Location -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Temperature</label>
              <select
                v-model="formData.temperature"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Not Set</option>
                <option value="Hot">🔴 Hot</option>
                <option value="Warm">🟠 Warm</option>
                <option value="Cold">🔵 Cold</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Value (₹)</label>
              <input
                v-model.number="formData.value"
                type="number"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <!-- Location & Source -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
              <input
                v-model="formData.location"
                type="text"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition"
                placeholder="City, Area..."
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Source</label>
              <input
                v-model="formData.source"
                type="text"
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition"
                placeholder="LinkedIn, Referral..."
              />
            </div>
          </div>

          <!-- Assigned To -->
          <div v-if="isAdmin">
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Assign To</label>
            <select
              v-model="formData.assignedTo"
              class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Unassigned</option>
              <option v-for="user in agents" :key="user.id" :value="user.username">
                {{ user.name }}
              </option>
            </select>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              v-model="formData.notes"
              rows="3"
              class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Activity Tab -->
        <div v-if="activeTab === 'Activity'" class="space-y-4">
          <ActivityTimeline :lead="lead" />
        </div>

        <!-- Task Tab -->
        <div v-if="activeTab === 'Task'" class="space-y-4">
          <!-- Add Task Form -->
          <div class="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <input
                v-model="newTask.title"
                type="text"
                placeholder="Task title..."
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <textarea
                v-model="newTask.note"
                placeholder="Task note (max 15 words)..."
                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm resize-none h-12"
              ></textarea>
            </div>
            <div class="flex gap-2">
              <input
                v-model="newTask.dueDate"
                type="date"
                class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <button
                @click="addTask"
                class="bg-slate-800 text-white rounded-xl px-4 py-3 hover:bg-slate-700 font-medium text-sm transition"
              >
                <i class="ph-bold ph-plus"></i> Add
              </button>
            </div>
          </div>

          <!-- Tasks List -->
          <TaskList :lead="lead" @open-detail="openTaskDetail" @delete="deleteTask" />
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-100 shrink-0 bg-white">
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-300 transition"
          >
            Cancel
          </button>
          <button
            @click="saveLead"
            :disabled="!formData.name"
            class="flex-1 bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {{ lead?.id ? 'Update' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Lead, User, LeadStatus } from '@/types'
import { useCountryCodes } from '@/composables/useCountryCodes'
import ActivityTimeline from './ActivityTimeline.vue'
import TaskList from './TaskList.vue'
import CountryCodeSelect from './CountryCodeSelect.vue'

const props = defineProps<{
  modelValue: boolean
  lead?: Lead | null
  agents?: User[]
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: Partial<Lead>]
  'add-task': [title: string, note: string, dueDate: string]
  'delete-task': [leadId: string, taskIndex: number]
}>()

const { 
  validatePhoneLength, 
  getPhoneInputPlaceholder, 
  getPhoneInputMaxLength 
} = useCountryCodes()

const showModal = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const tabs = ['Info', 'Activity', 'Task']
const activeTab = ref('Info')

const phonePrefix = ref('+91')
const phoneNumber = ref('')
const phoneError = ref('')
const interestInput = ref('')
const selectedInterests = ref<string[]>([])

const formData = ref<Partial<Lead>>({
  name: '',
  email: '',
  phone: '',
  location: '',
  interest: '',
  source: '',
  status: 'New',
  temperature: '',
  value: 0,
  notes: '',
  assignedTo: ''
})

const newTask = ref({
  title: '',
  note: '',
  dueDate: ''
})

watch(
  () => props.lead,
  (newLead) => {
    if (newLead) {
      formData.value = { ...newLead }
      if (newLead.phone) {
        const parts = newLead.phone.split(' ')
        phonePrefix.value = parts[0] || '+91'
        phoneNumber.value = parts[1] || newLead.phone
      }
      if (newLead.interest) {
        selectedInterests.value = newLead.interest.split(',').map(i => i.trim()).filter(Boolean)
      }
    } else {
      resetForm()
    }
  }
)

function resetForm() {
  formData.value = {
    name: '',
    email: '',
    phone: '',
    location: '',
    interest: '',
    source: '',
    status: 'New',
    temperature: '',
    value: 0,
    notes: '',
    assignedTo: ''
  }
  phoneNumber.value = ''
  phonePrefix.value = '+91'
  selectedInterests.value = []
  interestInput.value = ''
  newTask.value = { title: '', note: '', dueDate: '' }
}

function handlePhoneInput() {
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

function addInterest() {
  if (interestInput.value && !selectedInterests.value.includes(interestInput.value)) {
    selectedInterests.value.push(interestInput.value)
    interestInput.value = ''
  }
}

function removeInterest(interest: string) {
  selectedInterests.value = selectedInterests.value.filter(i => i !== interest)
}

function addTask() {
  if (newTask.value.title) {
    emit('add-task', newTask.value.title, newTask.value.note, newTask.value.dueDate)
    newTask.value = { title: '', note: '', dueDate: '' }
  }
}

function deleteTask(leadId: string, taskIndex: number) {
  emit('delete-task', leadId, taskIndex)
}

function openTaskDetail(leadId: string, taskIndex: number) {
  // Implement task detail logic
}

function saveLead() {
  if (!formData.value.name) return

  const fullPhone = phoneNumber.value ? `${phonePrefix.value} ${phoneNumber.value}` : ''
  const interest = selectedInterests.value.join(', ')

  emit('save', {
    ...formData.value,
    phone: fullPhone,
    interest
  })

  closeModal()
}

function closeModal() {
  showModal.value = false
  resetForm()
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
