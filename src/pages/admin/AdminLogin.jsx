import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { seededCredentials } from '@/lib/mockBackend'
import { Label, Input, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function AdminLogin() {
  const { login, logout, isAuthenticated, isAdmin, authAction } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(isSupabaseConfigured ? '' : seededCredentials.admin.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated && isAdmin) return <Navigate to="/super-admin/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const result = await login(email.trim(), password)
    if (!result.success) {
      setError(result.error)
      return
    }
    if (result.affiliate.role !== 'admin') {
      await logout()
      setError('This account does not have Super Admin access.')
      return
    }
    navigate('/super-admin/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-white">Digitalsofts</p>
            <p className="text-sm text-navy-300">Super Admin Console</p>
          </div>
        </div>

        <div className="rounded-2xl border border-navy-800 bg-navy-900 p-6 shadow-panel">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3.5 py-3 text-sm text-danger-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-email" className="text-navy-200">Email or phone</Label>
              <Input id="admin-email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@digitalsofts.local" />
            </div>
            <div>
              <Label htmlFor="admin-password" className="text-navy-200">Password</Label>
              <Input id="admin-password" type="password" icon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <FieldError />
            </div>
            <Button type="submit" className="w-full" size="lg" loading={authAction}>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-center">
              <p className="text-xs font-medium text-navy-300">Demo credentials</p>
              <p className="mt-1 font-mono text-xs text-navy-100">{seededCredentials.admin.email}</p>
              <p className="font-mono text-xs text-navy-100">{seededCredentials.admin.password}</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-navy-400">
          Not an admin? <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">Go to affiliate sign in</Link>
        </p>
      </div>
    </div>
  )
}
