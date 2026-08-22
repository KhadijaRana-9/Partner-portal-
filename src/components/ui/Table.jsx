import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Table({ className, children }) {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table className={cn('w-full min-w-max border-collapse text-sm', className)}>{children}</table>
    </div>
  )
}

export function THead({ children }) {
  return <thead className="border-b border-ink-100 bg-ink-50/60">{children}</thead>
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>
}

export function TR({ className, children, ...props }) {
  return (
    <tr className={cn('transition-colors hover:bg-ink-50/70', className)} {...props}>
      {children}
    </tr>
  )
}

export function TH({ className, children, sortable, sortDirection, onSort, ...props }) {
  if (sortable) {
    return (
      <th
        className={cn('whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500', className)}
        {...props}
      >
        <button
          onClick={onSort}
          className="inline-flex items-center gap-1 hover:text-ink-800"
        >
          {children}
          {sortDirection === 'asc' && <ChevronUp className="h-3.5 w-3.5" />}
          {sortDirection === 'desc' && <ChevronDown className="h-3.5 w-3.5" />}
          {!sortDirection && <ChevronsUpDown className="h-3.5 w-3.5 text-ink-300" />}
        </button>
      </th>
    )
  }
  return (
    <th
      className={cn('whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500', className)}
      {...props}
    >
      {children}
    </th>
  )
}

export function TD({ className, children, ...props }) {
  return (
    <td className={cn('whitespace-nowrap px-4 py-3.5 text-sm text-ink-700', className)} {...props}>
      {children}
    </td>
  )
}
