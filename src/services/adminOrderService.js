import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { orderService } from '@/services/orderService'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function orderFromRow(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    affiliateId: row.affiliate_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address,
    shippingCity: row.shipping_city,
    shippingNotes: row.shipping_notes,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee),
    total: Number(row.total),
    status: row.status,
    adminNote: row.admin_note,
    placedAt: row.placed_at,
    updatedAt: row.updated_at,
  }
}

const realAdminOrderService = {
  async listOrders({ status, search, paymentMethod, page = 1, pageSize = 20 } = {}) {
    let query = supabase.from('orders').select('*', { count: 'exact' })
    if (status) query = query.eq('status', status)
    if (paymentMethod) query = query.eq('payment_method', paymentMethod)
    if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('placed_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw error
    return { items: data.map(orderFromRow), total: count ?? data.length }
  },

  // Same shape as the affiliate-facing order detail fetch (items + proofs) —
  // RLS's "orders_select_own_or_guest_or_admin" policy already lets an
  // authenticated admin read any order, so there's no admin-specific query.
  getOrderById: orderService.getOrderById,

  // The ONLY sanctioned write path for order.status — never update the
  // orders table directly, the commission distribution/reversal logic lives
  // inside this Postgres function.
  async setOrderStatus(orderId, newStatus, note) {
    const { error } = await supabase.rpc('admin_set_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_note: note || null,
    })
    if (error) throw new Error(error.message)
    return realAdminOrderService.getOrderById(orderId)
  },
}

const mockAdminOrderService = {
  async listOrders(params) {
    await delay()
    return mock.adminListOrders(params)
  },
  getOrderById: orderService.getOrderById,
  async setOrderStatus(orderId, newStatus, note) {
    await delay(400)
    return mock.adminSetOrderStatus(orderId, newStatus, note)
  },
}

export const adminOrderService = isSupabaseConfigured ? realAdminOrderService : mockAdminOrderService
