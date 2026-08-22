import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Package,
  LayoutDashboard,
  Users,
  Wallet,
  ShoppingBag,
  Settings as SettingsIcon,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import { useCommandPalette } from '@/context/CommandPaletteContext'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { productService } from '@/services/productService'

const PAGES = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'My Referrals', to: '/referrals', icon: Users },
  { label: 'Wallet', to: '/wallet', icon: Wallet },
  { label: 'Product Catalog', to: '/products', icon: Package },
  { label: 'My Orders', to: '/orders', icon: ShoppingBag },
  { label: 'Settings', to: '/settings', icon: SettingsIcon },
]

const groupHeadingClass =
  '[&_[cmdk-group-heading]]:block [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-400'

export default function CommandPalette() {
  const { open, setOpen } = useCommandPalette()
  const { theme, toggleTheme } = useTheme()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    let cancelled = false
    productService.listProducts({ pageSize: 100 }).then(({ items }) => {
      if (!cancelled) setProducts(items)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  function go(to) {
    navigate(to)
    setOpen(false)
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return null
    return { products: products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6) }
  }, [query, products])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      shouldFilter={false}
      contentClassName="fixed left-1/2 top-24 z-[100] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-panel animate-scale-in"
      overlayClassName="fixed inset-0 z-[100] bg-ink-900/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="flex items-center gap-3 border-b border-ink-100 px-4">
        <Search className="h-4 w-4 shrink-0 text-ink-400" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          autoFocus
          placeholder="Search products, or jump to a page…"
          className="h-14 w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <kbd className="hidden shrink-0 rounded border border-ink-200 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-[26rem] overflow-y-auto scrollbar-thin p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-ink-400">No results found.</Command.Empty>

        {!results && (
          <Command.Group heading="Pages" className={`mb-1 ${groupHeadingClass}`}>
            {PAGES.map((p) => (
              <Command.Item
                key={p.to}
                value={p.label}
                onSelect={() => go(p.to)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-700 aria-selected:bg-brand-50 aria-selected:text-brand-700"
              >
                <p.icon className="h-4 w-4 text-ink-400" />
                {p.label}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {results && results.products.length > 0 && (
          <Command.Group heading="Products" className={`mb-1 ${groupHeadingClass}`}>
            {results.products.map((p) => (
              <Command.Item
                key={p.id}
                value={`prod-${p.id}`}
                onSelect={() => go(`/products/${p.slug}`)}
                className="flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-700 aria-selected:bg-brand-50 aria-selected:text-brand-700"
              >
                <span className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-ink-400" />
                  {p.name}
                </span>
                <span className="text-xs text-ink-400">{p.categoryName}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {!results && (
          <Command.Group heading="Actions" className={`mb-1 ${groupHeadingClass}`}>
            <Command.Item
              value="toggle theme dark light"
              onSelect={() => {
                toggleTheme()
                setOpen(false)
              }}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-700 aria-selected:bg-brand-50 aria-selected:text-brand-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-ink-400" /> : <Moon className="h-4 w-4 text-ink-400" />}
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </Command.Item>
            <Command.Item
              value="log out sign out"
              onSelect={() => {
                setOpen(false)
                logout()
              }}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-danger-600 aria-selected:bg-danger-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Command.Item>
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}
