import { useEffect, useState } from 'react'
import { Copy, Check, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { referralService } from '@/services/referralService'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Tabs from '@/components/ui/Tabs'
import EmptyState from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatDate, initials } from '@/lib/utils'

export default function Referrals() {
  const { affiliate } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState(null)
  const [downline, setDownline] = useState(null)
  const [tab, setTab] = useState('all')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    referralService.getNetworkStats(affiliate.id).then(setStats)
    referralService.getDownlineGrouped(affiliate.id).then(setDownline)
  }, [affiliate.id])

  const referralLink = `${window.location.origin}/registration?ref=${affiliate.referralCode}`

  function copyLink() {
    navigator.clipboard?.writeText(referralLink)
    setCopied(true)
    toast({ title: 'Referral link copied' })
    setTimeout(() => setCopied(false), 1500)
  }

  const tabs = [
    { value: 'all', label: 'All levels', count: downline?.length ?? 0 },
    ...[1, 2, 3, 4, 5].map((l) => ({ value: String(l), label: `Level ${l}`, count: downline?.filter((d) => d.level === l).length ?? 0 })),
  ]

  const filtered = downline?.filter((d) => tab === 'all' || d.level === Number(tab)) ?? []

  return (
    <div>
      <PageHeader title="My Referrals" description="Your referral link, code and 5-level network." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-ink-500">Your referral code</p>
            <p className="mt-1 font-display text-lg font-bold text-ink-900">{affiliate.referralCode}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-5">
            <Input readOnly value={referralLink} className="font-mono text-xs" />
            <Button size="icon" variant="secondary" onClick={copyLink} aria-label="Copy referral link">
              {copied ? <Check className="h-4 w-4 text-success-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Level-wise Statistics</CardTitle>
            <CardDescription>Commission percentage and reach at each level</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!stats ? (
            <div className="p-5"><CardSkeleton /></div>
          ) : (
            <div className="divide-y divide-ink-100">
              {stats.byLevel.map((l) => (
                <div key={l.level} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">L{l.level}</span>
                    <p className="text-sm font-medium text-ink-900">Level {l.level} · {l.percentage}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink-900">{l.count} referrals</p>
                    <p className="text-xs text-ink-500">{l.withSales} with sales</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />
        {downline === null ? (
          <CardSkeleton className="h-40" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No referrals at this level yet" description="Share your referral link to start building your network." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(({ affiliate: a, level }) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {initials(a.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{a.fullName}</p>
                    <p className="truncate text-xs text-ink-500">{a.city}</p>
                  </div>
                  <Badge variant="brand">L{level}</Badge>
                </div>
                <p className="mt-2 text-xs text-ink-400">Joined {formatDate(a.createdAt)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
