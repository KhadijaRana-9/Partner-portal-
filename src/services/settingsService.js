import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Public read of admin-configured payment account details — used by
// Checkout so instructions are never hardcoded into a page component.
// Editable only from /super-admin/settings (see adminSettingsService.js).
const realSettingsService = {
  async getPaymentSettings() {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('jazzcash_account, easypaisa_account, bank_details, crypto_details, cash_instructions')
      .single()
    if (error) throw error
    return {
      jazzcashAccount: data.jazzcash_account,
      easypaisaAccount: data.easypaisa_account,
      bankDetails: data.bank_details,
      cryptoDetails: data.crypto_details,
      cashInstructions: data.cash_instructions,
    }
  },
}

const mockSettingsService = {
  async getPaymentSettings() {
    await delay()
    const s = mock.getPlatformSettings()
    return {
      jazzcashAccount: s.jazzcashAccount,
      easypaisaAccount: s.easypaisaAccount,
      bankDetails: s.bankDetails,
      cryptoDetails: s.cryptoDetails,
      cashInstructions: s.cashInstructions,
    }
  },
}

export const settingsService = isSupabaseConfigured ? realSettingsService : mockSettingsService
