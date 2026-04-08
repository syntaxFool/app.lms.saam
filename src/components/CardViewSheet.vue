<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-[70] flex items-end md:items-center md:justify-center" 
        @click="emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <!-- Sheet Panel -->
        <div
          @click.stop
          class="relative w-full md:w-auto md:min-w-[320px] md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl"
        >
          <!-- Handle Bar (mobile visual affordance) -->
          <div class="flex justify-center pt-3 pb-2 md:hidden">
            <div class="w-12 h-1.5 bg-slate-300 rounded-full"></div>
          </div>
          
          <!-- Title -->
          <div class="px-6 pt-4 pb-3 md:pt-5">
            <h3 class="font-bold text-slate-800 text-lg">Card View</h3>
          </div>
          
          <!-- Options -->
          <div class="px-4 pb-6 space-y-2">
            <!-- Cards (Normal) -->
            <button 
              @click="emit('select', 'normal')" 
              class="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-slate-50 active:bg-slate-100 transition-all min-h-[56px]"
              :class="currentMode === 'normal' ? 'border-primary bg-primary/5' : 'border-slate-200'"
            >
              <i 
                class="ph-bold ph-cards text-2xl" 
                :class="currentMode === 'normal' ? 'text-primary' : 'text-slate-600'"
              ></i>
              <div class="flex-1 text-left">
                <div class="font-semibold text-slate-800">Cards</div>
                <div class="text-xs text-slate-500">Full detail, ~70px per card</div>
              </div>
              <i v-if="currentMode === 'normal'" class="ph-bold ph-check text-primary text-xl"></i>
            </button>
            
            <!-- Compact -->
            <button 
              @click="emit('select', 'compact')" 
              class="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-slate-50 active:bg-slate-100 transition-all min-h-[56px]"
              :class="currentMode === 'compact' ? 'border-primary bg-primary/5' : 'border-slate-200'"
            >
              <i 
                class="ph-bold ph-rows text-2xl" 
                :class="currentMode === 'compact' ? 'text-primary' : 'text-slate-600'"
              ></i>
              <div class="flex-1 text-left">
                <div class="font-semibold text-slate-800">Compact</div>
                <div class="text-xs text-slate-500">Condensed, ~60px per card</div>
              </div>
              <i v-if="currentMode === 'compact'" class="ph-bold ph-check text-primary text-xl"></i>
            </button>
            
            <!-- List -->
            <button 
              @click="emit('select', 'list')" 
              class="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-slate-50 active:bg-slate-100 transition-all min-h-[56px]"
              :class="currentMode === 'list' ? 'border-primary bg-primary/5' : 'border-slate-200'"
            >
              <i 
                class="ph-bold ph-list-dashes text-2xl" 
                :class="currentMode === 'list' ? 'text-primary' : 'text-slate-600'"
              ></i>
              <div class="flex-1 text-left">
                <div class="font-semibold text-slate-800">List</div>
                <div class="text-xs text-slate-500">Ultra-compact, ~45px per row</div>
              </div>
              <i v-if="currentMode === 'list'" class="ph-bold ph-check text-primary text-xl"></i>
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
  currentMode: 'normal' | 'compact' | 'list'
}

interface Emits {
  (e: 'close'): void
  (e: 'select', mode: 'normal' | 'compact' | 'list'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<style scoped>
/* Slide-up animation for sheet */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s ease;
}

.sheet-enter-active > div:last-child,
.sheet-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from > div:last-child,
.sheet-leave-to > div:last-child {
  transform: translateY(100%);
}
</style>
