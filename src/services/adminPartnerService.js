import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function investmentFromRow(row) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    affiliateName: row.profiles?.full_name,
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

function withdrawalFromRow(row) {
  return {
    id: row.id,
    investmentId: row.investment_id,
    affiliateId: row.affiliate_id,
    affiliateName: row.profiles?.full_name,
    withdrawalType: row.withdrawal_type,
    amount: Number(row.amount),
    feeAmount: Number(row.fee_amount),
    netAmount: Number(row.net_amount),
    status: row.status,
    requestedAt: row.requested_at,
  }
}

const realAdminPartnerService = {
  async listInvestments({ status, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('partner_investments')
      .select('*, affiliates(profiles(full_name))', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const from = (page - 1) * pageSize
    const { data, error, count } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    return { items: data.map((r) => investmentFromRow({ ...r, profiles: r.affiliates?.profiles })), total: count ?? data.length }
  },
  async getInvestmentDetail(investmentId) {
    const [{ data: inv, error }, { data: entries }, { data: withdrawals }] = await Promise.all([
      supabase.from('partner_investments').select('*, affiliates(profiles(full_name))').eq('id', investmentId).single(),
      supabase.from('partner_profit_entries').select('*').eq('investment_id', investmentId).order('entry_date', { ascending: false }),
      supabase.from('partner_withdrawal_requests').select('*').eq('investment_id', investmentId).order('requested_at', { ascending: false }),
    ])
    if (error) throw error
    return {
      investment: investmentFromRow({ ...inv, profiles: inv.affiliates?.profiles }),
      profitEntries: entries ?? [],
      withdrawals: (withdrawals ?? []).map(withdrawalFromRow),
    }
  },
  async setInvestmentStatus(investmentId, status, note) {
    const { error } = await supabase.rpc('admin_set_investment_status', { p_investment_id: investmentId, p_new_status: status, p_note: note || null })
    if (error) throw new Error(error.message)
  },
  async postProfit(investmentId, amount, entryDate, note) {
    const { error } = await supabase.rpc('admin_post_partner_profit', { p_investment_id: investmentId, p_amount: amount, p_entry_date: entryDate, p_note: note || null })
    if (error) throw new Error(error.message)
  },
  async listWithdrawals({ status, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('partner_withdrawal_requests')
      .select('*, affiliates(profiles(full_name))', { count: 'exact' })
      .order('requested_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const from = (page - 1) * pageSize
    const { data, error, count } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    return { items: data.map((r) => withdrawalFromRow({ ...r, profiles: r.affiliates?.profiles })), total: count ?? data.length }
  },
  async setWithdrawalStatus(id, status, note) {
    const { error } = await supabase.rpc('admin_set_partner_withdrawal_status', { p_id: id, p_new_status: status, p_note: note || null })
    if (error) throw new Error(error.message)
  },
}

const mockAdminPartnerService = {
  async listInvestments(params) {
    await delay()
    return mock.adminListInvestments(params)
  },
  async getInvestmentDetail(investmentId) {
    await delay()
    return mock.getInvestmentDetail(investmentId)
  },
  async setInvestmentStatus(investmentId, status, note) {
    await delay(400)
    return mock.adminSetInvestmentStatus(investmentId, status, note)
  },
  async postProfit(investmentId, amount, entryDate, note) {
    await delay(400)
    return mock.adminPostPartnerProfit(investmentId, amount, entryDate, note)
  },
  async listWithdrawals(params) {
    await delay()
    return mock.adminListPartnerWithdrawals(params)
  },
  async setWithdrawalStatus(id, status, note) {
    await delay(400)
    return mock.adminSetPartnerWithdrawalStatus(id, status, note)
  },
}

export const adminPartnerService = isSupabaseConfigured ? realAdminPartnerService : mockAdminPartnerService
