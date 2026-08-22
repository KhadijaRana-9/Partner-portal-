import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn, uid } from '@/lib/utils'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const STYLES = {
  success: 'border-success-500/20 bg-surface text-ink-900',
  error: 'border-danger-500/20 bg-surface text-ink-900',
  info: 'border-info-500/20 bg-surface text-ink-900',
  warning: 'border-warning-500/20 bg-surface text-ink-900',
}

const ICON_COLORS = {
  success: 'text-success-600',
  error: 'text-danger-600',
  info: 'text-info-600',
  warning: 'text-warning-600',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'success', duration = 4000 }) => {
      const id = uid('toast')
      setToasts((prev) => [...prev, { id, title, description, variant }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] || Info
          return (
            <div
              key={t.id}
              className={cn(
                'animate-slide-up pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-panel',
                STYLES[t.variant]
              )}
              role="status"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_COLORS[t.variant])} />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-sm font-semibold text-ink-900">{t.title}</p>}
                {t.description && <p className="mt-0.5 text-sm text-ink-500">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
