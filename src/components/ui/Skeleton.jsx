import { cn } from '@/lib/utils'

export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-ink-100', className)} />
}

export function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="mb-3 flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className }) {
  return (
    <div className={cn('rounded-xl border border-ink-200 bg-surface p-5', className)}>
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}
