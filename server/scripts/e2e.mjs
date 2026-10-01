/**
 * End-to-end test of the API against a REAL MongoDB and a REAL Redis.
 *   npm run test:e2e      (MongoDB + Redis must be running; the database is re-seeded first)
 *
 * The only thing replaced is the network call to Razorpay (gateway.createOrder / gateway.refund).
 * Signature verification is NOT mocked: the test signs payments with the real HMAC algorithm.
 */
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import mongoose from 'mongoose'
import { env } from '../src/config/env.js'
import { redis } from '../src/config/redis.js'
import { connectMongo } from '../src/config/db.js'
import { createApp } from '../src/app.js'
import { User, hashPassword } from '../src/models/User.js'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { Cart } from '../src/models/Cart.js'
import { signToken, COOKIE_NAME } from '../src/middleware/auth.js'
import { gateway } from '../src/services/razorpay.js'
import { sweepExpired } from '../src/services/stock.js'
import { onReservationExpired } from '../src/services/orderService.js'

/* ------------------------------ tiny test kit ----------------------------- */
let passed = 0, failed = 0
const check = (name, cond, extra = '') => {
  if (cond) { passed += 1; console.log(`  ok   ${name}`) } else { failed += 1; console.log(`  FAIL ${name} ${extra}`) }
}
const section = (t) => console.log(`\n== ${t}`)
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), `(got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`)

/* ---------------------------------- setup --------------------------------- */
console.log('Re-seeding database...')
execFileSync('node', ['src/seed/seed.js'], { stdio: 'ignore' })
await connectMongo()
await redis.ping()

const server = createApp().listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`

// Fake ONLY the network calls to Razorpay.
const rp = { orders: [], refunds: [] }
gateway.createOrder = async ({ amount, currency, receipt }) => {
  const id = `order_T${crypto.randomBytes(6).toString('hex')}`
  rp.orders.push({ id, amount, currency, receipt })
  return { id, amount, currency }
}
gateway.refund = async (paymentId, amount) => { rp.refunds.push({ paymentId, amount }); return { id: 'rfnd_test' } }

const sign = (orderId, paymentId, secret = env.razorpay.keySecret) => crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')

class Client {
  constructor(token) { this.cookie = token ? `${COOKIE_NAME}=${token}` : '' }
  async req(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined && !(body instanceof Buffer) ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : body instanceof Buffer ? body : JSON.stringify(body),
    })
    const set = res.headers.getSetCookie?.() || []
    for (const c of set) { const [pair] = c.split(';'); if (pair.startsWith(`${COOKIE_NAME}=`)) this.cookie = pair.split('=')[1] ? pair : '' }
    let json = null
    try { json = await res.json() } catch { /* empty body */ }
    return { status: res.status, body: json, headers: res.headers }
  }
  get = (p) => this.req('GET', p)
  post = (p, b = {}) => this.req('POST', p, b)
  put = (p, b = {}) => this.req('PUT', p, b)
  del = (p) => this.req('DELETE', p)
}

let n = 0
async function makeUser(role = 'USER') {
  n += 1
  const user = await User.create({ name: `Tester ${n}`, email: `tester${n}.${Date.now()}@example.com`, password: await hashPassword('Passw0rdTest'), role })
  const c = new Client(signToken(user._id)); c.user = user; return c
}
const clearKeys = async (pattern) => { const k = await redis.keys(pattern); if (k.length) await redis.del(...k) }
const anon = new Client()
const admin = await makeUser('ADMIN')

const catalog = (await anon.get('/products?limit=100')).body.products
const P = (name) => catalog.find((p) => p.name === name)
const stockOf = async (p) => Number(await redis.get(`stock:${p.id}`))
const ADDRESS = { fullName: 'Asha Verma', phone: '9876543210', line1: '12 MG Road', city: 'Indore', state: 'Madhya Pradesh', postalCode: '452001', country: 'India' }
const reserveBuyNow = (c, p, qty = 1) => c.post('/checkout/reserve', { mode: 'buyNow', item: { productId: p.id, color: p.colors[0].name, size: p.sizes[0], qty } })

/* ---------------------------------- tests --------------------------------- */
try {
  section('Health')
  eq('health ok', (await anon.get('/health')).body, { ok: true, mongo: true, redis: true })

  section('Authentication')
  await clearKeys('rl:*')
  let r = await anon.post('/auth/register', { name: 'A', email: 'nope', password: 'short', confirmPassword: 'x' })
  eq('register validation -> 400', r.status, 400)
  check('field errors returned', r.body.errors?.email && r.body.errors?.password && r.body.errors?.confirmPassword)
  const email = `reg.${Date.now()}@example.com`
  const web = new Client()
  r = await web.post('/auth/register', { name: 'Riya Sharma', email, password: 'Passw0rd1', confirmPassword: 'Passw0rd1' })
  eq('register -> 201', r.status, 201)
  check('response has no password hash', r.body.user && !('password' in r.body.user) && r.body.user.role === 'USER')
  const stored = await User.findOne({ email }).select('+password')
  check('password stored hashed (bcrypt)', /^\$2[aby]\$/.test(stored.password) && stored.password !== 'Passw0rd1')
  eq('/me with cookie -> 200', (await web.get('/auth/me')).status, 200)
  eq('duplicate email -> 409', (await anon.post('/auth/register', { name: 'Riya Again', email, password: 'Passw0rd1', confirmPassword: 'Passw0rd1' })).status, 409)
  eq('logout ok', (await web.post('/auth/logout')).status, 200)
  eq('/me after logout -> 401', (await web.get('/auth/me')).status, 401)
  eq('wrong password -> 401', (await anon.post('/auth/login', { email, password: 'WrongPass1' })).status, 401)
  eq('unknown email -> 401 (same message)', (await anon.post('/auth/login', { email: 'ghost@example.com', password: 'WrongPass1' })).body.message, 'Incorrect email or password.')
  r = await web.post('/auth/login', { email, password: 'Passw0rd1' })
  eq('login -> 200', r.status, 200)
  eq('/me after login -> 200', (await web.get('/auth/me')).body.user.email, email)
  const bad = new Client('not.a.jwt'); r = await bad.get('/auth/me')
  check('invalid token -> 401 TOKEN_INVALID', r.status === 401 && r.body.code === 'TOKEN_INVALID')
  const expired = new Client((await import('jsonwebtoken')).default.sign({ sub: String(stored._id) }, env.jwtSecret, { expiresIn: -10 })); r = await expired.get('/auth/me')
  check('expired token -> 401 TOKEN_EXPIRED', r.status === 401 && r.body.code === 'TOKEN_EXPIRED')
  eq('protected route without login -> 401', (await anon.get('/cart')).status, 401)

  section('Catalogue, categories, search, cache')
  eq('26 products from MongoDB', catalog.length, 26)
  r = await anon.get('/categories'); eq('8 categories', r.body.categories.length, 8)
  check('category product counts add up to 26', r.body.categories.reduce((s, c) => s + c.productCount, 0) === 26)
  eq('category by slug', (await anon.get('/categories/sneakers')).body.category.name, 'Sneakers')
  eq('unknown category -> 404', (await anon.get('/categories/nope')).status, 404)
  await redis.incr('cache:version') // start from a cold cache
  r = await anon.get('/products/flash-sale'); const miss = r.headers.get('x-cache')
  r = await anon.get('/products/flash-sale'); const hit = r.headers.get('x-cache')
  check('flash-sale cache: MISS then HIT', miss === 'MISS' && hit === 'HIT', `${miss}/${hit}`)
  eq('flash-sale has 24 items', r.body.products.length, 24)
  r = await anon.get('/products/search?q=sneaker'); check('search "sneaker" finds the 4 sneakers by category', r.body.products.length === 4)
  r = await anon.get('/products/search?q=halden'); check('search by brand', r.body.products.length >= 3 && r.body.products.every((p) => p.brand === 'Halden'))
  r = await anon.get('/products/search?q=zzzz'); eq('search with no results -> empty list', r.body.products.length, 0)
  r = await anon.get('/products/search?q=.*'); eq('regex characters are escaped', r.status, 200)
  eq('by category endpoint', (await anon.get('/products/category/watches')).body.products.length, 3)
  const apex = P('Apex Runner')
  r = await anon.get(`/products/${apex.id}`); check('product by id includes live stock', r.body.product.stock === 12 && r.body.product.category === 'sneakers')
  eq('bad id -> 404', (await anon.get('/products/not-an-id')).status, 404)
  eq('missing id -> 404', (await anon.get('/products/64b64b64b64b64b64b64b64b')).status, 404)
  eq('unknown api route -> 404 json', (await anon.get('/nothing-here')).status, 404)

  section('Cart')
  const u = await makeUser()
  const bottle = P('Terra Insulated Bottle'), cardholder = P('Slim Cardholder')
  r = await u.post('/cart/items', { productId: bottle.id, color: 'Olive', size: '500 ml', qty: 2 }); eq('add to cart -> 201', r.status, 201)
  r = await u.post('/cart/items', { productId: bottle.id, color: 'Olive', size: '500 ml', qty: 1 }); eq('adding same variant merges qty', r.body.items[0].qty, 3)
  const lineId = r.body.items[0].id
  r = await u.put(`/cart/items/${lineId}`, { qty: 5 }); eq('update quantity', r.body.items[0].qty, 5)
  eq('qty above 10 rejected', (await u.put(`/cart/items/${lineId}`, { qty: 11 })).status, 400)
  eq('invalid colour rejected', (await u.post('/cart/items', { productId: bottle.id, color: 'Pink', size: '500 ml', qty: 1 })).status, 400)
  eq('invalid product id rejected', (await u.post('/cart/items', { productId: 'zzz', color: 'Olive', size: '500 ml', qty: 1 })).status, 400)
  eq('deleted/unknown product rejected', (await u.post('/cart/items', { productId: '64b64b64b64b64b64b64b64b', color: 'Olive', size: '500 ml', qty: 1 })).status, 400)
  const vortex = P('Vortex Controller') // only 4 in stock
  r = await u.post('/cart/items', { productId: vortex.id, color: 'Onyx', size: 'One size', qty: 6 }); check('more than stock -> 409 OUT_OF_STOCK', r.status === 409 && r.body.code === 'OUT_OF_STOCK')
  r = await u.del(`/cart/items/${lineId}`); eq('remove line', r.body.items.length, 0)
  eq('removal is persisted (re-read from MongoDB)', (await u.get('/cart')).body.items.length, 0)
  await u.post('/cart/items', { productId: cardholder.id, color: 'Onyx', size: 'One size', qty: 1 })
  await Product.updateOne({ _id: cardholder.id }, { $set: { price: 31 } })
  r = await u.get('/cart'); check('price change is reported', r.body.items[0].priceChanged === true && r.body.items[0].unitPrice === 31 && r.body.items[0].previousPrice === 29)
  await Product.updateOne({ _id: cardholder.id }, { $set: { price: 29 } })
  await redis.set(`stock:${cardholder.id}`, 0); r = await u.get('/cart'); check('sold-out line flagged', r.body.items[0].soldOut === true)
  await redis.set(`stock:${cardholder.id}`, 45)
  r = await u.del('/cart'); eq('clear cart', r.body.items.length, 0)
  const u2 = await makeUser(); r = await u2.get('/cart'); eq('carts are per user', r.body.items.length, 0)

  section('Wishlist')
  r = await u.post(`/wishlist/${apex.id}`); eq('add', r.body.productIds, [apex.id])
  r = await u.post(`/wishlist/${apex.id}`); eq('adding twice does not duplicate', r.body.productIds.length, 1)
  eq('list', (await u.get('/wishlist')).body.productIds, [apex.id])
  eq('other user has empty wishlist', (await u2.get('/wishlist')).body.productIds, [])
  eq('remove', (await u.del(`/wishlist/${apex.id}`)).body.productIds, [])
  eq('wishlist unknown product -> 404', (await u.post('/wishlist/64b64b64b64b64b64b64b64b')).status, 404)
  eq('wishlist needs login', (await anon.get('/wishlist')).status, 401)

  section('FLASH SALE: Redis atomic reservation (12 shoppers, 3 units)')
  const candle = P('Ember Candle Trio'); eq('starts with 3 in Redis', await stockOf(candle), 3)
  const crowd = await Promise.all(Array.from({ length: 12 }, () => makeUser()))
  const results = await Promise.all(crowd.map((c) => reserveBuyNow(c, candle, 1)))
  const won = results.filter((x) => x.status === 201), lost = results.filter((x) => x.status === 409)
  eq('exactly 3 reservations succeed', won.length, 3)
  eq('the other 9 are refused with 409', lost.length, 9)
  check('refusals say sold out', lost.every((x) => x.body.code === 'OUT_OF_STOCK'))
  eq('Redis stock is exactly 0 (never negative)', await stockOf(candle), 0)
  eq('MongoDB stock untouched until someone pays', (await Product.findById(candle.id)).stock, 3)
  check('reservation exposes a countdown', won[0].body.expiresAt > Date.now() && won[0].body.totalsOk !== false && won[0].body.totals.total > 0)
  eq('releasing one hold puts 1 unit back', (await crowd[results.indexOf(won[0])].del(`/checkout/reservation/${won[0].body.reservationId}`)).status, 200)
  eq('stock back to 1', await stockOf(candle), 1)
  r = await reserveBuyNow(crowd[results.indexOf(lost[0])], candle, 1); eq('a waiting shopper can now reserve it', r.status, 201)
  eq('stock 0 again', await stockOf(candle), 0)

  section('FLASH SALE: multi-item hold is all-or-nothing')
  const v = await makeUser(); await v.post('/cart/items', { productId: vortex.id, color: 'Onyx', size: 'One size', qty: 2 })
  const stockBefore = await stockOf(vortex)
  await Cart.updateOne({ user: v.user._id }, { $push: { items: { product: candle.id, color: 'Sand', size: 'One size', qty: 1, priceAtAdd: candle.price } } }) // sneak in a sold-out line
  r = await v.post('/checkout/reserve', { mode: 'cart' })
  check('cart with a sold-out line is refused', r.status === 409)
  eq('the available item was NOT decremented', await stockOf(vortex), stockBefore)
  eq('empty cart cannot check out', (await (await makeUser()).post('/checkout/reserve', { mode: 'cart' })).status, 400)
  eq('reserve needs login', (await anon.post('/checkout/reserve', { mode: 'cart' })).status, 401)

  section('Payment: happy path (buy now)')
  const buyer = await makeUser()
  r = await reserveBuyNow(buyer, bottle, 2); eq('reserve 2 bottles', r.status, 201)
  const res1 = r.body; eq('Redis 17 -> 15', await stockOf(bottle), 15)
  eq('totals computed server-side', res1.totals.subtotal, 44)
  r = await buyer.post('/orders', { reservationId: res1.reservationId, shippingAddress: { ...ADDRESS, phone: '12' } }); eq('bad address -> 400', r.status, 400)
  r = await buyer.post('/orders', { reservationId: res1.reservationId, shippingAddress: ADDRESS }); eq('create order -> 201', r.status, 201)
  const o1 = r.body.order
  check('order is PENDING/PENDING', o1.orderStatus === 'PENDING' && o1.paymentStatus === 'PENDING')
  eq('amount in paise = total x rate x 100', o1.amountPaise, Math.round(o1.total * env.usdToInr * 100))
  const again = await buyer.post('/orders', { reservationId: res1.reservationId, shippingAddress: ADDRESS }); eq('creating twice returns the same order', again.body.order.id, o1.id)
  eq("someone else cannot use my reservation (404, reveals nothing)", (await (await makeUser()).post('/orders', { reservationId: res1.reservationId, shippingAddress: ADDRESS })).status, 404)
  r = await buyer.post('/payment/create-order', { orderId: o1.id }); eq('create Razorpay order', r.status, 200)
  const pay1 = r.body; check('gateway got the right amount + INR', rp.orders.at(-1).amount === o1.amountPaise && rp.orders.at(-1).currency === 'INR')
  check('secret key never sent to browser', !JSON.stringify(pay1).includes(env.razorpay.keySecret) && pay1.keyId === env.razorpay.keyId)
  eq('order still not paid before verification', (await Order.findById(o1.id)).paymentStatus, 'PENDING')
  r = await buyer.post('/payment/verify', { orderId: o1.id, razorpay_order_id: pay1.razorpayOrderId, razorpay_payment_id: 'pay_FAKE1', razorpay_signature: 'deadbeef' })
  check('forged signature rejected', r.status === 400 && r.body.code === 'BAD_SIGNATURE')
  r = await buyer.post('/payment/verify', { orderId: o1.id, razorpay_order_id: pay1.razorpayOrderId, razorpay_payment_id: 'pay_FAKE1', razorpay_signature: sign('order_OTHER', 'pay_FAKE1') })
  eq('signature for a different order rejected', r.status, 400)
  eq('still PENDING after forged attempts', (await Order.findById(o1.id)).paymentStatus, 'PENDING')
  eq("another user cannot verify my order", (await (await makeUser()).post('/payment/verify', { orderId: o1.id, razorpay_order_id: pay1.razorpayOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(pay1.razorpayOrderId, 'pay_1') })).status, 404)
  r = await buyer.post('/payment/verify', { orderId: o1.id, razorpay_order_id: pay1.razorpayOrderId, razorpay_payment_id: 'pay_REAL1', razorpay_signature: sign(pay1.razorpayOrderId, 'pay_REAL1') })
  eq('valid signature -> 200', r.status, 200)
  check('order is PAID + CONFIRMED with payment id', r.body.order.paymentStatus === 'PAID' && r.body.order.orderStatus === 'CONFIRMED' && r.body.order.paymentId === 'pay_REAL1')
  eq('Redis stock stays 15 (units are sold)', await stockOf(bottle), 15)
  const bp = await Product.findById(bottle.id); check('Mongo stock 15 and sold counter went up by 2', bp.stock === 15 && bp.sold === bp.totalStock - 15, `stock=${bp.stock} sold=${bp.sold} total=${bp.totalStock}`)
  eq('reservation removed from Redis', await redis.exists(`resv:${res1.reservationId}`), 0)
  r = await buyer.post('/payment/verify', { orderId: o1.id, razorpay_order_id: pay1.razorpayOrderId, razorpay_payment_id: 'pay_REAL1', razorpay_signature: sign(pay1.razorpayOrderId, 'pay_REAL1') })
  check('verify is idempotent (no double sale)', r.status === 200 && r.body.alreadyPaid === true && (await Product.findById(bottle.id)).stock === 15)
  eq('order shows in history', (await buyer.get('/orders')).body.orders.length, 1)
  eq('order by id', (await buyer.get(`/orders/${o1.id}`)).body.order.orderNumber, o1.orderNumber)
  eq("other user cannot read my order", (await (await makeUser()).get(`/orders/${o1.id}`)).status, 404)
  eq('new user has no orders (empty state)', (await (await makeUser()).get('/orders')).body.orders.length, 0)

  section('Payment: cart checkout clears the cart')
  const cb = await makeUser(); const buds = P('Pocket Buds 2')
  await cb.post('/cart/items', { productId: cardholder.id, color: 'Onyx', size: 'One size', qty: 2 })
  await cb.post('/cart/items', { productId: buds.id, color: 'White', size: 'One size', qty: 1 })
  r = await cb.post('/checkout/reserve', { mode: 'cart' }); const res2 = r.body
  eq('cart reserve: cardholder 45 -> 43', await stockOf(cardholder), 43)
  check('shipping is free at/over the threshold else fee', res2.totals.shipping === (res2.totals.subtotal >= env.freeShippingAt ? 0 : env.shippingFee))
  const o2 = (await cb.post('/orders', { reservationId: res2.reservationId, shippingAddress: ADDRESS })).body.order
  const pay2 = (await cb.post('/payment/create-order', { orderId: o2.id })).body
  await cb.post('/payment/verify', { orderId: o2.id, razorpay_order_id: pay2.razorpayOrderId, razorpay_payment_id: 'pay_REAL2', razorpay_signature: sign(pay2.razorpayOrderId, 'pay_REAL2') })
  eq('cart emptied after payment', (await cb.get('/cart')).body.items.length, 0)
  eq('paid order has 2 lines', (await cb.get(`/orders/${o2.id}`)).body.order.items.length, 2)

  section('Payment failure releases the reservation')
  const fb = await makeUser(); const court = P('Court Low 86'); const s0 = await stockOf(court)
  const resF = (await reserveBuyNow(fb, court, 3)).body; eq('held 3', await stockOf(court), s0 - 3)
  const oF = (await fb.post('/orders', { reservationId: resF.reservationId, shippingAddress: ADDRESS })).body.order
  r = await fb.post('/payment/failed', { orderId: oF.id, reason: 'card declined' })
  check('order FAILED + CANCELLED, never PAID', r.body.order.paymentStatus === 'FAILED' && r.body.order.orderStatus === 'CANCELLED')
  eq('stock released back', await stockOf(court), s0)
  await fb.post('/payment/failed', { orderId: oF.id }); eq('releasing twice does not double-restore', await stockOf(court), s0)
  eq('failed order not in history', (await fb.get('/orders')).body.orders.length, 0)
  r = await fb.post('/payment/create-order', { orderId: oF.id }); eq('cannot pay a cancelled checkout', r.status, 409)
  const resC = (await reserveBuyNow(fb, court, 2)).body; await fb.del(`/checkout/reservation/${resC.reservationId}`)
  eq('closing checkout releases the hold', await stockOf(court), s0)
  const first = (await reserveBuyNow(fb, court, 1)).body; await reserveBuyNow(fb, court, 1)
  eq('a shopper holds only one reservation at a time', await stockOf(court), s0 - 1)
  eq('old reservation is gone', await redis.exists(`resv:${first.reservationId}`), 0)
  await fb.del(`/checkout/reservation/${(await fb.post('/checkout/reserve', { mode: 'buyNow', item: { productId: court.id, color: court.colors[0].name, size: court.sizes[0], qty: 1 } })).body.reservationId}`)

  section('Reservation expiry (TTL sweeper)')
  const eb = await makeUser(); const field = P('Field Automatic'); const f0 = await stockOf(field)
  const resE = (await reserveBuyNow(eb, field, 4)).body
  const oE = (await eb.post('/orders', { reservationId: resE.reservationId, shippingAddress: ADDRESS })).body.order
  const payE = (await eb.post('/payment/create-order', { orderId: oE.id })).body
  await redis.zadd('resv:expiry', Date.now() - 1000, resE.reservationId) // pretend the TTL passed
  const swept = await sweepExpired(onReservationExpired)
  check('sweeper released the hold', swept >= 1 && (await stockOf(field)) === f0)
  const eo = await Order.findById(oE.id); check('order cancelled as RESERVATION_EXPIRED', eo.orderStatus === 'CANCELLED' && eo.failureReason === 'RESERVATION_EXPIRED')
  await sweepExpired(onReservationExpired); eq('sweeping again is a no-op', await stockOf(field), f0)
  r = await eb.post('/orders', { reservationId: resE.reservationId, shippingAddress: ADDRESS }); check('cannot re-order on an expired hold', r.status === 409)

  section('Late payment after expiry: stock still available -> order is honoured')
  r = await eb.post('/payment/verify', { orderId: oE.id, razorpay_order_id: payE.razorpayOrderId, razorpay_payment_id: 'pay_LATE1', razorpay_signature: sign(payE.razorpayOrderId, 'pay_LATE1') })
  check('paid despite expired hold', r.status === 200 && r.body.order.paymentStatus === 'PAID')
  eq('stock re-taken exactly once', await stockOf(field), f0 - 4)

  section('Late payment after expiry: sold out meanwhile -> automatic refund')
  const late = await makeUser(); const halo = P('Halo ANC Headphones'); const h0 = await stockOf(halo)
  const resL = (await reserveBuyNow(late, halo, 3)).body
  const oL = (await late.post('/orders', { reservationId: resL.reservationId, shippingAddress: ADDRESS })).body.order
  const payL = (await late.post('/payment/create-order', { orderId: oL.id })).body
  await redis.zadd('resv:expiry', Date.now() - 1000, resL.reservationId); await sweepExpired(onReservationExpired)
  const sniper = await makeUser(); r = await reserveBuyNow(sniper, halo, h0); eq('someone else grabs every unit', r.status, 201)
  eq('Redis stock 0', await stockOf(halo), 0)
  r = await late.post('/payment/verify', { orderId: oL.id, razorpay_order_id: payL.razorpayOrderId, razorpay_payment_id: 'pay_LATE2', razorpay_signature: sign(payL.razorpayOrderId, 'pay_LATE2') })
  check('409 SOLD_OUT_REFUNDED', r.status === 409 && r.body.code === 'SOLD_OUT_REFUNDED')
  check('Razorpay refund requested for the full amount', rp.refunds.at(-1)?.paymentId === 'pay_LATE2' && rp.refunds.at(-1)?.amount === oL.amountPaise)
  const lo = await Order.findById(oL.id); check('order REFUNDED + CANCELLED', lo.paymentStatus === 'REFUNDED' && lo.orderStatus === 'CANCELLED')
  eq('stock stays 0 (no oversell)', await stockOf(halo), 0)

  section('Webhook (customer paid then closed the tab)')
  const wb = await makeUser(); const mouse = P('Pulse Air Mouse')
  const resW = (await reserveBuyNow(wb, mouse, 1)).body
  const oW = (await wb.post('/orders', { reservationId: resW.reservationId, shippingAddress: ADDRESS })).body.order
  const payW = (await wb.post('/payment/create-order', { orderId: oW.id })).body
  const raw = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_HOOK1', order_id: payW.razorpayOrderId } } } }))
  r = await anon.req('POST', '/payment/webhook', raw, { 'x-razorpay-signature': 'bad' }); eq('webhook with bad signature -> 400', r.status, 400)
  eq('order untouched', (await Order.findById(oW.id)).paymentStatus, 'PENDING')
  r = await anon.req('POST', '/payment/webhook', raw, { 'x-razorpay-signature': crypto.createHmac('sha256', env.razorpay.webhookSecret).update(raw).digest('hex') })
  eq('signed webhook -> 200', r.status, 200)
  const wo = await Order.findById(oW.id); check('order PAID via webhook', wo.paymentStatus === 'PAID' && wo.paymentId === 'pay_HOOK1')

  section('Flash sale window')
  const sb = await makeUser(); await redis.set('flashsale:endsAt', Date.now() - 1000)
  eq('status reports ended', (await anon.get('/flash-sale/status')).body.live, false)
  r = await reserveBuyNow(sb, P('Mono Hi-Top'), 1); check('flash item cannot be reserved after the sale', r.status === 409 && r.body.code === 'SALE_ENDED')
  r = await sb.post('/cart/items', { productId: P('Mono Hi-Top').id, color: 'Onyx', size: 'US 7', qty: 1 }); eq('...nor added to cart', r.status, 409)
  const regular = P('Lumen Slate 11'); check('non-flash item is unaffected', (await reserveBuyNow(sb, regular, 1)).status === 201)
  eq('restart is admin only', (await sb.post('/flash-sale/restart')).status, 403)
  r = await admin.post('/flash-sale/restart'); check('admin restarts the sale', r.status === 200 && r.body.live === true)

  section('Authorization + admin catalogue')
  const newProduct = { name: 'Test Lamp', brand: 'Testco', category: 'lifestyle', price: 20, originalPrice: 40, images: ['https://example.com/a.jpg'], colors: [{ name: 'White', hex: '#FFFFFF' }], stock: 5, isFlashSale: true }
  eq('anonymous cannot create product', (await anon.post('/products', newProduct)).status, 401)
  eq('normal user cannot create product', (await u.post('/products', newProduct)).status, 403)
  eq('invalid product body -> 400', (await admin.post('/products', { ...newProduct, price: 99 })).status, 400)
  r = await admin.post('/products', newProduct); eq('admin creates product', r.status, 201)
  const lamp = r.body.product; check('slug, discount and live stock set', lamp.slug === 'test-lamp' && lamp.discount === 50 && lamp.stock === 5 && lamp.category === 'lifestyle')
  const holder = await makeUser(); await reserveBuyNow(holder, lamp, 2)
  r = await admin.put(`/products/${lamp.id}`, { stock: 10 }); eq('admin raises stock 5 -> 10', r.status, 200)
  eq('Redis keeps the 2 held units out: 8 available', await stockOf(lamp), 8)
  eq('cache refreshed after edit', (await anon.get(`/products/${lamp.id}`)).body.product.stock, 8)
  eq('normal user cannot delete', (await u.del(`/products/${lamp.id}`)).status, 403)
  eq('admin deletes', (await admin.del(`/products/${lamp.id}`)).status, 200)
  eq('deleted product gone', (await anon.get(`/products/${lamp.id}`)).status, 404)
  eq('stock key removed', await redis.exists(`stock:${lamp.id}`), 0)
  eq('admin lists all orders', (await admin.get('/orders/admin/all')).status, 200)
  eq('user cannot list all orders', (await u.get('/orders/admin/all')).status, 403)
  r = await admin.req('PATCH', `/orders/${o1.id}/status`, { status: 'PROCESSING' }); eq('admin moves paid order to PROCESSING', r.body.order?.orderStatus, 'PROCESSING')
  eq('cannot skip to DELIVERED', (await admin.req('PATCH', `/orders/${o1.id}/status`, { status: 'DELIVERED' })).status, 400)
  eq('upload needs admin', (await u.post('/uploads/images')).status, 403)
  r = await admin.post('/uploads/images'); check('upload without Cloudinary config -> clean 503', r.status === 503 && r.body.code === 'UPLOADS_NOT_CONFIGURED')

  section('Rate limiting (Redis)')
  await clearKeys('rl:login:*')
  const codes = []
  for (let i = 0; i < 12; i += 1) codes.push((await anon.post('/auth/login', { email: 'ghost@example.com', password: 'WrongPass1' })).status)
  check('11th+ login attempt -> 429', codes.slice(0, 10).every((c) => c === 401) && codes[10] === 429 && codes[11] === 429, codes.join(','))
  await clearKeys('rl:*')

  section('Error handling')
  r = await anon.req('POST', '/auth/login', undefined, { 'Content-Type': 'application/json' }); check('empty body handled', r.status === 400)
  r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' }); eq('malformed JSON -> 400', r.status, 400)
  const txt = JSON.stringify((await anon.get('/products/not-an-id')).body); check('no stack traces / secrets in error bodies', !/at \w+ \(|node_modules|JWT_SECRET|mongodb:\/\//.test(txt))
} catch (err) {
  failed += 1
  console.error('\nTEST CRASHED:', err)
} finally {
  console.log(`\n${passed} passed, ${failed} failed`)
  server.close()
  await mongoose.disconnect()
  redis.disconnect()
  process.exit(failed ? 1 : 0)
}
