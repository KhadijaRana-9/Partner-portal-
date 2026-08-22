import { Link } from 'react-router-dom'

export default function PublicFooter() {
  return (
    <footer className="border-t border-ink-200 bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-display text-sm font-bold text-white">D</div>
              <span className="font-display text-base font-bold text-ink-900">Digitalsofts</span>
            </div>
            <p className="mt-3 text-sm text-ink-500">Shop directly, or join as an affiliate and earn across a 5-level referral network.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Shop</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link to="/products" className="hover:text-brand-600">All Products</Link></li>
              <li><Link to="/categories" className="hover:text-brand-600">Categories</Link></li>
              <li><Link to="/cart" className="hover:text-brand-600">Cart</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Affiliate</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link to="/registration" className="hover:text-brand-600">Join as Affiliate</Link></li>
              <li><Link to="/login" className="hover:text-brand-600">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Payments accepted</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>JazzCash</li>
              <li>Easypaisa</li>
              <li>Bank Transfer · Crypto · Cash</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-ink-100 pt-6 text-xs text-ink-400">© 2026 Digitalsofts. All rights reserved.</p>
      </div>
    </footer>
  )
}
