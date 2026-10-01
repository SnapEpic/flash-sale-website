import Redis from 'ioredis'
import { env } from './env.js'

// One shared connection. ioredis reconnects automatically; commands issued while
// disconnected are rejected quickly (see maxRetriesPerRequest) instead of hanging forever.
export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 300, 3000),
})

redis.on('ready', () => console.log('[redis] ready'))
redis.on('error', (err) => console.error('[redis] error:', err.code || err.message))
redis.on('end', () => console.warn('[redis] connection closed'))

export const redisIsUp = () => redis.status === 'ready'
