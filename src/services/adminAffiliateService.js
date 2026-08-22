import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function affiliateFromRow(row) {
  const p = row.profiles
  return {
    id: row.id,
    fullName: p?.full_name ?? 'Affiliate',
    email: p?.email ?? null,
    phone: p?.phone ?? null,
    city: p?.city ?? null,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  }
}

const realAdminAffiliateService = {
  async listAffiliates({ search, status, role, page = 1, pageSize = 20 } = {}) {
    let query = supabase.from('affiliates').select('*, profiles!inner(full_name, email, phone, city)', { count: 'exact' })
    if (status) query = query.eq('status', status)
    if (role) query = query.eq('role', role)
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'profiles' })
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw error
    return { items: data.map(affiliateFromRow), total: count ?? data.length }
  },

  async getAffiliateDetail(affiliateId) {
    const { data: row, error } = await supabase
      .from('affiliates')
      .select('*, profiles(full_name, email, phone, city)')
      .eq('id', affiliateId)
      .single()
    if (error) throw error

    let upline = null
    if (row.referred_by) {
      const { data: uprow } = await supabase
        .from('affiliates')
        .select('*, profiles(full_name, email, phone, city)')
        .eq('id', row.referred_by)
        .maybeSingle()
      upline = uprow ? affiliateFromRow(uprow) : null
    }

    const [{ data: directRows }, { data: downline }, { data: orderRows }, { data: commRows }, { data: walletRow }, { data: wdRows }, { data: levels }] =
      await Promise.all([
        supabase.from('affiliates').select('*, profiles(full_name, email, phone, city)').eq('referred_by', affiliateId),
        supabase.rpc('get_downline', { p_affiliate_id: affiliateId, p_max_depth: 5 }),
        supabase.from('orders').select('*').eq('affiliate_id', affiliateId).order('placed_at', { ascending: false }),
        supabase
          .from('commissions')
          .select('*, source:source_affiliate_id(profiles(full_name))')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false }),
        supabase.from('wallets').select('*').eq('affiliate_id', affiliateId).maybeSingle(),
        supabase.from('withdrawal_requests').select('*').eq('affiliate_id', affiliateId).order('requested_at', { ascending: false }),
        supabase.from('commission_levels').select('*').order('level'),
      ])

    const downlineIds = (downline ?? []).map((d) => d.id)
    let withSalesIds = new Set()
    if (downlineIds.length) {
      const { data: orderedBy } = await supabase
        .from('orders')
        .select('affiliate_id')
        .in('affiliate_id', downlineIds)
        .not('status', 'in', '(rejected,cancelled)')
      withSalesIds = new Set((orderedBy ?? []).map((o) => o.affiliate_id))
    }
    const byLevel = (levels ?? []).map(({ level, percentage }) => {
      const atLevel = (downline ?? []).filter((d) => d.level === level)
      return {
        level,
        percentage: Number(percentage),
        count: atLevel.length,
        withSales: atLevel.filter((d) => withSalesIds.has(d.id)).length,
      }
    })
    const totalDirect = byLevel[0]?.count ?? 0
    const networkStats = { byLevel, totalDirect, totalIndirect: (downline?.length ?? 0) - totalDirect }

    return {
      affiliate: affiliateFromRow(row),
      upline,
      directReferrals: (directRows ?? []).map(affiliateFromRow),
      networkStats,
      orders: (orderRows ?? []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        total: Number(o.total),
        placedAt: o.placed_at,
        items: [],
      })),
      commissions: (commRows ?? []).map((c) => ({
        id: c.id,
        affiliateId: c.affiliate_id,
        orderId: c.order_id,
        sourceAffiliateId: c.source_affiliate_id,
        sourceAffiliateName: c.source?.profiles?.full_name ?? 'Affiliate',
        level: c.level,
        commissionPercentage: Number(c.commission_percentage),
        orderAmount: Number(c.order_amount),
        commissionAmount: Number(c.commission_amount),
        status: c.status,
        createdAt: c.created_at,
      })),
      wallet: walletRow
        ? {
            affiliateId: walletRow.affiliate_id,
            availableBalance: Number(walletRow.available_balance),
            lifetimeEarned: Number(walletRow.lifetime_earned),
            lifetimeWithdrawn: Number(walletRow.lifetime_withdrawn),
            updatedAt: walletRow.updated_at,
          }
        : { affiliateId, availableBalance: 0, lifetimeEarned: 0, lifetimeWithdrawn: 0, updatedAt: null },
      withdrawals: (wdRows ?? []).map((w) => ({
        id: w.id,
        affiliateId: w.affiliate_id,
        amount: Number(w.amount),
        feePercentage: Number(w.fee_percentage),
        feeAmount: Number(w.fee_amount),
        netAmount: Number(w.net_amount),
        method: w.method,
        accountDetails: w.account_details,
        status: w.status,
        adminNote: w.admin_note,
        requestedAt: w.requested_at,
        processedAt: w.processed_at,
      })),
    }
  },

  async setAffiliateStatus(affiliateId, status) {
    const { data, error } = await supabase
      .from('affiliates')
      .update({ status })
      .eq('id', affiliateId)
      .select('*, profiles(full_name, email, phone, city)')
      .single()
    if (error) throw error
    return affiliateFromRow(data)
  },
}

const mockAdminAffiliateService = {
  async listAffiliates(params) {
    await delay()
    return mock.adminListAffiliates(params)
  },
  async getAffiliateDetail(affiliateId) {
    await delay()
    return mock.adminGetAffiliateDetail(affiliateId)
  },
  async setAffiliateStatus(affiliateId, status) {
    await delay(300)
    return mock.adminSetAffiliateStatus(affiliateId, status)
  },
}

export const adminAffiliateService = isSupabaseConfigured ? realAdminAffiliateService : mockAdminAffiliateService
