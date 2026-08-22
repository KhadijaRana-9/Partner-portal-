import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { orderService } from '@/services/orderService'
import { settingsService } from '@/services/settingsService'
import { Label, Input, Textarea, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { cn, formatCurrency } from '@/lib/utils'

const METHOD_LABELS = {
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  bank_transfer: 'Bank Transfer',
  crypto: 'Crypto (USDT)',
  cash: 'Cash on Delivery',
}

// Instructions come from settingsService (admin-configured, see
// /super-admin/settings) — never hardcoded here.
function buildPaymentMethods(paymentSettings) {
  return [
    { value: 'jazzcash', label: METHOD_LABELS.jazzcash, instructions: paymentSettings.jazzcashAccount },
    { value: 'easypaisa', label: METHOD_LABELS.easypaisa, instructions: paymentSettings.easypaisaAccount },
    { value: 'bank_transfer', label: METHOD_LABELS.bank_transfer, instructions: paymentSettings.bankDetails },
    { value: 'crypto', label: METHOD_LABELS.crypto, instructions: paymentSettings.cryptoDetails },
    { value: 'cash', label: METHOD_LABELS.cash, instructions: paymentSettings.cashInstructions },
  ]
}

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { affiliate } = useAuth()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState({ name: affiliate?.fullName || '', email: affiliate?.email || '', phone: affiliate?.phone || '' })
  const [shipping, setShipping] = useState({ address: '', city: affiliate?.city || '', notes: '' })
  const [method, setMethod] = useState('jazzcash')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState(null)

  useEffect(() => {
    settingsService.getPaymentSettings().then((s) => setPaymentMethods(buildPaymentMethods(s)))
  }, [])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Add products before checking out." action={<Link to="/products"><Button>Browse products</Button></Link>} />
      </div>
    )
  }

  if (!paymentMethods) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const selectedMethod = paymentMethods.find((m) => m.value === method)
  const requiresProof = method !== 'cash'

  function onFileChange(e) {
    const file = e.target.files?.[0]
    setProofFile(file || null)
    setProofPreview(file ? URL.createObjectURL(file) : null)
  }

  function validate() {
    const next = {}
    if (!customer.name.trim()) next.name = 'Name is required.'
    if (!customer.phone.trim()) next.phone = 'Phone is required.'
    if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) next.email = 'Enter a valid email address.'
    if (!shipping.address.trim()) next.address = 'Shipping address is required.'
    if (!shipping.city.trim()) next.city = 'City is required.'
    if (requiresProof && !proofFile) next.proof = 'Upload your payment proof to continue.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setLoading(true)
    try {
      const order = await orderService.createOrder({
        affiliateId: affiliate?.id || null,
        customer,
        shipping,
        items: items.map((i) => ({ productId: i.productId, productName: i.name, unitPrice: i.price, quantity: i.quantity })),
        paymentMethod: method,
        proofFile: requiresProof ? proofFile : null,
        proofNote: null,
      })
      clear()
      navigate(`/order-confirmation/${order.id}`)
    } catch (err) {
      setServerError(err.message || 'Something went wrong placing your order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Contact details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="c-name">Full name</Label>
                  <Input id="c-name" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} />
                  <FieldError>{errors.name}</FieldError>
                </div>
                <div>
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input id="c-phone" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="+92 3XX XXXXXXX" />
                  <FieldError>{errors.phone}</FieldError>
                </div>
              </div>
              <div>
                <Label htmlFor="c-email">Email (optional)</Label>
                <Input id="c-email" type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} />
                <FieldError>{errors.email}</FieldError>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Shipping address</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="s-address">Address</Label>
                <Textarea id="s-address" rows={2} value={shipping.address} onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))} />
                <FieldError>{errors.address}</FieldError>
              </div>
              <div>
                <Label htmlFor="s-city">City</Label>
                <Input id="s-city" value={shipping.city} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} />
                <FieldError>{errors.city}</FieldError>
              </div>
              <div>
                <Label htmlFor="s-notes">Delivery notes (optional)</Label>
                <Textarea id="s-notes" rows={2} value={shipping.notes} onChange={(e) => setShipping((s) => ({ ...s, notes: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment method</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {paymentMethods.map((m) => (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => { setMethod(m.value); setProofFile(null); setProofPreview(null) }}
                    className={cn(
                      'rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors',
                      method === m.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:bg-ink-50'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
                {selectedMethod.instructions}
              </div>

              {requiresProof && (
                <div>
                  <Label htmlFor="proof">Payment proof</Label>
                  <label
                    htmlFor="proof"
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center',
                      errors.proof ? 'border-danger-400' : 'border-ink-300 hover:border-brand-400'
                    )}
                  >
                    {proofPreview ? (
                      <img src={proofPreview} alt="Payment proof preview" className="h-32 rounded-md object-cover" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-ink-400" />
                        <span className="text-xs text-ink-500">Click to upload a screenshot or photo of your payment</span>
                      </>
                    )}
                  </label>
                  <input id="proof" type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  <FieldError>{errors.proof}</FieldError>
                </div>
              )}
            </CardContent>
          </Card>

          {serverError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}
        </div>

        <Card className="h-fit p-5">
          <p className="font-display text-sm font-semibold text-ink-900">Order Summary</p>
          <div className="mt-4 space-y-2">
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between text-xs text-ink-600">
                <span className="truncate pr-2">{i.name} × {i.quantity}</span>
                <span className="shrink-0 font-medium text-ink-900">{formatCurrency(i.price * i.quantity, 'PKR')}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
            <span className="font-semibold text-ink-900">Total</span>
            <span className="font-display text-base font-bold text-ink-900">{formatCurrency(subtotal, 'PKR')}</span>
          </div>
          <Button type="submit" size="lg" className="mt-5 w-full" loading={loading}>
            Place order
          </Button>
        </Card>
      </form>
    </div>
  )
}
