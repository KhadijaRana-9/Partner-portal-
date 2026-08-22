import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600 disabled:bg-brand-300',
  secondary:
    'bg-surface text-ink-700 border border-ink-200 shadow-sm hover:bg-ink-50 focus-visible:outline-brand-600 disabled:text-ink-300',
  outline:
    'bg-transparent text-brand-700 border border-brand-200 hover:bg-brand-50 focus-visible:outline-brand-600 disabled:text-brand-300',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-brand-600',
  danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700 focus-visible:outline-danger-600 disabled:bg-danger-300',
  dangerOutline:
    'bg-transparent text-danger-600 border border-danger-200 hover:bg-danger-50 focus-visible:outline-danger-600',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9',
}

const Button = forwardRef(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-semibold transition-colors duration-150',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          VARIANTS[variant],
          SIZES[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export default Button
