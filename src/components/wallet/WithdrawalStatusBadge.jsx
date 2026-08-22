import Badge from '@/components/ui/Badge'

const VARIANT = {
  pending: 'warning',
  approved: 'info',
  paid: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
}

export default function WithdrawalStatusBadge({ status, ...props }) {
  return (
    <Badge variant={VARIANT[status] || 'neutral'} dot {...props}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
