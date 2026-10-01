/**
 * TEST-ONLY harness used to drive the real React UI with a browser (Playwright) without Razorpay credentials.
 * It is the normal API, except:
 *   - the two network calls to Razorpay are faked (gateway.createOrder / gateway.refund)
 *   - GET /api/__test/sign returns a genuine HMAC signature so a fake "Razorpay popup" can complete a payment
 * Never used by `npm start`.
 */
import crypto from 'node:crypto'
import express from 'express'
import { env } from '../src/config/env.js'
import { connectMongo } from '../src/config/db.js'
import { redis } from '../src/config/redis.js'
import { createApp } from '../src/app.js'
import { gateway } from '../src/services/razorpay.js'
import { hydrateStock, sweepExpired } from '../src/services/stock.js'
import { initSale } from '../src/services/saleClock.js'
import { onReservationExpired } from '../src/services/orderService.js'

gateway.createOrder = async ({ amount, currency }) => ({ id: `order_UI${crypto.randomBytes(5).toString('hex')}`, amount, currency })
gateway.refund = async () => ({ id: 'rfnd_ui' })

await connectMongo(); await redis.ping(); await hydrateStock(); await initSale()
setInterval(() => sweepExpired(onReservationExpired).catch(() => {}), 3000)

const outer = express()
outer.get('/api/__test/sign', (req, res) => {
  const { order, payment } = req.query
  res.json({ signature: crypto.createHmac('sha256', env.razorpay.keySecret).update(`${order}|${payment}`).digest('hex') })
})
outer.use(createApp())
outer.listen(5000, () => console.log('ui-test api on 5000'))
