/**
 * npm run seed  ->  (re)builds the demo catalogue in MongoDB, resets live stock in Redis,
 * restarts the sale clock and makes sure the admin account exists.
 * WARNING: wipes categories, products, carts, wishlists and orders.
 */
import fs from 'node:fs'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { connectMongo } from '../config/db.js'
import { redis } from '../config/redis.js'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { Cart } from '../models/Cart.js'
import { Wishlist } from '../models/Wishlist.js'
import { Order } from '../models/Order.js'
import { User, hashPassword } from '../models/User.js'
import { resetStock } from '../services/stock.js'
import { restartSale } from '../services/saleClock.js'
import { invalidateCache } from '../services/cache.js'

const { categories, products } = JSON.parse(fs.readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'))
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

await connectMongo()

// Clear Redis keys owned by the app (stock, reservations, rate limits, cache) so the demo starts clean.
const stale = [...(await redis.keys('stock:*')), ...(await redis.keys('resv:*')), ...(await redis.keys('rl:*')), ...(await redis.keys('cache:*'))]
if (stale.length) await redis.del(...stale)

await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Cart.deleteMany({}), Wishlist.deleteMany({}), Order.deleteMany({})])
const cats = await Category.insertMany(categories)
const catId = new Map(cats.map((c) => [c.slug, c._id]))

const docs = products.map((p) => ({
  sku: `DL-${String(p.n).padStart(4, '0')}`,
  slug: slugify(p.name),
  name: p.name, brand: p.brand, description: p.description,
  category: catId.get(p.category),
  price: p.price, originalPrice: p.originalPrice, discount: Math.round((1 - p.price / p.originalPrice) * 100),
  images: p.images, colors: p.colors, sizes: p.sizes,
  stock: p.stock, totalStock: p.totalStock, sold: p.totalStock - p.stock,
  isFlashSale: p.isFlashSale, isTrending: p.isTrending, isFeatured: p.isFeatured,
  rating: p.rating, reviews: p.reviews,
  createdAt: new Date(Date.now() - p.daysOld * 86400000), // preserves the "New arrivals" ordering
}))
const created = await Product.insertMany(docs)
await resetStock(created)
await restartSale()
await invalidateCache()

const admin = await User.findOne({ email: env.admin.email.toLowerCase() })
if (admin) { admin.role = 'ADMIN'; await admin.save() }
else await User.create({ name: env.admin.name, email: env.admin.email, password: await hashPassword(env.admin.password), role: 'ADMIN' })

console.log(`[seed] ${cats.length} categories, ${created.length} products, Redis stock loaded, sale restarted`)
console.log(`[seed] admin account: ${env.admin.email} (password from ADMIN_PASSWORD)`)
await mongoose.disconnect()
await redis.quit()
