<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="close"></div>

      <!-- Modal -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-bold text-slate-800">Enter Phone Number</h3>
            <button @click="close" class="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
              <i class="ph-bold ph-x text-lg"></i>
            </button>
          </div>
          <p class="text-sm text-slate-500">We'll check if this lead already exists</p>
        </div>

        <!-- Content -->
        <div class="px-6 pb-6">
          <!-- Phone Input -->
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
            <div class="flex gap-2">
              <div class="w-28">
                <CountryCodeSelect 
                  v-model="phonePrefix" 
                  size="sm"
                />
              </div>
              <input
                ref="phoneInput"
                v-model="phoneNumber"
                type="tel"
                class="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-lg font-mono focus:ring-2 focus:ring-primary outline-none"
                :placeholder="getPhoneInputPlaceholder(phonePrefix)"
                :maxlength="getPhoneInputMaxLength(phonePrefix)"
                @input="handlePhoneInput"
                @keyup.enter="handleSubmit"
              />
            </div>
            <p v-if="phoneError" class="mt-2 text-sm text-red-600">{{ phoneError }}</p>
          </div>

          <!-- Duplicate Warning -->
          <div v-if="duplicateLeads.length > 0" class="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div class="flex items-start gap-3 mb-3">
              <i class="ph-bold ph-warning text-amber-600 text-xl mt-0.5"></i>
              <div class="flex-1">
                <h4 class="font-semibold text-amber-900 mb-1">Duplicate Lead Found!</h4>
                <p class="text-sm text-amber-700">This phone number already exists in the system.</p>
              </div>
            </div>

            <!-- Existing Leads -->
            <div class="space-y-2">
              <div
                v-for="lead in duplicateLeads"
                :key="lead.id"
                class="bg-white border border-amber-200 rounded-lg p-3 hover:border-amber-400 transition cursor-pointer"
                @click="openExistingLead(lead.id)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h5 class="font-semibold text-slate-800">{{ lead.name }}</h5>
                    <p class="text-sm text-slate-600">{{ formatPhone(lead.phone) }}</p>
                    <div class="flex items-center gap-2 mt-2">
                      <span class="px-2 py-0.5 text-xs font-semibold rounded-full"
                        :class="getStatusClass(lead.status)">
                        {{ lead.status }}
                      </span>
                      <span v-if="lead.assignedTo" class="text-xs text-slate-500">
                        Assigned to: {{ lead.assignedTo }}
                      </span>
                    </div>
                  </div>
                  <button class="p-2 text-primary hover:bg-primary/10 rounded-lg">
                    <i class="ph-bold ph-arrow-right text-lg"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-4 flex gap-2">
              <button
                @click="continueAnyway"
                class="flex-1 bg-amber-600 text-white font-semibold py-2.5 rounded-lg hover:bg-amber-700 transition"
              >
                Create New Anyway
              </button>
              <button
                @click="close"
                class="flex-1 bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- No Duplicate - Continue Button -->
          <div v-else-if="phoneNumber && validatePhoneLength(phonePrefix, phoneNumber) && !phoneError">
            <button
              @click="handleSubmit"
              class="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-2"
            >
              <i class="ph-bold ph-check-circle text-lg"></i>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useLeadsStore } from '@/stores/leads'
import { useCountryCodes } from '@/composables/useCountryCodes'
import type { Lead } from '@/types'
import CountryCodeSelect from './CountryCodeSelect.vue'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', phone: string): void
  (e: 'open-existing', leadId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const leadsStore = useLeadsStore()

const { 
  validatePhoneLength, 
  getPhoneInputPlaceholder, 
  getPhoneInputMaxLength,
  formatPhoneNumber
} = useCountryCodes()

const phoneInput = ref<HTMLInputElement | null>(null)
const phonePrefix = ref('+91')
const phoneNumber = ref('')
const phoneError = ref('')

// Check for duplicates - need to check with full phone format
const duplicateLeads = computed((): Lead[] => {
  if (!phoneNumber.value) return []
  
  const fullPhone = formatPhoneNumber(phonePrefix.value, phoneNumber.value)
  
  return leadsStore.leads.filter(lead => {
    if (!lead.phone) return false
    
    // Check if lead's phone matches either format
    return lead.phone === phoneNumber.value || // Legacy format
           lead.phone === fullPhone || // Full format with country code
           lead.phone.replace(/\s+/g, '') === `${phonePrefix.value}${phoneNumber.value}` // Stripped spaces
  })
})

// Watch for modal opening to focus input
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    phoneNumber.value = ''
    phonePrefix.value = '+91'
    phoneError.value = ''
    nextTick(() => {
      phoneInput.value?.focus()
    })
  }
})

const handlePhoneInput = () => {
  // Only allow numbers
  phoneNumber.value = phoneNumber.value.replace(/\D/g, '')
  
  // Validate based on selected country code
  phoneError.value = ''
  if (phoneNumber.value.length > 0) {
    const isValid = validatePhoneLength(phonePrefix.value, phoneNumber.value)
    if (!isValid) {
      phoneError.value = `Invalid phone number length for ${phonePrefix.value}`
    }
  }
}

const handleSubmit = () => {
  if (!validatePhoneLength(phonePrefix.value, phoneNumber.value)) {
    phoneError.value = `Please enter a valid phone number for ${phonePrefix.value}`
    return
  }
  
  if (duplicateLeads.value.length === 0) {
    const fullPhone = formatPhoneNumber(phonePrefix.value, phoneNumber.value)
    emit('submit', fullPhone)
    close()
  }
}

const continueAnyway = () => {
  if (validatePhoneLength(phonePrefix.value, phoneNumber.value)) {
    const fullPhone = formatPhoneNumber(phonePrefix.value, phoneNumber.value)
    emit('submit', fullPhone)
    close()
  }
}

const openExistingLead = (leadId: string) => {
  emit('open-existing', leadId)
  close()
}

const close = () => {
  emit('close')
}

const formatPhone = (phone: string): string => {
  if (!phone) return ''
  
  // If phone already contains country code
  if (phone.includes('+') || phone.includes(' ')) {
    return phone
  }
  
  // Legacy format - assume +91
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
  }
  
  return phone
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    New: 'bg-blue-100 text-blue-700',
    Contacted: 'bg-yellow-100 text-yellow-700',
    Proposal: 'bg-purple-100 text-purple-700',
    Won: 'bg-green-100 text-green-700',
    Lost: 'bg-red-100 text-red-700'
  }
  return classes[status] || 'bg-slate-100 text-slate-700'
}
</script>
