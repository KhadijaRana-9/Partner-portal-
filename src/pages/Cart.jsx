import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add products from the catalog to get started."
          action={<Link to="/products"><Button>Browse products</Button></Link>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink-900">Your Cart</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <Card key={item.productId} className="flex items-center gap-4 p-4">
              <img src={item.imageUrl} alt={item.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <Link to={`/products/${item.slug}`} className="truncate text-sm font-semibold text-ink-900 hover:text-brand-600">
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-ink-500">{formatCurrency(item.price, 'PKR')}</p>
              </div>
              <div className="flex items-center rounded-lg border border-ink-200">
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center text-ink-500 hover:bg-ink-50" aria-label="Decrease quantity">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold text-ink-900">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center text-ink-500 hover:bg-ink-50" aria-label="Increase quantity">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="w-24 shrink-0 text-right font-display text-sm font-bold text-ink-900">
                {formatCurrency(item.price * item.quantity, 'PKR')}
              </p>
              <button onClick={() => removeItem(item.productId)} className="shrink-0 rounded-lg p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600" aria-label="Remove item">
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>

        <Card className="h-fit p-5">
          <p className="font-display text-sm font-semibold text-ink-900">Order Summary</p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-ink-500">Subtotal</span>
            <span className="font-medium text-ink-900">{formatCurrency(subtotal, 'PKR')}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink-500">Shipping</span>
            <span className="font-medium text-ink-900">Free</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
            <span className="font-semibold text-ink-900">Total</span>
            <span className="font-display text-base font-bold text-ink-900">{formatCurrency(subtotal, 'PKR')}</span>
          </div>
          <Button size="lg" className="mt-5 w-full" onClick={() => navigate('/checkout')}>
            Checkout
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link to="/products" className="mt-3 block text-center text-xs font-medium text-ink-500 hover:text-brand-600">
            Continue shopping
          </Link>
        </Card>
      </div>
    </div>
  )
}
