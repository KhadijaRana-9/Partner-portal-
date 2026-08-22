import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function productFromRow(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.product_categories?.name ?? null,
    categorySlug: row.product_categories?.slug ?? null,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
    imageUrl: row.image_url,
    gallery: row.gallery ?? [],
    stockQuantity: row.stock_quantity,
    sku: row.sku,
    status: row.status,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toProductRow(fields) {
  const row = {}
  if (fields.categoryId !== undefined) row.category_id = fields.categoryId
  if (fields.name !== undefined) row.name = fields.name
  if (fields.slug !== undefined) row.slug = fields.slug
  if (fields.description !== undefined) row.description = fields.description
  if (fields.price !== undefined) row.price = Number(fields.price) || 0
  if (fields.compareAtPrice !== undefined) row.compare_at_price = fields.compareAtPrice ? Number(fields.compareAtPrice) : null
  if (fields.imageUrl !== undefined) row.image_url = fields.imageUrl
  if (fields.stockQuantity !== undefined) row.stock_quantity = Number(fields.stockQuantity) || 0
  if (fields.sku !== undefined) row.sku = fields.sku
  if (fields.status !== undefined) row.status = fields.status
  if (fields.isActive !== undefined) row.is_active = fields.isActive
  return row
}

const realAdminProductService = {
  async listCategories() {
    const { data, error } = await supabase.from('product_categories').select('*').order('sort_order')
    if (error) throw error
    return data.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sort_order }))
  },

  async listProducts({ search, status, categoryId, page = 1, pageSize = 20 } = {}) {
    let query = supabase.from('products').select('*, product_categories(name, slug)', { count: 'exact' })
    if (status) query = query.eq('status', status)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw error
    return { items: data.map(productFromRow), total: count ?? data.length }
  },

  async createProduct(fields) {
    const row = toProductRow(fields)
    row.slug = row.slug || `${slugify(fields.name)}-${Date.now().toString(36)}`
    row.status = row.status || 'pending'
    if (row.is_active === undefined) row.is_active = true
    const { data, error } = await supabase.from('products').insert(row).select('*, product_categories(name, slug)').single()
    if (error) throw error
    return productFromRow(data)
  },

  async updateProduct(id, fields) {
    const row = toProductRow(fields)
    row.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('products').update(row).eq('id', id).select('*, product_categories(name, slug)').single()
    if (error) throw error
    return productFromRow(data)
  },

  async setProductStatus(id, status) {
    return realAdminProductService.updateProduct(id, { status })
  },

  async deleteProduct(id) {
    return realAdminProductService.updateProduct(id, { status: 'archived', isActive: false })
  },

  async createCategory({ name, slug }) {
    const { data, error } = await supabase.from('product_categories').insert({ name, slug: slug || slugify(name) }).select().single()
    if (error) throw error
    return { id: data.id, name: data.name, slug: data.slug, sortOrder: data.sort_order }
  },

  async updateCategory(id, fields) {
    const row = {}
    if (fields.name !== undefined) row.name = fields.name
    if (fields.slug !== undefined) row.slug = fields.slug
    const { data, error } = await supabase.from('product_categories').update(row).eq('id', id).select().single()
    if (error) throw error
    return { id: data.id, name: data.name, slug: data.slug, sortOrder: data.sort_order }
  },

  async deleteCategory(id) {
    // products.category_id is ON DELETE SET NULL at the DB level, but we
    // never want a silent "orphan the products" delete from the admin UI —
    // block it explicitly, same rule the mock backend enforces.
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
    if (countError) throw countError
    if (count > 0) throw new Error('Category still has products assigned.')
    const { error } = await supabase.from('product_categories').delete().eq('id', id)
    if (error) throw error
  },
}

const mockAdminProductService = {
  async listCategories() {
    await delay(150)
    return mock.listCategories()
  },
  async listProducts(params) {
    await delay()
    return mock.adminListProducts(params)
  },
  async createProduct(fields) {
    await delay(400)
    return mock.adminCreateProduct(fields)
  },
  async updateProduct(id, fields) {
    await delay(400)
    return mock.adminUpdateProduct(id, fields)
  },
  async setProductStatus(id, status) {
    await delay(300)
    return mock.adminSetProductStatus(id, status)
  },
  async deleteProduct(id) {
    await delay(300)
    return mock.adminDeleteProduct(id)
  },
  async createCategory(fields) {
    await delay(300)
    return mock.adminCreateCategory(fields)
  },
  async updateCategory(id, fields) {
    await delay(300)
    return mock.adminUpdateCategory(id, fields)
  },
  async deleteCategory(id) {
    await delay(300)
    return mock.adminDeleteCategory(id)
  },
}

export const adminProductService = isSupabaseConfigured ? realAdminProductService : mockAdminProductService
