import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withdrawalFromRow(row) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    affiliateName: row.affiliate?.profiles?.full_name ?? 'Affiliate',
    amount: Number(row.amount),
    feePercentage: Number(row.fee_percentage),
    feeAmount: Number(row.fee_amount),
    netAmount: Number(row.net_amount),
    method: row.method,
    accountDetails: row.account_details,
    status: row.status,
    adminNote: row.admin_note,
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
  }
}

const realAdminWithdrawalService = {
  async listWithdrawals({ status, page = 1, pageSize = 20 } = {}) {
    let query = supabase.from('withdrawal_requests').select('*, affiliate:affiliate_id(profiles(full_name))', { count: 'exact' })
    if (status) query = query.eq('status', status)
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('requested_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw error
    return { items: data.map(withdrawalFromRow), total: count ?? data.length }
  },

  // Idempotent, admin-only transition enforced server-side — the RPC raises
  // if the withdrawal is already paid/rejected/cancelled; surface that.
  async setWithdrawalStatus(id, newStatus, note) {
    const { error } = await supabase.rpc('admin_set_withdrawal_status', {
      p_id: id,
      p_new_status: newStatus,
      p_note: note || null,
    })
    if (error) throw new Error(error.message)
  },
}

const mockAdminWithdrawalService = {
  async listWithdrawals(params) {
    await delay()
    return mock.adminListWithdrawals(params)
  },
  async setWithdrawalStatus(id, newStatus, note) {
    await delay(350)
    return mock.adminSetWithdrawalStatus(id, newStatus, note)
  },
}

export const adminWithdrawalService = isSupabaseConfigured ? realAdminWithdrawalService : mockAdminWithdrawalService
