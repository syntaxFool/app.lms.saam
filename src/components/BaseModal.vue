<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
            <h2 v-if="title" class="text-xl font-bold text-slate-900">{{ title }}</h2>
            <button
              @click="closeModal"
              class="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <i class="ph-bold ph-x text-xl"></i>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="showFooter" class="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button
              @click="closeModal"
              class="px-4 py-2 text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              {{ cancelLabel }}
            </button>
            <button
              @click="submitModal"
              :disabled="isSubmitting"
              class="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <i v-if="isSubmitting" class="ph-bold ph-spinner animate-spin"></i>
              {{ submitLabel }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  title?: string
  showFooter?: boolean
  submitLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit'): void
}

withDefaults(defineProps<Props>(), {
  showFooter: true,
  submitLabel: 'Submit',
  cancelLabel: 'Cancel',
  isSubmitting: false
})

const emit = defineEmits<Emits>()

const closeModal = () => {
  emit('close')
}

const submitModal = () => {
  emit('submit')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
