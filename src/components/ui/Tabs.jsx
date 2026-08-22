import { cn } from '@/lib/utils'

export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto scrollbar-thin border-b border-ink-200', className)}>
      {tabs.map((tab) => {
        const isActive = tab.value === value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'
            )}
          >
            <span className="flex items-center gap-2">
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    isActive ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        )
      })}
    </div>
  )
}
