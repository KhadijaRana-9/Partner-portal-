import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Search, PackageX } from 'lucide-react'
import { productService } from '@/services/productService'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useDebouncedValue } from '@/lib/hooks'
import { formatCurrency, cn } from '@/lib/utils'

const PAGE_SIZE = 12

function ProductGridItem({ product, view }) {
  const { addItem } = useCart()
  const { toast } = useToast()

  function add(e) {
    e.preventDefault()
    addItem(product, 1)
    toast({ title: 'Added to cart', description: product.name })
  }

  if (view === 'list') {
    return (
      <Link to={`/products/${product.slug}`}>
        <Card className="flex items-center gap-4 p-3 hover:border-brand-300">
          <img src={product.imageUrl} alt={product.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-400">{product.categoryName}</p>
            <p className="truncate text-sm font-semibold text-ink-900">{product.name}</p>
            <p className="mt-1 font-display text-sm font-bold text-ink-900">{formatCurrency(product.price, 'PKR')}</p>
          </div>
          <Button size="sm" onClick={add}>Add to cart</Button>
        </Card>
      </Link>
    )
  }

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
          <span className="font-display text-sm font-bold text-ink-900">{formatCurrency(product.price, 'PKR')}</span>
          <Button size="sm" variant="secondary" onClick={add}>Add</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProductCatalog() {
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState(null)
  const [total, setTotal] = useState(0)
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState(params.get('q') || '')
  const debouncedSearch = useDebouncedValue(search, 300)
  const category = params.get('category') || ''
  const page = Number(params.get('page') || 1)

  useEffect(() => {
    productService.listCategories().then(setCategories)
  }, [])

  useEffect(() => {
    setProducts(null)
    productService.listProducts({ category: category || undefined, search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE }).then((r) => {
      setProducts(r.items)
      setTotal(r.total)
    })
  }, [category, debouncedSearch, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Product Catalog</h1>
          <p className="mt-1 text-sm text-ink-500">{total} products{category ? ` in ${categories.find((c) => c.slug === category)?.name || category}` : ''}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-surface p-1">
          <button onClick={() => setView('grid')} className={cn('rounded-md p-1.5', view === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-ink-400')} aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('list')} className={cn('rounded-md p-1.5', view === 'list' ? 'bg-brand-50 text-brand-700' : 'text-ink-400')} aria-label="List view">
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input icon={Search} placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); updateParam('q', e.target.value) }} />
        </div>
        <Select value={category} onChange={(e) => updateParam('category', e.target.value)} className="sm:w-56">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </Select>
      </div>

      <div className={cn('mt-6 grid gap-4', view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1')}>
        {products === null
          ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} className="h-64" />)
          : products.map((p) => <ProductGridItem key={p.id} product={p} view={view} />)}
      </div>

      {products?.length === 0 && (
        <EmptyState icon={PackageX} title="No products found" description="Try a different search term or category." className="mt-6" />
      )}

      {pageCount > 1 && (
        <div className="mt-6">
          <Pagination page={page} pageCount={pageCount} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => updateParam('page', String(p))} />
        </div>
      )}
    </div>
  )
}
