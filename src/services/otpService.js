import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Real mode: the request_otp() RPC generates and stores the code
// server-side but does NOT return it — a production deployment sends it via
// a trusted Edge Function that holds real provider credentials (see
// supabase/functions/send-otp and the note at the bottom of
// supabase/migrations/0003_otp_verification.sql). Since no such function is
// deployed in this project, real mode's `devCode` is always null — the UI
// must treat that as "delivery isn't wired up yet", not silently succeed.
const realOtpService = {
  async request(identifier, channel, purpose) {
    const { data, error } = await supabase.rpc('request_otp', { p_identifier: identifier, p_channel: channel, p_purpose: purpose })
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : data
    return { expiresAt: row.expires_at, resendAfterSeconds: row.resend_after_seconds, devCode: null }
  },
  async verify(identifier, purpose, code) {
    const { data, error } = await supabase.rpc('verify_otp', { p_identifier: identifier, p_purpose: purpose, p_code: code })
    if (error) throw new Error(error.message)
    return data === true ? { success: true } : { success: false, error: 'Incorrect or expired code.' }
  },
}

const mockOtpService = {
  async request(identifier, channel, purpose) {
    await delay(500)
    return mock.requestOtp(identifier, channel, purpose)
  },
  async verify(identifier, purpose, code) {
    await delay(300)
    return mock.verifyOtp(identifier, purpose, code)
  },
}

export const otpService = isSupabaseConfigured ? realOtpService : mockOtpService
