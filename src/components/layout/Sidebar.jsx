import { NavLink, useLocation } from 'react-router-dom'
import { ChevronsLeft, X, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUI } from '@/context/UIContext'
import { useAuth } from '@/context/AuthContext'
import { navSections } from './navConfig'

function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 font-display text-sm font-bold text-white">
        D
      </div>
      {!collapsed && <span className="font-display text-base font-bold tracking-tight text-white">Digitalsofts</span>}
    </div>
  )
}

function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation()
  const matchPath = item.matchTo || item.to
  const isActive = location.pathname === matchPath.split('?')[0].split('#')[0]

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-navy-800 text-white' : 'text-navy-200 hover:bg-navy-800/60 hover:text-white',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-500" />}
      <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand-400' : 'text-navy-300 group-hover:text-brand-300')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

function SidebarContent({ collapsed, onNavigate }) {
  const { logout, affiliate } = useAuth()

  return (
    <div className="flex h-full flex-col bg-navy-900">
      <div className={cn('flex h-16 shrink-0 items-center border-b border-navy-800', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-3 py-4">
        {navSections.map((section, i) => (
          <div key={i}>
            {section.title && !collapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-navy-800 p-3', collapsed && 'px-2')}>
        {!collapsed ? (
          <div className="rounded-lg bg-navy-800 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                {affiliate.fullName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{affiliate.fullName}</p>
                <p className="truncate text-xs text-navy-300">{affiliate.referralCode}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-end">
              <button
                onClick={logout}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-300 hover:bg-navy-700 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={logout}
            className="flex w-full items-center justify-center rounded-lg py-2 text-navy-300 hover:bg-navy-800 hover:text-white"
            title="Logout"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUI()

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          'sticky top-0 relative hidden h-screen shrink-0 border-r border-navy-950 bg-navy-900 transition-[width] duration-200 md:block',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-[3.35rem] flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-surface text-ink-500 shadow-card hover:bg-ink-50"
          aria-label="Toggle sidebar"
        >
          <ChevronsLeft className={cn('h-3.5 w-3.5 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="animate-fade-in absolute inset-0 bg-ink-900/50" onClick={closeMobileSidebar} />
          <div className="animate-slide-in-right absolute inset-y-0 left-0 w-72 bg-navy-900 shadow-panel">
            <button
              onClick={closeMobileSidebar}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-800 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent collapsed={false} onNavigate={closeMobileSidebar} />
          </div>
        </div>
      )}
    </>
  )
}
