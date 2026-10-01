import { Router } from 'express'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { cached } from '../services/cache.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { notFound } from '../utils/AppError.js'

const router = Router()

const withCounts = async () => {
  const cats = await Category.find().sort({ order: 1 }).lean()
  return Promise.all(cats.map(async (c) => ({
    id: String(c._id), slug: c.slug, name: c.name, blurb: c.blurb, image: c.image,
    productCount: await Product.countDocuments({ category: c._id }),
  })))
}

router.get('/', asyncHandler(async (_req, res) => {
  const { data, hit } = await cached('categories', 300, withCounts)
  res.setHeader('X-Cache', hit ? 'HIT' : 'MISS')
  res.json({ categories: data })
}))

router.get('/:slug', asyncHandler(async (req, res) => {
  const { data } = await cached('categories', 300, withCounts)
  const category = data.find((c) => c.slug === req.params.slug.toLowerCase())
  if (!category) throw notFound('Category not found.')
  res.json({ category })
}))

export default router
