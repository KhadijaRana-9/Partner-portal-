import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, Network, Wallet, Clock, ArrowRight, Copy, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { referralService } from '@/services/referralService'
import { commissionService } from '@/services/commissionService'
import { walletService } from '@/services/walletService'
import { orderService } from '@/services/orderService'
import MetricCard from '@/components/dashboard/MetricCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { affiliate } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [orders, setOrders] = useState([])
  const [commissions, setCommissions] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    referralService.getNetworkStats(affiliate.id).then(setStats)
    walletService.getWallet(affiliate.id).then(setWallet)
    orderService.listMyOrders(affiliate.id).then(setOrders)
    commissionService.listMyCommissions(affiliate.id).then(setCommissions)
  }, [affiliate.id])

  const referralLink = `${window.location.origin}/registration?ref=${affiliate.referralCode}`

  function copyLink() {
    navigator.clipboard?.writeText(referralLink)
    setCopied(true)
    toast({ title: 'Referral link copied' })
    setTimeout(() => setCopied(false), 1500)
  }

  const totalProductsPurchased = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)

  const activity = [
    ...commissions.slice(0, 4).map((c) => ({
      id: c.id,
      type: 'commission',
      text: `Earned ${formatCurrency(c.commissionAmount, 'PKR')} commission (Level ${c.level}).`,
      timestamp: c.createdAt,
    })),
    ...orders.slice(0, 4).map((o) => ({
      id: o.id,
      type: 'order',
      text: `Order ${o.orderNumber} is ${o.status.replace(/_/g, ' ')}.`,
      timestamp: o.placedAt,
      to: `/orders/${o.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6)

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-6 text-white sm:p-8">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '26px 26px' }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-2xl font-bold sm:text-3xl">
              {greeting()}, {affiliate.fullName.split(' ')[0]}
            </p>
            <p className="mt-1.5 max-w-md text-sm text-navy-100">Share your link below to start growing your network.</p>
            <button
              onClick={copyLink}
              className="mt-4 flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-mono text-white backdrop-blur-sm hover:bg-white/20"
            >
              {referralLink}
              {copied ? <Check className="h-3.5 w-3.5 text-success-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            <Link to="/referrals" className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20">
              My Referrals
            </Link>
            <Link to="/wallet" className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20">
              Wallet
            </Link>
            <Link to="/products" className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20">
              Shop
            </Link>
            <Link to="/orders" className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20">
              My Orders
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Products Purchased" value={totalProductsPurchased} icon={Package} tone="brand" />
        <MetricCard label="Direct Referrals" value={stats?.totalDirect ?? '—'} icon={Users} tone="info" />
        <MetricCard label="Indirect Referrals" value={stats?.totalIndirect ?? '—'} icon={Network} tone="info" />
        <MetricCard label="Available Balance" value={wallet ? formatCurrency(wallet.availableBalance, 'PKR') : '—'} icon={Wallet} tone="success" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Level-wise Referral Statistics</CardTitle>
              <CardDescription>Your 5-level commission structure and network reach</CardDescription>
            </div>
            <Link to="/referrals" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              View network
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
                      <div>
                        <p className="text-sm font-medium text-ink-900">Level {l.level}</p>
                        <p className="text-xs text-ink-500">{l.percentage}% commission</p>
                      </div>
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

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pending Commission</CardTitle>
              <CardDescription>Awaiting payment approval</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-ink-900">
                  {formatCurrency(commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionAmount, 0), 'PKR')}
                </p>
                <p className="text-xs text-ink-500">Commission is credited as soon as the source order's payment is approved.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? <p className="py-6 text-center text-sm text-ink-400">No activity yet.</p> : <RecentActivity items={activity} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
