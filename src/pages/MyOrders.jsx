import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { orderService } from '@/services/orderService'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'
import Button from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MyOrders() {
  const { affiliate } = useAuth()
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    orderService.listMyOrders(affiliate.id).then(setOrders)
  }, [affiliate.id])

  return (
    <div>
      <PageHeader title="My Orders" description="Orders you've placed through your account." />
      <Card>
        {orders === null ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders yet" description="Products you buy will show up here." action={<Link to="/products"><Button>Browse products</Button></Link>} className="border-0" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Date</TH>
                <TH>Items</TH>
                <TH>Total</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id} className="cursor-pointer">
                  <TD>
                    <Link to={`/orders/${o.id}`} className="font-mono text-xs font-medium text-brand-600 hover:text-brand-700">{o.orderNumber}</Link>
                  </TD>
                  <TD>{formatDate(o.placedAt)}</TD>
                  <TD>{o.items.reduce((s, i) => s + i.quantity, 0)}</TD>
                  <TD className="font-semibold text-ink-900">{formatCurrency(o.total, 'PKR')}</TD>
                  <TD><OrderStatusBadge status={o.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
