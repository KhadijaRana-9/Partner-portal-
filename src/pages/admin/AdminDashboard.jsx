import { useEffect, useState } from 'react'
import {
  Users, UserCog, UserCheck, ShoppingBag, Wallet, Clock, Landmark, Percent, Package, PackageSearch, RotateCcw,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminReportService } from '@/services/adminReportService'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/dashboard/MetricCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { BRAND, CATEGORICAL, CHART_INK } from '@/lib/chartColors'
import { formatCurrency, formatNumber } from '@/lib/utils'

const SIGNUP_COLOR = CATEGORICAL[0]

function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-xs shadow-panel">
      <p className="font-medium text-ink-900">{label}</p>
      <p className="mt-0.5 text-ink-600">{valueFormatter(payload[0].value)}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [sales, setSales] = useState(null)
  const [signups, setSignups] = useState(null)
  const [activity, setActivity] = useState(null)

  useEffect(() => {
    adminReportService.dashboardStats().then(setStats)
    adminReportService.salesSeries(30).then(setSales)
    adminReportService.signupsSeries(30).then(setSignups)
    adminReportService.recentActivity(10).then(setActivity)
  }, [])

  const metrics = stats
    ? [
        { label: 'Total Users', value: formatNumber(stats.totalUsers), icon: Users, tone: 'ink' },
        { label: 'Total Affiliates', value: formatNumber(stats.totalAffiliates), icon: UserCog, tone: 'brand' },
        { label: 'Active Affiliates', value: formatNumber(stats.activeAffiliates), icon: UserCheck, tone: 'success' },
        { label: 'Total Orders', value: formatNumber(stats.totalOrders), icon: ShoppingBag, tone: 'info' },
        { label: 'Total Sales', value: formatCurrency(stats.totalSales, 'PKR'), icon: Wallet, tone: 'success' },
        { label: 'Pending Payments', value: formatNumber(stats.pendingPayments), icon: Clock, tone: 'warning' },
        { label: 'Pending Withdrawals', value: formatNumber(stats.pendingWithdrawals), icon: Landmark, tone: 'warning' },
        { label: 'Total Commission', value: formatCurrency(stats.totalCommission, 'PKR'), icon: Percent, tone: 'brand' },
        { label: 'Total Products', value: formatNumber(stats.totalProducts), icon: Package, tone: 'ink' },
        { label: 'Products Pending Approval', value: formatNumber(stats.productsPendingApproval), icon: PackageSearch, tone: 'warning' },
        { label: 'Returned Orders', value: formatNumber(stats.returnedOrders), icon: RotateCcw, tone: 'warning' },
      ]
    : []

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform-wide overview across affiliates, orders and payouts." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!stats
          ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
          : metrics.map((m) => <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} tone={m.tone} />)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sales — last 30 days</CardTitle>
              <CardDescription>Order totals, excluding rejected/cancelled orders</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!sales ? (
              <CardSkeleton className="h-64 border-0 p-0" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: CHART_INK.muted }}
                      axisLine={{ stroke: CHART_INK.axis }}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: CHART_INK.muted }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(v) => `PKR ${Math.round(v / 1000)}K`}
                    />
                    <Tooltip content={<ChartTooltip valueFormatter={(v) => formatCurrency(v, 'PKR')} />} cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill="url(#salesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Signups — last 30 days</CardTitle>
              <CardDescription>New affiliate accounts created</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!signups ? (
              <CardSkeleton className="h-64 border-0 p-0" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signups} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: CHART_INK.muted }}
                      axisLine={{ stroke: CHART_INK.axis }}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatNumber(v)} signup${v === 1 ? '' : 's'}`} />} cursor={{ fill: CHART_INK.grid }} />
                    <Bar dataKey="value" fill={SIGNUP_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!activity ? (
              <CardSkeleton className="h-40 border-0 p-0" />
            ) : activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">No activity yet.</p>
            ) : (
              <RecentActivity items={activity} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
