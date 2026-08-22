import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, ArrowLeft, UserCog } from 'lucide-react'
import { adminOrderService } from '@/services/adminOrderService'
import { adminAffiliateService } from '@/services/adminAffiliateService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Label, Textarea, FieldError } from '@/components/ui/Input'
import OrderStatusBadge, { ORDER_STATUS_SEQUENCE, ORDER_STATUS_LABEL, ORDER_STATUS_OFF_PATH } from '@/components/orders/OrderStatusBadge'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'

const ACTIONS_BY_STATUS = {
  pending_payment: [{ label: 'Cancel Order', nextStatus: 'cancelled', variant: 'dangerOutline', requireNote: true }],
  payment_submitted: [
    { label: 'Approve Payment', nextStatus: 'payment_approved', variant: 'primary', requireNote: false },
    { label: 'Reject Payment', nextStatus: 'rejected', variant: 'dangerOutline', requireNote: true },
  ],
  payment_approved: [
    { label: 'Confirm Order', nextStatus: 'order_confirmed', variant: 'primary', requireNote: false },
    { label: 'Cancel Order', nextStatus: 'cancelled', variant: 'dangerOutline', requireNote: true },
  ],
  order_confirmed: [
    { label: 'Mark Processing', nextStatus: 'processing', variant: 'primary', requireNote: false },
    { label: 'Cancel Order', nextStatus: 'cancelled', variant: 'dangerOutline', requireNote: true },
  ],
  processing: [
    { label: 'Mark Delivered', nextStatus: 'delivered', variant: 'primary', requireNote: false },
    { label: 'Cancel Order', nextStatus: 'cancelled', variant: 'dangerOutline', requireNote: true },
  ],
  delivered: [
    { label: 'Mark Returned', nextStatus: 'returned', variant: 'outline', requireNote: true },
    { label: 'Mark Refunded', nextStatus: 'refunded', variant: 'outline', requireNote: true },
  ],
  return_requested: [
    { label: 'Approve Return', nextStatus: 'returned', variant: 'primary', requireNote: false },
    { label: 'Reject Return', nextStatus: 'delivered', variant: 'dangerOutline', requireNote: true },
  ],
}

export default function AdminOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [order, setOrder] = useState(null)
  const [affiliate, setAffiliate] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [processing, setProcessing] = useState(false)

  function refresh() {
    adminOrderService.getOrderById(id).then(setOrder)
  }

  useEffect(() => {
    setOrder(null)
    setAffiliate(null)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (order?.affiliateId) {
      adminAffiliateService.getAffiliateDetail(order.affiliateId).then((d) => setAffiliate(d?.affiliate ?? null))
    }
  }, [order?.affiliateId])

  function openAction(action) {
    setPendingAction(action)
    setNote('')
    setNoteError('')
  }

  async function confirmAction() {
    if (!pendingAction) return
    if (pendingAction.requireNote && !note.trim()) {
      setNoteError('A reason is required for this action.')
      return
    }
    setProcessing(true)
    try {
      await adminOrderService.setOrderStatus(id, pendingAction.nextStatus, note.trim() || undefined)
      toast({ title: 'Order updated', description: `Order is now ${ORDER_STATUS_LABEL[pendingAction.nextStatus] || pendingAction.nextStatus}.` })
      setPendingAction(null)
      refresh()
    } catch (err) {
      setNoteError(err.message || 'Could not update order.')
    } finally {
      setProcessing(false)
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
  const actions = ACTIONS_BY_STATUS[order.status] || []

  return (
    <div>
      <button onClick={() => navigate('/super-admin/orders')} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-600">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </button>
      <PageHeader title={`Order ${order.orderNumber}`} description={formatDateTime(order.placedAt)} actions={<OrderStatusBadge status={order.status} />} />

      {order.returnReason && (
        <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          Customer return reason: {order.returnReason}
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
            <CardHeader><CardTitle>Affiliate</CardTitle></CardHeader>
            <CardContent className="text-sm text-ink-600">
              {order.affiliateId ? (
                affiliate ? (
                  <Link to={`/super-admin/affiliates/${order.affiliateId}`} className="flex items-center gap-2 font-medium text-brand-600 hover:text-brand-700">
                    <UserCog className="h-4 w-4" />
                    {affiliate.fullName}
                  </Link>
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
                )
              ) : (
                <p className="text-ink-400">Guest checkout — no affiliate.</p>
              )}
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

      <Card className="mt-6">
        <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-ink-400">This order is in a terminal state — no further actions available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button key={a.nextStatus} variant={a.variant} onClick={() => openAction(a)}>
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={!!pendingAction} onClose={() => setPendingAction(null)} title={pendingAction?.label} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            {pendingAction?.requireNote
              ? 'A reason is required — it will be recorded on the order and shown to the affiliate.'
              : 'Optionally add a note for the record.'}
          </p>
          <div>
            <Label htmlFor="action-note">{pendingAction?.requireNote ? 'Reason' : 'Note (optional)'}</Label>
            <Textarea id="action-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Payment proof unclear, please resend." />
            <FieldError>{noteError}</FieldError>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button type="button" variant={pendingAction?.variant === 'dangerOutline' ? 'danger' : 'primary'} loading={processing} onClick={confirmAction}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
