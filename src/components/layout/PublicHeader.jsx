import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ShoppingCart, Menu, X, User, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dropdown, { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { Input } from '@/components/ui/Input'
import { cn, initials } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/products' },
  { label: 'Categories', to: '/categories' },
]

export default function PublicHeader() {
  const { isAuthenticated, affiliate, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [mobileOpen, setMobileOpen] = useState(false)

  function submitSearch(e) {
    e.preventDefault()
    navigate(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : '/products')
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-display text-sm font-bold text-white">D</div>
          <span className="hidden font-display text-base font-bold tracking-tight text-ink-900 sm:inline">Digitalsofts</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900">
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-sm flex-1 md:block">
          <Input icon={Search} placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            to="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge variant="brand" className="absolute -right-1 -top-1 min-w-[1.1rem] justify-center px-1 py-0">
                {itemCount}
              </Badge>
            )}
          </Link>

          {isAuthenticated ? (
            <Dropdown
              trigger={
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  {initials(affiliate.fullName)}
                </button>
              }
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-ink-900">{affiliate.fullName}</p>
                <p className="truncate text-xs text-ink-500">{affiliate.email}</p>
              </div>
              <DropdownSeparator />
              <DropdownItem icon={LayoutDashboard} onClick={() => navigate('/dashboard')}>
                Dashboard
              </DropdownItem>
              <DropdownItem icon={User} onClick={() => navigate('/orders')}>
                My Orders
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem icon={LogOut} onClick={logout} className="text-danger-600">
                Log out
              </DropdownItem>
            </Dropdown>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login">
                <Button variant="secondary" size="sm">Sign in</Button>
              </Link>
              <Link to="/registration">
                <Button size="sm">Join as Affiliate</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-100 px-4 pb-4 pt-3 md:hidden">
          <form onSubmit={submitSearch} className="mb-3">
            <Input icon={Search} placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </form>
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={cn('rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100')}
              >
                {l.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="mt-2 flex gap-2 border-t border-ink-100 pt-3">
                <Link to="/login" className="flex-1">
                  <Button variant="secondary" className="w-full">Sign in</Button>
                </Link>
                <Link to="/registration" className="flex-1">
                  <Button className="w-full">Join as Affiliate</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
