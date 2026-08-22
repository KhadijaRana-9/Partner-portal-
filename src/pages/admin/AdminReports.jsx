import { useEffect, useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminReportService } from '@/services/adminReportService'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { BRAND, CATEGORICAL, CHART_INK } from '@/lib/chartColors'
import { formatCurrency, formatNumber } from '@/lib/utils'

const SIGNUP_COLOR = CATEGORICAL[0]

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
  { value: 90, label: 'Last 90 days' },
]

const GRANULARITY_DAYS = { daily: null, weekly: 90, monthly: 365 }

function groupWeekly(series) {
  const groups = []
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7)
    if (!chunk.length) continue
    const start = new Date(chunk[0].date)
    groups.push({
      label: `Wk of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      value: Math.round(chunk.reduce((s, d) => s + d.value, 0) * 100) / 100,
      count: chunk.reduce((s, d) => s + d.count, 0),
    })
  }
  return groups
}

function groupMonthly(series) {
  const map = new Map()
  series.forEach((d) => {
    const key = d.date.slice(0, 7)
    if (!map.has(key)) {
      const dt = new Date(d.date)
      map.set(key, { label: dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), value: 0, count: 0 })
    }
    const g = map.get(key)
    g.value += d.value
    g.count += d.count
  })
  return Array.from(map.values()).map((g) => ({ ...g, value: Math.round(g.value * 100) / 100 }))
}

function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-xs shadow-panel">
      <p className="font-medium text-ink-900">{label}</p>
      <p className="mt-0.5 text-ink-600">{valueFormatter(payload[0].value)}</p>
    </div>
  )
}

export default function AdminReports() {
  const [granularity, setGranularity] = useState('daily')
  const [range, setRange] = useState(30)
  const [rawSales, setRawSales] = useState(null)
  const [rawSignups, setRawSignups] = useState(null)

  const fetchDays = GRANULARITY_DAYS[granularity] ?? range

  useEffect(() => {
    setRawSales(null)
    setRawSignups(null)
    adminReportService.salesSeries(fetchDays).then(setRawSales)
    adminReportService.signupsSeries(fetchDays).then(setRawSignups)
  }, [fetchDays])

  const sales = useMemo(() => {
    if (!rawSales) return null
    if (granularity === 'weekly') return groupWeekly(rawSales)
    if (granularity === 'monthly') return groupMonthly(rawSales)
    return rawSales
  }, [rawSales, granularity])

  const signups = useMemo(() => {
    if (!rawSignups) return null
    if (granularity === 'weekly') return groupWeekly(rawSignups)
    if (granularity === 'monthly') return groupMonthly(rawSignups)
    return rawSignups
  }, [rawSignups, granularity])

  const totalSales = sales ? sales.reduce((s, d) => s + d.value, 0) : 0
  const totalSignups = signups ? signups.reduce((s, d) => s + d.count, 0) : 0

  return (
    <div>
      <PageHeader title="Reports" description="Sales and signup trends across the platform." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          value={granularity}
          onChange={setGranularity}
        />
        {granularity === 'daily' && (
          <Select value={range} onChange={(e) => setRange(Number(e.target.value))} className="sm:w-44">
            {RANGE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sales</CardTitle>
              <CardDescription>{sales ? `${formatCurrency(totalSales, 'PKR')} across ${sales.length} period${sales.length === 1 ? '' : 's'}` : 'Loading…'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!sales ? (
              <CardSkeleton className="h-64 border-0 p-0" />
            ) : sales.every((d) => d.value === 0) ? (
              <EmptyState icon={BarChart3} title="No sales in this window" className="border-0" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportSalesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => `PKR ${Math.round(v / 1000)}K`} />
                    <Tooltip content={<ChartTooltip valueFormatter={(v) => formatCurrency(v, 'PKR')} />} cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill="url(#reportSalesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Signups</CardTitle>
              <CardDescription>{signups ? `${formatNumber(totalSignups)} new affiliates across ${signups.length} period${signups.length === 1 ? '' : 's'}` : 'Loading…'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!signups ? (
              <CardSkeleton className="h-64 border-0 p-0" />
            ) : signups.every((d) => d.count === 0) ? (
              <EmptyState icon={BarChart3} title="No signups in this window" className="border-0" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signups} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatNumber(v)} signup${v === 1 ? '' : 's'}`} />} cursor={{ fill: CHART_INK.grid }} />
                    <Bar dataKey="count" fill={SIGNUP_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Period Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!sales || !signups ? (
            <div className="p-5"><CardSkeleton className="h-40 border-0 p-0" /></div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Period</TH>
                  <TH>Sales</TH>
                  <TH>Orders</TH>
                  <TH>Signups</TH>
                </TR>
              </THead>
              <TBody>
                {sales.map((s, i) => (
                  <TR key={s.label + i}>
                    <TD className="font-medium text-ink-900">{s.label}</TD>
                    <TD>{formatCurrency(s.value, 'PKR')}</TD>
                    <TD>{s.count}</TD>
                    <TD>{signups[i]?.count ?? 0}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
