import { Router } from 'express'
import { z } from 'zod'
import { Cart } from '../models/Cart.js'
import { Product } from '../models/Product.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { notFound } from '../utils/AppError.js'
import { getLiveStock } from '../services/stock.js'
import { priceLines, MAX_QTY } from '../services/pricing.js'

const router = Router()
router.use(protect)

// Replace the array instead of $pull-ing a subdocument: a plain $set works identically on every MongoDB-compatible server.
const without = (cart, lineId) => { cart.items = cart.items.filter((i) => String(i._id) !== String(lineId)) }

const getCart = async (userId) => (await Cart.findOne({ user: userId })) || new Cart({ user: userId, items: [] })

/**
 * Cart as the UI needs it, re-checked against today's catalogue:
 *  - lines whose product was deleted are dropped
 *  - priceChanged: price moved since the item was added (shown once, then we remember the new price)
 *  - insufficient / soldOut: live Redis stock is lower than the quantity in the bag
 */
async function cartView(cart) {
  const ids = cart.items.map((i) => i.product)
  const products = await Product.find({ _id: { $in: ids } }, 'price stock').lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const live = await getLiveStock(products)
  let dirty = false
  const items = []
  const gone = []
  for (const line of cart.items) {
    const p = byId.get(String(line.product))
    if (!p) { gone.push(line._id); dirty = true; continue }
    const available = live.get(String(p._id)) ?? 0
    const priceChanged = p.price !== line.priceAtAdd
    const previousPrice = line.priceAtAdd
    if (priceChanged) { line.priceAtAdd = p.price; dirty = true }
    items.push({
      id: String(line._id), productId: String(line.product), color: line.color, size: line.size, qty: line.qty,
      unitPrice: p.price, available, soldOut: available < 1, insufficient: available >= 1 && line.qty > available,
      priceChanged, previousPrice: priceChanged ? previousPrice : undefined,
    })
  }
  if (gone.length) cart.items = cart.items.filter((i) => !gone.some((g) => String(g) === String(i._id)))
  if (dirty) await cart.save()
  return { items }
}

const addSchema = z.object({
  productId: z.string().min(1),
  color: z.string().min(1),
  size: z.string().min(1),
  qty: z.number().int().min(1).max(MAX_QTY).default(1),
})

router.get('/', asyncHandler(async (req, res) => res.json(await cartView(await getCart(req.user._id)))))

router.post('/items', validate(addSchema), asyncHandler(async (req, res) => {
  const { productId, color, size, qty } = req.body
  const cart = await getCart(req.user._id)
  const line = cart.items.find((i) => String(i.product) === productId && i.color === color && i.size === size)
  const wanted = Math.min(MAX_QTY, (line?.qty || 0) + qty)
  // priceLines validates product, options, flash-sale window and live stock for the merged quantity.
  const [priced] = await priceLines([{ productId, color, size, qty: wanted }])
  if (line) { line.qty = wanted; line.priceAtAdd = priced.price }
  else cart.items.push({ product: productId, color, size, qty: wanted, priceAtAdd: priced.price })
  await cart.save()
  res.status(201).json(await cartView(cart))
}))

router.put('/items/:itemId', validate(z.object({ qty: z.number().int().min(0).max(MAX_QTY) })), asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id)
  const line = cart.items.id(req.params.itemId)
  if (!line) throw notFound('That item is not in your bag.')
  if (req.body.qty === 0) without(cart, line._id)
  else {
    const [priced] = await priceLines([{ productId: String(line.product), color: line.color, size: line.size, qty: req.body.qty }])
    line.qty = req.body.qty
    line.priceAtAdd = priced.price
  }
  await cart.save()
  res.json(await cartView(cart))
}))

router.delete('/items/:itemId', asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id)
  const line = cart.items.id(req.params.itemId)
  if (line) { without(cart, line._id); await cart.save() }
  res.json(await cartView(cart))
}))

router.delete('/', asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id)
  cart.items = []
  await cart.save()
  res.json({ items: [] })
}))

export default router
