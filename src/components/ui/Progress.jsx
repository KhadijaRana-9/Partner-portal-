import { cn } from '@/lib/utils'

export default function Progress({ value = 0, className, barClassName, color = 'bg-brand-600', size = 'md' }) {
  const clamped = Math.max(0, Math.min(100, value))
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' }
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink-100', heights[size], className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', color, barClassName)}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
