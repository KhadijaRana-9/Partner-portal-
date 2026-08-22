import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fromRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    timestamp: row.created_at,
    read: row.is_read,
  }
}

const realNotificationService = {
  async list(affiliateId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map(fromRow)
  },
  async markAsRead(affiliateId, id) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('affiliate_id', affiliateId)
    if (error) throw error
  },
  async markAllAsRead(affiliateId) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('affiliate_id', affiliateId)
    if (error) throw error
  },
  subscribe(affiliateId, onInsert) {
    const channel = supabase
      .channel(`notifications-${affiliateId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `affiliate_id=eq.${affiliateId}` },
        (payload) => onInsert(fromRow(payload.new))
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}

const mockNotificationService = {
  async list(affiliateId) {
    await delay()
    return mock.listNotifications(affiliateId)
  },
  async markAsRead(affiliateId, id) {
    mock.markNotificationRead(affiliateId, id)
  },
  async markAllAsRead(affiliateId) {
    mock.markAllNotificationsRead(affiliateId)
  },
  subscribe() {
    return () => {}
  },
}

export const notificationService = isSupabaseConfigured ? realNotificationService : mockNotificationService
