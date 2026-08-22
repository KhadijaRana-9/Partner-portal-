import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function commissionFromRow(row) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    affiliateName: row.affiliate?.profiles?.full_name ?? 'Affiliate',
    orderId: row.order_id,
    sourceAffiliateId: row.source_affiliate_id,
    sourceAffiliateName: row.source?.profiles?.full_name ?? 'Affiliate',
    level: row.level,
    commissionPercentage: Number(row.commission_percentage),
    orderAmount: Number(row.order_amount),
    commissionAmount: Number(row.commission_amount),
    status: row.status,
    createdAt: row.created_at,
  }
}

const realAdminCommissionService = {
  async listCommissions({ level, status, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('commissions')
      .select('*, affiliate:affiliate_id(profiles(full_name)), source:source_affiliate_id(profiles(full_name))', { count: 'exact' })
    if (level) query = query.eq('level', Number(level))
    if (status) query = query.eq('status', status)
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw error
    return { items: data.map(commissionFromRow), total: count ?? data.length }
  },
}

const mockAdminCommissionService = {
  async listCommissions(params) {
    await delay()
    return mock.adminListCommissions(params)
  },
}

export const adminCommissionService = isSupabaseConfigured ? realAdminCommissionService : mockAdminCommissionService
