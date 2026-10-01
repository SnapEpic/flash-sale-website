/**
 * Flash-sale stock + reservations, backed by Redis.
 *
 * WHY REDIS: during a drop hundreds of people hit "Buy now" for the same 5 units. Doing
 *   read stock -> check -> write stock-1
 * in Node (or Mongo) lets two requests both read "1" and both succeed => overselling.
 * Redis runs a Lua script as ONE indivisible step (single-threaded), so "check every item
 * AND decrement every item" can never interleave with another shopper's request.
 *
 * KEYS
 *   stock:<productId>       integer  units available right now (not sold, not reserved)
 *   resv:<id>               JSON     what a shopper is holding (deleted on finalize/release)
 *   resv:expiry             ZSET     reservation ids scored by expiry time (ms)
 *   resv:user:<userId>      string   the shopper's current reservation id (one at a time)
 *
 * LIFECYCLE
 *   reserve  -> stock decremented, reservation created with TTL
 *   finalize -> payment verified: reservation removed, stock stays decremented (units are sold)
 *   release  -> payment failed / abandoned / expired: stock put back
 * MongoDB stays the source of truth for units sold; Redis is the fast gate in front of it.
 */
import { redis } from '../config/redis.js'
import { env } from '../config/env.js'
import { Product } from '../models/Product.js'
import { conflict } from '../utils/AppError.js'
import crypto from 'node:crypto'

const STOCK = (id) => `stock:${id}`
const RESV = (id) => `resv:${id}`
const EXPIRY_SET = 'resv:expiry'
const USER_RESV = (uid) => `resv:user:${uid}`
const GRACE_SECONDS = 300 // payload outlives the logical expiry so the sweeper can always read it

/* ------------------------------ Lua scripts ------------------------------ */

// KEYS: [reservationKey, expirySet, stockKey1..N]   ARGV: [resId, payloadJson, ttlSec, expiresAtMs, qty1..N]
// Returns {1} on success, {-1, index, available} if item `index` is short, {-2, index} if its stock key is missing.
redis.defineCommand('reserveStock', {
  lua: `
    local n = #KEYS - 2
    for i = 1, n do
      local have = tonumber(redis.call('GET', KEYS[i + 2]))
      if have == nil then return {-2, i} end
      if have < tonumber(ARGV[i + 4]) then return {-1, i, have} end
    end
    for i = 1, n do redis.call('DECRBY', KEYS[i + 2], ARGV[i + 4]) end
    redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]) + ${GRACE_SECONDS})
    redis.call('ZADD', KEYS[2], ARGV[4], ARGV[1])
    return {1}
  `,
})

// KEYS: [reservationKey, expirySet]   ARGV: [resId]
// Put the units back. ZREM is the "ownership token": only the caller whose ZREM returns 1 restores stock,
// so cancel + TTL sweeper + retries can race and stock is still restored exactly once.
redis.defineCommand('releaseReservation', {
  numberOfKeys: 2,
  lua: `
    if redis.call('ZREM', KEYS[2], ARGV[1]) == 0 then return 0 end
    local raw = redis.call('GET', KEYS[1])
    if raw then
      local r = cjson.decode(raw)
      for _, it in ipairs(r.stock) do redis.call('INCRBY', 'stock:' .. it.p, it.q) end
      redis.call('DEL', KEYS[1])
    end
    return 1
  `,
})

// KEYS: [reservationKey, expirySet]   ARGV: [resId]
// Payment succeeded: the units are sold. Drop the reservation but do NOT restore stock.
redis.defineCommand('finalizeReservation', {
  numberOfKeys: 2,
  lua: `
    if redis.call('ZREM', KEYS[2], ARGV[1]) == 0 then return 0 end
    redis.call('DEL', KEYS[1])
    return 1
  `,
})

// KEYS: [stockKey1..N]   ARGV: [qty1..N]   All-or-nothing decrement (used for late payments).
redis.defineCommand('takeStock', {
  lua: `
    for i = 1, #KEYS do
      local have = tonumber(redis.call('GET', KEYS[i]))
      if have == nil or have < tonumber(ARGV[i]) then return 0 end
    end
    for i = 1, #KEYS do redis.call('DECRBY', KEYS[i], ARGV[i]) end
    return 1
  `,
})

/* ------------------------------- Stock keys ------------------------------ */

// Load stock into Redis for any product that has no key yet (NX = never overwrite live counts).
export async function hydrateStock() {
  const products = await Product.find({}, 'stock').lean()
  if (!products.length) return 0
  const pipe = redis.pipeline()
  products.forEach((p) => pipe.set(STOCK(p._id), p.stock, 'NX'))
  await pipe.exec()
  return products.length
}

// Overwrite Redis stock (seed script).
export async function resetStock(products) {
  const pipe = redis.pipeline()
  products.forEach((p) => pipe.set(STOCK(p._id), p.stock))
  await pipe.exec()
}

export const removeStockKey = (productId) => redis.del(STOCK(productId))
// Relative change so units currently held by shoppers are not clobbered when an admin edits stock.
export const adjustStock = (productId, delta) => redis.incrby(STOCK(productId), delta)

/** Live available stock for many products: Map(productId -> number). Falls back to Mongo if a key is missing. */
export async function getLiveStock(products) {
  if (!products.length) return new Map()
  const values = await redis.mget(products.map((p) => STOCK(p._id ?? p.id)))
  const map = new Map()
  const repair = []
  products.forEach((p, i) => {
    const id = String(p._id ?? p.id)
    if (values[i] === null) {
      map.set(id, p.stock)
      repair.push(redis.set(STOCK(id), p.stock, 'NX'))
    } else map.set(id, Math.max(0, Number(values[i])))
  })
  if (repair.length) await Promise.all(repair)
  return map
}

/* ------------------------------ Reservations ----------------------------- */

const aggregate = (items) => {
  const m = new Map()
  items.forEach((i) => m.set(String(i.productId), (m.get(String(i.productId)) || 0) + i.qty))
  return [...m].map(([p, q]) => ({ p, q }))
}

/**
 * Atomically hold stock for a shopper.
 * `lines` are already price-checked by the caller: [{productId, name, color, size, qty, price, ...}]
 */
export async function reserve({ userId, lines, meta = {} }) {
  await releaseUserReservation(userId) // one active hold per shopper: no hoarding

  const id = crypto.randomUUID()
  const stock = aggregate(lines)
  const ttl = env.reservationTtlSeconds
  const expiresAt = Date.now() + ttl * 1000
  const payload = { id, userId: String(userId), lines, stock, expiresAt, ...meta }

  // For commands with a variable number of keys, ioredis expects the key count as the first argument.
  const keys = [RESV(id), EXPIRY_SET, ...stock.map((s) => STOCK(s.p))]
  const args = [id, JSON.stringify(payload), ttl, expiresAt, ...stock.map((s) => s.q)]
  const res = await redis.reserveStock(keys.length, ...keys, ...args)
  const [status, index, have] = res
  if (status !== 1) {
    const line = lines.find((l) => String(l.productId) === stock[index - 1].p)
    if (status === -1) {
      throw conflict(
        have > 0 ? `Only ${have} of "${line.name}" left. Please lower the quantity.` : `"${line.name}" just sold out.`,
        'OUT_OF_STOCK',
      )
    }
    throw conflict(`"${line.name}" is not available right now.`, 'OUT_OF_STOCK')
  }
  await redis.set(USER_RESV(userId), id, 'EX', ttl + GRACE_SECONDS)
  return payload
}

/** The reservation if it is still live, else null. */
export async function getReservation(id) {
  if (!id) return null
  const [raw, score] = await Promise.all([redis.get(RESV(id)), redis.zscore(EXPIRY_SET, id)])
  if (!raw || score === null) return null // finalized, released or swept
  const r = JSON.parse(raw)
  return r.expiresAt > Date.now() ? r : null
}

export const releaseReservation = async (id) => (await redis.releaseReservation(RESV(id), EXPIRY_SET, id)) === 1
export const finalizeReservation = async (id) => (await redis.finalizeReservation(RESV(id), EXPIRY_SET, id)) === 1

export async function releaseUserReservation(userId) {
  const old = await redis.get(USER_RESV(userId))
  if (!old) return null
  const released = await releaseReservation(old)
  await redis.del(USER_RESV(userId))
  return released ? old : null
}

/** Late payment: reservation is gone, so try to grab the units again, all or nothing. */
export async function takeStockNow(lines) {
  const stock = aggregate(lines)
  const keys = stock.map((s) => STOCK(s.p))
  return (await redis.takeStock(keys.length, ...keys, ...stock.map((s) => s.q))) === 1
}

/* --------------------------------- Sweeper -------------------------------- */

/** Release every reservation whose time is up. Safe to run on many servers at once. */
export async function sweepExpired(onReleased) {
  const due = await redis.zrangebyscore(EXPIRY_SET, '-inf', Date.now(), 'LIMIT', 0, 100)
  for (const id of due) {
    if (await releaseReservation(id)) await onReleased?.(id)
  }
  return due.length
}
