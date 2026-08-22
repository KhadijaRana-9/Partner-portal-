import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { UIProvider } from '@/context/UIContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { CommandPaletteProvider } from '@/context/CommandPaletteContext'
import { CartProvider } from '@/context/CartContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminRoute from '@/components/AdminRoute'
import AppLayout from '@/components/layout/AppLayout'
import PublicLayout from '@/components/layout/PublicLayout'
import AdminLayout from '@/components/admin/AdminLayout'

import Login from '@/pages/Login'
import Registration from '@/pages/Registration'
import ForgotPassword from '@/pages/ForgotPassword'
import NotFound from '@/pages/NotFound'

import Home from '@/pages/Home'
import ProductCatalog from '@/pages/ProductCatalog'
import ProductDetails from '@/pages/ProductDetails'
import Categories from '@/pages/Categories'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import OrderConfirmation from '@/pages/OrderConfirmation'

import Dashboard from '@/pages/Dashboard'
import Referrals from '@/pages/Referrals'
import Wallet from '@/pages/Wallet'
import MyOrders from '@/pages/MyOrders'
import OrderDetail from '@/pages/OrderDetail'
import Settings from '@/pages/Settings'

import AdminLogin from '@/pages/admin/AdminLogin'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminAffiliates from '@/pages/admin/AdminAffiliates'
import AdminAffiliateDetail from '@/pages/admin/AdminAffiliateDetail'
import AdminProducts from '@/pages/admin/AdminProducts'
import AdminCategories from '@/pages/admin/AdminCategories'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminOrderDetail from '@/pages/admin/AdminOrderDetail'
import AdminPayments from '@/pages/admin/AdminPayments'
import AdminCommissions from '@/pages/admin/AdminCommissions'
import AdminWithdrawals from '@/pages/admin/AdminWithdrawals'
import AdminPartners from '@/pages/admin/AdminPartners'
import AdminReports from '@/pages/admin/AdminReports'
import AdminSettings from '@/pages/admin/AdminSettings'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <NotificationsProvider>
              <CartProvider>
                <UIProvider>
                  <CommandPaletteProvider>
                    <Routes>
                      {/* Public storefront — must work fully unauthenticated */}
                      <Route element={<PublicLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<ProductCatalog />} />
                        <Route path="/products/:slug" element={<ProductDetails />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
                      </Route>

                      {/* Affiliate auth */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/registration" element={<Registration />} />
                      <Route path="/signup" element={<Navigate to="/registration" replace />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />

                      {/* Authenticated affiliate portal */}
                      <Route
                        element={
                          <ProtectedRoute>
                            <AppLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/referrals" element={<Referrals />} />
                        <Route path="/wallet" element={<Wallet />} />
                        <Route path="/orders" element={<MyOrders />} />
                        <Route path="/orders/:id" element={<OrderDetail />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>

                      {/* Super Admin — separate auth flow, separate layout, role-gated.
                          Client-side gating is UX only; every admin read/write is
                          independently authorized server-side (see AdminRoute.jsx). */}
                      <Route path="/super-admin/login" element={<AdminLogin />} />
                      <Route
                        element={
                          <AdminRoute>
                            <AdminLayout />
                          </AdminRoute>
                        }
                      >
                        <Route path="/super-admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/super-admin/users" element={<AdminUsers />} />
                        <Route path="/super-admin/affiliates" element={<AdminAffiliates />} />
                        <Route path="/super-admin/affiliates/:id" element={<AdminAffiliateDetail />} />
                        <Route path="/super-admin/products" element={<AdminProducts />} />
                        <Route path="/super-admin/categories" element={<AdminCategories />} />
                        <Route path="/super-admin/orders" element={<AdminOrders />} />
                        <Route path="/super-admin/orders/:id" element={<AdminOrderDetail />} />
                        <Route path="/super-admin/payments" element={<AdminPayments />} />
                        <Route path="/super-admin/commissions" element={<AdminCommissions />} />
                        <Route path="/super-admin/withdrawals" element={<AdminWithdrawals />} />
                        <Route path="/super-admin/partners" element={<AdminPartners />} />
                        <Route path="/super-admin/reports" element={<AdminReports />} />
                        <Route path="/super-admin/settings" element={<AdminSettings />} />
                      </Route>

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </CommandPaletteProvider>
                </UIProvider>
              </CartProvider>
            </NotificationsProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
