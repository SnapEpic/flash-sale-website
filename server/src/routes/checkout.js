import { Router } from 'express'
import { z } from 'zod'
import { Cart } from '../models/Cart.js'
import { Order } from '../models/Order.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest } from '../utils/AppError.js'
import { priceLines, totalsOf, toPaise, MAX_QTY } from '../services/pricing.js'
import { reserve, getReservation, releaseReservation } from '../services/stock.js'
import { failOrder } from '../services/orderService.js'
import { env } from '../config/env.js'

const router = Router()
router.use(protect)

const reserveSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('cart') }),
  z.object({
    mode: z.literal('buyNow'),
    item: z.object({ productId: z.string().min(1), color: z.string().min(1), size: z.string().min(1), qty: z.number().int().min(1).max(MAX_QTY).default(1) }),
  }),
])

const summary = (r) => {
  const totals = totalsOf(r.lines)
  return {
    reservationId: r.id, expiresAt: r.expiresAt, serverTime: Date.now(),
    ttlSeconds: env.reservationTtlSeconds, lines: r.lines, totals,
    amountPaise: toPaise(totals.total), currency: 'INR', usdToInr: env.usdToInr,
  }
}

/**
 * "Buy now" / "Checkout": validate the items, then ask Redis to hold the stock for this shopper.
 * The hold is atomic across all items; if any item is short, nothing is held and we return 409.
 */
router.post('/reserve', rateLimit({ name: 'reserve', windowSec: 60, max: 20, by: (req) => String(req.user._id) }), validate(reserveSchema), asyncHandler(async (req, res) => {
  let items
  if (req.body.mode === 'cart') {
    const cart = await Cart.findOne({ user: req.user._id }).lean()
    if (!cart?.items.length) throw badRequest('Your bag is empty.', 'EMPTY_CART')
    items = cart.items.map((i) => ({ productId: String(i.product), color: i.color, size: i.size, qty: i.qty }))
  } else items = [req.body.item]

  const lines = await priceLines(items) // server-side prices, options, sale window, soft stock check
  const reservation = await reserve({ userId: req.user._id, lines, meta: { mode: req.body.mode } }) // atomic Redis hold
  res.status(201).json(summary(reservation))
}))

router.get('/reservation/:id', asyncHandler(async (req, res) => {
  const r = await getReservation(req.params.id)
  if (!r || r.userId !== String(req.user._id)) return res.status(410).json({ message: 'Your stock hold expired.', code: 'RESERVATION_EXPIRED' })
  res.json(summary(r))
}))

// The shopper closed checkout or the payment window: give the units back right away.
router.delete('/reservation/:id', asyncHandler(async (req, res) => {
  const r = await getReservation(req.params.id)
  const order = await Order.findOne({ reservationId: req.params.id, user: req.user._id })
  if (r && r.userId === String(req.user._id)) await releaseReservation(r.id)
  if (order && order.paymentStatus === 'PENDING') await failOrder(order, 'CANCELLED_BY_USER')
  res.json({ ok: true })
}))

export default router
