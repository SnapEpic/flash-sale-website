import { env } from './config/env.js'
import { connectMongo } from './config/db.js'
import { redis } from './config/redis.js'
import mongoose from 'mongoose'
import { createApp } from './app.js'
import { hydrateStock, sweepExpired } from './services/stock.js'
import { initSale } from './services/saleClock.js'
import { onReservationExpired } from './services/orderService.js'

async function main() {
  await connectMongo()
  await redis.ping() // fail fast: the flash sale cannot run without Redis
  const n = await hydrateStock()
  await initSale()
  console.log(`[boot] stock keys ensured for ${n} products`)

  // Every 10s: put stock back for holds nobody paid for (Redis TTLs alone can't run code, so we sweep).
  const sweeper = setInterval(async () => {
    try {
      const found = await sweepExpired(onReservationExpired)
      if (found) console.log(`[sweeper] released ${found} expired reservation(s)`)
    } catch (err) { console.warn('[sweeper] failed:', err.message) }
  }, 10_000)

  const server = createApp().listen(env.port, () => console.log(`[api] listening on http://localhost:${env.port}`))

  const shutdown = async (sig) => {
    console.log(`[api] ${sig} received, shutting down`)
    clearInterval(sweeper)
    server.close()
    await mongoose.disconnect().catch(() => {})
    redis.disconnect()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

// One bad request must never take the process down.
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err))
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err))

main().catch((err) => {
  console.error('[boot] failed to start:', err.message)
  process.exit(1)
})
