import { Link } from 'react-router-dom'
import { ShoppingBag, Percent, UserPlus, Wallet, Bell, Circle, ChevronRight } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'

const TYPE_META = {
  order: { icon: ShoppingBag, tone: 'text-brand-600 bg-brand-50' },
  commission: { icon: Percent, tone: 'text-success-600 bg-success-50' },
  referral: { icon: UserPlus, tone: 'text-info-600 bg-info-50' },
  withdrawal: { icon: Wallet, tone: 'text-success-600 bg-success-50' },
  system: { icon: Bell, tone: 'text-ink-500 bg-ink-100' },
}

export default function RecentActivity({ items, className }) {
  return (
    <ul className={cn('space-y-1', className)}>
      {items.map((item) => {
        const meta = TYPE_META[item.type] || { icon: Circle, tone: 'text-ink-500 bg-ink-100' }
        const Icon = meta.icon
        const content = (
          <>
            <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', meta.tone)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-700">{item.text}</p>
              <p className="mt-0.5 text-xs text-ink-400">{timeAgo(item.timestamp)}</p>
            </div>
            {item.to && <ChevronRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-ink-300" />}
          </>
        )
        return (
          <li key={item.id}>
            {item.to ? (
              <Link to={item.to} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-ink-50">
                {content}
              </Link>
            ) : (
              <div className="flex items-start gap-3 py-2.5">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
