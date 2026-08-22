import Badge from '@/components/ui/Badge'

// Order status uses its own map (not Badge's global STATUS_VARIANT) because
// the DB enum is snake_case and specific to the order lifecycle — see
// supabase/migrations/0002_mlm_platform.sql's `orders.status` check.
const VARIANT = {
  pending_payment: 'neutral',
  payment_submitted: 'warning',
  payment_approved: 'info',
  order_confirmed: 'brand',
  processing: 'info',
  delivered: 'success',
  return_requested: 'warning',
  rejected: 'danger',
  cancelled: 'neutral',
  returned: 'warning',
  refunded: 'danger',
}

export const ORDER_STATUS_LABEL = {
  pending_payment: 'Pending Payment',
  payment_submitted: 'Payment Submitted',
  payment_approved: 'Payment Approved',
  order_confirmed: 'Order Confirmed',
  processing: 'Processing',
  delivered: 'Delivered',
  return_requested: 'Return Requested',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
}

// Statuses that fall outside the linear happy-path stepper (used to decide
// whether to render ORDER_STATUS_SEQUENCE as a progress bar).
export const ORDER_STATUS_OFF_PATH = new Set(['return_requested', 'rejected', 'cancelled', 'returned', 'refunded'])

export const ORDER_STATUS_SEQUENCE = [
  'pending_payment', 'payment_submitted', 'payment_approved', 'order_confirmed', 'processing', 'delivered',
]

export default function OrderStatusBadge({ status, ...props }) {
  return (
    <Badge variant={VARIANT[status] || 'neutral'} dot {...props}>
      {ORDER_STATUS_LABEL[status] || status}
    </Badge>
  )
}
