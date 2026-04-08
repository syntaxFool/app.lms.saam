import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface SwipeOptions {
  threshold?: number // minimum distance in px to trigger swipe
  velocity?: number // minimum velocity to trigger swipe
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useSwipe(target: Ref<HTMLElement | null>, options: SwipeOptions = {}) {
  const {
    threshold = 50,
    velocity = 0.3,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  } = options

  const isSwiping = ref(false)
  const direction = ref<'left' | 'right' | 'up' | 'down' | null>(null)
  const distance = ref(0)

  let startX = 0
  let startY = 0
  let startTime = 0
  let currentX = 0
  let currentY = 0

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    startTime = Date.now()
    isSwiping.value = true
    direction.value = null
    distance.value = 0
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping.value) return

    const touch = e.touches[0]
    currentX = touch.clientX
    currentY = touch.clientY

    const deltaX = currentX - startX
    const deltaY = currentY - startY

    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      direction.value = deltaX > 0 ? 'right' : 'left'
      distance.value = Math.abs(deltaX)
      
      // Prevent vertical scroll when swiping horizontally
      if (Math.abs(deltaX) > 10) {
        e.preventDefault()
      }
    } else {
      // Vertical swipe
      direction.value = deltaY > 0 ? 'down' : 'up'
      distance.value = Math.abs(deltaY)
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping.value) return

    const deltaX = currentX - startX
    const deltaY = currentY - startY
    const deltaTime = Date.now() - startTime
    const velocityX = Math.abs(deltaX) / deltaTime
    const velocityY = Math.abs(deltaY) / deltaTime

    // Check if swipe meets threshold
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold || velocityX > velocity) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold || velocityY > velocity) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
    }

    // Reset state
    isSwiping.value = false
    direction.value = null
    distance.value = 0
    startX = 0
    startY = 0
    currentX = 0
    currentY = 0
  }

  const handleTouchCancel = () => {
    isSwiping.value = false
    direction.value = null
    distance.value = 0
  }

  onMounted(() => {
    if (target.value) {
      target.value.addEventListener('touchstart', handleTouchStart, { passive: false })
      target.value.addEventListener('touchmove', handleTouchMove, { passive: false })
      target.value.addEventListener('touchend', handleTouchEnd)
      target.value.addEventListener('touchcancel', handleTouchCancel)
    }
  })

  onUnmounted(() => {
    if (target.value) {
      target.value.removeEventListener('touchstart', handleTouchStart)
      target.value.removeEventListener('touchmove', handleTouchMove)
      target.value.removeEventListener('touchend', handleTouchEnd)
      target.value.removeEventListener('touchcancel', handleTouchCancel)
    }
  })

  return {
    isSwiping,
    direction,
    distance
  }
}
