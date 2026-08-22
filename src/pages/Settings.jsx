import { useState } from 'react'
import { User, ShieldCheck, Bell, Gift, Copy, Check } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Tabs from '@/components/ui/Tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Label, Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

const TABS = [
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'referral', label: 'Referral', icon: Gift },
  { value: 'notifications', label: 'Notifications', icon: Bell },
]

function SettingsRow({ label, description, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-ink-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-ink-200'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function Settings() {
  const { affiliate } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState('profile')

  const [profile, setProfile] = useState({ name: affiliate.fullName, email: affiliate.email, phone: affiliate.phone, city: affiliate.city })
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    commissionAlerts: true,
    referralAlerts: true,
    withdrawalAlerts: true,
    marketingTips: false,
  })
  const [copied, setCopied] = useState(false)

  function save(section) {
    toast({ title: 'Settings saved', description: `Your ${section} settings were updated.` })
  }

  const referralLink = `${window.location.origin}/registration?ref=${affiliate.referralCode}`

  function copyLink() {
    navigator.clipboard?.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and account preferences." />

      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'profile' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={profile.city} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))} />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => save('profile')}>Save changes</Button>
          </CardFooter>
        </Card>
      )}

      {tab === 'security' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="max-w-sm space-y-4">
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" placeholder="••••••••" />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" placeholder="At least 8 characters" />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => save('security')}>Update password</Button>
          </CardFooter>
        </Card>
      )}

      {tab === 'referral' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Referral</CardTitle>
              <CardDescription>Your referral code and link.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Referral code</Label>
              <p className="font-display text-lg font-bold text-ink-900">{affiliate.referralCode}</p>
            </div>
            <div>
              <Label htmlFor="ref-link">Referral link</Label>
              <div className="flex items-center gap-2">
                <Input id="ref-link" readOnly value={referralLink} className="font-mono text-xs" />
                <Button size="icon" variant="secondary" onClick={copyLink} aria-label="Copy referral link">
                  {copied ? <Check className="h-4 w-4 text-success-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you're notified about.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <SettingsRow label="Order updates" description="Status changes on your orders.">
              <ToggleSwitch checked={notifications.orderUpdates} onChange={(v) => setNotifications((n) => ({ ...n, orderUpdates: v }))} />
            </SettingsRow>
            <SettingsRow label="Commission alerts" description="When you earn a commission.">
              <ToggleSwitch checked={notifications.commissionAlerts} onChange={(v) => setNotifications((n) => ({ ...n, commissionAlerts: v }))} />
            </SettingsRow>
            <SettingsRow label="Referral alerts" description="When someone joins using your link.">
              <ToggleSwitch checked={notifications.referralAlerts} onChange={(v) => setNotifications((n) => ({ ...n, referralAlerts: v }))} />
            </SettingsRow>
            <SettingsRow label="Withdrawal alerts" description="Updates on your withdrawal requests.">
              <ToggleSwitch checked={notifications.withdrawalAlerts} onChange={(v) => setNotifications((n) => ({ ...n, withdrawalAlerts: v }))} />
            </SettingsRow>
            <SettingsRow label="Marketing tips" description="Occasional tips to grow your network.">
              <ToggleSwitch checked={notifications.marketingTips} onChange={(v) => setNotifications((n) => ({ ...n, marketingTips: v }))} />
            </SettingsRow>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => save('notification')}>Save preferences</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
