import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Order } from '../models/Order.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError, badRequest, conflict, notFound } from '../utils/AppError.js'
import { env } from '../config/env.js'
import { getReservation } from '../services/stock.js'
import { confirmPaid, failOrder, publicOrder } from '../services/orderService.js'
import { gateway, razorpayConfigured, verifyCheckoutSignature, verifyWebhookSignature } from '../services/razorpay.js'

const router = Router()
const byUser = (req) => String(req.user._id)

async function ownOrder(req, orderId) {
  if (!mongoose.isValidObjectId(orderId)) throw notFound('Order not found.')
  const order = await Order.findById(orderId)
  if (!order || String(order.user) !== String(req.user._id)) throw notFound('Order not found.')
  return order
}

// POST /api/payment/create-order  { orderId }  -> everything Razorpay Checkout needs in the browser
router.post('/create-order', protect, rateLimit({ name: 'pay-create', windowSec: 60, max: 10, by: byUser }), validate(z.object({ orderId: z.string().min(1) })), asyncHandler(async (req, res) => {
  if (!razorpayConfigured()) throw new AppError(503, 'Payments are not configured on this server yet.', 'PAYMENTS_NOT_CONFIGURED')
  const order = await ownOrder(req, req.body.orderId)
  if (order.paymentStatus === 'PAID') throw conflict('This order is already paid.', 'ALREADY_PAID')
  if (order.paymentStatus !== 'PENDING') throw conflict('This checkout was cancelled. Please start again.', 'CHECKOUT_CANCELLED')

  // The stock hold must still be alive, otherwise we would take money for units we no longer hold.
  const r = await getReservation(order.reservationId)
  if (!r) throw conflict('Your stock hold expired. Please start checkout again.', 'RESERVATION_EXPIRED')

  if (!order.razorpayOrderId) {
    const rp = await gateway.createOrder({
      amount: order.amountPaise, currency: order.currency, receipt: order.orderNumber,
      notes: { orderId: String(order._id), orderNumber: order.orderNumber },
    })
    order.razorpayOrderId = rp.id
    await order.save()
  }
  res.json({
    keyId: env.razorpay.keyId, // public key id; the secret never leaves the server
    razorpayOrderId: order.razorpayOrderId, amount: order.amountPaise, currency: order.currency,
    order: publicOrder(order), expiresAt: r.expiresAt,
    prefill: { name: req.user.name, email: req.user.email, contact: order.shippingAddress?.phone },
  })
}))

const verifySchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
})

// POST /api/payment/verify  -> the ONLY way the browser flow can turn an order into PAID
router.post('/verify', protect, validate(verifySchema), asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id: rpOrder, razorpay_payment_id: rpPayment, razorpay_signature: sig } = req.body
  const order = await ownOrder(req, orderId)
  if (order.paymentStatus === 'PAID') return res.json({ order: publicOrder(order), alreadyPaid: true })
  if (!order.razorpayOrderId || order.razorpayOrderId !== rpOrder) throw badRequest('Payment does not match this order.', 'PAYMENT_MISMATCH')
  if (!verifyCheckoutSignature({ orderId: rpOrder, paymentId: rpPayment, signature: sig })) {
    throw badRequest('We could not verify this payment. If money was deducted it will be refunded automatically.', 'BAD_SIGNATURE')
  }
  const result = await confirmPaid(order._id, rpPayment)
  if (result.refunded) {
    return res.status(409).json({
      message: 'Sorry, this item sold out while your payment was completing. Your payment is being refunded.',
      code: 'SOLD_OUT_REFUNDED', order: publicOrder(result.order),
    })
  }
  res.json({ order: publicOrder(result.order), alreadyPaid: Boolean(result.alreadyProcessed) })
}))

// POST /api/payment/failed  { orderId, reason }  -> payment failed or was dismissed: release the stock hold
router.post('/failed', protect, validate(z.object({ orderId: z.string().min(1), reason: z.string().max(200).optional() })), asyncHandler(async (req, res) => {
  const order = await ownOrder(req, req.body.orderId)
  // A client can only ever cancel an unpaid order; it can never mark anything paid.
  const updated = order.paymentStatus === 'PENDING' ? await failOrder(order, req.body.reason || 'PAYMENT_FAILED') : order
  res.json({ order: publicOrder(updated) })
}))

/**
 * Razorpay webhook: server-to-server confirmation, so an order still gets confirmed if the
 * customer paid and then closed the tab before /verify ran. Mounted with a raw body (see app.js).
 */
export const webhookHandler = asyncHandler(async (req, res) => {
  const raw = req.body // Buffer (express.raw)
  if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, req.headers['x-razorpay-signature'])) return res.status(400).json({ message: 'Invalid signature.' })
  const event = JSON.parse(raw.toString('utf8'))
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity
    if (payment?.order_id) {
      const order = await Order.findOne({ razorpayOrderId: payment.order_id })
      if (order) await confirmPaid(order._id, payment.id)
    }
  }
  res.json({ ok: true })
})

export default router
