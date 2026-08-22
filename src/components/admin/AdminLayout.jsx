import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, LogOut, ShieldCheck } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { adminNavSections } from './adminNavConfig'

function NavItem({ item, onNavigate }) {
  const location = useLocation()
  const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-navy-800 text-white' : 'text-navy-200 hover:bg-navy-800/60 hover:text-white'
      )}
    >
      {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-500" />}
      <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand-400' : 'text-navy-300 group-hover:text-brand-300')} />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

function SidebarContent({ onNavigate }) {
  const { logout, affiliate } = useAuth()
  return (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-navy-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="block font-display text-sm font-bold tracking-tight text-white">Digitalsofts</span>
          <span className="block text-[11px] font-medium text-navy-300">Super Admin</span>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-3 py-4">
        {adminNavSections.map((section, i) => (
          <div key={i}>
            {section.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-400">{section.title}</p>}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.label} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-navy-800 p-3">
        <div className="rounded-lg bg-navy-800 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
              {initials(affiliate?.fullName || 'Admin')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{affiliate?.fullName}</p>
              <p className="truncate text-xs text-navy-300">{affiliate?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-navy-300 hover:bg-navy-700 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { affiliate, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-navy-950 bg-navy-900 md:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="animate-fade-in absolute inset-0 bg-ink-900/50" onClick={() => setMobileOpen(false)} />
          <div className="animate-slide-in-right absolute inset-y-0 left-0 w-72 bg-navy-900 shadow-panel">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-medium text-ink-500">Super Admin Console</p>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="hidden text-xs font-medium text-ink-500 hover:text-brand-600 sm:inline"
            >
              View storefront
            </button>
            <button onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label="Log out">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials(affiliate?.fullName || 'Admin')}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
