import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productService } from '@/services/productService'
import { CardSkeleton } from '@/components/ui/Skeleton'

const CATEGORY_IMAGE_SEED = {
  clothing: 'cl1', 'mobile-accessories': 'ma1', 'herbal-products': 'hp1', watches: 'wt1', gents: 'gt1', ladies: 'ld1',
}

export default function Categories() {
  const [categories, setCategories] = useState(null)

  useEffect(() => {
    productService.listCategories().then(setCategories)
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink-900">Categories</h1>
      <p className="mt-1 text-sm text-ink-500">Browse the full catalog by category.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories === null
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} className="h-40" />)
          : categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className="group relative overflow-hidden rounded-xl border border-ink-200 bg-ink-900"
              >
                <img
                  src={`https://picsum.photos/seed/${CATEGORY_IMAGE_SEED[c.slug] || c.slug}/500/400`}
                  alt={c.name}
                  className="h-40 w-full object-cover opacity-70 transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink-900/80 via-transparent p-4">
                  <p className="font-display text-sm font-semibold text-white">{c.name}</p>
                </div>
              </Link>
            ))}
      </div>
    </div>
  )
}
