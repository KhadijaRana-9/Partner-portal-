import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Percent, TrendingUp, Clock, RotateCcw } from 'lucide-react'
import { adminCommissionService } from '@/services/adminCommissionService'
import PageHeader from '@/components/layout/PageHeader'
import MetricCard from '@/components/dashboard/MetricCard'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 15
const SUMMARY_PAGE_SIZE = 500 // demo-scale dataset — a real aggregate would need a dedicated backend rollup

export default function AdminCommissions() {
  const [params, setParams] = useSearchParams()
  const level = params.get('level') || ''
  const status = params.get('status') || ''
  const page = Number(params.get('page') || 1)

  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    setRows(null)
    adminCommissionService.listCommissions({ level: level || undefined, status: status || undefined, page, pageSize: PAGE_SIZE }).then((r) => {
      setRows(r.items)
      setTotal(r.total)
    })
  }, [level, status, page])

  useEffect(() => {
    adminCommissionService.listCommissions({ pageSize: SUMMARY_PAGE_SIZE }).then((r) => {
      const items = r.items
      setSummary({
        total: items.reduce((s, c) => s + c.commissionAmount, 0),
        pending: items.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionAmount, 0),
        approved: items.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commissionAmount, 0),
        reversed: items.filter((c) => c.status === 'reversed').reduce((s, c) => s + c.commissionAmount, 0),
        totalCount: r.total,
      })
    })
  }, [])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader title="Commissions" description="Every commission distributed across the 5-level referral network." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard label={`Total (${summary.totalCount} shown)`} value={formatCurrency(summary.total, 'PKR')} icon={Percent} tone="brand" />
            <MetricCard label="Approved" value={formatCurrency(summary.approved, 'PKR')} icon={TrendingUp} tone="success" />
            <MetricCard label="Pending" value={formatCurrency(summary.pending, 'PKR')} icon={Clock} tone="warning" />
            <MetricCard label="Reversed" value={formatCurrency(summary.reversed, 'PKR')} icon={RotateCcw} tone="ink" />
          </>
        )}
      </div>

      <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row">
        <Select value={level} onChange={(e) => updateParam('level', e.target.value)} className="sm:w-40">
          <option value="">All levels</option>
          {[1, 2, 3, 4, 5].map((l) => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => updateParam('status', e.target.value)} className="sm:w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="reversed">Reversed</option>
          <option value="paid">Paid</option>
        </Select>
      </div>

      <Card>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Percent} title="No commissions found" description="Try a different filter." className="border-0" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Affiliate</TH>
                  <TH>Source</TH>
                  <TH>Level</TH>
                  <TH>%</TH>
                  <TH>Order Amount</TH>
                  <TH>Commission</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((c) => (
                  <TR key={c.id}>
                    <TD>{formatDateTime(c.createdAt)}</TD>
                    <TD className="font-medium text-ink-900">{c.affiliateName}</TD>
                    <TD>{c.sourceAffiliateName}</TD>
                    <TD>L{c.level}</TD>
                    <TD>{c.commissionPercentage}%</TD>
                    <TD>{formatCurrency(c.orderAmount, 'PKR')}</TD>
                    <TD className="font-semibold text-ink-900">{formatCurrency(c.commissionAmount, 'PKR')}</TD>
                    <TD className="capitalize">{c.status}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => updateParam('page', String(p))} />
          </>
        )}
      </Card>
    </div>
  )
}
