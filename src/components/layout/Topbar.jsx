import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, User, Settings as SettingsIcon, LogOut, CheckCheck, Sun, Moon } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationsContext'
import { useTheme } from '@/context/ThemeContext'
import { useCommandPalette } from '@/context/CommandPaletteContext'
import { timeAgo, cn } from '@/lib/utils'
import Dropdown, { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'

const TYPE_DOT = {
  order: 'bg-brand-500',
  commission: 'bg-success-500',
  referral: 'bg-info-500',
  withdrawal: 'bg-success-500',
  system: 'bg-ink-400',
}

export default function Topbar() {
  const { openMobileSidebar } = useUI()
  const { affiliate, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { isDark, toggleTheme } = useTheme()
  const { setOpen: setPaletteOpen } = useCommandPalette()
  const navigate = useNavigate()
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={openMobileSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/60 px-3 text-sm text-ink-400 hover:border-ink-300 hover:bg-ink-50 sm:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search products or jump to a page…</span>
        <kbd className="rounded border border-ink-200 bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 sm:hidden"
        aria-label="Search"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <Dropdown
          trigger={
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-danger-500 ring-2 ring-surface" />
              )}
            </button>
          }
          className="w-80 p-0"
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-ink-50 px-4 py-3 text-left last:border-0 hover:bg-ink-50',
                    !n.read && 'bg-brand-50/40'
                  )}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TYPE_DOT[n.type] || 'bg-ink-300')} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', n.read ? 'text-ink-600' : 'font-medium text-ink-900')}>{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{n.message}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{timeAgo(n.timestamp)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                </button>
              ))
            )}
          </div>
        </Dropdown>

        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-ink-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {affiliate.fullName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')}
              </div>
              <span className="hidden text-sm font-medium text-ink-700 lg:inline">{affiliate.fullName}</span>
            </button>
          }
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-ink-900">{affiliate.fullName}</p>
            <p className="truncate text-xs text-ink-500">{affiliate.email}</p>
          </div>
          <DropdownSeparator />
          <DropdownItem icon={User} onClick={() => navigate('/settings')}>
            Profile
          </DropdownItem>
          <DropdownItem icon={SettingsIcon} onClick={() => navigate('/settings')}>
            Settings
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={LogOut} onClick={logout} className="text-danger-600">
            Log out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  )
}
