import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const DAY = 24 * 60 * 60 * 1000

// Mirrors mockBackend's buildDailySeries bucketing exactly so the real and
// mock report charts behave identically once a Supabase project is live.
function buildDailySeries(records, { days = 30, dateKey, valueKey }) {
  const buckets = new Map()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0, count: 0 })
  }
  records.forEach((r) => {
    const key = new Date(r[dateKey]).toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) return
    bucket.value += valueKey ? Number(r[valueKey]) || 0 : 1
    bucket.count += 1
  })
  return Array.from(buckets.values())
}

const realAdminReportService = {
  async dashboardStats() {
    const results = await Promise.all([
      supabase.from('affiliates').select('id', { count: 'exact', head: true }),
      supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('role', 'affiliate'),
      supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('role', 'affiliate').eq('status', 'active'),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total').not('status', 'in', '(rejected,cancelled)'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'payment_submitted'),
      supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('commissions').select('commission_amount').eq('status', 'approved'),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['returned', 'refunded']),
    ])
    const firstError = results.find((r) => r.error)?.error
    if (firstError) throw firstError

    const [usersRes, affRes, activeAffRes, ordersRes, salesRes, pendingPayRes, pendingWdRes, commRes, productsRes, pendingProdRes, returnedRes] = results
    const totalSales = (salesRes.data ?? []).reduce((s, r) => s + Number(r.total), 0)
    const totalCommission = (commRes.data ?? []).reduce((s, r) => s + Number(r.commission_amount), 0)

    return {
      totalUsers: usersRes.count ?? 0,
      totalAffiliates: affRes.count ?? 0,
      activeAffiliates: activeAffRes.count ?? 0,
      totalOrders: ordersRes.count ?? 0,
      totalSales: Math.round(totalSales * 100) / 100,
      pendingPayments: pendingPayRes.count ?? 0,
      pendingWithdrawals: pendingWdRes.count ?? 0,
      totalCommission: Math.round(totalCommission * 100) / 100,
      totalProducts: productsRes.count ?? 0,
      productsPendingApproval: pendingProdRes.count ?? 0,
      returnedOrders: returnedRes.count ?? 0,
    }
  },

  async salesSeries(days = 30) {
    const since = new Date(Date.now() - days * DAY).toISOString()
    const { data, error } = await supabase.from('orders').select('total, status, placed_at').gte('placed_at', since)
    if (error) throw error
    const records = (data ?? [])
      .filter((o) => !['rejected', 'cancelled'].includes(o.status))
      .map((o) => ({ placedAt: o.placed_at, total: Number(o.total) }))
    return buildDailySeries(records, { days, dateKey: 'placedAt', valueKey: 'total' })
  },

  async signupsSeries(days = 30) {
    const since = new Date(Date.now() - days * DAY).toISOString()
    const { data, error } = await supabase.from('affiliates').select('created_at').gte('created_at', since)
    if (error) throw error
    return buildDailySeries((data ?? []).map((a) => ({ createdAt: a.created_at })), { days, dateKey: 'createdAt' })
  },

  async recentActivity(limit = 12) {
    const [{ data: affRows }, { data: orderRows }, { data: wdRows }] = await Promise.all([
      supabase.from('affiliates').select('id, referred_by, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(8),
      supabase.from('orders').select('id, order_number, customer_name, status, placed_at, updated_at').order('placed_at', { ascending: false }).limit(8),
      supabase.from('withdrawal_requests').select('id, amount, requested_at').order('requested_at', { ascending: false }).limit(5),
    ])
    const events = []
    ;(affRows ?? []).forEach((a) =>
      events.push({
        id: `evt-${a.id}`,
        type: 'referral',
        text: `${a.profiles?.full_name ?? 'Affiliate'} registered${a.referred_by ? ' via referral link' : ''}.`,
        timestamp: a.created_at,
      })
    )
    ;(orderRows ?? []).forEach((o) =>
      events.push({ id: `evt-${o.id}`, type: 'order', text: `Order ${o.order_number} placed by ${o.customer_name}.`, timestamp: o.placed_at })
    )
    ;(wdRows ?? []).forEach((w) =>
      events.push({
        id: `evt-${w.id}`,
        type: 'withdrawal',
        text: `Withdrawal request of PKR ${Number(w.amount).toLocaleString('en-US')} submitted.`,
        timestamp: w.requested_at,
      })
    )
    ;(orderRows ?? [])
      .filter((o) => o.status === 'returned' || o.status === 'refunded')
      .forEach((o) => events.push({ id: `evt-ret-${o.id}`, type: 'order', text: `Order ${o.order_number} marked ${o.status}.`, timestamp: o.updated_at }))
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
  },
}

const mockAdminReportService = {
  async dashboardStats() {
    await delay(200)
    return mock.adminDashboardStats()
  },
  async salesSeries(days) {
    await delay(200)
    return mock.adminSalesSeries(days)
  },
  async signupsSeries(days) {
    await delay(200)
    return mock.adminSignupsSeries(days)
  },
  async recentActivity(limit) {
    await delay(200)
    return mock.adminRecentActivity(limit)
  },
}

export const adminReportService = isSupabaseConfigured ? realAdminReportService : mockAdminReportService
