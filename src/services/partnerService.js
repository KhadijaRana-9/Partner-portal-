import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function investmentFromRow(row) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    status: row.status,
    principalAmount: Number(row.principal_amount),
    proofImageUrl: row.proof_image_url,
    availablePrincipal: Number(row.available_principal),
    availableProfit: Number(row.available_profit),
    totalProfitEarned: Number(row.total_profit_earned),
    adminNote: row.admin_note,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  }
}

function profitEntryFromRow(row) {
  return { id: row.id, investmentId: row.investment_id, amount: Number(row.amount), entryDate: row.entry_date, note: row.note, createdBy: row.created_by, createdAt: row.created_at }
}

function withdrawalFromRow(row) {
  return {
    id: row.id,
    investmentId: row.investment_id,
    affiliateId: row.affiliate_id,
    withdrawalType: row.withdrawal_type,
    amount: Number(row.amount),
    feePercentage: Number(row.fee_percentage),
    feeAmount: Number(row.fee_amount),
    netAmount: Number(row.net_amount),
    status: row.status,
    adminNote: row.admin_note,
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
  }
}

const realPartnerService = {
  async getSettings() {
    const { data, error } = await supabase.from('partner_settings').select('*').single()
    if (error) throw error
    return {
      enabled: data.enabled,
      minInvestment: Number(data.min_investment),
      maxInvestment: data.max_investment !== null ? Number(data.max_investment) : null,
    }
  },
  async apply(principalAmount, proofImageUrl) {
    const { data, error } = await supabase.rpc('apply_for_partner', { p_principal_amount: principalAmount, p_proof_image_url: proofImageUrl })
    if (error) throw new Error(error.message)
    return data
  },
  async getMyInvestments(affiliateId) {
    const { data, error } = await supabase.from('partner_investments').select('*').eq('affiliate_id', affiliateId).order('created_at', { ascending: false })
    if (error) throw error
    return data.map(investmentFromRow)
  },
  async getInvestmentDetail(investmentId) {
    const [{ data: inv, error: invErr }, { data: entries }, { data: withdrawals }] = await Promise.all([
      supabase.from('partner_investments').select('*').eq('id', investmentId).single(),
      supabase.from('partner_profit_entries').select('*').eq('investment_id', investmentId).order('entry_date', { ascending: false }),
      supabase.from('partner_withdrawal_requests').select('*').eq('investment_id', investmentId).order('requested_at', { ascending: false }),
    ])
    if (invErr) throw invErr
    return {
      investment: investmentFromRow(inv),
      profitEntries: (entries ?? []).map(profitEntryFromRow),
      withdrawals: (withdrawals ?? []).map(withdrawalFromRow),
    }
  },
  async requestWithdrawal(investmentId, type, amount) {
    const { data, error } = await supabase.rpc('request_partner_withdrawal', { p_investment_id: investmentId, p_type: type, p_amount: amount })
    if (error) throw new Error(error.message)
    return data
  },
}

const mockPartnerService = {
  async getSettings() {
    await delay(150)
    const s = mock.getPartnerSettings()
    return { enabled: s.enabled, minInvestment: s.minInvestment, maxInvestment: s.maxInvestment }
  },
  async apply(principalAmount, proofImageUrl, affiliateId) {
    await delay(600)
    return mock.applyForPartner(affiliateId, principalAmount, proofImageUrl).id
  },
  async getMyInvestments(affiliateId) {
    await delay()
    return mock.getMyInvestments(affiliateId)
  },
  async getInvestmentDetail(investmentId) {
    await delay()
    return mock.getInvestmentDetail(investmentId)
  },
  async requestWithdrawal(investmentId, type, amount, affiliateId) {
    await delay(600)
    return mock.requestPartnerWithdrawal(affiliateId, investmentId, type, amount).id
  },
}

export const partnerService = isSupabaseConfigured ? realPartnerService : mockPartnerService
