import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../Button'
import Countdown from '../Countdown'
import SmartImage from '../SmartImage'
import StockIndicator from '../StockIndicator'
import Reveal from '../Reveal'
import { useStore } from '../../context/StoreContext'
import { money } from '../../lib/format'

export default function FeaturedDeal() {
  const { products, addToCart, buyNow } = useStore()
  const p = products.find((x) => x.isFeatured)
  const img = useRef(null)
  if (!p) return null
  const soldOut = p.stock <= 0
  return (
    <section className="on-dark bg-coal text-bone" aria-labelledby="deal-heading">
      <div className="grid lg:grid-cols-2">
        <div ref={img} className="relative min-h-[420px] overflow-hidden lg:min-h-[720px]">
          <SmartImage src={p.images[0]} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-coal/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-coal/60" />
          <motion.div initial={{ scale: 0, rotate: -30 }} whileInView={{ scale: 1, rotate: -8 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.2 }} className="absolute left-5 top-5 grid h-28 w-28 place-items-center rounded-full bg-signal text-center font-display text-4xl font-black leading-none shadow-2xl md:left-10 md:top-10 md:h-36 md:w-36 md:text-5xl">
            <span>-{p.discount}%</span>
          </motion.div>
        </div>

        <div className="flex flex-col justify-center px-5 py-16 md:px-12 lg:px-16 xl:px-24">
          <Reveal>
            <h2 id="deal-heading" className="h-display text-6xl sm:text-7xl xl:text-8xl">Deal of the day</h2>
            <p className="mt-6 text-sm text-bone/60">{p.brand}</p>
            <Link to={`/product/${p.id}`} className="mt-1 block text-3xl font-bold tracking-tight hover:underline sm:text-4xl">{p.name}</Link>
            <p className="mt-4 max-w-md text-bone/70">{p.description}</p>

            <div className="mt-8 flex items-baseline gap-4">
              <span className="font-display text-7xl font-black leading-none text-signal-soft sm:text-8xl">{money(p.price)}</span>
              <s className="text-2xl text-bone/45">{money(p.originalPrice)}</s>
            </div>
            <p className="mt-2 text-bone/60">You save {money(p.originalPrice - p.price)}</p>

            <Countdown variant="boxes" dark className="mt-8" />
            <StockIndicator stock={p.stock} total={p.totalStock} dark size="lg" className="mt-8 max-w-md" />
            <p className="mt-2 text-sm text-bone/55">{p.sold} sold since midnight</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" disabled={soldOut} onClick={() => buyNow(p)}>{soldOut ? 'Sold out' : 'Buy now'}</Button>
              <Button size="lg" variant="outlineLight" disabled={soldOut} onClick={() => addToCart(p, { sourceEl: img.current })}><ShoppingBag className="h-5 w-5" aria-hidden /> Add to cart</Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
