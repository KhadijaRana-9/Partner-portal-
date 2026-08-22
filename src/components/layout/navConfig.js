import { LayoutDashboard, Users, Wallet, Package, ShoppingBag, Settings } from 'lucide-react'

export const navSections = [
  { items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
  {
    title: 'Network',
    items: [{ label: 'My Referrals', to: '/referrals', icon: Users }],
  },
  {
    title: 'Finance',
    items: [{ label: 'Wallet', to: '/wallet', icon: Wallet }],
  },
  {
    title: 'Shopping',
    items: [
      { label: 'Product Catalog', to: '/products', icon: Package },
      { label: 'My Orders', to: '/orders', icon: ShoppingBag },
    ],
  },
  { items: [{ label: 'Settings', to: '/settings', icon: Settings }] },
]
