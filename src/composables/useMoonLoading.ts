import { ref, onUnmounted } from 'vue'

/**
 * Moon phase loading animation composable
 * Returns a ref with rotating moon phases: 🌕🌖🌗🌘🌑🌒🌓🌔
 */
export function useMoonLoading() {
  const moonPhases = ['🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔']
  const currentPhase = ref(0)
  let intervalId: number | null = null

  const start = () => {
    if (intervalId) return
    currentPhase.value = 0
    intervalId = window.setInterval(() => {
      currentPhase.value = (currentPhase.value + 1) % moonPhases.length
    }, 150) // Change phase every 150ms
  }

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    currentPhase.value = 0
  }

  const getCurrentMoon = () => moonPhases[currentPhase.value]

  onUnmounted(() => {
    stop()
  })

  return {
    moonPhases,
    currentPhase,
    start,
    stop,
    getCurrentMoon
  }
}
