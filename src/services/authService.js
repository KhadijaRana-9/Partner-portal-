import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const MOCK_SESSION_KEY = 'ds_affiliate_auth'

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const EMAIL_RE = /^\S+@\S+\.\S+$/

// -----------------------------------------------------------------------------
// Real Supabase implementation
// -----------------------------------------------------------------------------

async function fetchAffiliateForUser(userId) {
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (profileError) throw profileError

  const { data: row, error: affiliateError } = await supabase.from('affiliates').select('*').eq('profile_id', userId).single()
  if (affiliateError) throw affiliateError

  return {
    id: row.id,
    profileId: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    avatar: profile.avatar_url,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    role: row.role,
    status: row.status,
    joinedAt: row.created_at,
  }
}

const realAuthService = {
  async signIn(identifier, password) {
    let email = identifier
    if (!EMAIL_RE.test(identifier)) {
      const { data, error } = await supabase.rpc('email_for_identifier', { identifier })
      if (error || !data) return { success: false, error: 'Invalid email/phone or password. Please try again.' }
      email = data
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: 'Invalid email/phone or password. Please try again.' }
    const affiliate = await fetchAffiliateForUser(data.user.id)
    return { success: true, affiliate }
  },

  async signUp({ email, password, fullName, phone, city, referralCode }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, city, referral_code: referralCode || null } },
    })
    if (error) return { success: false, error: error.message }
    if (!data.session) {
      return {
        success: true,
        requiresEmailConfirmation: true,
        message: 'Check your inbox to confirm your email before signing in.',
      }
    }
    const affiliate = await fetchAffiliateForUser(data.user.id)
    return { success: true, affiliate }
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async getSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    return fetchAffiliateForUser(data.session.user.id)
  },

  async requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  async updateProfile(profileId, updates) {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: updates.fullName, phone: updates.phone, city: updates.city })
      .eq('id', profileId)
    if (error) throw error
  },

  onAuthStateChange(callback) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => callback(event))
    return () => subscription.unsubscribe()
  },
}

// -----------------------------------------------------------------------------
// Mock implementation — validated against an in-memory affiliate directory
// (see lib/mockBackend.js), session persisted to localStorage so a refresh
// keeps the session, exactly like real auth would.
// -----------------------------------------------------------------------------

const mockAuthService = {
  async signIn(identifier, password) {
    await delay(600)
    if (!identifier || !password) {
      return { success: false, error: 'Please enter both email/phone and password.' }
    }
    const affiliate = mock.findAffiliateByEmailOrPhone(identifier)
    if (!affiliate || !mock.verifyPassword(affiliate.id, password)) {
      return { success: false, error: 'Invalid email/phone or password. Please try again.' }
    }
    try {
      localStorage.setItem(MOCK_SESSION_KEY, affiliate.id)
    } catch {
      // ignore storage errors (e.g. private mode)
    }
    return { success: true, affiliate }
  },

  async signUp({ email, password, fullName, phone, city, referralCode }) {
    await delay(500)
    try {
      const affiliate = mock.signUpAffiliate({ fullName, email, phone, city, password, referralCode })
      localStorage.setItem(MOCK_SESSION_KEY, affiliate.id)
      return { success: true, affiliate }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  async signOut() {
    try {
      localStorage.removeItem(MOCK_SESSION_KEY)
    } catch {
      // ignore
    }
  },

  async getSession() {
    try {
      const id = localStorage.getItem(MOCK_SESSION_KEY)
      return id ? mock.getAffiliateById(id) : null
    } catch {
      return null
    }
  },

  async requestPasswordReset() {
    await delay(500)
    return { success: true }
  },

  async updateProfile() {
    await delay(400)
  },

  onAuthStateChange() {
    return () => {}
  },
}

export const authService = isSupabaseConfigured ? realAuthService : mockAuthService
