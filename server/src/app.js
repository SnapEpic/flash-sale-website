import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { redisIsUp } from './config/redis.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import categoryRoutes from './routes/categories.js'
import cartRoutes from './routes/cart.js'
import wishlistRoutes from './routes/wishlist.js'
import checkoutRoutes from './routes/checkout.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes, { webhookHandler } from './routes/payment.js'
import uploadRoutes from './routes/uploads.js'
import flashSaleRoutes from './routes/flashSale.js'
import configRoutes from './routes/config.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', env.trustProxy ? 1 : false)
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({
    origin: (origin, cb) => (!origin || env.clientUrls.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS'))),
    credentials: true,
  }))

  // Razorpay's webhook signature is computed over the RAW bytes, so this route must be mounted before express.json().
  app.post('/api/payment/webhook', express.raw({ type: () => true, limit: '1mb' }), webhookHandler)

  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    const mongo = mongoose.connection.readyState === 1
    const redisOk = redisIsUp()
    res.status(mongo && redisOk ? 200 : 503).json({ ok: mongo && redisOk, mongo, redis: redisOk })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/categories', categoryRoutes)
  app.use('/api/cart', cartRoutes)
  app.use('/api/wishlist', wishlistRoutes)
  app.use('/api/checkout', checkoutRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/payment', paymentRoutes)
  app.use('/api/uploads', uploadRoutes)
  app.use('/api/flash-sale', flashSaleRoutes)
  app.use('/api/config', configRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
