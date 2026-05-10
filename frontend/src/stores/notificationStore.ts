import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

let counter = 0

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notif-${++counter}`
    const item = { ...notification, id }
    set((state) => ({ notifications: [...state.notifications, item] }))

    const duration = notification.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, duration)
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  clearNotifications: () => set({ notifications: [] }),
}))
