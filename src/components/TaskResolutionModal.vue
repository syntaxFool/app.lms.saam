<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center" @click.self="close">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="close"></div>

      <!-- Modal Content -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-slate-100">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold text-slate-800">Complete Task</h3>
            <button @click="close" class="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
              <i class="ph-bold ph-x text-lg"></i>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6">
          <p class="text-sm text-slate-600 mb-4">
            Please provide a brief resolution or outcome for completing this task:
          </p>
          <textarea
            v-model="resolution"
            rows="4"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
            placeholder="Task resolution (optional)..."
            ref="resolutionInput"
          ></textarea>
        </div>

        <!-- Footer -->
        <div class="px-6 pb-6 flex gap-3">
          <button
            @click="close"
            class="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            @click="confirm"
            class="flex-1 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-indigo-600 transition"
          >
            <i class="ph-bold ph-check mr-1"></i> Mark Complete
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'confirm', resolution: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const resolution = ref('')
const resolutionInput = ref<HTMLTextAreaElement | null>(null)

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resolution.value = ''
    nextTick(() => {
      resolutionInput.value?.focus()
    })
  }
})

const close = () => {
  emit('close')
}

const confirm = () => {
  emit('confirm', resolution.value.trim())
  close()
}
</script>
