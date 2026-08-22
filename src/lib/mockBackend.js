// Single in-memory "database" + business logic used by every mock service
// when Supabase isn't connected (see isSupabaseConfigured in lib/supabase.js).
// This mirrors the real Postgres schema/functions in
// supabase/migrations/0002_mlm_platform.sql 1:1 (same entities, same
// commission-distribution and withdrawal-idempotency rules) so demo mode is
// a genuine working system, not a UI shell with fake success messages. It is
// intentionally the ONLY place that touches mock state — every mock service
// is a thin wrapper around the functions exported here, so the commission
// engine, order lifecycle and wallet ledger stay consistent across every
// page that reads or mutates them.
//
// This file is not imported by any real (Supabase-backed) code path.

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value))
}

let seq = 1
function mkId(prefix) {
  return `${prefix}_${String(seq++).padStart(4, '0')}`
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString()
}

const DAY = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const affiliates = []
const products = []
const categories = []
const orders = []
const commissions = []
const wallets = new Map() // affiliateId -> wallet
const withdrawals = []
const notifications = []

const commissionLevels = [
  { level: 1, percentage: 10 },
  { level: 2, percentage: 5 },
  { level: 3, percentage: 3 },
  { level: 4, percentage: 2 },
  { level: 5, percentage: 1 },
]

const platformSettings = {
  minWithdrawal: 1000,
  maxWithdrawal: null,
  withdrawalFeePercentage: 5,
  // Admin-configurable payment account details shown at checkout — never
  // hardcoded into a page component (see productService/orderService callers).
  jazzcashAccount: 'JazzCash: 0300-1234567 (Digitalsofts)',
  easypaisaAccount: 'Easypaisa: 0300-7654321 (Digitalsofts)',
  bankDetails: 'HBL — Account 1234-5678901-2 — Digitalsofts Pvt Ltd',
  cryptoDetails: 'USDT (TRC20): TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  cashInstructions: 'Pay in cash when your order is delivered. Your order will be reviewed and confirmed by our team before dispatch.',
}

const partnerSettings = {
  enabled: false,
  minInvestment: 0,
  maxInvestment: null,
  // 'manual' = admin posts each profit entry by hand (the safe default — no
  // assumed rate). 'fixed_percentage' = admin sets a rate below and can run
  // adminRunPartnerProfitCycle() to auto-post that period's profit.
  profitCalculationType: 'manual',
  profitRatePercentage: 0,
  profitFrequency: 'weekly',
  allowPrincipalWithdrawal: true,
  allowProfitOnlyWithdrawal: true,
  withdrawalFeePercentage: 0,
}

const partnerInvestments = []
const partnerProfitEntries = []
const partnerWithdrawals = []

function ensureWallet(affiliateId) {
  if (!wallets.has(affiliateId)) {
    wallets.set(affiliateId, {
      affiliateId,
      availableBalance: 0,
      lifetimeEarned: 0,
      lifetimeWithdrawn: 0,
      updatedAt: nowIso(),
    })
  }
  return wallets.get(affiliateId)
}

// ---------------------------------------------------------------------------
// Seed — categories & products (mirrors 0002_mlm_platform.sql exactly)
// ---------------------------------------------------------------------------

const CATEGORY_SEED = [
  { name: 'Clothing', slug: 'clothing' },
  { name: 'Mobile Accessories', slug: 'mobile-accessories' },
  { name: 'Herbal Products', slug: 'herbal-products' },
  { name: 'Watches', slug: 'watches' },
  { name: 'Gents', slug: 'gents' },
  { name: 'Ladies', slug: 'ladies' },
]
CATEGORY_SEED.forEach((c, i) => categories.push({ id: mkId('cat'), name: c.name, slug: c.slug, sortOrder: i + 1 }))

function categoryBySlug(slug) {
  return categories.find((c) => c.slug === slug)
}

const PRODUCT_SEED = [
  ['clothing', 'Cotton Casual Shirt', 'cotton-casual-shirt', 'Breathable cotton shirt for everyday wear.', 2490, 2990, 'cl1', 120, 'CL-001'],
  ['clothing', 'Slim Fit Jeans', 'slim-fit-jeans', 'Stretch-denim slim fit jeans.', 3290, null, 'cl2', 95, 'CL-002'],
  ['clothing', 'Printed Kurta', 'printed-kurta', 'Lightweight printed cotton kurta.', 1990, 2390, 'cl3', 140, 'CL-003'],
  ['mobile-accessories', 'Fast-Charge Power Bank 20000mAh', 'power-bank-20000', 'Dual USB-C fast charging power bank.', 3990, null, 'ma1', 80, 'MA-001'],
  ['mobile-accessories', 'Wireless Earbuds Pro', 'wireless-earbuds-pro', 'Bluetooth 5.3 earbuds with charging case.', 4490, 5490, 'ma2', 60, 'MA-002'],
  ['mobile-accessories', 'Tempered Glass Screen Protector', 'tempered-glass-protector', '9H hardness tempered glass, universal fit.', 490, null, 'ma3', 300, 'MA-003'],
  ['herbal-products', 'Herbal Immunity Booster', 'herbal-immunity-booster', 'Natural herbal supplement for daily immunity.', 1590, null, 'hp1', 200, 'HP-001'],
  ['herbal-products', 'Herbal Hair Oil', 'herbal-hair-oil', 'Cold-pressed herbal oil blend for hair growth.', 990, 1290, 'hp2', 180, 'HP-002'],
  ['herbal-products', 'Herbal Green Tea', 'herbal-green-tea', 'Antioxidant-rich herbal green tea, 100 bags.', 690, null, 'hp3', 250, 'HP-003'],
  ['watches', 'Classic Analog Watch', 'classic-analog-watch', 'Stainless steel analog watch with leather strap.', 4990, 5990, 'wt1', 60, 'WT-001'],
  ['watches', 'Digital Sports Watch', 'digital-sports-watch', 'Water-resistant digital sports watch.', 2990, null, 'wt2', 70, 'WT-002'],
  ['gents', 'Gents Leather Wallet', 'gents-leather-wallet', 'Genuine leather bifold wallet.', 1990, null, 'gt1', 150, 'GT-001'],
  ['gents', 'Gents Formal Belt', 'gents-formal-belt', 'Genuine leather formal belt with metal buckle.', 1490, 1790, 'gt2', 130, 'GT-002'],
  ['ladies', 'Ladies Embroidered Handbag', 'ladies-embroidered-handbag', 'Hand-embroidered everyday handbag.', 3490, 3990, 'ld1', 90, 'LD-001'],
  ['ladies', 'Ladies Stone Earrings', 'ladies-stone-earrings', 'Statement earrings with stone accents.', 890, null, 'ld2', 160, 'LD-002'],
]

PRODUCT_SEED.forEach(([catSlug, name, slug, description, price, compareAtPrice, imgSeed, stock, sku]) => {
  const category = categoryBySlug(catSlug)
  products.push({
    id: mkId('prod'),
    categoryId: category.id,
    name,
    slug,
    description,
    price,
    compareAtPrice,
    imageUrl: `https://picsum.photos/seed/${imgSeed}/600/600`,
    gallery: [`https://picsum.photos/seed/${imgSeed}/900/900`, `https://picsum.photos/seed/${imgSeed}b/900/900`],
    stockQuantity: stock,
    sku,
    status: 'approved',
    isActive: true,
    createdAt: nowIso(-60 * DAY),
    updatedAt: nowIso(-60 * DAY),
  })
})

// ---------------------------------------------------------------------------
// Seed — affiliates, referral tree, orders, commissions, wallet, withdrawal
// ---------------------------------------------------------------------------

export const seededCredentials = {
  admin: { email: 'admin@digitalsofts.local', password: 'Admin@12345' },
  affiliate: { email: 'affiliate@digitalsofts.local', password: 'Affiliate@12345' },
}

const NAME_POOL = [
  'Ahmed Raza', 'Sana Malik', 'Bilal Farooq', 'Fatima Sheikh', 'Nida Yousaf', 'Hassan Iqbal',
  'Ayesha Khan', 'Junaid Malik', 'Rabia Anwar', 'Usman Tariq', 'Omer Farooq', 'Mariam Chaudhry',
  'Zara Baig', 'Kamran Aslam', 'Hira Nasir', 'Faisal Butt', 'Sadia Rehman', 'Waqas Ahmed',
  'Mehwish Ali', 'Tariq Javed', 'Amna Siddiqui', 'Adeel Khan', 'Saba Nawaz', 'Imran Sheikh',
]
let nameIdx = 0
function nextName() {
  return NAME_POOL[nameIdx++ % NAME_POOL.length]
}

function makeAffiliate({ fullName, email, phone, city, password, referredBy, role = 'affiliate', code }) {
  const affiliate = {
    id: mkId('aff'),
    fullName,
    email,
    phone,
    city,
    avatar: null,
    referralCode: code || `DS${String(seq).padStart(6, '0')}`,
    referredBy: referredBy || null,
    role,
    status: 'active',
    password,
    createdAt: nowIso(-45 * DAY),
  }
  affiliates.push(affiliate)
  ensureWallet(affiliate.id)
  return affiliate
}

const admin = makeAffiliate({
  fullName: 'Digitalsofts Admin',
  email: seededCredentials.admin.email,
  phone: '+92 300 0000000',
  city: 'Lahore',
  password: seededCredentials.admin.password,
  role: 'admin',
  code: 'DSADMIN01',
})

const root = makeAffiliate({
  fullName: 'Hamza Sheikh',
  email: seededCredentials.affiliate.email,
  phone: '+92 300 1234567',
  city: 'Lahore',
  password: seededCredentials.affiliate.password,
  code: 'DSROOT001',
})

export const currentAffiliateId = root.id

// Build a realistic 5-level downline under `root`: 3 direct referrals, each
// with 2 of their own, thinning out toward level 5 — enough for level-wise
// stats and a network view without a huge fixture.
const CITY_POOL = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Multan', 'Rawalpindi']
let phoneSeq = 1000
function buildDownline(parentId, level, spread) {
  if (level > 5) return
  const count = spread[level - 1] ?? 0
  for (let i = 0; i < count; i++) {
    const name = nextName()
    const child = makeAffiliate({
      fullName: name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}${phoneSeq}@example.pk`,
      phone: `+92 3${String(phoneSeq++).padStart(9, '0')}`,
      city: CITY_POOL[phoneSeq % CITY_POOL.length],
      password: 'Demo@12345',
      referredBy: parentId,
    })
    buildDownline(child.id, level + 1, spread)
  }
}
// level 1: 3, level 2: 2 each, level 3: 1-2 each, level 4: 1 for half, level 5: thin
buildDownline(root.id, 1, [3, 2, 1, 1, 1])

// ---------------------------------------------------------------------------
// Commission engine (mirrors distribute_commissions / reverse_commissions)
// ---------------------------------------------------------------------------

function distributeCommissions(orderId) {
  const order = orders.find((o) => o.id === orderId)
  if (!order || !order.affiliateId) return
  if (commissions.some((c) => c.orderId === orderId)) return // idempotency guard

  let uplineId = affiliates.find((a) => a.id === order.affiliateId)?.referredBy
  let level = 1
  while (uplineId && level <= 5) {
    const cfg = commissionLevels.find((l) => l.level === level)
    const amount = Math.round(order.subtotal * (cfg.percentage / 100) * 100) / 100

    commissions.push({
      id: mkId('comm'),
      affiliateId: uplineId,
      orderId: order.id,
      sourceAffiliateId: order.affiliateId,
      level,
      commissionPercentage: cfg.percentage,
      orderAmount: order.subtotal,
      commissionAmount: amount,
      status: 'approved',
      createdAt: nowIso(),
    })

    const wallet = ensureWallet(uplineId)
    wallet.availableBalance = Math.round((wallet.availableBalance + amount) * 100) / 100
    wallet.lifetimeEarned = Math.round((wallet.lifetimeEarned + amount) * 100) / 100
    wallet.updatedAt = nowIso()

    pushNotification(uplineId, {
      type: 'commission',
      title: 'Commission earned',
      message: `You earned PKR ${amount.toLocaleString('en-US')} (Level ${level}) from an approved order.`,
    })

    uplineId = affiliates.find((a) => a.id === uplineId)?.referredBy
    level += 1
  }
}

function reverseCommissions(orderId) {
  commissions
    .filter((c) => c.orderId === orderId && c.status === 'approved')
    .forEach((c) => {
      c.status = 'reversed'
      const wallet = ensureWallet(c.affiliateId)
      wallet.availableBalance = Math.max(0, Math.round((wallet.availableBalance - c.commissionAmount) * 100) / 100)
      wallet.updatedAt = nowIso()
    })
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function pushNotification(affiliateId, { type, title, message }) {
  const n = { id: mkId('ntf'), affiliateId, type, title, message, read: false, timestamp: nowIso() }
  notifications.unshift(n)
  return clone(n)
}

export function listNotifications(affiliateId) {
  return clone(notifications.filter((n) => n.affiliateId === affiliateId))
}

export function markNotificationRead(affiliateId, id) {
  const n = notifications.find((x) => x.id === id && x.affiliateId === affiliateId)
  if (n) n.read = true
}

export function markAllNotificationsRead(affiliateId) {
  notifications.filter((n) => n.affiliateId === affiliateId).forEach((n) => (n.read = true))
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export function findAffiliateByEmailOrPhone(identifier) {
  const id = String(identifier || '').trim().toLowerCase()
  const a = affiliates.find((x) => x.email.toLowerCase() === id || x.phone === identifier)
  return a ? clone(publicAffiliate(a)) : null
}

export function verifyPassword(affiliateId, password) {
  const a = affiliates.find((x) => x.id === affiliateId)
  return !!a && a.password === password
}

export function getAffiliateById(affiliateId) {
  const a = affiliates.find((x) => x.id === affiliateId)
  return a ? clone(publicAffiliate(a)) : null
}

function publicAffiliate(a) {
  const { password: _password, ...rest } = a
  return rest
}

export function validateReferralCode(code) {
  const a = affiliates.find((x) => x.referralCode === code)
  return a ? clone(publicAffiliate(a)) : null
}

export function signUpAffiliate({ fullName, email, phone, city, password, referralCode }) {
  if (affiliates.some((a) => a.email.toLowerCase() === String(email).toLowerCase())) {
    throw new Error('An account with this email already exists.')
  }
  // Enforced server-side (here, in the shared mock "backend"), not just by
  // the UI not showing a submit button — mirrors handle_new_user() staying
  // gated behind verify_otp() in the real schema's intended flow.
  if (!isOtpVerified(email, 'registration')) {
    throw new Error('Email verification is required before an account can be created.')
  }
  if (!isOtpVerified(phone, 'registration')) {
    throw new Error('Phone verification is required before an account can be created.')
  }
  let referredBy = null
  if (referralCode) {
    const upline = affiliates.find((a) => a.referralCode === referralCode)
    if (!upline) throw new Error('That referral code is invalid.')
    referredBy = upline.id
  }
  const affiliate = makeAffiliate({ fullName, email, phone, city, password, referredBy })
  pushNotification(affiliate.id, {
    type: 'system',
    title: 'Welcome to Digitalsofts',
    message: 'Your affiliate account is ready. Share your referral link to start earning.',
  })
  if (referredBy) {
    pushNotification(referredBy, {
      type: 'referral',
      title: 'New referral',
      message: `${fullName} joined using your referral link.`,
    })
  }
  return clone(publicAffiliate(affiliate))
}

// ---------------------------------------------------------------------------
// OTP verification (email + phone) — mirrors request_otp/verify_otp in
// supabase/migrations/0003_otp_verification.sql: server-side (here,
// module-private) state, expiry, attempt-limiting, resend cooldown,
// single-use. This is a genuine verification mechanism, not a UI-only
// illusion — it just has no real SMS/email carrier behind it (see
// src/services/otpService.js and supabase/functions/send-otp for exactly
// what a production deployment still needs to wire up).
// ---------------------------------------------------------------------------

const otpStore = new Map() // `${identifier}:${purpose}` -> record
const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 30 * 1000
const OTP_MAX_ATTEMPTS = 5

function otpKey(identifier, purpose) {
  return `${identifier}:${purpose}`
}

// Returns { expiresAt, resendAfterSeconds, devCode }. `devCode` is the raw
// 6-digit code — returned ONLY because no real provider is configured, so
// the UI can display it behind a clearly-labeled "DEV MODE" banner. A real
// provider integration (see supabase/functions/send-otp) would send this to
// the user instead and never return it to the caller.
export function requestOtp(identifier, channel, purpose) {
  const key = otpKey(identifier, purpose)
  const existing = otpStore.get(key)
  const now = Date.now()
  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    const waitMs = OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)
    throw new Error(`Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`)
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const record = {
    identifier,
    channel,
    purpose,
    code,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt: now + OTP_TTL_MS,
    lastSentAt: now,
    verified: false,
  }
  otpStore.set(key, record)

  return { expiresAt: new Date(record.expiresAt).toISOString(), resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000, devCode: code }
}

// Returns { success, error, attemptsRemaining }.
export function verifyOtp(identifier, purpose, code) {
  const key = otpKey(identifier, purpose)
  const record = otpStore.get(key)
  if (!record) return { success: false, error: 'No verification code was requested for this identifier.' }
  if (record.verified) return { success: false, error: 'This code has already been used.' }
  if (Date.now() > record.expiresAt) return { success: false, error: 'This code has expired. Request a new one.' }
  if (record.attempts >= record.maxAttempts) {
    return { success: false, error: 'Too many incorrect attempts. Request a new code.' }
  }

  if (record.code !== String(code).trim()) {
    record.attempts += 1
    return { success: false, error: 'Incorrect code.', attemptsRemaining: record.maxAttempts - record.attempts }
  }

  record.verified = true
  return { success: true }
}

export function isOtpVerified(identifier, purpose) {
  const record = otpStore.get(otpKey(identifier, purpose))
  return !!record?.verified
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

function decorateProduct(p) {
  const category = categories.find((c) => c.id === p.categoryId)
  return { ...p, categoryName: category?.name ?? null, categorySlug: category?.slug ?? null }
}

export function listCategories() {
  return clone(categories.slice().sort((a, b) => a.sortOrder - b.sortOrder))
}

export function listProducts({ category, search, page = 1, pageSize = 12, includeUnapproved = false } = {}) {
  let items = products.filter((p) => includeUnapproved || (p.status === 'approved' && p.isActive))
  if (category) items = items.filter((p) => p.categorySlug === category || categories.find((c) => c.id === p.categoryId)?.slug === category)
  if (search) {
    const q = search.trim().toLowerCase()
    items = items.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  }
  items = items.map(decorateProduct)
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

export function getProductBySlug(slug) {
  const p = products.find((x) => x.slug === slug)
  return p ? clone(decorateProduct(p)) : null
}

export function getProductById(id) {
  const p = products.find((x) => x.id === id)
  return p ? clone(decorateProduct(p)) : null
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

let orderSeq = 10231
function nextOrderNumber() {
  return `DS-${orderSeq++}`
}

export function createOrder({ affiliateId, customer, shipping, items, paymentMethod, proof }) {
  const lineItems = items.map((it) => {
    const product = products.find((p) => p.id === it.productId)
    const unitPrice = product ? product.price : it.unitPrice
    return {
      id: mkId('item'),
      productId: it.productId,
      productName: product?.name ?? it.productName ?? 'Product',
      unitPrice,
      quantity: it.quantity,
      lineTotal: Math.round(unitPrice * it.quantity * 100) / 100,
    }
  })
  const subtotal = Math.round(lineItems.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100

  const order = {
    id: mkId('order'),
    orderNumber: nextOrderNumber(),
    affiliateId: affiliateId || null,
    customerName: customer.name,
    customerEmail: customer.email || null,
    customerPhone: customer.phone,
    shippingAddress: shipping.address,
    shippingCity: shipping.city,
    shippingNotes: shipping.notes || null,
    paymentMethod,
    subtotal,
    shippingFee: 0,
    total: subtotal,
    status: 'payment_submitted',
    adminNote: null,
    placedAt: nowIso(),
    updatedAt: nowIso(),
    items: lineItems,
    proofs: proof ? [{ id: mkId('proof'), imageUrl: proof.imageUrl, note: proof.note || null, uploadedAt: nowIso() }] : [],
  }
  orders.push(order)

  if (affiliateId) {
    pushNotification(affiliateId, {
      type: 'order',
      title: 'Order placed',
      message: `Order ${order.orderNumber} was submitted and is awaiting payment verification.`,
    })
  }

  return clone(order)
}

export function addPaymentProof(orderId, { imageUrl, note }) {
  const order = orders.find((o) => o.id === orderId)
  if (!order) throw new Error('Order not found.')
  const proof = { id: mkId('proof'), imageUrl, note: note || null, uploadedAt: nowIso() }
  order.proofs.push(proof)
  if (order.status === 'rejected' || order.status === 'pending_payment') {
    order.status = 'payment_submitted'
    order.updatedAt = nowIso()
  }
  return clone(proof)
}

export function getOrderById(orderId) {
  const order = orders.find((o) => o.id === orderId)
  return order ? clone(order) : null
}

export function listOrdersForAffiliate(affiliateId) {
  return clone(
    orders.filter((o) => o.affiliateId === affiliateId).sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
  )
}

const ORDER_TRANSITIONS = new Set([
  'pending_payment', 'payment_submitted', 'payment_approved', 'order_confirmed',
  'processing', 'delivered', 'return_requested', 'rejected', 'cancelled', 'returned', 'refunded',
])

// Customer-initiated: the owning affiliate requests a return on their own
// delivered order. Ownership is enforced here (not just left to the UI),
// mirroring request_order_return() in 0004_payment_settings_and_returns.sql.
export function requestOrderReturn(affiliateId, orderId, reason) {
  const order = orders.find((o) => o.id === orderId)
  if (!order || order.affiliateId !== affiliateId) throw new Error('Order not found or not owned by you.')
  if (order.status !== 'delivered') throw new Error('Only delivered orders can be returned.')
  order.status = 'return_requested'
  order.returnReason = reason || null
  order.updatedAt = nowIso()
  return clone(order)
}

export function adminSetOrderStatus(orderId, newStatus, note) {
  if (!ORDER_TRANSITIONS.has(newStatus)) throw new Error('Unknown order status.')
  const order = orders.find((o) => o.id === orderId)
  if (!order) throw new Error('Order not found.')
  const oldStatus = order.status
  order.status = newStatus
  if (note) order.adminNote = note
  order.updatedAt = nowIso()

  if (newStatus === 'payment_approved' && oldStatus !== 'payment_approved') {
    distributeCommissions(orderId)
  }
  if ((newStatus === 'returned' || newStatus === 'refunded') && oldStatus !== 'returned' && oldStatus !== 'refunded') {
    reverseCommissions(orderId)
  }

  if (order.affiliateId) {
    const label = newStatus.replace(/_/g, ' ')
    pushNotification(order.affiliateId, {
      type: 'order',
      title: `Order ${order.orderNumber} updated`,
      message: `Your order is now ${label}.`,
    })
  }

  return clone(order)
}

export function adminListOrders({ status, search, paymentMethod, page = 1, pageSize = 20 } = {}) {
  let items = orders.slice()
  if (status) items = items.filter((o) => o.status === status)
  if (paymentMethod) items = items.filter((o) => o.paymentMethod === paymentMethod)
  if (search) {
    const q = search.trim().toLowerCase()
    items = items.filter(
      (o) => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q)
    )
  }
  items = items.slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

// ---------------------------------------------------------------------------
// Referral network
// ---------------------------------------------------------------------------

export function getDownline(affiliateId, maxDepth = 5) {
  const result = []
  let frontier = [affiliateId]
  for (let level = 1; level <= maxDepth; level++) {
    const next = affiliates.filter((a) => frontier.includes(a.referredBy))
    if (next.length === 0) break
    next.forEach((a) => result.push({ affiliate: clone(publicAffiliate(a)), level }))
    frontier = next.map((a) => a.id)
  }
  return result
}

export function getNetworkStats(affiliateId) {
  const downline = getDownline(affiliateId, 5)
  const byLevel = commissionLevels.map(({ level, percentage }) => {
    const atLevel = downline.filter((d) => d.level === level)
    const withSales = atLevel.filter((d) => orders.some((o) => o.affiliateId === d.affiliate.id && o.status !== 'rejected' && o.status !== 'cancelled'))
    return { level, percentage, count: atLevel.length, withSales: withSales.length }
  })
  return {
    byLevel,
    totalDirect: byLevel[0]?.count ?? 0,
    totalIndirect: downline.length - (byLevel[0]?.count ?? 0),
  }
}

export function getDirectReferrals(affiliateId) {
  return clone(affiliates.filter((a) => a.referredBy === affiliateId).map(publicAffiliate))
}

// ---------------------------------------------------------------------------
// Commissions (affiliate-facing)
// ---------------------------------------------------------------------------

export function listCommissionsForAffiliate(affiliateId) {
  return clone(
    commissions
      .filter((c) => c.affiliateId === affiliateId)
      .map((c) => ({ ...c, sourceAffiliateName: affiliates.find((a) => a.id === c.sourceAffiliateId)?.fullName ?? 'Affiliate' }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )
}

export function adminListCommissions({ level, status, page = 1, pageSize = 20 } = {}) {
  let items = commissions.slice()
  if (level) items = items.filter((c) => c.level === Number(level))
  if (status) items = items.filter((c) => c.status === status)
  items = items
    .map((c) => ({
      ...c,
      affiliateName: affiliates.find((a) => a.id === c.affiliateId)?.fullName ?? 'Affiliate',
      sourceAffiliateName: affiliates.find((a) => a.id === c.sourceAffiliateId)?.fullName ?? 'Affiliate',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

// ---------------------------------------------------------------------------
// Wallet & withdrawals
// ---------------------------------------------------------------------------

export function getWallet(affiliateId) {
  return clone(ensureWallet(affiliateId))
}

export function requestWithdrawal(affiliateId, amount, method, accountDetails) {
  const wallet = ensureWallet(affiliateId)
  if (amount < platformSettings.minWithdrawal) {
    throw new Error(`Amount is below the minimum withdrawal of PKR ${platformSettings.minWithdrawal.toLocaleString('en-US')}.`)
  }
  if (platformSettings.maxWithdrawal && amount > platformSettings.maxWithdrawal) {
    throw new Error(`Amount exceeds the maximum withdrawal of PKR ${platformSettings.maxWithdrawal.toLocaleString('en-US')}.`)
  }
  if (amount > wallet.availableBalance) {
    throw new Error('Amount exceeds your available balance.')
  }

  wallet.availableBalance = Math.round((wallet.availableBalance - amount) * 100) / 100
  wallet.updatedAt = nowIso()

  const feeAmount = Math.round(amount * (platformSettings.withdrawalFeePercentage / 100) * 100) / 100
  const withdrawal = {
    id: mkId('wd'),
    affiliateId,
    amount,
    feePercentage: platformSettings.withdrawalFeePercentage,
    feeAmount,
    netAmount: Math.round((amount - feeAmount) * 100) / 100,
    method,
    accountDetails: accountDetails || null,
    status: 'pending',
    adminNote: null,
    requestedAt: nowIso(),
    processedAt: null,
  }
  withdrawals.push(withdrawal)

  pushNotification(affiliateId, {
    type: 'withdrawal',
    title: 'Withdrawal requested',
    message: `Your withdrawal request for PKR ${amount.toLocaleString('en-US')} is pending review.`,
  })

  return clone(withdrawal)
}

export function listWithdrawalsForAffiliate(affiliateId) {
  return clone(withdrawals.filter((w) => w.affiliateId === affiliateId).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)))
}

const WITHDRAWAL_FINAL = new Set(['paid', 'rejected', 'cancelled'])

export function adminSetWithdrawalStatus(withdrawalId, newStatus, note) {
  const withdrawal = withdrawals.find((w) => w.id === withdrawalId)
  if (!withdrawal) throw new Error('Withdrawal not found.')
  if (WITHDRAWAL_FINAL.has(withdrawal.status)) {
    throw new Error(`Withdrawal already finalized (${withdrawal.status}); no further transitions allowed.`)
  }

  withdrawal.status = newStatus
  if (note) withdrawal.adminNote = note
  withdrawal.processedAt = nowIso()

  const wallet = ensureWallet(withdrawal.affiliateId)
  if (newStatus === 'rejected' || newStatus === 'cancelled') {
    wallet.availableBalance = Math.round((wallet.availableBalance + withdrawal.amount) * 100) / 100
    wallet.updatedAt = nowIso()
  }
  if (newStatus === 'paid') {
    wallet.lifetimeWithdrawn = Math.round((wallet.lifetimeWithdrawn + withdrawal.amount) * 100) / 100
    wallet.updatedAt = nowIso()
  }

  pushNotification(withdrawal.affiliateId, {
    type: 'withdrawal',
    title: `Withdrawal ${newStatus}`,
    message: `Your withdrawal of PKR ${withdrawal.amount.toLocaleString('en-US')} is now ${newStatus}.`,
  })

  return clone(withdrawal)
}

export function adminListWithdrawals({ status, page = 1, pageSize = 20 } = {}) {
  let items = withdrawals.slice()
  if (status) items = items.filter((w) => w.status === status)
  items = items
    .map((w) => ({ ...w, affiliateName: affiliates.find((a) => a.id === w.affiliateId)?.fullName ?? 'Affiliate' }))
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

// ---------------------------------------------------------------------------
// Platform configuration (single source of truth — never duplicated)
// ---------------------------------------------------------------------------

export function getCommissionLevels() {
  return clone(commissionLevels)
}

export function adminUpdateCommissionLevel(level, percentage) {
  const cfg = commissionLevels.find((l) => l.level === Number(level))
  if (!cfg) throw new Error('Unknown level.')
  cfg.percentage = Number(percentage)
  return clone(commissionLevels)
}

export function getPlatformSettings() {
  return clone(platformSettings)
}

export function adminUpdatePlatformSettings(fields) {
  Object.assign(platformSettings, fields)
  return clone(platformSettings)
}

// ---------------------------------------------------------------------------
// Admin — affiliates
// ---------------------------------------------------------------------------

export function adminListAffiliates({ search, status, role, page = 1, pageSize = 20 } = {}) {
  let items = affiliates.map(publicAffiliate)
  if (status) items = items.filter((a) => a.status === status)
  if (role) items = items.filter((a) => a.role === role)
  if (search) {
    const q = search.trim().toLowerCase()
    items = items.filter((a) => a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.referralCode.toLowerCase().includes(q))
  }
  items = items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

export function adminGetAffiliateDetail(affiliateId) {
  const affiliate = affiliates.find((a) => a.id === affiliateId)
  if (!affiliate) return null
  const upline = affiliate.referredBy ? clone(publicAffiliate(affiliates.find((a) => a.id === affiliate.referredBy))) : null
  return {
    affiliate: clone(publicAffiliate(affiliate)),
    upline,
    directReferrals: getDirectReferrals(affiliateId),
    networkStats: getNetworkStats(affiliateId),
    orders: listOrdersForAffiliate(affiliateId),
    commissions: listCommissionsForAffiliate(affiliateId),
    wallet: getWallet(affiliateId),
    withdrawals: listWithdrawalsForAffiliate(affiliateId),
  }
}

export function adminSetAffiliateStatus(affiliateId, status) {
  const affiliate = affiliates.find((a) => a.id === affiliateId)
  if (!affiliate) throw new Error('Affiliate not found.')
  affiliate.status = status
  return clone(publicAffiliate(affiliate))
}

// ---------------------------------------------------------------------------
// Admin — products & categories
// ---------------------------------------------------------------------------

export function adminListProducts({ search, status, categoryId, page = 1, pageSize = 20 } = {}) {
  let items = products.slice()
  if (status) items = items.filter((p) => p.status === status)
  if (categoryId) items = items.filter((p) => p.categoryId === categoryId)
  if (search) {
    const q = search.trim().toLowerCase()
    items = items.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
  }
  items = items.map(decorateProduct).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function adminCreateProduct(fields) {
  const product = {
    id: mkId('prod'),
    categoryId: fields.categoryId,
    name: fields.name,
    slug: fields.slug || `${slugify(fields.name)}-${mkId('sl')}`,
    description: fields.description || '',
    price: Number(fields.price) || 0,
    compareAtPrice: fields.compareAtPrice ? Number(fields.compareAtPrice) : null,
    imageUrl: fields.imageUrl || 'https://picsum.photos/seed/new/600/600',
    gallery: fields.gallery || [],
    stockQuantity: Number(fields.stockQuantity) || 0,
    sku: fields.sku || '',
    status: fields.status || 'pending',
    isActive: fields.isActive ?? true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  products.push(product)
  return clone(decorateProduct(product))
}

export function adminUpdateProduct(id, fields) {
  const product = products.find((p) => p.id === id)
  if (!product) throw new Error('Product not found.')
  Object.assign(product, fields, { updatedAt: nowIso() })
  return clone(decorateProduct(product))
}

export function adminSetProductStatus(id, status) {
  return adminUpdateProduct(id, { status })
}

export function adminDeleteProduct(id) {
  return adminUpdateProduct(id, { status: 'archived', isActive: false })
}

export function adminCreateCategory({ name, slug }) {
  const category = { id: mkId('cat'), name, slug: slug || slugify(name), sortOrder: categories.length + 1 }
  categories.push(category)
  return clone(category)
}

export function adminUpdateCategory(id, fields) {
  const category = categories.find((c) => c.id === id)
  if (!category) throw new Error('Category not found.')
  Object.assign(category, fields)
  return clone(category)
}

export function adminDeleteCategory(id) {
  const idx = categories.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error('Category not found.')
  if (products.some((p) => p.categoryId === id)) throw new Error('Category still has products assigned.')
  categories.splice(idx, 1)
}

// ---------------------------------------------------------------------------
// Admin — dashboard, activity & reports
// ---------------------------------------------------------------------------

export function adminDashboardStats() {
  const totalUsers = affiliates.length
  const totalAffiliates = affiliates.filter((a) => a.role === 'affiliate').length
  const activeAffiliates = affiliates.filter((a) => a.role === 'affiliate' && a.status === 'active').length
  const totalOrders = orders.length
  const totalSales = orders
    .filter((o) => !['rejected', 'cancelled'].includes(o.status))
    .reduce((s, o) => s + o.total, 0)
  const pendingPayments = orders.filter((o) => o.status === 'payment_submitted').length
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending').length
  const totalCommission = commissions.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commissionAmount, 0)
  const totalProducts = products.length
  const productsPendingApproval = products.filter((p) => p.status === 'pending').length
  const returnedOrders = orders.filter((o) => o.status === 'returned' || o.status === 'refunded').length

  return {
    totalUsers,
    totalAffiliates,
    activeAffiliates,
    totalOrders,
    totalSales: Math.round(totalSales * 100) / 100,
    pendingPayments,
    pendingWithdrawals,
    totalCommission: Math.round(totalCommission * 100) / 100,
    totalProducts,
    productsPendingApproval,
    returnedOrders,
  }
}

// Generic day-bucketed series generator — shared by the affiliate dashboard's
// "my referred sales" chart and the admin reports' platform-wide charts, so
// the aggregation logic exists exactly once.
export function buildDailySeries(records, { days = 30, dateKey, valueKey }) {
  const buckets = new Map()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0, count: 0 })
  }
  records.forEach((r) => {
    const key = new Date(r[dateKey]).toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) return
    bucket.value += valueKey ? Number(r[valueKey]) || 0 : 1
    bucket.count += 1
  })
  return Array.from(buckets.values())
}

export function adminSalesSeries(days = 30) {
  return buildDailySeries(orders.filter((o) => !['rejected', 'cancelled'].includes(o.status)), { days, dateKey: 'placedAt', valueKey: 'total' })
}

export function adminSignupsSeries(days = 30) {
  return buildDailySeries(affiliates, { days, dateKey: 'createdAt' })
}

export function adminRecentActivity(limit = 12) {
  const events = []
  affiliates.slice(-8).forEach((a) => events.push({ id: `evt-${a.id}`, type: 'referral', text: `${a.fullName} registered${a.referredBy ? ' via referral link' : ''}.`, timestamp: a.createdAt }))
  orders.slice(-8).forEach((o) => events.push({ id: `evt-${o.id}`, type: 'order', text: `Order ${o.orderNumber} placed by ${o.customerName}.`, timestamp: o.placedAt }))
  withdrawals.slice(-5).forEach((w) => events.push({ id: `evt-${w.id}`, type: 'withdrawal', text: `Withdrawal request of PKR ${w.amount.toLocaleString('en-US')} submitted.`, timestamp: w.requestedAt }))
  orders
    .filter((o) => o.status === 'returned' || o.status === 'refunded')
    .forEach((o) => events.push({ id: `evt-ret-${o.id}`, type: 'order', text: `Order ${o.orderNumber} marked ${o.status}.`, timestamp: o.updatedAt }))
  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
}

// ---------------------------------------------------------------------------
// "Become a Partner" investment module — mirrors
// supabase/migrations/0005_partner_investment.sql exactly, including the
// same reserve-at-request-time withdrawal idempotency pattern used for
// affiliate withdrawals. No profit number is invented: profitRatePercentage
// defaults to 0 and the module defaults to disabled; every business rule is
// admin-configurable via partnerSettings.
// ---------------------------------------------------------------------------

export function getPartnerSettings() {
  return clone(partnerSettings)
}

export function adminUpdatePartnerSettings(fields) {
  Object.assign(partnerSettings, fields)
  return clone(partnerSettings)
}

function decorateInvestment(inv) {
  return { ...inv, affiliateName: affiliates.find((a) => a.id === inv.affiliateId)?.fullName ?? 'Affiliate' }
}

export function applyForPartner(affiliateId, principalAmount, proofImageUrl) {
  if (!partnerSettings.enabled) throw new Error('The partner investment program is not currently open.')
  if (principalAmount < partnerSettings.minInvestment) {
    throw new Error(`Amount is below the minimum investment of PKR ${partnerSettings.minInvestment.toLocaleString('en-US')}.`)
  }
  if (partnerSettings.maxInvestment && principalAmount > partnerSettings.maxInvestment) {
    throw new Error(`Amount exceeds the maximum investment of PKR ${partnerSettings.maxInvestment.toLocaleString('en-US')}.`)
  }

  const investment = {
    id: mkId('inv'),
    affiliateId,
    status: 'pending',
    principalAmount,
    proofImageUrl: proofImageUrl || null,
    availablePrincipal: 0,
    availableProfit: 0,
    totalProfitEarned: 0,
    adminNote: null,
    createdAt: nowIso(),
    approvedAt: null,
  }
  partnerInvestments.push(investment)

  pushNotification(affiliateId, {
    type: 'system',
    title: 'Partner application submitted',
    message: `Your investment application for PKR ${principalAmount.toLocaleString('en-US')} is pending admin review.`,
  })

  return clone(investment)
}

export function getMyInvestments(affiliateId) {
  return clone(partnerInvestments.filter((i) => i.affiliateId === affiliateId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
}

export function getInvestmentDetail(investmentId) {
  const inv = partnerInvestments.find((i) => i.id === investmentId)
  if (!inv) return null
  return {
    investment: clone(decorateInvestment(inv)),
    profitEntries: clone(partnerProfitEntries.filter((e) => e.investmentId === investmentId).sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))),
    withdrawals: clone(partnerWithdrawals.filter((w) => w.investmentId === investmentId).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))),
  }
}

export function adminListInvestments({ status, page = 1, pageSize = 20 } = {}) {
  let items = partnerInvestments.slice()
  if (status) items = items.filter((i) => i.status === status)
  items = items.map(decorateInvestment).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

export function adminSetInvestmentStatus(investmentId, newStatus, note) {
  const inv = partnerInvestments.find((i) => i.id === investmentId)
  if (!inv) throw new Error('Investment not found.')
  if (inv.status !== 'pending') throw new Error('Only a pending application can be approved or rejected.')

  if (newStatus === 'active') {
    inv.status = 'active'
    inv.availablePrincipal = inv.principalAmount
    inv.approvedAt = nowIso()
    inv.adminNote = note || null
    pushNotification(inv.affiliateId, {
      type: 'system',
      title: 'Partner application approved',
      message: `Your investment of PKR ${inv.principalAmount.toLocaleString('en-US')} is now active.`,
    })
  } else if (newStatus === 'rejected') {
    inv.status = 'rejected'
    inv.adminNote = note || null
    pushNotification(inv.affiliateId, {
      type: 'system',
      title: 'Partner application rejected',
      message: note || 'Your investment application was not approved.',
    })
  } else {
    throw new Error('Invalid status transition.')
  }
  return clone(decorateInvestment(inv))
}

export function adminPostPartnerProfit(investmentId, amount, entryDate, note) {
  const inv = partnerInvestments.find((i) => i.id === investmentId)
  if (!inv) throw new Error('Investment not found.')
  if (inv.status !== 'active') throw new Error('Investment is not active.')

  partnerProfitEntries.push({
    id: mkId('profit'),
    investmentId,
    amount,
    entryDate: entryDate || nowIso().slice(0, 10),
    note: note || null,
    createdBy: 'admin',
    createdAt: nowIso(),
  })
  inv.availableProfit = Math.round((inv.availableProfit + amount) * 100) / 100
  inv.totalProfitEarned = Math.round((inv.totalProfitEarned + amount) * 100) / 100

  pushNotification(inv.affiliateId, {
    type: 'system',
    title: 'Profit posted',
    message: `PKR ${amount.toLocaleString('en-US')} profit was posted to your investment.`,
  })

  return clone(decorateInvestment(inv))
}

// Optional automatic mode — no-ops safely unless an admin has explicitly
// enabled 'fixed_percentage' mode with a real (>0) rate. Mirrors
// admin_run_partner_profit_cycle() in the SQL migration.
export function adminRunPartnerProfitCycle() {
  if (!partnerSettings.enabled || partnerSettings.profitCalculationType !== 'fixed_percentage' || partnerSettings.profitRatePercentage <= 0) {
    return 0
  }
  let count = 0
  partnerInvestments.filter((i) => i.status === 'active').forEach((inv) => {
    const amount = Math.round(inv.availablePrincipal * (partnerSettings.profitRatePercentage / 100) * 100) / 100
    if (amount > 0) {
      partnerProfitEntries.push({
        id: mkId('profit'),
        investmentId: inv.id,
        amount,
        entryDate: nowIso().slice(0, 10),
        note: `Auto: ${partnerSettings.profitRatePercentage}% ${partnerSettings.profitFrequency}`,
        createdBy: 'system',
        createdAt: nowIso(),
      })
      inv.availableProfit = Math.round((inv.availableProfit + amount) * 100) / 100
      inv.totalProfitEarned = Math.round((inv.totalProfitEarned + amount) * 100) / 100
      count += 1
    }
  })
  return count
}

export function requestPartnerWithdrawal(affiliateId, investmentId, type, amount) {
  const inv = partnerInvestments.find((i) => i.id === investmentId && i.affiliateId === affiliateId)
  if (!inv) throw new Error('Investment not found or not owned by you.')
  if (inv.status !== 'active') throw new Error('Investment is not active.')

  if (type === 'profit_only') {
    if (!partnerSettings.allowProfitOnlyWithdrawal) throw new Error('Profit-only withdrawal is not currently allowed.')
    if (amount > inv.availableProfit) throw new Error('Amount exceeds available profit.')
    inv.availableProfit = Math.round((inv.availableProfit - amount) * 100) / 100
  } else if (type === 'whole') {
    if (!partnerSettings.allowPrincipalWithdrawal) throw new Error('Whole-amount withdrawal is not currently allowed.')
    if (amount > inv.availablePrincipal + inv.availableProfit) throw new Error('Amount exceeds available balance.')
    const fromProfit = Math.min(amount, inv.availableProfit)
    inv.availableProfit = Math.round((inv.availableProfit - fromProfit) * 100) / 100
    inv.availablePrincipal = Math.round((inv.availablePrincipal - (amount - fromProfit)) * 100) / 100
  } else {
    throw new Error('Invalid withdrawal type.')
  }

  const feeAmount = Math.round(amount * (partnerSettings.withdrawalFeePercentage / 100) * 100) / 100
  const withdrawal = {
    id: mkId('pwd'),
    investmentId,
    affiliateId,
    withdrawalType: type,
    amount,
    feePercentage: partnerSettings.withdrawalFeePercentage,
    feeAmount,
    netAmount: Math.round((amount - feeAmount) * 100) / 100,
    status: 'pending',
    adminNote: null,
    requestedAt: nowIso(),
    processedAt: null,
  }
  partnerWithdrawals.push(withdrawal)

  pushNotification(affiliateId, {
    type: 'withdrawal',
    title: 'Partner withdrawal requested',
    message: `Your ${type === 'whole' ? 'whole-amount' : 'profit-only'} withdrawal of PKR ${amount.toLocaleString('en-US')} is pending review.`,
  })

  return clone(withdrawal)
}

export function listPartnerWithdrawalsForAffiliate(affiliateId) {
  return clone(partnerWithdrawals.filter((w) => w.affiliateId === affiliateId).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)))
}

const PARTNER_WITHDRAWAL_FINAL = new Set(['paid', 'rejected', 'cancelled'])

export function adminSetPartnerWithdrawalStatus(withdrawalId, newStatus, note) {
  const withdrawal = partnerWithdrawals.find((w) => w.id === withdrawalId)
  if (!withdrawal) throw new Error('Withdrawal not found.')
  if (PARTNER_WITHDRAWAL_FINAL.has(withdrawal.status)) {
    throw new Error(`Withdrawal already finalized (${withdrawal.status}); no further transitions allowed.`)
  }

  withdrawal.status = newStatus
  if (note) withdrawal.adminNote = note
  withdrawal.processedAt = nowIso()

  if (newStatus === 'rejected' || newStatus === 'cancelled') {
    const inv = partnerInvestments.find((i) => i.id === withdrawal.investmentId)
    if (inv) {
      if (withdrawal.withdrawalType === 'profit_only') {
        inv.availableProfit = Math.round((inv.availableProfit + withdrawal.amount) * 100) / 100
      } else {
        inv.availablePrincipal = Math.round((inv.availablePrincipal + withdrawal.amount) * 100) / 100
      }
    }
  }

  pushNotification(withdrawal.affiliateId, {
    type: 'withdrawal',
    title: `Partner withdrawal ${newStatus}`,
    message: `Your partner withdrawal of PKR ${withdrawal.amount.toLocaleString('en-US')} is now ${newStatus}.`,
  })

  return clone(withdrawal)
}

export function adminListPartnerWithdrawals({ status, page = 1, pageSize = 20 } = {}) {
  let items = partnerWithdrawals.slice()
  if (status) items = items.filter((w) => w.status === status)
  items = items
    .map((w) => ({ ...w, affiliateName: affiliates.find((a) => a.id === w.affiliateId)?.fullName ?? 'Affiliate' }))
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: clone(items.slice(start, start + pageSize)), total }
}

// ---------------------------------------------------------------------------
// Demo seed: orders across the tree so the dashboard/admin panel aren't empty
// ---------------------------------------------------------------------------

function seedDemoOrder({ buyerId, buyerName, buyerPhone, city, itemsSpec, method, daysAgo, finalStatus }) {
  const items = itemsSpec.map(([slug, qty]) => {
    const product = products.find((p) => p.slug === slug)
    return { productId: product.id, quantity: qty }
  })
  const created = createOrder({
    affiliateId: buyerId,
    customer: { name: buyerName, email: null, phone: buyerPhone },
    shipping: { address: '123 Main Street', city, notes: null },
    items,
    paymentMethod: method,
    proof: method === 'cash' ? null : { imageUrl: 'https://picsum.photos/seed/proof/400/500', note: 'Payment receipt' },
  })
  // createOrder() returns a clone() — mutate the actual stored record, not
  // the disconnected copy, so the backdated timestamp below really sticks.
  const order = orders.find((o) => o.id === created.id)
  order.placedAt = nowIso(-daysAgo * DAY)
  order.updatedAt = order.placedAt

  if (finalStatus && finalStatus !== 'payment_submitted') {
    // walk the realistic path so intermediate commission/notification side
    // effects fire exactly like they would for a real order
    const path = ['payment_approved', 'order_confirmed', 'processing', 'delivered']
    const returnLike = finalStatus === 'returned' || finalStatus === 'refunded'
    if (finalStatus === 'rejected') {
      adminSetOrderStatus(order.id, 'rejected', 'Payment proof unclear.')
    } else {
      for (const step of path) {
        adminSetOrderStatus(order.id, step)
        if (step === finalStatus) break
      }
      if (returnLike) adminSetOrderStatus(order.id, finalStatus, 'Customer requested return.')
    }
  }
  return order
}

const l1 = affiliates.filter((a) => a.referredBy === root.id)
const l2 = affiliates.filter((a) => l1.some((p) => p.id === a.referredBy))

if (l1[0]) seedDemoOrder({ buyerId: l1[0].id, buyerName: l1[0].fullName, buyerPhone: l1[0].phone, city: l1[0].city, itemsSpec: [['cotton-casual-shirt', 2], ['gents-leather-wallet', 1]], method: 'easypaisa', daysAgo: 18, finalStatus: 'delivered' })
if (l1[1]) seedDemoOrder({ buyerId: l1[1].id, buyerName: l1[1].fullName, buyerPhone: l1[1].phone, city: l1[1].city, itemsSpec: [['classic-analog-watch', 1]], method: 'jazzcash', daysAgo: 9, finalStatus: 'processing' })
if (l1[2]) seedDemoOrder({ buyerId: l1[2].id, buyerName: l1[2].fullName, buyerPhone: l1[2].phone, city: l1[2].city, itemsSpec: [['herbal-immunity-booster', 3]], method: 'cash', daysAgo: 2, finalStatus: 'payment_submitted' })
if (l2[0]) seedDemoOrder({ buyerId: l2[0].id, buyerName: l2[0].fullName, buyerPhone: l2[0].phone, city: l2[0].city, itemsSpec: [['wireless-earbuds-pro', 1]], method: 'bank_transfer', daysAgo: 30, finalStatus: 'delivered' })
if (l2[1]) seedDemoOrder({ buyerId: l2[1].id, buyerName: l2[1].fullName, buyerPhone: l2[1].phone, city: l2[1].city, itemsSpec: [['ladies-embroidered-handbag', 1]], method: 'crypto', daysAgo: 40, finalStatus: 'returned' })
if (l2[2]) seedDemoOrder({ buyerId: l2[2].id, buyerName: l2[2].fullName, buyerPhone: l2[2].phone, city: l2[2].city, itemsSpec: [['digital-sports-watch', 1]], method: 'jazzcash', daysAgo: 5, finalStatus: 'rejected' })

// guest checkouts (no affiliate) — proves the storefront works without an account
seedDemoOrder({ buyerId: null, buyerName: 'Ali Raza', buyerPhone: '+92 301 5551234', city: 'Karachi', itemsSpec: [['printed-kurta', 1], ['herbal-green-tea', 2]], method: 'cash', daysAgo: 4, finalStatus: 'order_confirmed' })
seedDemoOrder({ buyerId: null, buyerName: 'Sidra Yousaf', buyerPhone: '+92 302 5559876', city: 'Islamabad', itemsSpec: [['tempered-glass-protector', 2]], method: 'easypaisa', daysAgo: 1, finalStatus: 'payment_submitted' })

// one live pending withdrawal so Wallet + Admin > Withdrawals both have data
try {
  requestWithdrawal(root.id, Math.min(2000, ensureWallet(root.id).availableBalance || 2000), 'bank_transfer', 'HBL •••• 4521 — Hamza Sheikh')
} catch {
  // if the seeded orders above didn't leave enough balance, skip silently
}

// welcome notification for admin
pushNotification(admin.id, { type: 'system', title: 'Admin console ready', message: 'You are viewing seeded demo data for local development.' })

// ---------------------------------------------------------------------------
// Demo seed: partner investment module. The module is enabled and min/max
// limits are set purely so the demo dashboards aren't empty; the profit
// numbers below are hand-entered ledger rows via the 'manual' calculation
// mode (created_by: 'system-demo'), NOT an invented ongoing percentage —
// profitRatePercentage stays 0 and profitCalculationType stays 'manual',
// exactly the safe default. A real deployment should treat every value in
// partnerSettings as unconfigured until the business supplies real terms.
// ---------------------------------------------------------------------------
partnerSettings.enabled = true
partnerSettings.minInvestment = 25000
partnerSettings.maxInvestment = 2000000

if (l1[2]) {
  const app = applyForPartner(l1[2].id, 50000, 'https://picsum.photos/seed/invproof1/400/500')
  adminSetInvestmentStatus(app.id, 'active', 'Funds received via bank transfer — demo approval.')
  adminPostPartnerProfit(app.id, 750, nowIso(-21 * DAY).slice(0, 10), 'Demo profit entry — week 1')
  adminPostPartnerProfit(app.id, 820, nowIso(-14 * DAY).slice(0, 10), 'Demo profit entry — week 2')
  adminPostPartnerProfit(app.id, 690, nowIso(-7 * DAY).slice(0, 10), 'Demo profit entry — week 3')
}

if (l2[2]) {
  applyForPartner(l2[2].id, 30000, 'https://picsum.photos/seed/invproof2/400/500')
  // left 'pending' deliberately — demonstrates the admin approval queue
}
