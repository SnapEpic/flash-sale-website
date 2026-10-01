import { Router } from 'express'
import mongoose from 'mongoose'
import { Wishlist } from '../models/Wishlist.js'
import { Product } from '../models/Product.js'
import { protect } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { notFound } from '../utils/AppError.js'

const router = Router()
router.use(protect)

const ids = (w) => (w?.products || []).map(String)

router.get('/', asyncHandler(async (req, res) => {
  const w = await Wishlist.findOne({ user: req.user._id }).lean()
  // Drop products that no longer exist so the heart counter never counts ghosts.
  const existing = w ? await Product.find({ _id: { $in: w.products } }, '_id').lean() : []
  res.json({ productIds: existing.map((p) => String(p._id)) })
}))

router.post('/:productId', asyncHandler(async (req, res) => {
  const { productId } = req.params
  if (!mongoose.isValidObjectId(productId) || !(await Product.exists({ _id: productId }))) throw notFound('Product not found.')
  const w = await Wishlist.findOneAndUpdate({ user: req.user._id }, { $addToSet: { products: productId } }, { upsert: true, new: true })
  res.status(201).json({ productIds: ids(w) })
}))

router.delete('/:productId', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) throw notFound('Product not found.')
  const w = await Wishlist.findOneAndUpdate({ user: req.user._id }, { $pull: { products: req.params.productId } }, { new: true })
  res.json({ productIds: ids(w) })
}))

export default router
