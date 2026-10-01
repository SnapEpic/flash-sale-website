import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Product } from '../models/Product.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest, notFound } from '../utils/AppError.js'
import { getCategoryBySlug, getProductById, listCached, searchProducts, serializeStatic, withLiveStock } from '../services/catalog.js'
import { invalidateCache } from '../services/cache.js'
import { adjustStock, removeStockKey } from '../services/stock.js'
import { redis } from '../config/redis.js'

const router = Router()
const cacheHeader = (res, hit) => res.setHeader('X-Cache', hit ? 'HIT' : 'MISS')
const bool = (v) => (v === 'true' ? true : v === 'false' ? false : undefined)
const limitOf = (v, d = 100) => Math.min(100, Math.max(1, parseInt(v, 10) || d))

/* ------------------------------- public reads ------------------------------ */

// GET /api/products?category=&brand=&isFlashSale=&isTrending=&isFeatured=&sort=&limit=&page=
router.get('/', asyncHandler(async (req, res) => {
  const { category, brand, sort = 'popular' } = req.query
  const filter = {}
  if (category) {
    const c = await getCategoryBySlug(category)
    if (!c) return res.json({ products: [], total: 0 })
    filter.category = c._id
  }
  if (brand) filter.brand = String(brand)
  for (const f of ['isFlashSale', 'isTrending', 'isFeatured']) if (bool(req.query[f]) !== undefined) filter[f] = bool(req.query[f])
  const limit = limitOf(req.query.limit)
  const skip = (Math.max(1, parseInt(req.query.page, 10) || 1) - 1) * limit
  const { products, hit } = await listCached(`list:${JSON.stringify(filter)}`, filter, String(sort), limit, skip)
  cacheHeader(res, hit)
  res.json({ products, total: products.length })
}))

// GET /api/products/search?q=sneaker&flashSale=true
router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80)
  if (!q) return res.json({ products: [], total: 0, q })
  const products = await searchProducts(q, { flashSale: bool(req.query.flashSale) === true })
  res.json({ products, total: products.length, q })
}))

// GET /api/products/flash-sale  -> Redis read-through cache for the product docs, live stock merged in
router.get('/flash-sale', asyncHandler(async (req, res) => {
  const { products, hit } = await listCached('flash-sale', { isFlashSale: true }, String(req.query.sort || 'popular'), 100)
  cacheHeader(res, hit)
  res.json({ products, total: products.length })
}))

router.get('/category/:slug', asyncHandler(async (req, res) => {
  const category = await getCategoryBySlug(req.params.slug)
  if (!category) throw notFound('Category not found.')
  const { products, hit } = await listCached(`cat:${category.slug}`, { category: category._id }, String(req.query.sort || 'popular'), 100)
  cacheHeader(res, hit)
  res.json({ category: { slug: category.slug, name: category.name, blurb: category.blurb }, products, total: products.length })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const { product, hit } = await getProductById(req.params.id)
  if (!product) throw notFound('Product not found.')
  cacheHeader(res, hit)
  res.json({ product })
}))

/* ------------------------------- admin writes ------------------------------ */

const colors = z.array(z.object({ name: z.string().min(1), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1B1C20') })).min(1)
const baseProduct = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(''),
  brand: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1, 'Category slug is required.'),
  price: z.number().positive(),
  originalPrice: z.number().positive(),
  images: z.array(z.string().url()).min(1, 'Add at least one image URL (use /api/uploads/images for Cloudinary).').max(8),
  colors,
  sizes: z.array(z.string().min(1)).min(1).default(['One size']),
  stock: z.number().int().min(0),
  totalStock: z.number().int().min(1).optional(),
  isFlashSale: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(0),
  reviews: z.number().int().min(0).default(0),
})
const createSchema = baseProduct.refine((d) => d.price <= d.originalPrice, { path: ['price'], message: 'Sale price cannot exceed the original price.' })
const updateSchema = baseProduct.partial().extend({ stock: z.number().int().min(0).optional() })

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
async function uniqueSlug(name) {
  const base = slugify(name)
  let slug = base
  for (let n = 2; await Product.exists({ slug }); n += 1) slug = `${base}-${n}`
  return slug
}
async function categoryId(slug) {
  const c = await getCategoryBySlug(slug)
  if (!c) throw badRequest(`Unknown category "${slug}".`, 'UNKNOWN_CATEGORY', { category: 'Unknown category.' })
  return c._id
}

router.post('/', protect, adminOnly, validate(createSchema), asyncHandler(async (req, res) => {
  const d = req.body
  const count = await Product.countDocuments()
  const product = await Product.create({
    ...d, category: await categoryId(d.category), slug: await uniqueSlug(d.name),
    sku: `DL-${String(count + 1).padStart(4, '0')}-${Date.now().toString(36).toUpperCase().slice(-3)}`,
    totalStock: d.totalStock ?? Math.max(d.stock, 1), sold: 0,
  })
  await redis.set(`stock:${product._id}`, product.stock)
  await invalidateCache()
  const fresh = await Product.findById(product._id).populate('category', 'slug name').lean()
  res.status(201).json({ product: (await withLiveStock([serializeStatic(fresh)]))[0] })
}))

router.put('/:id', protect, adminOnly, validate(updateSchema), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Product not found.')
  const product = await Product.findById(req.params.id)
  if (!product) throw notFound('Product not found.')
  const d = req.body
  const oldStock = product.stock
  if (d.category) product.category = await categoryId(d.category)
  const { category, ...rest } = d
  Object.assign(product, rest)
  if (product.price > product.originalPrice) throw badRequest('Sale price cannot exceed the original price.', 'VALIDATION_ERROR', { price: 'Sale price cannot exceed the original price.' })
  if (product.stock > product.totalStock) product.totalStock = product.stock
  await product.save()
  // Apply the CHANGE to Redis so units currently held by shoppers in checkout are not overwritten.
  if (d.stock !== undefined && d.stock !== oldStock) await adjustStock(product._id, d.stock - oldStock)
  await invalidateCache()
  const fresh = await Product.findById(product._id).populate('category', 'slug name').lean()
  res.json({ product: (await withLiveStock([serializeStatic(fresh)]))[0] })
}))

router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Product not found.')
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) throw notFound('Product not found.')
  await removeStockKey(product._id)
  await invalidateCache()
  res.json({ ok: true })
}))

export default router
