import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '@/services/authService'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [affiliate, setAffiliate] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authAction, setAuthAction] = useState(false)

  useEffect(() => {
    let mounted = true
    authService
      .getSession()
      .then((a) => {
        if (mounted) setAffiliate(a)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
          setAffiliate(null)
        }
      })
      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }
    return () => {
      mounted = false
    }
  }, [])

  async function login(identifier, password) {
    setAuthAction(true)
    const result = await authService.signIn(identifier, password)
    setAuthAction(false)
    if (result.success) setAffiliate(result.affiliate)
    return result
  }

  async function signup(fields) {
    setAuthAction(true)
    const result = await authService.signUp(fields)
    setAuthAction(false)
    if (result.success && result.affiliate) setAffiliate(result.affiliate)
    return result
  }

  async function requestPasswordReset(email) {
    return authService.requestPasswordReset(email)
  }

  async function logout() {
    await authService.signOut()
    setAffiliate(null)
  }

  async function refreshAffiliate() {
    const a = await authService.getSession()
    setAffiliate(a)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!affiliate,
        isAdmin: affiliate?.role === 'admin',
        isLoading,
        authAction,
        login,
        signup,
        logout,
        requestPasswordReset,
        refreshAffiliate,
        affiliate,
        setAffiliate,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
