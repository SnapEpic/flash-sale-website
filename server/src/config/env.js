import 'dotenv/config'

const num = (v, d) => (v === undefined || v === '' ? d : Number(v))
const required = ['MONGO_URI', 'JWT_SECRET', 'REDIS_URL']
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`\n[config] Missing required environment variables: ${missing.join(', ')}\n        Copy server/.env.example to server/.env and fill them in.\n`)
  process.exit(1)
}
if (process.env.JWT_SECRET.length < 16) {
  console.error('[config] JWT_SECRET must be at least 16 characters.')
  process.exit(1)
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 5000),
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === '1',
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  usdToInr: num(process.env.USD_TO_INR, 83),
  freeShippingAt: num(process.env.FREE_SHIPPING_AT, 150),
  shippingFee: num(process.env.SHIPPING_FEE, 9),
  reservationTtlSeconds: num(process.env.RESERVATION_TTL_SECONDS, 600),
  saleDurationMs: Math.round(num(process.env.SALE_DURATION_HOURS, 8.705) * 3600 * 1000),
  admin: {
    name: process.env.ADMIN_NAME || 'Dropline Admin',
    email: process.env.ADMIN_EMAIL || 'admin@dropline.test',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123',
  },
}
