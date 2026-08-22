import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2, ArrowLeft, RotateCcw } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { orderService } from '@/services/orderService'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Label, Textarea, FieldError } from '@/components/ui/Input'
import OrderStatusBadge, { ORDER_STATUS_SEQUENCE, ORDER_STATUS_LABEL, ORDER_STATUS_OFF_PATH } from '@/components/orders/OrderStatusBadge'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'

export default function OrderDetail() {
  const { id } = useParams()
  const { affiliate } = useAuth()
  const { toast } = useToast()
  const [order, setOrder] = useState(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function refresh() {
    orderService.getOrderById(id).then(setOrder)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function submitReturn() {
    if (!reason.trim()) {
      setReasonError('Please tell us why you want to return this order.')
      return
    }
    setSubmitting(true)
    try {
      await orderService.requestReturn(id, reason.trim(), affiliate.id)
      toast({ title: 'Return requested', description: 'Our team will review your request shortly.' })
      setReturnOpen(false)
      setReason('')
      refresh()
    } catch (err) {
      setReasonError(err.message || 'Could not submit return request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!order) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const isOffPath = ORDER_STATUS_OFF_PATH.has(order.status)
  const currentIdx = ORDER_STATUS_SEQUENCE.indexOf(order.status)

  return (
    <div>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-600">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </Link>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={formatDateTime(order.placedAt)}
        actions={
          <div className="flex items-center gap-2">
            {order.status === 'delivered' && (
              <Button variant="secondary" size="sm" onClick={() => setReturnOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" />
                Request Return
              </Button>
            )}
            <OrderStatusBadge status={order.status} />
          </div>
        }
      />

      {order.status === 'return_requested' && (
        <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          Your return request is pending admin review. {order.returnReason && <span>Reason: {order.returnReason}</span>}
        </div>
      )}

      {!isOffPath && (
        <Card className="mb-6 p-5">
          <div className="flex items-center">
            {ORDER_STATUS_SEQUENCE.map((s, i) => (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold', i <= currentIdx ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400')}>
                    {i + 1}
                  </div>
                  <span className={cn('whitespace-nowrap text-[11px]', i <= currentIdx ? 'font-medium text-ink-900' : 'text-ink-400')}>{ORDER_STATUS_LABEL[s]}</span>
                </div>
                {i < ORDER_STATUS_SEQUENCE.length - 1 && <div className={cn('mx-1 h-0.5 flex-1', i < currentIdx ? 'bg-brand-600' : 'bg-ink-100')} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent className="space-y-3 p-0">
            <div className="divide-y divide-ink-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{item.productName}</p>
                    <p className="text-xs text-ink-500">{formatCurrency(item.unitPrice, 'PKR')} × {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-ink-900">{formatCurrency(item.lineTotal, 'PKR')}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-100 px-5 py-4">
              <p className="font-semibold text-ink-900">Total</p>
              <p className="font-display text-base font-bold text-ink-900">{formatCurrency(order.total, 'PKR')}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm text-ink-600">
              <p className="font-medium text-ink-900">{order.customerName}</p>
              <p>{order.customerPhone}</p>
              <p>{order.shippingAddress}, {order.shippingCity}</p>
              {order.shippingNotes && <p className="text-ink-500">{order.shippingNotes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-ink-600">
              <p className="capitalize">{order.paymentMethod.replace('_', ' ')}</p>
              {order.proofs?.length > 0 && (
                <img src={order.proofs[order.proofs.length - 1].imageUrl} alt="Payment proof" className="mt-2 max-h-40 rounded-lg border border-ink-200 object-cover" />
              )}
              {order.adminNote && <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">{order.adminNote}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Request a return" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">Tell us why you'd like to return this order. Our team will review your request.</p>
          <div>
            <Label htmlFor="return-reason">Reason</Label>
            <Textarea id="return-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong size, item arrived damaged…" />
            <FieldError>{reasonError}</FieldError>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button type="button" loading={submitting} onClick={submitReturn}>Submit request</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
