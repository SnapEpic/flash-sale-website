import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Star, X } from 'lucide-react'
import Overlay from './Overlay'
import SmartImage from './SmartImage'
import StockIndicator from './StockIndicator'
import Button from './Button'
import Countdown from './Countdown'
import { ColorPicker, SizePicker } from './Selectors'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/format'

function Body({ product, onClose }) {
  const { addToCart, buyNow, toggleWishlist, isWished } = useStore()
  const [img, setImg] = useState(0)
  const [color, setColor] = useState(product.colors[0].name)
  const [size, setSize] = useState(product.sizes[0])
  const stage = useRef(null)
  const wished = isWished(product.id)
  const soldOut = product.stock <= 0

  return (
    <div className="grid md:grid-cols-2">
      <div className="relative bg-bone p-3 md:p-4">
        <div ref={stage} className="relative aspect-square overflow-hidden rounded-2xl md:aspect-[4/5]">
          <SmartImage src={product.images[img]} alt={`${product.name}, view ${img + 1}`} className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-signal px-3 py-1 text-sm font-bold text-white">-{product.discount}%</span>
        </div>
        <div className="mt-3 flex gap-2">
          {product.images.map((src, i) => (
            <button key={i} onClick={() => setImg(i)} aria-label={`Show image ${i + 1}`} aria-pressed={img === i} className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition ${img === i ? 'border-signal' : 'border-transparent opacity-70 hover:opacity-100'}`}>
              <SmartImage src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 md:p-8">
        <div>
          <p className="text-sm text-stone">{product.brand}</p>
          <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight md:text-3xl">{product.name}</h2>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
            <Star className="h-4 w-4 fill-ink" aria-hidden /> <span className="font-semibold">{product.rating}</span>
            <span className="text-stone">{product.reviews.toLocaleString()} reviews</span>
          </p>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-extrabold tracking-tight text-signal">{money(product.price)}</span>
          <s className="text-lg text-stone">{money(product.originalPrice)}</s>
          <span className="rounded-full bg-signal/10 px-2.5 py-1 text-xs font-bold text-signal">Save {money(product.originalPrice - product.price)}</span>
        </div>

        <p className="max-w-md leading-relaxed text-ink/75">{product.description}</p>
        <ColorPicker colors={product.colors} value={color} onChange={setColor} />
        <SizePicker sizes={product.sizes} value={size} onChange={setSize} />
        <StockIndicator stock={product.stock} total={product.totalStock} size="lg" />
        <Countdown variant="inline" />

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" disabled={soldOut} onClick={async () => { if (await addToCart(product, { color, size, sourceEl: stage.current })) onClose() }}>{soldOut ? 'Sold out' : 'Add to cart'}</Button>
          <Button variant="dark" className="flex-1" disabled={soldOut} onClick={() => buyNow(product, { color, size })}>Buy now</Button>
          <button
            onClick={() => toggleWishlist(product)} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
            className="grid h-12 w-12 flex-none place-items-center self-center rounded-full border border-ink/15 transition hover:bg-ink/5"
          >
            <Heart className={`h-5 w-5 ${wished ? 'fill-signal text-signal' : ''}`} />
          </button>
        </div>
        <Link to={`/product/${product.id}`} onClick={onClose} className="text-sm font-semibold underline underline-offset-4">View full details</Link>
      </div>
    </div>
  )
}

export default function QuickView() {
  const { quickView, closeQuickView } = useStore()
  return (
    <Overlay open={!!quickView} onClose={closeQuickView} label={quickView ? `Quick view: ${quickView.name}` : 'Quick view'} variant="center"
      className="max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-paper shadow-2xl sm:max-w-4xl sm:rounded-3xl">
      {quickView && (
        <>
          <button onClick={closeQuickView} aria-label="Close quick view" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md hover:bg-white">
            <X className="h-5 w-5" />
          </button>
          <Body key={quickView.id} product={quickView} onClose={closeQuickView} />
        </>
      )}
    </Overlay>
  )
}
