import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

export const razorpayConfigured = () => Boolean(env.razorpay.keyId && env.razorpay.keySecret)

let client
const getClient = () => {
  if (!razorpayConfigured()) {
    throw new AppError(503, 'Payments are not configured on this server yet.', 'PAYMENTS_NOT_CONFIGURED')
  }
  client ||= new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret })
  return client
}

// Thin wrapper around the official SDK (an object so tests can swap the network calls).
export const gateway = {
  createOrder: ({ amount, currency, receipt, notes }) =>
    getClient().orders.create({ amount, currency, receipt, notes, payment_capture: 1 }),
  refund: (paymentId, amount) => getClient().payments.refund(paymentId, { amount, speed: 'normal' }),
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a), 'utf8')
  const y = Buffer.from(String(b), 'utf8')
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

/**
 * Razorpay signs "<razorpay_order_id>|<razorpay_payment_id>" with our key SECRET (HMAC-SHA256).
 * Only someone holding the secret can produce a matching signature, so a match proves the payment
 * really happened on Razorpay for THIS order. The browser never sees the secret.
 */
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  if (!razorpayConfigured() || !orderId || !paymentId || !signature) return false
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  return safeEqual(expected, signature)
}

// Webhooks are signed over the raw request body with a separate webhook secret.
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret || !signature) return false
  const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex')
  return safeEqual(expected, signature)
}
