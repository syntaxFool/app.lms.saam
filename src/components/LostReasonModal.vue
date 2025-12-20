<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="close"></div>

      <!-- Modal -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-slate-100">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-bold text-slate-800">Why was this lead lost?</h3>
            <button @click="close" class="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
              <i class="ph-bold ph-x text-lg"></i>
            </button>
          </div>
          <p class="text-sm text-slate-500">Select a reason to help improve future conversions</p>
        </div>

        <!-- Content -->
        <div class="px-6 py-4">
          <!-- Lost Reason Categories -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <button
              v-for="reason in lostReasons"
              :key="reason.id"
              @click="selectedReason = reason.id"
              :class="[
                'p-4 rounded-xl border-2 transition-all text-left',
                selectedReason === reason.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              ]"
            >
              <div class="flex items-start gap-3">
                <i :class="[reason.icon, 'text-2xl', selectedReason === reason.id ? 'text-red-600' : 'text-slate-400']"></i>
                <div class="flex-1 min-w-0">
                  <h4 :class="['font-semibold text-sm mb-1', selectedReason === reason.id ? 'text-red-900' : 'text-slate-800']">
                    {{ reason.label }}
                  </h4>
                  <p class="text-xs text-slate-500">{{ reason.description }}</p>
                </div>
              </div>
            </button>
          </div>

          <!-- Details Input -->
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-2">
              Additional Details <span class="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              v-model="details"
              rows="3"
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              placeholder="Add any additional context about why this lead was lost..."
            ></textarea>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ error }}
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            @click="close"
            class="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-300 transition"
          >
            Cancel
          </button>
          <button
            @click="submit"
            :disabled="!selectedReason"
            class="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            Mark as Lost
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LostReasonType } from '@/types'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', data: { reasonType: LostReasonType; details: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedReason = ref<LostReasonType | null>(null)
const details = ref('')
const error = ref('')

const lostReasons = [
  {
    id: 'price' as LostReasonType,
    label: 'Price Too High',
    description: 'Budget constraints',
    icon: 'ph-bold ph-currency-circle-dollar'
  },
  {
    id: 'competitor' as LostReasonType,
    label: 'Chose Competitor',
    description: 'Went with another vendor',
    icon: 'ph-bold ph-users-three'
  },
  {
    id: 'not_interested' as LostReasonType,
    label: 'Not Interested',
    description: 'No longer needs service',
    icon: 'ph-bold ph-hand-palm'
  },
  {
    id: 'invalid_number' as LostReasonType,
    label: 'Invalid Contact',
    description: 'Wrong/inactive number',
    icon: 'ph-bold ph-phone-disconnect'
  },
  {
    id: 'duplicate' as LostReasonType,
    label: 'Duplicate Lead',
    description: 'Already exists in system',
    icon: 'ph-bold ph-copy'
  },
  {
    id: 'other' as LostReasonType,
    label: 'Other Reason',
    description: 'Specify in details',
    icon: 'ph-bold ph-dots-three-circle'
  }
]

// Reset on open
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    selectedReason.value = null
    details.value = ''
    error.value = ''
  }
})

const submit = () => {
  error.value = ''
  
  if (!selectedReason.value) {
    error.value = 'Please select a reason'
    return
  }

  emit('submit', {
    reasonType: selectedReason.value,
    details: details.value.trim()
  })
  close()
}

const close = () => {
  emit('close')
}
</script>
