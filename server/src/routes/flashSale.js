import { Router } from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getSaleEndsAt, restartSale } from '../services/saleClock.js'

const router = Router()

// The browser countdown is driven by this. serverTime lets the client correct for its own clock being off.
const status = async () => {
  const endsAt = await getSaleEndsAt()
  const serverTime = Date.now()
  return { endsAt, serverTime, live: endsAt > serverTime }
}

router.get('/status', asyncHandler(async (_req, res) => res.json(await status())))
router.post('/restart', protect, adminOnly, asyncHandler(async (_req, res) => {
  await restartSale()
  res.json(await status())
}))

export default router
