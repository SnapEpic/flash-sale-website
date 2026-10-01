import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { cached } from './cache.js'
import { getLiveStock } from './stock.js'

const DAY = 86400000
const POPULATE = { path: 'category', select: 'slug name' }
export const CACHE_TTL = 60

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Static (cacheable) shape: everything except live stock.
export const serializeStatic = (p) => ({
  id: String(p._id),
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  category: p.category?.slug ?? null, // the UI uses the category slug string
  categoryName: p.category?.name ?? null,
  price: p.price,
  originalPrice: p.originalPrice,
  discount: p.discount,
  images: p.images,
  colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
  sizes: p.sizes,
  totalStock: p.totalStock,
  description: p.description,
  isFlashSale: p.isFlashSale,
  isTrending: p.isTrending,
  isFeatured: p.isFeatured,
  rating: p.rating,
  reviews: p.reviews,
  createdAt: p.createdAt,
})

/** Add the numbers that change every second: stock (from Redis), sold, age. */
export async function withLiveStock(list) {
  const live = await getLiveStock(list.map((p) => ({ id: p.id, stock: p.totalStock })))
  return list.map((p) => {
    const stock = live.get(p.id) ?? 0
    return { ...p, stock, sold: p.totalStock - stock, daysOld: Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / DAY)) }
  })
}

const SORTS = {
  popular: { sold: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  discount: { discount: -1 },
  newest: { createdAt: -1 },
}

const staticQuery = async (filter, sort = 'popular', limit = 100, skip = 0) => {
  const docs = await Product.find(filter).populate(POPULATE).sort(SORTS[sort] || SORTS.popular).skip(skip).limit(limit).lean()
  return docs.map(serializeStatic)
}

export async function getCategoryBySlug(slug) {
  return Category.findOne({ slug: String(slug).toLowerCase() }).lean()
}

/** Cached list (static part) + live stock. Returns { products, hit }. */
export async function listCached(cacheName, filter, sort, limit = 100, skip = 0) {
  const { data, hit } = await cached(`products:${cacheName}:${sort}:${limit}:${skip}`, CACHE_TTL, () => staticQuery(filter, sort, limit, skip))
  return { products: await withLiveStock(data), hit }
}

export async function getProductById(id) {
  if (!mongoose.isValidObjectId(id)) return { product: null, hit: false }
  const { data, hit } = await cached(`product:${id}`, CACHE_TTL, async () => {
    const doc = await Product.findById(id).populate(POPULATE).lean()
    return doc ? serializeStatic(doc) : null
  })
  if (!data) return { product: null, hit }
  return { product: (await withLiveStock([data]))[0], hit }
}

/** Search across name, brand and category. Every word must match somewhere (same rule the old client-side search used). */
export async function searchProducts(q, { flashSale = false, limit = 50 } = {}) {
  const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)
  if (!terms.length) return []
  const cats = await Category.find({}, 'slug name').lean()
  const clauses = terms.map((t) => {
    const re = new RegExp(escapeRegex(t), 'i')
    const catIds = cats.filter((c) => re.test(c.name) || re.test(c.slug)).map((c) => c._id)
    return { $or: [{ name: re }, { brand: re }, { category: { $in: catIds } }] }
  })
  const filter = { $and: clauses }
  if (flashSale) filter.isFlashSale = true
  return withLiveStock(await staticQuery(filter, 'popular', limit))
}
