import { ref, computed } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  message: string
  type: NotificationType
  duration?: number
  dismissible?: boolean
}

/**
 * Composable for managing notifications/toasts
 * Provides a centralized way to show messages to users
 */
export function useNotification() {
  const notifications = ref<Notification[]>([])
  let notificationId = 0

  const hasNotifications = computed(() => notifications.value.length > 0)

  /**
   * Add a notification
   */
  function addNotification(
    message: string,
    type: NotificationType = 'info',
    duration = 4000,
    dismissible = true
  ): string {
    const id = `notification-${++notificationId}`

    const notification: Notification = {
      id,
      message,
      type,
      duration,
      dismissible
    }

    notifications.value.push(notification)

    // Auto-dismiss after duration
    if (duration) {
      setTimeout(() => {
        dismissNotification(id)
      }, duration)
    }

    return id
  }

  /**
   * Show success notification
   */
  function success(message: string, duration?: number) {
    return addNotification(message, 'success', duration)
  }

  /**
   * Show error notification
   */
  function error(message: string, duration?: number) {
    return addNotification(message, 'error', duration || 5000)
  }

  /**
   * Show warning notification
   */
  function warning(message: string, duration?: number) {
    return addNotification(message, 'warning', duration)
  }

  /**
   * Show info notification
   */
  function info(message: string, duration?: number) {
    return addNotification(message, 'info', duration)
  }

  /**
   * Dismiss a notification
   */
  function dismissNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * Clear all notifications
   */
  function clearAll() {
    notifications.value = []
  }

  return {
    notifications,
    hasNotifications,
    addNotification,
    success,
    error,
    warning,
    info,
    dismissNotification,
    clearAll
  }
}
