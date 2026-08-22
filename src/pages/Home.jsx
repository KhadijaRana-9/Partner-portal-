import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, ShieldCheck, Users, Percent } from 'lucide-react'
import { productService } from '@/services/productService'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'

const FEATURES = [
  { icon: Truck, title: 'Nationwide delivery', description: 'We ship across Pakistan.' },
  { icon: ShieldCheck, title: 'Buy without an account', description: 'Guest checkout is always available.' },
  { icon: Users, title: '5-level affiliate program', description: 'Refer others and earn on every level.' },
  { icon: Percent, title: 'Level 1 pays 10%', description: 'Commission on every approved order.' },
]

function ProductCard({ product }) {
  const { addItem } = useCart()
  const { toast } = useToast()
  return (
    <Card className="overflow-hidden">
      <Link to={`/products/${product.slug}`}>
        <div className="aspect-square w-full overflow-hidden bg-ink-100">
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform hover:scale-105" />
        </div>
      </Link>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-ink-400">{product.categoryName}</p>
        <Link to={`/products/${product.slug}`}>
          <p className="mt-0.5 truncate text-sm font-semibold text-ink-900 hover:text-brand-600">{product.name}</p>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-sm font-bold text-ink-900">{formatCurrency(product.price, 'PKR')}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-ink-400 line-through">{formatCurrency(product.compareAtPrice, 'PKR')}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              addItem(product, 1)
              toast({ title: 'Added to cart', description: product.name })
            }}
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const [products, setProducts] = useState(null)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    productService.listProducts({ page: 1, pageSize: 8 }).then((r) => setProducts(r.items))
    productService.listCategories().then(setCategories)
  }, [])

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '26px 26px' }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-sm font-medium text-brand-400">Digitalsofts Marketplace</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl">
            Shop everyday essentials. Earn by sharing them.
          </h1>
          <p className="mt-4 max-w-xl text-navy-100">
            Browse clothing, mobile accessories, herbal products, watches and more — no account required. Or join as an
            affiliate and earn commission across a 5-level referral network.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products">
              <Button size="lg">
                Shop now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/registration">
              <Button size="lg" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                Become an affiliate
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-xl border border-ink-200 bg-surface p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">{f.title}</p>
                <p className="mt-0.5 text-xs text-ink-500">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <h2 className="font-display text-lg font-bold text-ink-900">Shop by category</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className="rounded-xl border border-ink-200 bg-surface px-4 py-5 text-center text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Featured products</h2>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products === null
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} className="h-64" />)
            : products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  )
}
