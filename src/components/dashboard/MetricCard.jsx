import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/lib/useCountUp'

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  info: 'bg-info-50 text-info-600',
  ink: 'bg-ink-100 text-ink-600',
}

export default function MetricCard({
  label,
  value,
  numericValue,
  formatValue,
  icon: Icon,
  trend,
  trendLabel,
  tone = 'brand',
  className,
}) {
  const isPositive = trend !== undefined && trend >= 0
  const animated = useCountUp(numericValue ?? 0)
  const displayValue = numericValue !== undefined ? (formatValue ? formatValue(animated) : Math.round(animated)) : value

  return (
    <div className={cn('rounded-xl border border-ink-200 bg-surface p-5 shadow-card transition-shadow hover:shadow-panel', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        {Icon && (
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink-900">{displayValue}</p>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium">
          <span className={cn('flex items-center gap-0.5', isPositive ? 'text-success-600' : 'text-danger-600')}>
            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-ink-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}
