import { memo, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, Eye, Heart, Plus, Star } from 'lucide-react'
import SmartImage from './SmartImage'
import StockIndicator from './StockIndicator'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/format'

function ProductCard({ product, className = '' }) {
  const { addToCart, toggleWishlist, isWished, openQuickView } = useStore()
  const imgRef = useRef(null)
  const timer = useRef()
  const [added, setAdded] = useState(false)
  const wished = isWished(product.id)

  useEffect(() => () => clearTimeout(timer.current), [])

  const soldOut = product.stock <= 0
  const add = async () => {
    const ok = await addToCart(product, { sourceEl: imgRef.current })
    if (!ok) return
    setAdded(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAdded(false), 1700)
  }

  return (
    <motion.article
      whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={`group relative flex h-full flex-col ${className}`}
    >
      <div ref={imgRef} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-bone">
        <Link to={`/product/${product.id}`} aria-label={`View ${product.name}`} className="absolute inset-0 block">
          <SmartImage src={product.images[0]} alt={product.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
          {product.images[1] && (
            <SmartImage src={product.images[1]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" />
          )}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-signal px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-signal/30 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
          -{product.discount}%
        </span>

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => toggleWishlist(product)}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition-all duration-300 hover:bg-white md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"
          style={wished ? { opacity: 1, transform: 'none' } : undefined}
        >
          <Heart className={`h-[18px] w-[18px] transition ${wished ? 'fill-signal text-signal' : ''}`} />
        </motion.button>

        <button
          onClick={() => openQuickView(product)}
          className="absolute inset-x-3 bottom-3 hidden h-11 items-center justify-center gap-2 rounded-full bg-white/95 text-sm font-semibold text-ink shadow-lg backdrop-blur transition-all duration-300 hover:bg-white md:flex md:translate-y-[150%] md:group-hover:translate-y-0 md:focus-visible:translate-y-0"
        >
          <Eye className="h-4 w-4" aria-hidden /> Quick view
        </button>
        <button
          onClick={() => openQuickView(product)} aria-label={`Quick view ${product.name}`}
          className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur md:hidden"
        >
          <Eye className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 text-xs text-stone">
          <span>{product.brand}</span>
          <span className="inline-flex items-center gap-1 text-ink/80">
            <Star className="h-3.5 w-3.5 fill-ink text-ink" aria-hidden />
            <span className="font-semibold">{product.rating}</span>
            <span className="text-stone">({product.reviews.toLocaleString()})</span>
          </span>
        </div>
        <Link to={`/product/${product.id}`} className="group/link mt-1 inline-flex items-start gap-1 text-[15px] font-semibold leading-snug">
          <span className="line-clamp-2 underline-offset-4 group-hover/link:underline">{product.name}</span>
          <ArrowUpRight className="mt-0.5 h-4 w-4 flex-none -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
        </Link>
        <p className="text-xs capitalize text-stone">{product.category}</p>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight">{money(product.price)}</span>
          <s className="text-sm text-stone">{money(product.originalPrice)}</s>
        </div>

        <StockIndicator stock={product.stock} total={product.totalStock} className="mt-3" />

        <motion.button
          whileTap={{ scale: 0.96 }} onClick={add} disabled={soldOut}
          className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/50 ${added ? 'bg-signal text-white' : 'bg-ink text-bone hover:bg-signal'}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={added ? 'added' : 'idle'}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-2"
            >
              {soldOut ? 'Sold out' : added ? <><Check className="h-4 w-4" aria-hidden /> Added</> : <><Plus className="h-4 w-4" aria-hidden /> Add to cart</>}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.article>
  )
}

export default memo(ProductCard)
