import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Mail, Lock, User, Phone, MapPin, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Gift, Lock as LockIcon, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { referralService } from '@/services/referralService'
import { otpService } from '@/services/otpService'
import { Label, Input, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const emptyForm = { fullName: '', email: '', phone: '', city: '', referralCode: '', password: '', confirmPassword: '' }

function emptyChannelState() {
  return { verified: false, code: '', error: '', devCode: null, sentAt: 0, resendAfterSeconds: 30, verifying: false, sending: false }
}

// One verification channel (email or phone): request/verify/resend, with
// expiry, attempt-limiting and rate-limiting all enforced server-side (real
// mode: the request_otp/verify_otp RPCs; demo mode: lib/mockBackend.js's
// otpStore) — this component only reflects that state, it doesn't invent it.
function OtpChannel({ label, icon: Icon, identifier, channel, state, setState }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const cooldownRemaining = Math.max(0, Math.ceil((state.sentAt + state.resendAfterSeconds * 1000 - now) / 1000))

  async function send() {
    setState((s) => ({ ...s, sending: true, error: '' }))
    try {
      const res = await otpService.request(identifier, channel, 'registration')
      setState((s) => ({ ...s, sending: false, sentAt: Date.now(), resendAfterSeconds: res.resendAfterSeconds ?? 30, devCode: res.devCode ?? null, code: '' }))
    } catch (err) {
      setState((s) => ({ ...s, sending: false, error: err.message }))
    }
  }

  async function verify() {
    setState((s) => ({ ...s, verifying: true, error: '' }))
    const res = await otpService.verify(identifier, 'registration', state.code.trim())
    if (res.success) {
      setState((s) => ({ ...s, verifying: false, verified: true, error: '' }))
    } else {
      setState((s) => ({ ...s, verifying: false, error: res.error || 'Incorrect code.' }))
    }
  }

  if (state.verified) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-success-200 bg-success-50 px-3.5 py-3 text-sm text-success-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {label} verified — {identifier}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-ink-200 p-3.5">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-800">
        <Icon className="h-4 w-4 text-ink-400" />
        {label} — {identifier}
      </div>

      {state.sentAt === 0 ? (
        <Button type="button" size="sm" variant="secondary" className="mt-2.5" onClick={send} loading={state.sending}>
          Send code
        </Button>
      ) : (
        <>
          {state.devCode !== null && (
            <p className="mt-2 rounded-md bg-warning-50 px-2.5 py-1.5 text-xs text-warning-800">
              DEV MODE — no real {channel === 'email' ? 'email' : 'SMS'} sent. Your code is <span className="font-mono font-semibold">{state.devCode}</span>.
            </p>
          )}
          {isSupabaseConfigured && state.devCode === null && (
            <p className="mt-2 rounded-md bg-warning-50 px-2.5 py-1.5 text-xs text-warning-800">
              This deployment doesn't have a real SMS/email provider connected yet, so no code can be delivered. See supabase/functions/send-otp.
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <Input
              value={state.code}
              onChange={(e) => setState((s) => ({ ...s, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              placeholder="6-digit code"
              className="font-mono"
            />
            <Button type="button" size="sm" onClick={verify} loading={state.verifying} disabled={state.code.length !== 6}>
              Verify
            </Button>
          </div>
          <button
            type="button"
            onClick={send}
            disabled={cooldownRemaining > 0 || state.sending}
            className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-400"
          >
            {cooldownRemaining > 0 ? `Resend code in ${cooldownRemaining}s` : 'Resend code'}
          </button>
        </>
      )}
      <FieldError>{state.error}</FieldError>
    </div>
  )
}

export default function Registration() {
  const { signup, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const refFromUrl = params.get('ref') || ''

  const [step, setStep] = useState('details') // 'details' | 'verify'
  const [form, setForm] = useState({ ...emptyForm, referralCode: refFromUrl })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [emailState, setEmailState] = useState(emptyChannelState)
  const [phoneState, setPhoneState] = useState(emptyChannelState)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function validate() {
    const next = {}
    if (!form.fullName.trim()) next.fullName = 'Full name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (!/^\+?[0-9 ()-]{7,15}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.'
    if (!form.city.trim()) next.city = 'City is required.'
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.'
    if (form.referralCode.trim()) {
      const valid = await referralService.validateReferralCode(form.referralCode.trim())
      if (!valid) next.referralCode = 'This referral code is invalid.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleContinueToVerify(e) {
    e.preventDefault()
    setServerError('')
    if (!(await validate())) return
    setEmailState(emptyChannelState())
    setPhoneState(emptyChannelState())
    setStep('verify')
  }

  async function handleCreateAccount() {
    setServerError('')
    setLoading(true)
    const result = await signup({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      phone: form.phone,
      city: form.city,
      referralCode: form.referralCode.trim() || null,
    })
    setLoading(false)
    if (!result.success) {
      setServerError(result.error)
      return
    }
    if (result.requiresEmailConfirmation) {
      setConfirmMessage(result.message)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  const bothVerified = emailState.verified && phoneState.verified

  if (confirmMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-surface p-8 text-center shadow-panel">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-semibold text-ink-900">Check your inbox</h2>
          <p className="mt-2 text-sm text-ink-500">{confirmMessage}</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-display text-base font-bold text-white">D</div>
          <span className="font-display text-xl font-bold">Digitalsofts</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-3xl font-bold leading-tight">Become a Digitalsofts affiliate.</h1>
          <p className="mt-4 text-navy-100">
            Share your referral link, build a network up to 5 levels deep, and earn commission on every approved sale.
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

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-display text-base font-bold text-white">D</div>
            <span className="font-display text-xl font-bold text-ink-900">Digitalsofts</span>
          </div>

          {step === 'details' ? (
            <>
              <h2 className="font-display text-2xl font-bold text-ink-900">Create your affiliate account</h2>
              <p className="mt-1.5 text-sm text-ink-500">Start shopping, or share your referral link right after you sign up.</p>

              {!isSupabaseConfigured && (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3.5 py-3 text-sm text-warning-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Demo mode: this creates a real in-memory affiliate account for this session — no external accounts needed.
                </div>
              )}

              <form onSubmit={handleContinueToVerify} noValidate className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" icon={User} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Ayesha Raza" />
                  <FieldError>{errors.fullName}</FieldError>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="reg-email">Email address</Label>
                    <Input id="reg-email" type="email" icon={Mail} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
                    <FieldError>{errors.email}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" icon={Phone} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+92 3XX XXXXXXX" />
                    <FieldError>{errors.phone}</FieldError>
                  </div>
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" icon={MapPin} value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Lahore" />
                  <FieldError>{errors.city}</FieldError>
                </div>
                <div>
                  <Label htmlFor="referralCode">Referral code (optional)</Label>
                  <Input
                    id="referralCode"
                    icon={refFromUrl ? LockIcon : Gift}
                    value={form.referralCode}
                    readOnly={!!refFromUrl}
                    onChange={(e) => update('referralCode', e.target.value.toUpperCase())}
                    placeholder="DS12345678"
                    className={refFromUrl ? 'bg-ink-50 text-ink-500' : undefined}
                  />
                  {refFromUrl ? (
                    <p className="mt-1 text-xs text-success-600">Applied from your invite link.</p>
                  ) : (
                    <FieldError>{errors.referralCode}</FieldError>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" type="password" icon={Lock} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" />
                  <FieldError>{errors.password}</FieldError>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input id="confirmPassword" type="password" icon={Lock} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Re-enter your password" />
                  <FieldError>{errors.confirmPassword}</FieldError>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Continue to verification
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => setStep('details')} className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-600">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <h2 className="font-display text-2xl font-bold text-ink-900">Verify your details</h2>
              </div>
              <p className="mt-1.5 text-sm text-ink-500">Confirm your email and phone before your account is created.</p>

              {serverError && (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <OtpChannel label="Email" icon={Mail} identifier={form.email} channel="email" state={emailState} setState={setEmailState} />
                <OtpChannel label="Phone" icon={Phone} identifier={form.phone} channel="phone" state={phoneState} setState={setPhoneState} />
              </div>

              <Button className="mt-6 w-full" size="lg" disabled={!bothVerified} loading={loading} onClick={handleCreateAccount}>
                Create account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          <p className="mt-8 text-center text-sm text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
