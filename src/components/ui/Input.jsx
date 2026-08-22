import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef(({ className, icon: Icon, error, ...props }, ref) => {
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />}
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-lg border bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
          Icon && 'pl-9',
          error ? 'border-danger-400' : 'border-ink-200',
          className
        )}
        {...props}
      />
    </div>
  )
})
Input.displayName = 'Input'

export const Label = forwardRef(({ className, children, ...props }, ref) => (
  <label ref={ref} className={cn('mb-1.5 block text-sm font-medium text-ink-700', className)} {...props}>
    {children}
  </label>
))
Label.displayName = 'Label'

export const Textarea = forwardRef(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400',
      'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
      error ? 'border-danger-400' : 'border-ink-200',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1 text-xs text-danger-600">{children}</p>
}
