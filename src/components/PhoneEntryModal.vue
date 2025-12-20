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
              <div class="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-600 font-medium">
                +91
              </div>
              <input
                ref="phoneInput"
                v-model="phoneNumber"
                type="tel"
                maxlength="10"
                pattern="[0-9]{10}"
                class="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-lg font-mono focus:ring-2 focus:ring-primary outline-none"
                placeholder="9876543210"
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
          <div v-else-if="phoneNumber.length === 10 && !phoneError">
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
import type { Lead } from '@/types'

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
const phoneInput = ref<HTMLInputElement | null>(null)
const phoneNumber = ref('')
const phoneError = ref('')

// Check for duplicates
const duplicateLeads = computed((): Lead[] => {
  if (phoneNumber.value.length !== 10) return []
  return leadsStore.leads.filter(lead => 
    lead.phone === phoneNumber.value
  )
})

// Watch for modal opening to focus input
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    phoneNumber.value = ''
    phoneError.value = ''
    nextTick(() => {
      phoneInput.value?.focus()
    })
  }
})

const handlePhoneInput = () => {
  // Only allow numbers
  phoneNumber.value = phoneNumber.value.replace(/\D/g, '')
  
  // Validate
  phoneError.value = ''
  if (phoneNumber.value.length > 0 && phoneNumber.value.length < 10) {
    phoneError.value = 'Phone number must be 10 digits'
  }
}

const handleSubmit = () => {
  if (phoneNumber.value.length !== 10) {
    phoneError.value = 'Please enter a valid 10-digit phone number'
    return
  }
  
  if (duplicateLeads.value.length === 0) {
    emit('submit', phoneNumber.value)
    close()
  }
}

const continueAnyway = () => {
  if (phoneNumber.value.length === 10) {
    emit('submit', phoneNumber.value)
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
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
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
