import {
  LayoutDashboard,
  Users,
  UserCog,
  Package,
  Tags,
  ShoppingBag,
  ReceiptText,
  Percent,
  Wallet,
  Landmark,
  BarChart3,
  Settings,
} from 'lucide-react'

export const adminNavSections = [
  { items: [{ label: 'Dashboard', to: '/super-admin/dashboard', icon: LayoutDashboard }] },
  {
    title: 'People',
    items: [
      { label: 'Users', to: '/super-admin/users', icon: Users },
      { label: 'Affiliates', to: '/super-admin/affiliates', icon: UserCog },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', to: '/super-admin/products', icon: Package },
      { label: 'Categories', to: '/super-admin/categories', icon: Tags },
    ],
  },
  {
    title: 'Orders & Payments',
    items: [
      { label: 'Orders', to: '/super-admin/orders', icon: ShoppingBag },
      { label: 'Payment Verification', to: '/super-admin/payments', icon: ReceiptText },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Commissions', to: '/super-admin/commissions', icon: Percent },
      { label: 'Withdrawals', to: '/super-admin/withdrawals', icon: Wallet },
      { label: 'Partner Investments', to: '/super-admin/partners', icon: Landmark },
    ],
  },
  {
    title: 'Insights',
    items: [{ label: 'Reports', to: '/super-admin/reports', icon: BarChart3 }],
  },
  { items: [{ label: 'Settings', to: '/super-admin/settings', icon: Settings }] },
]
