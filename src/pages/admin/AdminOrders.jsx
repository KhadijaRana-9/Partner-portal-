import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ShoppingBag } from 'lucide-react'
import { adminOrderService } from '@/services/adminOrderService'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/ui/Skeleton'
import OrderStatusBadge, { ORDER_STATUS_LABEL } from '@/components/orders/OrderStatusBadge'
import { useDebouncedValue } from '@/lib/hooks'
import { formatCurrency, formatDate } from '@/lib/utils'

const PAGE_SIZE = 10

const PAYMENT_METHODS = [
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'cash', label: 'Cash' },
]

export default function AdminOrders() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const debouncedSearch = useDebouncedValue(search, 300)
  const status = params.get('status') || ''
  const paymentMethod = params.get('method') || ''
  const page = Number(params.get('page') || 1)

  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setRows(null)
    adminOrderService
      .listOrders({ search: debouncedSearch || undefined, status: status || undefined, paymentMethod: paymentMethod || undefined, page, pageSize: PAGE_SIZE })
      .then((r) => {
        setRows(r.items)
        setTotal(r.total)
      })
  }, [debouncedSearch, status, paymentMethod, page])

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
      <PageHeader title="Orders" description="Every order placed across the storefront, by affiliates and guests." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search by order number, customer or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              updateParam('q', e.target.value)
            }}
          />
        </div>
        <Select value={status} onChange={(e) => updateParam('status', e.target.value)} className="sm:w-52">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select value={paymentMethod} onChange={(e) => updateParam('method', e.target.value)} className="sm:w-44">
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
      </div>

      <Card>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders found" description="Try a different search term or filter." className="border-0" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>Total</TH>
                  <TH>Payment</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((o) => (
                  <TR key={o.id} className="cursor-pointer" onClick={() => navigate(`/super-admin/orders/${o.id}`)}>
                    <TD className="font-mono text-xs font-medium text-brand-600">{o.orderNumber}</TD>
                    <TD>
                      <p className="text-ink-900">{o.customerName}</p>
                      <p className="text-xs text-ink-400">{o.customerPhone}</p>
                    </TD>
                    <TD className="font-semibold text-ink-900">{formatCurrency(o.total, 'PKR')}</TD>
                    <TD className="capitalize">{o.paymentMethod.replace('_', ' ')}</TD>
                    <TD><OrderStatusBadge status={o.status} /></TD>
                    <TD>{formatDate(o.placedAt)}</TD>
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
