import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fromRow(row) {
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
  }
}

const realProductService = {
  async listCategories() {
    const { data, error } = await supabase.from('product_categories').select('*').order('sort_order')
    if (error) throw error
    return data.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sort_order }))
  },

  async listProducts({ category, search, page = 1, pageSize = 12 } = {}) {
    let query = supabase.from('products').select('*, product_categories(name, slug)', { count: 'exact' }).eq('status', 'approved').eq('is_active', true)
    if (category) query = query.eq('product_categories.slug', category)
    if (search) query = query.ilike('name', `%${search}%`)
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw error
    return { items: data.map(fromRow), total: count ?? data.length }
  },

  async getProductBySlug(slug) {
    const { data, error } = await supabase.from('products').select('*, product_categories(name, slug)').eq('slug', slug).single()
    if (error) throw error
    return fromRow(data)
  },
}

const mockProductService = {
  async listCategories() {
    await delay()
    return mock.listCategories()
  },
  async listProducts(params) {
    await delay()
    return mock.listProducts(params)
  },
  async getProductBySlug(slug) {
    await delay()
    return mock.getProductBySlug(slug)
  },
}

export const productService = isSupabaseConfigured ? realProductService : mockProductService
