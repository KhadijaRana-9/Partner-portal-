import { cn } from '@/lib/utils'

const VARIANTS = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
  outline: 'border border-ink-200 text-ink-600 bg-surface',
}

const DOT_COLORS = {
  neutral: 'bg-ink-400',
  brand: 'bg-brand-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  outline: 'bg-ink-400',
}

export default function Badge({ variant = 'neutral', dot = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[variant])} />}
      {children}
    </span>
  )
}

// Common status -> badge variant mapping used across the app.
export const STATUS_VARIANT = {
  New: 'info',
  Contacted: 'brand',
  Qualified: 'brand',
  Demo: 'warning',
  Proposal: 'warning',
  Negotiation: 'warning',
  Won: 'success',
  Lost: 'danger',
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Expired: 'neutral',
  Active: 'success',
  Trial: 'info',
  'At Risk': 'warning',
  Churned: 'neutral',
  Processing: 'info',
  Paid: 'success',
  Failed: 'danger',
  Open: 'info',
  'In Progress': 'warning',
  'Waiting for Customer': 'warning',
  Resolved: 'success',
  Closed: 'neutral',
  Completed: 'success',
  'Not Started': 'neutral',
  Earned: 'success',
  Available: 'neutral',
  Suspended: 'danger',
}

export function StatusBadge({ status, ...props }) {
  return (
    <Badge variant={STATUS_VARIANT[status] || 'neutral'} dot {...props}>
      {status}
    </Badge>
  )
}
