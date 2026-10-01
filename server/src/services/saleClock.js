// The flash-sale window lives in Redis so every server and every browser agrees on when it ends.
import { redis } from '../config/redis.js'
import { env } from '../config/env.js'

const KEY = 'flashsale:endsAt'

export async function initSale() {
  await redis.set(KEY, Date.now() + env.saleDurationMs, 'NX') // only on first boot / after Redis was wiped
}

export async function getSaleEndsAt() {
  const v = await redis.get(KEY)
  if (v) return Number(v)
  await initSale()
  return Number(await redis.get(KEY))
}

export const restartSale = async () => {
  const endsAt = Date.now() + env.saleDurationMs
  await redis.set(KEY, endsAt)
  return endsAt
}

export const isSaleLive = async () => (await getSaleEndsAt()) > Date.now()
