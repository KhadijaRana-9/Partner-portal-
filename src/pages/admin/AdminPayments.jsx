import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReceiptText, Check, X, UserCog, ImageOff } from 'lucide-react'
import { adminOrderService } from '@/services/adminOrderService'
import { adminAffiliateService } from '@/services/adminAffiliateService'
import { useToast } from '@/context/ToastContext'
import PageHeader from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Label, Textarea, FieldError } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function AdminPayments() {
  const { toast } = useToast()
  const [orders, setOrders] = useState(null)
  const [affiliateMap, setAffiliateMap] = useState({})
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [actioningId, setActioningId] = useState(null)

  function refresh() {
    setOrders(null)
    adminOrderService.listOrders({ status: 'payment_submitted', pageSize: 100 }).then(async (r) => {
      const full = await Promise.all(r.items.map((o) => adminOrderService.getOrderById(o.id)))
      setOrders(full)
    })
  }

  useEffect(() => {
    refresh()
    adminAffiliateService.listAffiliates({ pageSize: 500 }).then((r) => {
      const map = {}
      r.items.forEach((a) => {
        map[a.id] = a.fullName
      })
      setAffiliateMap(map)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function approve(order) {
    setActioningId(order.id)
    try {
      await adminOrderService.setOrderStatus(order.id, 'payment_approved')
      toast({ title: 'Payment approved', description: `Order ${order.orderNumber} moved to payment approved.` })
      refresh()
    } catch (err) {
      toast({ title: 'Could not approve payment', description: err.message, variant: 'error' })
    } finally {
      setActioningId(null)
    }
  }

  function openReject(order) {
    setRejectTarget(order)
    setRejectReason('')
    setRejectError('')
  }

  async function confirmReject() {
    if (!rejectReason.trim()) {
      setRejectError('A reason is required.')
      return
    }
    setActioningId(rejectTarget.id)
    try {
      await adminOrderService.setOrderStatus(rejectTarget.id, 'rejected', rejectReason.trim())
      toast({ title: 'Payment rejected', description: `Order ${rejectTarget.orderNumber} was rejected.` })
      setRejectTarget(null)
      refresh()
    } catch (err) {
      setRejectError(err.message || 'Could not reject payment.')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Payment Verification" description="Orders awaiting proof-of-payment review. Approving credits commission to the referring upline." />

      {orders === null ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton className="h-56" />
          <CardSkeleton className="h-56" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={ReceiptText} title="All caught up" description="No orders are currently awaiting payment verification." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {orders.map((o) => {
            const proof = o.proofs?.[o.proofs.length - 1]
            return (
              <Card key={o.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
                  <div>
                    <p className="font-mono text-xs font-semibold text-brand-600">{o.orderNumber}</p>
                    <p className="text-xs text-ink-400">{formatDateTime(o.placedAt)}</p>
                  </div>
                  <p className="font-display text-lg font-bold text-ink-900">{formatCurrency(o.total, 'PKR')}</p>
                </div>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 text-sm text-ink-600">
                    <div>
                      <p className="text-xs font-medium text-ink-400">Customer</p>
                      <p className="text-ink-900">{o.customerName}</p>
                      <p className="text-xs text-ink-400">{o.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink-400">Affiliate</p>
                      {o.affiliateId ? (
                        <Link to={`/super-admin/affiliates/${o.affiliateId}`} className="flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700">
                          <UserCog className="h-3.5 w-3.5" />
                          {affiliateMap[o.affiliateId] || 'Affiliate'}
                        </Link>
                      ) : (
                        <p className="text-ink-400">Guest checkout</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink-400">Payment method</p>
                      <p className="capitalize text-ink-900">{o.paymentMethod.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-ink-400">Payment proof</p>
                    {proof ? (
                      <a href={proof.imageUrl} target="_blank" rel="noreferrer">
                        <img src={proof.imageUrl} alt="Payment proof" className="h-32 w-full rounded-lg border border-ink-200 object-cover" />
                      </a>
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-ink-200 text-ink-300">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3.5">
                  <Button variant="dangerOutline" loading={actioningId === o.id} onClick={() => openReject(o)}>
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button loading={actioningId === o.id} onClick={() => approve(o)}>
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Reject payment — ${rejectTarget?.orderNumber}`} size="sm">
        <div className="space-y-4">
          <div>
            <Label htmlFor="reject-reason">Reason (shown to the customer/affiliate)</Label>
            <Textarea id="reject-reason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Payment amount doesn't match order total." />
            <FieldError>{rejectError}</FieldError>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" loading={actioningId === rejectTarget?.id} onClick={confirmReject}>Reject payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
