/**
 * Order + payment state machine. The important rule: an order becomes PAID only here,
 * and only after the server has verified the payment. Nothing the browser sends can do it.
 */
import crypto from 'node:crypto'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Cart } from '../models/Cart.js'
import { env } from '../config/env.js'
import { finalizeReservation, releaseReservation, takeStockNow, getReservation } from './stock.js'
import { totalsOf, toPaise } from './pricing.js'
import { gateway } from './razorpay.js'
import { invalidateCache } from './cache.js'
import { conflict, notFound } from '../utils/AppError.js'

const newOrderNumber = () => `DL-${crypto.randomBytes(5).toString('hex').toUpperCase()}`

/** Turn a live reservation into a PENDING order (idempotent: same reservation => same order). */
export async function createPendingOrder({ user, reservationId, shippingAddress }) {
  const existing = await Order.findOne({ reservationId })
  if (existing) {
    if (String(existing.user) !== String(user._id)) throw notFound('Reservation not found.')
    if (existing.paymentStatus === 'PENDING') {
      existing.shippingAddress = shippingAddress
      await existing.save()
      return existing
    }
    throw conflict('This checkout has already been completed. Please start a new one.', 'CHECKOUT_DONE')
  }

  const r = await getReservation(reservationId)
  if (!r || r.userId !== String(user._id)) {
    throw conflict('Your stock hold expired. Please start checkout again.', 'RESERVATION_EXPIRED')
  }
  const totals = totalsOf(r.lines)
  return Order.create({
    orderNumber: newOrderNumber(),
    user: user._id,
    items: r.lines.map((l) => ({
      product: l.productId, name: l.name, brand: l.brand, image: l.image, color: l.color, size: l.size,
      qty: l.qty, price: l.price, originalPrice: l.originalPrice,
    })),
    shippingAddress,
    ...totals,
    amountPaise: toPaise(totals.total),
    currency: 'INR',
    reservationId,
    source: r.mode === 'buyNow' ? 'buyNow' : 'cart',
  })
}

/** Payment did not happen (failed / cancelled / expired): give the units back, never mark PAID. */
export async function failOrder(order, reason) {
  if (order.reservationId) await releaseReservation(order.reservationId)
  await Order.updateOne(
    { _id: order._id, paymentStatus: 'PENDING' },
    { $set: { paymentStatus: 'FAILED', orderStatus: 'CANCELLED', failureReason: reason } },
  )
  return Order.findById(order._id)
}

// Called by the sweeper after Redis has put expired reservations' stock back.
export const onReservationExpired = (reservationId) =>
  Order.updateOne(
    { reservationId, paymentStatus: 'PENDING' },
    { $set: { paymentStatus: 'FAILED', orderStatus: 'CANCELLED', failureReason: 'RESERVATION_EXPIRED' } },
  )

async function refund(order, reason) {
  try {
    await gateway.refund(order.paymentId, order.amountPaise)
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'REFUNDED', orderStatus: 'CANCELLED', failureReason: reason } })
  } catch (err) {
    // Money was taken but the refund call failed: flag it loudly so a human can refund from the dashboard.
    console.error(`[payment] REFUND FAILED for order ${order.orderNumber} (payment ${order.paymentId}):`, err?.error?.description || err.message)
    await Order.updateOne({ _id: order._id }, { $set: { orderStatus: 'CANCELLED', failureReason: `${reason} | REFUND_FAILED_NEEDS_MANUAL_REFUND` } })
  }
}

/**
 * Called once a payment is verified (checkout signature or webhook). Safe to call many times.
 *
 * 1. CLAIM the order with one atomic Mongo update (PENDING/FAILED -> PAID). If two requests race
 *    (browser verify + webhook), exactly one wins; the other just returns the paid order.
 * 2. Finalize the Redis reservation: the held units become permanently sold.
 *    If the reservation is already gone (customer paid after the hold expired) try to grab the
 *    units again. If they sold out meanwhile, refund automatically.
 * 3. Record the sale in MongoDB and tidy the cart.
 */
export async function confirmPaid(orderId, paymentId) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $in: ['PENDING', 'FAILED'] } },
    { $set: { paymentStatus: 'PAID', orderStatus: 'CONFIRMED', paymentId, paidAt: new Date() }, $unset: { failureReason: '' } },
    { new: true },
  )
  if (!order) return { order: await Order.findById(orderId), alreadyProcessed: true }

  let stockOk = order.reservationId ? await finalizeReservation(order.reservationId) : false
  if (!stockOk) stockOk = await takeStockNow(order.items.map((i) => ({ productId: String(i.product), qty: i.qty })))
  if (!stockOk) {
    await refund(order, 'Sold out before payment completed; refunded automatically')
    return { order: await Order.findById(orderId), refunded: true }
  }

  await Product.bulkWrite(order.items.map((i) => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: -i.qty, sold: i.qty } } } })))
  await invalidateCache() // `sold`/stock changed in Mongo; cached product docs must refresh

  if (order.source === 'cart') {
    const cart = await Cart.findOne({ user: order.user })
    if (cart) {
      const bought = new Set(order.items.map((i) => `${i.product}|${i.color}|${i.size}`))
      cart.items = cart.items.filter((c) => !bought.has(`${c.product}|${c.color}|${c.size}`))
      await cart.save()
    }
  }
  return { order }
}

export const publicOrder = (o) => ({
  id: String(o._id),
  orderNumber: o.orderNumber,
  items: o.items.map((i) => ({ productId: String(i.product), name: i.name, brand: i.brand, image: i.image, color: i.color, size: i.size, qty: i.qty, price: i.price, originalPrice: i.originalPrice })),
  shippingAddress: o.shippingAddress,
  subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total,
  amountPaise: o.amountPaise, currency: o.currency,
  paymentStatus: o.paymentStatus, orderStatus: o.orderStatus, paymentId: o.paymentId,
  failureReason: o.failureReason, paidAt: o.paidAt, createdAt: o.createdAt, updatedAt: o.updatedAt,
  usdToInr: env.usdToInr,
})
