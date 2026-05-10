import { useNotificationStore } from '@/stores/notificationStore'

export function useNotifications() {
  const store = useNotificationStore()
  return {
    notifications: store.notifications,
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
    clearNotifications: store.clearNotifications,
  }
}
