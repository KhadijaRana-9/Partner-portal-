import { createContext, useContext, useEffect, useState } from 'react'
import { notificationService } from '@/services/notificationService'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { affiliate } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!affiliate?.id) {
      setNotifications([])
      return
    }
    let cancelled = false
    setLoading(true)
    notificationService
      .list(affiliate.id)
      .then((data) => {
        if (!cancelled) setNotifications(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const unsubscribe = notificationService.subscribe(affiliate.id, (n) => {
      setNotifications((prev) => [n, ...prev])
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [affiliate?.id])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    if (affiliate?.id) await notificationService.markAsRead(affiliate.id, id)
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (affiliate?.id) await notificationService.markAllAsRead(affiliate.id)
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
