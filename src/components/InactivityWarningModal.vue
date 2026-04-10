<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <i class="ph-bold ph-warning text-amber-600 text-3xl"></i>
          </div>
          
          <h3 class="text-xl font-bold text-slate-800 mb-2">Session Expiring Soon</h3>
          <p class="text-slate-600 mb-6">
            You've been inactive. You'll be logged out in:
          </p>
          
          <div class="text-5xl font-bold text-amber-600 mb-6 font-mono">
            {{ formatTime(remainingSeconds) }}
          </div>
          
          <div class="flex gap-3 w-full">
            <button
              @click="$emit('extend')"
              class="flex-1 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-indigo-600 transition"
            >
              Stay Logged In
            </button>
            <button
              @click="$emit('logout')"
              class="flex-1 bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg hover:bg-slate-300 transition"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  remainingSeconds: number
}>()

defineEmits<{
  extend: []
  logout: []
}>()

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>
