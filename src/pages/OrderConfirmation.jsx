import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { orderService } from '@/services/orderService'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    orderService.getOrderById(orderId).then(setOrder)
  }, [orderId])

  if (!order) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">Order placed</h1>
        <p className="mt-1.5 text-sm text-ink-500">Thank you — your order {order.orderNumber} has been submitted and is being reviewed.</p>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Order number</p>
            <p className="font-mono text-sm font-semibold text-ink-900">{order.orderNumber}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Status</p>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Placed</p>
            <p className="text-sm text-ink-900">{formatDateTime(order.placedAt)}</p>
          </div>
          <div className="border-t border-ink-100 pt-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1 text-sm">
                <span className="text-ink-600">{item.productName} × {item.quantity}</span>
                <span className="font-medium text-ink-900">{formatCurrency(item.lineTotal, 'PKR')}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-ink-100 pt-3">
            <p className="font-semibold text-ink-900">Total</p>
            <p className="font-display text-base font-bold text-ink-900">{formatCurrency(order.total, 'PKR')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center gap-3">
        <Link to="/products"><Button variant="secondary">Continue shopping</Button></Link>
        {order.affiliateId && <Link to="/orders"><Button>View my orders</Button></Link>}
      </div>
    </div>
  )
}
