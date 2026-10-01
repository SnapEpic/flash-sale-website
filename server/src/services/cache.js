/**
 * Read-through cache in Redis:  request -> Redis hit? return it : query Mongo -> store with TTL -> return.
 *
 * Invalidation uses a version number baked into every key. Bumping the version (one INCR)
 * orphans all old entries at once; they simply expire on their own. No KEYS/SCAN needed.
 *
 * We cache only *static* catalogue data. Live stock is merged in on every request (see catalog.js),
 * so a cached response can never show stale stock.
 */
import { redis } from '../config/redis.js'

const VERSION_KEY = 'cache:version'

export async function cached(name, ttlSeconds, loader) {
  let key
  try {
    const version = (await redis.get(VERSION_KEY)) || '0'
    key = `cache:${version}:${name}`
    const hit = await redis.get(key)
    if (hit) return { data: JSON.parse(hit), hit: true }
  } catch (err) {
    console.warn('[cache] read failed, going to Mongo:', err.message)
  }
  const data = await loader()
  if (key) redis.set(key, JSON.stringify(data), 'EX', ttlSeconds).catch((e) => console.warn('[cache] write failed:', e.message))
  return { data, hit: false }
}

export const invalidateCache = () => redis.incr(VERSION_KEY).catch((e) => console.warn('[cache] invalidate failed:', e.message))
