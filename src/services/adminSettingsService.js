import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const realAdminSettingsService = {
  async getCommissionLevels() {
    const { data, error } = await supabase.from('commission_levels').select('*').order('level')
    if (error) throw error
    return data.map((r) => ({ level: r.level, percentage: Number(r.percentage) }))
  },

  async updateCommissionLevel(level, percentage) {
    const { error } = await supabase.from('commission_levels').update({ percentage: Number(percentage) }).eq('level', level)
    if (error) throw error
    return realAdminSettingsService.getCommissionLevels()
  },

  async getPlatformSettings() {
    const { data, error } = await supabase.from('platform_settings').select('*').single()
    if (error) throw error
    return {
      minWithdrawal: Number(data.min_withdrawal),
      maxWithdrawal: data.max_withdrawal !== null ? Number(data.max_withdrawal) : null,
      withdrawalFeePercentage: Number(data.withdrawal_fee_percentage),
      jazzcashAccount: data.jazzcash_account,
      easypaisaAccount: data.easypaisa_account,
      bankDetails: data.bank_details,
      cryptoDetails: data.crypto_details,
      cashInstructions: data.cash_instructions,
    }
  },

  async updatePlatformSettings(fields) {
    const row = { updated_at: new Date().toISOString() }
    if (fields.minWithdrawal !== undefined) row.min_withdrawal = fields.minWithdrawal
    if (fields.maxWithdrawal !== undefined) row.max_withdrawal = fields.maxWithdrawal
    if (fields.withdrawalFeePercentage !== undefined) row.withdrawal_fee_percentage = fields.withdrawalFeePercentage
    if (fields.jazzcashAccount !== undefined) row.jazzcash_account = fields.jazzcashAccount
    if (fields.easypaisaAccount !== undefined) row.easypaisa_account = fields.easypaisaAccount
    if (fields.bankDetails !== undefined) row.bank_details = fields.bankDetails
    if (fields.cryptoDetails !== undefined) row.crypto_details = fields.cryptoDetails
    if (fields.cashInstructions !== undefined) row.cash_instructions = fields.cashInstructions
    const { error } = await supabase.from('platform_settings').update(row).eq('id', true)
    if (error) throw error
    return realAdminSettingsService.getPlatformSettings()
  },

  async getPartnerSettings() {
    const { data, error } = await supabase.from('partner_settings').select('*').single()
    if (error) throw error
    return {
      enabled: data.enabled,
      minInvestment: Number(data.min_investment),
      maxInvestment: data.max_investment !== null ? Number(data.max_investment) : null,
      profitCalculationType: data.profit_calculation_type,
      profitRatePercentage: Number(data.profit_rate_percentage),
      profitFrequency: data.profit_frequency,
      allowPrincipalWithdrawal: data.allow_principal_withdrawal,
      allowProfitOnlyWithdrawal: data.allow_profit_only_withdrawal,
      withdrawalFeePercentage: Number(data.withdrawal_fee_percentage),
    }
  },

  async updatePartnerSettings(fields) {
    const row = { updated_at: new Date().toISOString() }
    if (fields.enabled !== undefined) row.enabled = fields.enabled
    if (fields.minInvestment !== undefined) row.min_investment = fields.minInvestment
    if (fields.maxInvestment !== undefined) row.max_investment = fields.maxInvestment
    if (fields.profitCalculationType !== undefined) row.profit_calculation_type = fields.profitCalculationType
    if (fields.profitRatePercentage !== undefined) row.profit_rate_percentage = fields.profitRatePercentage
    if (fields.profitFrequency !== undefined) row.profit_frequency = fields.profitFrequency
    if (fields.allowPrincipalWithdrawal !== undefined) row.allow_principal_withdrawal = fields.allowPrincipalWithdrawal
    if (fields.allowProfitOnlyWithdrawal !== undefined) row.allow_profit_only_withdrawal = fields.allowProfitOnlyWithdrawal
    if (fields.withdrawalFeePercentage !== undefined) row.withdrawal_fee_percentage = fields.withdrawalFeePercentage
    const { error } = await supabase.from('partner_settings').update(row).eq('id', true)
    if (error) throw error
    return realAdminSettingsService.getPartnerSettings()
  },

  async runPartnerProfitCycle() {
    const { data, error } = await supabase.rpc('admin_run_partner_profit_cycle')
    if (error) throw new Error(error.message)
    return data
  },
}

const mockAdminSettingsService = {
  async getCommissionLevels() {
    await delay(150)
    return mock.getCommissionLevels()
  },
  async updateCommissionLevel(level, percentage) {
    await delay(300)
    return mock.adminUpdateCommissionLevel(level, percentage)
  },
  async getPlatformSettings() {
    await delay(150)
    return mock.getPlatformSettings()
  },
  async updatePlatformSettings(fields) {
    await delay(300)
    return mock.adminUpdatePlatformSettings(fields)
  },
  async getPartnerSettings() {
    await delay(150)
    return mock.getPartnerSettings()
  },
  async updatePartnerSettings(fields) {
    await delay(300)
    return mock.adminUpdatePartnerSettings(fields)
  },
  async runPartnerProfitCycle() {
    await delay(400)
    return mock.adminRunPartnerProfitCycle()
  },
}

export const adminSettingsService = isSupabaseConfigured ? realAdminSettingsService : mockAdminSettingsService
