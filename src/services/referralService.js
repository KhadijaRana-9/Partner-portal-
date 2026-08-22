import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function affiliateFromRow(profile, row) {
  return {
    id: row.id,
    fullName: profile?.full_name ?? 'Affiliate',
    email: profile?.email,
    phone: profile?.phone,
    city: profile?.city,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  }
}

async function fetchCommissionLevels() {
  const { data, error } = await supabase.from('commission_levels').select('*').order('level')
  if (error) throw error
  return data.map((r) => ({ level: r.level, percentage: Number(r.percentage) }))
}

const realReferralService = {
  async validateReferralCode(code) {
    if (!code) return null
    const { data } = await supabase.from('affiliates').select('id, referral_code').eq('referral_code', code).maybeSingle()
    return !!data
  },

  async getNetworkStats(affiliateId) {
    const [{ data: downline, error: downlineError }, levels] = await Promise.all([
      supabase.rpc('get_downline', { p_affiliate_id: affiliateId, p_max_depth: 5 }),
      fetchCommissionLevels(),
    ])
    if (downlineError) throw downlineError

    const ids = downline.map((d) => d.id)
    let withSalesIds = new Set()
    if (ids.length) {
      const { data: orderedBy } = await supabase.from('orders').select('affiliate_id').in('affiliate_id', ids).not('status', 'in', '(rejected,cancelled)')
      withSalesIds = new Set((orderedBy ?? []).map((o) => o.affiliate_id))
    }

    const byLevel = levels.map(({ level, percentage }) => {
      const atLevel = downline.filter((d) => d.level === level)
      return { level, percentage, count: atLevel.length, withSales: atLevel.filter((d) => withSalesIds.has(d.id)).length }
    })
    const totalDirect = byLevel[0]?.count ?? 0
    return { byLevel, totalDirect, totalIndirect: downline.length - totalDirect }
  },

  async getDirectReferrals(affiliateId) {
    const { data, error } = await supabase.from('affiliates').select('*, profiles(full_name, email, phone, city)').eq('referred_by', affiliateId)
    if (error) throw error
    return data.map((row) => affiliateFromRow(row.profiles, row))
  },

  async getDownlineGrouped(affiliateId) {
    const { data: downline, error } = await supabase.rpc('get_downline', { p_affiliate_id: affiliateId, p_max_depth: 5 })
    if (error) throw error
    if (!downline.length) return []
    const { data: rows } = await supabase.from('affiliates').select('*, profiles(full_name, email, phone, city)').in('id', downline.map((d) => d.id))
    const byId = new Map(rows.map((r) => [r.id, r]))
    return downline
      .map((d) => ({ level: d.level, affiliate: byId.has(d.id) ? affiliateFromRow(byId.get(d.id).profiles, byId.get(d.id)) : null }))
      .filter((d) => d.affiliate)
  },
}

const mockReferralService = {
  async validateReferralCode(code) {
    await delay(200)
    return !!mock.validateReferralCode(code)
  },
  async getNetworkStats(affiliateId) {
    await delay()
    return mock.getNetworkStats(affiliateId)
  },
  async getDirectReferrals(affiliateId) {
    await delay()
    return mock.getDirectReferrals(affiliateId)
  },
  async getDownlineGrouped(affiliateId) {
    await delay()
    return mock.getDownline(affiliateId, 5)
  },
}

export const referralService = isSupabaseConfigured ? realReferralService : mockReferralService
