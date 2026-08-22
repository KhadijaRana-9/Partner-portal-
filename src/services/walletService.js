import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function walletFromRow(row) {
  return {
    affiliateId: row.affiliate_id,
    availableBalance: Number(row.available_balance),
    lifetimeEarned: Number(row.lifetime_earned),
    lifetimeWithdrawn: Number(row.lifetime_withdrawn),
    updatedAt: row.updated_at,
  }
}

function withdrawalFromRow(row) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
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

const realWalletService = {
  async getWallet(affiliateId) {
    const { data, error } = await supabase.from('wallets').select('*').eq('affiliate_id', affiliateId).single()
    if (error) throw error
    return walletFromRow(data)
  },
  async listWithdrawals(affiliateId) {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('requested_at', { ascending: false })
    if (error) throw error
    return data.map(withdrawalFromRow)
  },
  // The reservation, min/max validation, and fee math all happen inside the
  // request_withdrawal() Postgres function — never trust a client-computed
  // balance or fee for money movement.
  async requestWithdrawal(amount, method, accountDetails) {
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_amount: amount,
      p_method: method,
      p_account_details: accountDetails || null,
    })
    if (error) throw new Error(error.message)
    return data
  },
  async getPlatformSettings() {
    const { data, error } = await supabase.from('platform_settings').select('*').single()
    if (error) throw error
    return {
      minWithdrawal: Number(data.min_withdrawal),
      maxWithdrawal: data.max_withdrawal ? Number(data.max_withdrawal) : null,
      withdrawalFeePercentage: Number(data.withdrawal_fee_percentage),
    }
  },
}

const mockWalletService = {
  async getWallet(affiliateId) {
    await delay()
    return mock.getWallet(affiliateId)
  },
  async listWithdrawals(affiliateId) {
    await delay()
    return mock.listWithdrawalsForAffiliate(affiliateId)
  },
  async requestWithdrawal(amount, method, accountDetails, affiliateId) {
    await delay(600)
    return mock.requestWithdrawal(affiliateId, amount, method, accountDetails)
  },
  async getPlatformSettings() {
    await delay(150)
    return mock.getPlatformSettings()
  },
}

export const walletService = isSupabaseConfigured ? realWalletService : mockWalletService
