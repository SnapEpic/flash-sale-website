# Dropline — Flash Sale E-commerce (MERN + Redis)

A flash-sale store where limited stock is protected by **Redis**, payments go through **Razorpay (test mode)** and every payment is **verified on the server** before an order is marked paid.

The React storefront is the original Dropline design. This version adds a real Express + MongoDB + Redis backend behind it.

## Tech stack

```text
React 18 · Vite · React Router · Tailwind CSS · Framer Motion · Axios
Node.js · Express · MongoDB (Mongoose) · Redis (ioredis)
JWT (httpOnly cookie) · bcryptjs · zod · Helmet · CORS
Razorpay (payments) · Cloudinary (images)
```

## What is implemented

| Area | What it does |
| --- | --- |
| **Auth** | Register, login, logout, `/me`. bcrypt-hashed passwords, JWT stored in an **httpOnly cookie** (survives refresh, unreadable by JavaScript). Invalid/expired tokens return clear 401s. Roles: `USER`, `ADMIN`. Login page, Register page, protected routes. |
| **Catalogue** | Products and categories live in MongoDB. Products reference categories by `ObjectId`; the UI gets the category slug. `GET /api/products`, `/:id`, `/category/:slug`, `/flash-sale`, `/search?q=`. |
| **Search** | The search overlay and the Flash Sale page call `GET /api/products/search` (name, brand and category; every word must match). Debounced and cancellable in the UI. |
| **Cart** | Stored per user in MongoDB. Quantity limits, stock check on add/update, removed products are dropped, price changes and low stock are flagged in the UI. |
| **Wishlist** | Stored per user in MongoDB, optimistic UI with rollback on error. |
| **Flash sale** | Live stock, atomic reservations and the sale clock all live in Redis (see below). |
| **Checkout + payment** | Reserve stock → address → review → Razorpay Checkout → server-side signature verification → order confirmation. Razorpay webhook supported as a safety net. |
| **Orders** | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, plus admin list and status updates. "My orders" page. |
| **Images** | `POST /api/uploads/images` (admin) streams files to **Cloudinary**; nothing is stored in MongoDB. Seed products keep their existing image URLs. |
| **Admin** | No admin UI was added (the original design had none). Admin actions are API endpoints: create/update/delete products (stock edits are applied to Redis safely), upload images, list orders, move orders to processing/shipped/delivered, restart the sale. |
| **Errors** | One central error handler. Users see friendly messages; stack traces, secrets and database errors stay in the server log. |

### Where Redis is used (all of it is real)

```text
Redis is used for:
- Flash-sale stock counters        stock:<productId>   (atomic, via Lua scripts)
- Atomic stock reservation         all items in an order are checked + decremented in ONE step
- Temporary holds with a TTL       10 minutes by default, released early on cancel / failure
- Expired-hold sweeper             a sorted set of expiry times; the server releases overdue holds every 10 s
- Read-through caching             product lists / categories (60 s), version-number invalidation
- Rate limiting                    login, register, reserve and payment endpoints (fixed window, Lua)
- Flash-sale clock                 the sale end time, so every browser and server agrees
```

## Architecture

```text
            React frontend (Vite)
                    │  Axios, cookie auth
                    ▼
            Express REST API
        ┌───────────┴────────────┐
        ▼                        ▼
     MongoDB                   Redis
  (source of truth)     (fast, atomic, temporary)
  users, products,      live stock, reservations,
  categories, carts,    cache, rate limits,
  wishlists, orders     sale clock

  Payments ──▶ Razorpay        Images ──▶ Cloudinary
```

## Why Redis is used in this project (interview notes)

### The problem
In a flash sale, many people press **Buy now** for the same product at the same moment, and there are only a few units.

### Without Redis (or any atomic operation)
A typical implementation does three separate steps:

```text
1. read stock        → 1
2. check stock > 0   → yes
3. write stock - 1   → 0
```

If two requests run step 1 before either reaches step 3, both see `1` and both succeed. **One unit, two buyers: overselling.** This is a race condition. Doing it in Node (or with two Mongo queries) doesn't fix it, because other requests run between your steps.

### With Redis
Redis runs a Lua script as **one indivisible step**. Redis is single-threaded for command execution, so nothing can run in the middle of the script. `server/src/services/stock.js` does this in one script:

```text
for every item in the order: is stock >= quantity?   (if any item fails, stop, nothing changes)
for every item:              stock = stock - quantity
create the reservation with a TTL
```

Consequences you can explain:
- **No overselling**: 12 people racing for 3 units → exactly 3 succeed, stock never goes below 0 (this is an automated test, see below).
- **All-or-nothing**: a cart with one available and one sold-out item reserves nothing.
- **Fast**: a Redis counter is far cheaper than a MongoDB write under load.
- **Reservations with TTL**: stock is *held* while the customer pays (10 min). If they leave, the sweeper puts it back. If they pay, the hold is finalized.

### The split of responsibilities

```text
MongoDB → persistent source of truth   (what was actually sold, orders, users)
Redis   → fast temporary/atomic flash-sale operations   (what is available right now)
```

`Product.stock` in MongoDB = units not yet sold (includes units currently held). `stock:<id>` in Redis = units available *right now* (not sold, not held). When a payment is verified, MongoDB records the sale; Redis just drops the hold.

## The purchase flow

```text
Buy now / Checkout
   ↓  POST /api/checkout/reserve        Lua: check + decrement stock, create hold (TTL)
Address → Review
   ↓  POST /api/orders                  PENDING order tied to the hold (prices set by the server)
   ↓  POST /api/payment/create-order    Razorpay order created with the server-computed amount
Razorpay Checkout (test mode)
   ↓  POST /api/payment/verify          server recomputes HMAC-SHA256(order_id|payment_id, key_secret)
                                        and compares it in constant time
   ✔ valid   → order claimed PAID atomically → hold finalized → MongoDB stock/sold updated → cart cleared
   ✘ invalid → 400, order stays PENDING
Payment failed   → POST /api/payment/failed  → order FAILED/CANCELLED, hold released, stock available again
Dialog closed    → DELETE /api/checkout/reservation/:id → hold released immediately
Tab closed       → Redis TTL + sweeper release it and cancel the pending order
```

Edge cases that are handled (and tested):
- **Forged or mismatched signature** → rejected, order never becomes PAID.
- **Verify called twice** (or browser + webhook race) → the order is claimed with one atomic MongoDB update, so there is no double sale.
- **Paid after the hold expired** → the server tries to take the units again. If they are gone, it **refunds automatically** via Razorpay and tells the customer.
- **Customer paid and closed the tab** → Razorpay's webhook (`/api/payment/webhook`, signature-checked) confirms the order.
- Only one active hold per customer, so nobody can hoard stock.

> **Currency note.** The catalogue is priced in USD (as in the original UI). Razorpay charges in INR, so the server converts using `USD_TO_INR` (default 83) and the checkout shows both amounts. Change the rate or re-price the catalogue as you like.

## Project structure

```text
.
├── src/                      React app (original design + API integration)
│   ├── context/              AuthContext, StoreContext (catalogue, cart, wishlist, sale clock)
│   ├── lib/api.js            Axios instance + error helpers
│   ├── pages/                Home, FlashSale, Category, ProductDetails, Cart, Wishlist, Orders, Login, Register...
│   └── components/           CheckoutModal (reserve → address → Razorpay → verify), CartDrawer, ...
└── server/
    ├── src/
    │   ├── config/           env, mongo, redis, cloudinary
    │   ├── models/           User, Category, Product, Cart, Wishlist, Order
    │   ├── routes/           auth, products, categories, cart, wishlist, checkout, orders, payment, uploads, flashSale
    │   ├── services/         stock.js (Redis Lua), cache.js, saleClock.js, pricing.js, orderService.js, razorpay.js
    │   ├── middleware/       auth, rateLimit (Redis), validate (zod), errorHandler, upload
    │   └── seed/             catalog.json + seed.js
    └── scripts/              e2e.mjs (API tests), ui-test-server.mjs (browser-test harness)
```

## Setup

You need **Node 18+**, **MongoDB** (local or a free Atlas cluster) and **Redis**.

```bash
# 1. Get the project and install dependencies (frontend + backend)
npm install
npm --prefix server install
# (or: npm run install:all)

# 2. Configure the backend
cp server/.env.example server/.env
#    then edit server/.env:
#      MONGO_URI   mongodb://127.0.0.1:27017/dropline   (or your Atlas string)
#      REDIS_URL   redis://127.0.0.1:6379
#      JWT_SECRET  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#      RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET   Razorpay dashboard → Test mode → API keys

# 3. Start MongoDB and Redis (pick what suits your machine)
mongod                      # or use Atlas
redis-server                # or: docker run -p 6379:6379 redis

# 4. Load the demo data (products, categories, Redis stock, admin account)
npm run seed

# 5. Start the backend (http://localhost:5000)
npm run server

# 6. In a second terminal, start the frontend (http://localhost:5173)
npm run dev
```

The frontend dev server proxies `/api` to `http://localhost:5000`, so no frontend `.env` is needed in development. For production, build with `npm run build` and set `VITE_API_URL` (see `.env.example`), `CLIENT_URL`, `NODE_ENV=production` and `TRUST_PROXY=1` on the server.

### Demo accounts
`npm run seed` creates an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (default `admin@dropline.test` / `ChangeMe123`; change them). Register normal customers in the UI. Only the admin sees the "Restart sale" button when the countdown ends.

### Testing a payment
Use Razorpay **test mode** keys. In the popup, use test card `4111 1111 1111 1111`, any future expiry and any CVV, then the test OTP/"Success" option. To test a failure choose the failure option in Razorpay's test UI. Razorpay's own docs list more test cards.

To receive the optional webhook locally, expose the server (e.g. with a tunnel), add `https://<tunnel>/api/payment/webhook` in the Razorpay dashboard for the `payment.captured` event and put the secret in `RAZORPAY_WEBHOOK_SECRET`.

## API overview

```text
POST   /api/auth/register | /login | /logout        GET /api/auth/me
GET    /api/products  /search?q=  /flash-sale  /category/:slug  /:id
POST   /api/products            (admin)   PUT/DELETE /api/products/:id   (admin)
GET    /api/categories  /:slug
GET    /api/cart                POST /api/cart/items   PUT|DELETE /api/cart/items/:itemId   DELETE /api/cart
GET    /api/wishlist            POST|DELETE /api/wishlist/:productId
POST   /api/checkout/reserve    GET|DELETE /api/checkout/reservation/:id
POST   /api/orders              GET /api/orders   GET /api/orders/:id
POST   /api/payment/create-order | /verify | /failed | /webhook
POST   /api/uploads/images      (admin, multipart field "images" → Cloudinary)
GET    /api/flash-sale/status   POST /api/flash-sale/restart   (admin)
GET    /api/orders/admin/all    PATCH /api/orders/:id/status   (admin)
GET    /api/health | /api/config
```

Cart items use the cart line's own id (`:itemId`) rather than `:productId`, because the same product can be in the bag in several colours/sizes.

Admin image upload example:

```bash
curl -b cookies.txt -F "images=@shoe.jpg" http://localhost:5000/api/uploads/images
```

## Tests

```bash
npm --prefix server run test:e2e
```
Needs MongoDB and Redis running. It **re-seeds the database**, then exercises the real API: auth (hashing, expired/invalid tokens), catalogue + cache hit/miss, cart, wishlist, **12 simultaneous buyers for 3 units**, all-or-nothing multi-item holds, the payment happy path with real HMAC verification, forged signatures, failure release, hold expiry, late payment (honoured, or auto-refunded when sold out), the webhook, the sale window, admin authorization, rate limiting and error handling. Only the two network calls to Razorpay are replaced in tests.

## Honest limitations

- **Razorpay need your own credentials.** The code paths are implemented, and signature verification and error handling are tested, but the live calls to those two services can only be exercised with your keys.
- MongoDB transactions are not used: the order is claimed with one atomic update and Redis scripts are atomic, but a process crash between "order marked paid" and "MongoDB stock decremented" would leave Mongo's counter one sale behind (Redis, which gates purchases, stays correct). A transaction needs a replica set; this is the next step for production.
- Search uses indexed-field regex matching, which is fine for a catalogue of this size; for large catalogues use a text index or Atlas Search.
- The Contact form is still the original demo form (it does not send email), and product reviews are sample testimonials.
- The Redis Lua scripts touch several keys at once, so they assume a single Redis node (not Redis Cluster).
