import { Router } from 'express'
import { env } from '../config/env.js'

const router = Router()

// Public shop rules the UI needs for display (the server still enforces them at checkout).
router.get('/', (_req, res) => res.json({
  freeShippingAt: env.freeShippingAt,
  shippingFee: env.shippingFee,
  usdToInr: env.usdToInr,
  reservationTtlSeconds: env.reservationTtlSeconds,
}))

export default router
