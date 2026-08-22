import { useState } from 'react'
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Label, Input, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { seededCredentials } from '@/lib/mockBackend'

export default function Login() {
  const { login, isAuthenticated, authAction } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(isSupabaseConfigured ? '' : seededCredentials.affiliate.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    // Read straight from the form fields rather than trusting React state alone —
    // some browser password managers set the DOM value without firing a React
    // input event, which would otherwise leave `email`/`password` state stale.
    const formData = new FormData(e.target)
    const submittedEmail = (formData.get('email') || email || '').toString().trim()
    const submittedPassword = (formData.get('password') || password || '').toString()
    const result = await login(submittedEmail, submittedPassword)
    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-display text-base font-bold text-white">
            D
          </div>
          <span className="font-display text-xl font-bold">Digitalsofts</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-3xl font-bold leading-tight">Welcome back to Digitalsofts.</h1>
          <p className="mt-4 text-navy-100">
            Sign in to track your referrals, commission wallet and orders — or keep shopping without an account.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
            <div>
              <p className="font-display text-2xl font-bold text-brand-400">5</p>
              <p className="mt-1 text-xs text-navy-200">Referral levels</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-brand-400">6</p>
              <p className="mt-1 text-xs text-navy-200">Product categories</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-brand-400">10%</p>
              <p className="mt-1 text-xs text-navy-200">Level 1 commission</p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-navy-300">© 2026 Digitalsofts. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-display text-base font-bold text-white">
              D
            </div>
            <span className="font-display text-xl font-bold text-ink-900">Digitalsofts</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-500">Use your email or phone number to access your affiliate account.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email or phone</Label>
              <Input
                id="email"
                name="email"
                type="text"
                icon={Mail}
                placeholder="you@example.com or +92 3XXXXXXXXX"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="mb-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                icon={Lock}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <FieldError />
            </div>

            <Button type="submit" className="w-full" size="lg" loading={authAction}>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {!isSupabaseConfigured && (
            <div className="mt-6 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-center">
              <p className="text-xs font-medium text-ink-500">Demo credentials</p>
              <p className="mt-1 font-mono text-xs text-ink-700">{seededCredentials.affiliate.email}</p>
              <p className="font-mono text-xs text-ink-700">{seededCredentials.affiliate.password}</p>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-ink-500">
            Not an affiliate yet?{' '}
            <Link to="/registration" className="font-medium text-brand-600 hover:text-brand-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
