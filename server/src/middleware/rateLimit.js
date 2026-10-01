import { redis } from '../config/redis.js'

// Fixed-window counter in Redis. INCR + EXPIRE run inside one Lua script so they are atomic:
// a crash between the two commands can never leave a counter that never expires.
redis.defineCommand('rlHit', {
  numberOfKeys: 1,
  lua: `
    local c = redis.call('INCR', KEYS[1])
    if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
    return {c, redis.call('TTL', KEYS[1])}
  `,
})

/**
 * rateLimit({ name, windowSec, max, by })
 *  by(req) -> string identifying who is being limited (defaults to client IP)
 * If Redis is unreachable we fail OPEN (let the request through) so a cache outage
 * does not take login down; stock safety does NOT depend on this.
 */
export const rateLimit = ({ name, windowSec, max, by }) => async (req, res, next) => {
  try {
    const who = (by ? by(req) : req.ip) || 'anon'
    const [count, ttl] = await redis.rlHit(`rl:${name}:${who}`, windowSec)
    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count))
    if (count > max) {
      res.setHeader('Retry-After', Math.max(1, ttl))
      return res.status(429).json({ message: `Too many attempts. Please wait ${Math.max(1, ttl)}s and try again.`, code: 'RATE_LIMITED' })
    }
  } catch (err) {
    console.warn('[rateLimit] Redis unavailable, skipping limit:', err.message)
  }
  next()
}
