import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { uid } from '@/lib/utils'

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function orderFromRow(row, items = [], proofs = []) {
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
    accessToken: row.access_token,
    status: row.status,
    adminNote: row.admin_note,
    returnReason: row.return_reason,
    placedAt: row.placed_at,
    updatedAt: row.updated_at,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
    })),
    proofs: proofs.map((p) => ({ id: p.id, imageUrl: p.image_url, note: p.note, uploadedAt: p.uploaded_at })),
  }
}

async function uploadProofFile(orderId, file) {
  const path = `${orderId}/${uid('proof')}-${file.name}`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
  return data.publicUrl
}

const realOrderService = {
  async createOrder({ affiliateId, customer, shipping, items, paymentMethod, proofFile, proofNote }) {
    const orderNumber = `DS-${Date.now().toString().slice(-8)}`
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        affiliate_id: affiliateId || null,
        customer_name: customer.name,
        customer_email: customer.email || null,
        customer_phone: customer.phone,
        shipping_address: shipping.address,
        shipping_city: shipping.city,
        shipping_notes: shipping.notes || null,
        payment_method: paymentMethod,
        subtotal,
        shipping_fee: 0,
        total: subtotal,
        status: 'payment_submitted',
      })
      .select()
      .single()
    if (orderError) throw orderError

    const itemRows = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.productName,
      unit_price: i.unitPrice,
      quantity: i.quantity,
      line_total: Math.round(i.unitPrice * i.quantity * 100) / 100,
    }))
    const { error: itemsError } = await supabase.from('order_items').insert(itemRows)
    if (itemsError) throw itemsError

    let proofs = []
    if (proofFile) {
      const imageUrl = await uploadProofFile(order.id, proofFile)
      const { data: proof, error: proofError } = await supabase
        .from('payment_proofs')
        .insert({ order_id: order.id, image_url: imageUrl, note: proofNote || null })
        .select()
        .single()
      if (proofError) throw proofError
      proofs = [proof]
    }

    return orderFromRow(order, itemRows, proofs)
  },

  // `token` is the order's access_token (carried in the confirmation-page
  // URL for guest checkouts) — required for a guest to read their own order,
  // ignored for a logged-in affiliate/admin since get_order_full() already
  // authorizes those via auth_affiliate_id()/is_admin(). See migration 0006.
  async getOrderById(orderId, token) {
    const { data, error } = await supabase.rpc('get_order_full', { p_order_id: orderId, p_token: token ?? null })
    if (error) throw new Error(error.message)
    return orderFromRow(data.order, data.items ?? [], data.proofs ?? [])
  },

  async listMyOrders(affiliateId) {
    const { data, error } = await supabase.from('orders').select('*').eq('affiliate_id', affiliateId).order('placed_at', { ascending: false })
    if (error) throw error
    return data.map((row) => orderFromRow(row))
  },

  async requestReturn(orderId, reason) {
    const { error } = await supabase.rpc('request_order_return', { p_order_id: orderId, p_reason: reason })
    if (error) throw new Error(error.message)
  },
}

const mockOrderService = {
  async createOrder({ affiliateId, customer, shipping, items, paymentMethod, proofFile, proofNote }) {
    await delay(700)
    const proof = proofFile ? { imageUrl: URL.createObjectURL(proofFile), note: proofNote } : null
    return mock.createOrder({
      affiliateId,
      customer,
      shipping,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod,
      proof,
    })
  },
  async getOrderById(orderId) {
    await delay()
    return mock.getOrderById(orderId)
  },
  async listMyOrders(affiliateId) {
    await delay()
    return mock.listOrdersForAffiliate(affiliateId)
  },

  async requestReturn(orderId, reason, affiliateId) {
    await delay(500)
    mock.requestOrderReturn(affiliateId, orderId, reason)
  },
}

export const orderService = isSupabaseConfigured ? realOrderService : mockOrderService
