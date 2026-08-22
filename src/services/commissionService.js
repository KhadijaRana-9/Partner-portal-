import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fromRow(row) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
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

const realCommissionService = {
  async listMyCommissions(affiliateId) {
    const { data, error } = await supabase
      .from('commissions')
      .select('*, source:source_affiliate_id(profiles(full_name))')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map(fromRow)
  },
  async getCommissionLevels() {
    const { data, error } = await supabase.from('commission_levels').select('*').order('level')
    if (error) throw error
    return data.map((r) => ({ level: r.level, percentage: Number(r.percentage) }))
  },
}

const mockCommissionService = {
  async listMyCommissions(affiliateId) {
    await delay()
    return mock.listCommissionsForAffiliate(affiliateId)
  },
  async getCommissionLevels() {
    await delay(150)
    return mock.getCommissionLevels()
  },
}

export const commissionService = isSupabaseConfigured ? realCommissionService : mockCommissionService
