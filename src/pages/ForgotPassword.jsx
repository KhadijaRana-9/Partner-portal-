import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Label, Input, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setLoading(true)
    await requestPasswordReset(email)
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-display text-base font-bold text-white">D</div>
          <span className="font-display text-xl font-bold text-ink-900">Digitalsofts</span>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-surface p-8 shadow-panel">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Check your inbox</h2>
              <p className="mt-2 text-sm text-ink-500">
                If an account exists for <span className="font-medium text-ink-700">{email}</span>, a reset link is on its way.
              </p>
              {!isSupabaseConfigured && (
                <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-400">
                  Demo mode: no email is actually sent — this reproduces the exact flow a live Supabase project would run.
                </p>
              )}
            </div>
          ) : (
            <>
              <h2 className="font-display text-lg font-semibold text-ink-900">Reset your password</h2>
              <p className="mt-1.5 text-sm text-ink-500">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    icon={Mail}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    placeholder="you@company.com"
                  />
                  <FieldError>{error}</FieldError>
                </div>
                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Send reset link
                </Button>
              </form>
            </>
          )}

          <Link to="/login" className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
