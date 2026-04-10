<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-end md:items-center md:justify-center" @click="close">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <!-- Sheet / Modal -->
        <div
          @click.stop
          class="relative w-full md:w-auto md:min-w-[320px] md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
        >
          <!-- Handle (mobile only) -->
          <div class="flex justify-center pt-3 pb-2 md:hidden">
            <div class="w-12 h-1.5 bg-slate-300 rounded-full"></div>
          </div>

          <!-- Header -->
          <div class="px-5 pb-3 pt-3 md:pt-5 border-b border-slate-200">
            <h3 class="text-lg font-bold text-slate-800">Lead Scope</h3>
            <p class="text-sm text-slate-500 mt-0.5">Choose which leads to display</p>
          </div>

          <!-- Options -->
          <div class="py-2">
            <!-- All Leads -->
            <button
              @click="select('all')"
              class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              :class="currentMode === 'all' ? 'bg-blue-50' : ''"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                   :class="currentMode === 'all' ? 'bg-blue-100' : 'bg-slate-100'"
              >
                <i class="ph-bold ph-users-three text-xl"
                   :class="currentMode === 'all' ? 'text-blue-600' : 'text-slate-400'"
                ></i>
              </div>
              <div class="flex-1 text-left">
                <div class="font-semibold text-slate-800">All Leads</div>
                <div class="text-xs text-slate-500">Show all leads in the system</div>
              </div>
              <i v-if="currentMode === 'all'" class="ph-bold ph-check text-blue-600 text-xl flex-shrink-0"></i>
            </button>

            <!-- My Leads -->
            <button
              @click="select('me')"
              class="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              :class="currentMode === 'me' ? 'bg-purple-50' : ''"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                   :class="currentMode === 'me' ? 'bg-purple-100' : 'bg-slate-100'"
              >
                <i class="ph-bold ph-user text-xl"
                   :class="currentMode === 'me' ? 'text-purple-600' : 'text-slate-400'"
                ></i>
              </div>
              <div class="flex-1 text-left">
                <div class="font-semibold text-slate-800">My Leads</div>
                <div class="text-xs text-slate-500">Only leads assigned to me</div>
              </div>
              <i v-if="currentMode === 'me'" class="ph-bold ph-check text-purple-600 text-xl flex-shrink-0"></i>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  currentMode: 'all' | 'me'
}

interface Emits {
  (e: 'close'): void
  (e: 'select', mode: 'all' | 'me'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function close() {
  emit('close')
}

function select(mode: 'all' | 'me') {
  emit('select', mode)
  close()
}
</script>

<style scoped>
/* Sheet transition */
.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .relative,
.sheet-leave-to .relative {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .sheet-enter-from .relative,
  .sheet-leave-to .relative {
    transform: translate(0, 0) scale(0.95);
  }
}
</style>
