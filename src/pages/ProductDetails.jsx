import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heart, PackageSearch, RotateCcw, ShieldCheck, Star, Truck } from 'lucide-react'
import SmartImage from '../components/SmartImage'
import StockIndicator from '../components/StockIndicator'
import Countdown from '../components/Countdown'
import Button from '../components/Button'
import ProductGrid from '../components/ProductGrid'
import EmptyState from '../components/EmptyState'
import { ColorPicker, QtyStepper, SizePicker } from '../components/Selectors'
import { REVIEWS } from '../data/content'
import { useStore } from '../context/StoreContext'
import useRemote from '../hooks/useRemote'
import { api } from '../lib/api'
import { money } from '../lib/format'

function Details({ product }) {
  const { products: PRODUCTS, addToCart, buyNow, toggleWishlist, isWished } = useStore()
  const soldOut = product.stock <= 0
  const maxQty = Math.max(1, Math.min(10, product.stock))
  const [img, setImg] = useState(0)
  const [color, setColor] = useState(product.colors[0].name)
  const [size, setSize] = useState(product.sizes[0])
  const [qty, setQty] = useState(1)
  const [origin, setOrigin] = useState('50% 50%')
  const stage = useRef(null)
  const wished = isWished(product.id)

  const related = useMemo(() => {
    const same = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id)
    const rest = PRODUCTS.filter((p) => p.category !== product.category && p.isFlashSale)
    return [...same, ...rest].slice(0, 4)
  }, [product, PRODUCTS])
  const reviews = REVIEWS.map((r, i) => ({ ...r, stars: i === 3 ? 4 : 5 }))

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <>
      <div className="container-x grid gap-10 pb-20 pt-28 md:pt-32 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone">
            <Link to="/" className="hover:text-ink">Home</Link> / <Link to={`/category/${product.category}`} className="capitalize hover:text-ink">{product.category}</Link> / <span className="text-ink">{product.name}</span>
          </nav>
          <div className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)]">
            <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
              {product.images.map((src, i) => (
                <button key={i} onClick={() => setImg(i)} aria-label={`Show image ${i + 1} of ${product.images.length}`} aria-pressed={img === i}
                  className={`h-20 w-20 flex-none overflow-hidden rounded-2xl border-2 bg-bone transition sm:h-[88px] sm:w-[88px] ${img === i ? 'border-signal' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <SmartImage src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div ref={stage} onMouseMove={onMove} className="group relative order-1 aspect-[4/5] overflow-hidden rounded-3xl bg-bone sm:order-2">
              <SmartImage src={product.images[img]} alt={`${product.name}, view ${img + 1}`} eager style={{ transformOrigin: origin }} className="h-full w-full object-cover transition-transform duration-300 md:group-hover:scale-[1.6]" />
              <span className="absolute left-4 top-4 rounded-full bg-signal px-3.5 py-1.5 text-sm font-bold text-white">-{product.discount}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:pt-10">
          <div>
            <p className="text-sm text-stone">{product.brand}</p>
            <h1 className="mt-1 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{product.name}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <span className="flex" aria-hidden>{[0, 1, 2, 3, 4].map((s) => <Star key={s} className={`h-4 w-4 ${s < Math.round(product.rating) ? 'fill-ink text-ink' : 'text-ink/25'}`} />)}</span>
              <span className="font-semibold">{product.rating}</span>
              <a href="#reviews" className="text-stone underline underline-offset-4">{product.reviews.toLocaleString()} reviews</a>
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-5xl font-extrabold tracking-tight text-signal">{money(product.price)}</span>
            <s className="text-xl text-stone">{money(product.originalPrice)}</s>
            <span className="rounded-full bg-signal/10 px-3 py-1 text-sm font-bold text-signal">Save {money(product.originalPrice - product.price)}</span>
          </div>

          <div className="rounded-2xl bg-ink p-5 text-bone on-dark">
            <p className="mb-3 text-sm text-bone/60">Sale price ends in</p>
            <Countdown variant="boxes" dark />
            <StockIndicator stock={product.stock} total={product.totalStock} dark size="lg" className="mt-5" />
          </div>

          <p className="max-w-xl leading-relaxed text-ink/75">{product.description}</p>
          <ColorPicker colors={product.colors} value={color} onChange={setColor} />
          <SizePicker sizes={product.sizes} value={size} onChange={setSize} />

          <div className="flex items-center gap-4">
            <QtyStepper value={Math.min(qty, maxQty)} onChange={setQty} max={maxQty} />
            <span className="text-sm text-stone">{soldOut ? 'Currently sold out' : `Max ${maxQty} per order`}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="min-w-[10rem] flex-1" disabled={soldOut} onClick={() => addToCart(product, { color, size, qty: Math.min(qty, maxQty), sourceEl: stage.current })}>{soldOut ? 'Sold out' : 'Add to cart'}</Button>
            <Button size="lg" variant="dark" className="min-w-[10rem] flex-1" disabled={soldOut} onClick={() => buyNow(product, { color, size, qty: Math.min(qty, maxQty) })}>Buy now</Button>
            <button onClick={() => toggleWishlist(product)} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} className="grid h-14 w-14 place-items-center rounded-full border border-ink/15 transition hover:bg-ink/5">
              <Heart className={`h-5 w-5 ${wished ? 'fill-signal text-signal' : ''}`} />
            </button>
          </div>

          <ul className="grid gap-3 rounded-2xl bg-bone p-5 text-sm sm:grid-cols-3">
            <li className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 flex-none" aria-hidden /> Free shipping over $150</li>
            <li className="flex items-start gap-2"><RotateCcw className="mt-0.5 h-4 w-4 flex-none" aria-hidden /> 30-day returns</li>
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 flex-none" aria-hidden /> 1-year warranty</li>
          </ul>

          <div className="divide-y divide-ink/10 border-y border-ink/10">
            <details open className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Product details<span aria-hidden className="text-xl transition group-open:rotate-45">+</span></summary>
              <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
                <dt className="text-stone">Brand</dt><dd>{product.brand}</dd>
                <dt className="text-stone">Category</dt><dd className="capitalize">{product.category}</dd>
                <dt className="text-stone">Colours</dt><dd>{product.colors.map((c) => c.name).join(', ')}</dd>
                <dt className="text-stone">Options</dt><dd>{product.sizes.join(', ')}</dd>
                <dt className="text-stone">SKU</dt><dd className="tnum">{product.sku}</dd>
              </dl>
            </details>
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Shipping and returns<span aria-hidden className="text-xl transition group-open:rotate-45">+</span></summary>
              <p className="mt-4 text-sm leading-relaxed text-ink/75">Orders ship within 24 hours. Standard delivery takes 3 to 5 working days and express takes 1 to 2. Shipping is free on orders over $150, otherwise $9. Return any unworn item within 30 days for a full refund.</p>
            </details>
          </div>
        </div>
      </div>

      <section id="reviews" className="bg-bone py-16 md:py-20" aria-labelledby="reviews-heading">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div>
            <h2 id="reviews-heading" className="h-display text-5xl sm:text-6xl">Reviews</h2>
            <p className="mt-4 font-display text-7xl font-black leading-none">{product.rating}</p>
            <p className="mt-2 text-stone">from {product.reviews.toLocaleString()} verified buyers</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.name} className="rounded-3xl bg-paper p-6">
                <p className="flex" aria-label={`${r.stars} out of 5 stars`}>{[0, 1, 2, 3, 4].map((s) => <Star key={s} aria-hidden className={`h-4 w-4 ${s < r.stars ? 'fill-ink text-ink' : 'text-ink/25'}`} />)}</p>
                <p className="mt-3 font-semibold">{r.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{r.body}</p>
                <p className="mt-4 text-xs text-stone">{r.name}, verified buyer</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x py-16 md:py-20" aria-labelledby="related-heading">
        <h2 id="related-heading" className="h-display mb-10 text-5xl sm:text-6xl">You may also like</h2>
        <ProductGrid products={related} layout="scroll" />
      </section>
    </>
  )
}

export default function ProductDetails() {
  const { id } = useParams()
  const { getProduct } = useStore()
  // Instant paint from the catalogue we already have, then the API copy takes over (and re-polls for live stock).
  const { data: fresh, loading } = useRemote(() => api.get(`/products/${id}`).then((r) => r.data.product), [id], { pollMs: 15000 })
  const product = fresh || getProduct(id)
  if (!product && loading) return <div className="grid min-h-[60svh] place-items-center" role="status" aria-label="Loading"><span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-signal" /></div>
  if (!product) {
    return <div className="container-x pb-20 pt-40"><EmptyState icon={PackageSearch} title="Product not found" text="This deal may have sold out or the link is wrong." cta="See the flash sale" to="/flash-sale" /></div>
  }
  return <Details key={product.id} product={product} />
}
