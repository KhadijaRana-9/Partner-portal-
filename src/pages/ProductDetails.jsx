import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Minus, Plus, ShoppingCart, Zap, Loader2 } from 'lucide-react'
import { productService } from '@/services/productService'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

export default function ProductDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { toast } = useToast()
  const [product, setProduct] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    setProduct(null)
    setNotFound(false)
    setQty(1)
    setActiveImage(0)
    productService.getProductBySlug(slug).then((p) => {
      if (!p) setNotFound(true)
      else setProduct(p)
    })
  }, [slug])

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Product not found" description="This product may have been removed or is no longer available." action={<Link to="/products"><Button>Back to catalog</Button></Link>} />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const images = [product.imageUrl, ...(product.gallery || [])]
  const inStock = product.stockQuantity > 0

  function handleAdd() {
    addItem(product, qty)
    toast({ title: 'Added to cart', description: `${qty} × ${product.name}` })
  }

  function handleBuyNow() {
    addItem(product, qty)
    navigate('/cart')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <Link to="/" className="hover:text-brand-600">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/products" className="hover:text-brand-600">Products</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink-600">{product.name}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-xl border border-ink-200 bg-ink-100">
            <img src={images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === activeImage ? 'border-brand-500' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Badge variant="brand">{product.categoryName}</Badge>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">{product.name}</h1>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-ink-900">{formatCurrency(product.price, 'PKR')}</span>
            {product.compareAtPrice && <span className="text-sm text-ink-400 line-through">{formatCurrency(product.compareAtPrice, 'PKR')}</span>}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">{product.description}</p>

          <div className="mt-4">
            {inStock ? <Badge variant="success">In stock ({product.stockQuantity} available)</Badge> : <Badge variant="danger">Out of stock</Badge>}
          </div>

          {inStock && (
            <>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-ink-200">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center text-ink-500 hover:bg-ink-50" aria-label="Decrease quantity">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-ink-900">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                    className="flex h-10 w-10 items-center justify-center text-ink-500 hover:bg-ink-50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="secondary" className="flex-1" onClick={handleAdd}>
                  <ShoppingCart className="h-4 w-4" />
                  Add to cart
                </Button>
                <Button size="lg" className="flex-1" onClick={handleBuyNow}>
                  <Zap className="h-4 w-4" />
                  Buy now
                </Button>
              </div>
            </>
          )}

          {product.sku && <p className="mt-6 text-xs text-ink-400">SKU: {product.sku}</p>}
        </div>
      </div>
    </div>
  )
}
