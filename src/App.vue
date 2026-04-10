<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <router-view />
    <InactivityWarningModal
      :show="showInactivityWarning"
      :remaining-seconds="inactivityRemainingSeconds"
      @extend="extendSession"
      @logout="handleInactivityLogout"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useInactivity } from '@/composables/useInactivity'
import InactivityWarningModal from '@/components/InactivityWarningModal.vue'

const authStore = useAuthStore()
const {
  showWarning: showInactivityWarning,
  remainingSeconds: inactivityRemainingSeconds,
  extendSession,
  logout: handleInactivityLogout
} = useInactivity()

onMounted(() => {
  authStore.checkAuth()
})
</script>

<style scoped>
/* App-specific styles will be added here */
</style>