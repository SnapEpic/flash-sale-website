import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import SmartImage from '../SmartImage'
import StockIndicator from '../StockIndicator'
import Reveal from '../Reveal'
import { useStore } from '../../context/StoreContext'
import { money } from '../../lib/format'

function Row({ p }) {
  const { addToCart } = useStore()
  const ref = useRef(null)
  return (
    <motion.article whileHover={{ y: -4 }} className="flex gap-4 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-ink/5">
      <Link ref={ref} to={`/product/${p.id}`} className="h-36 w-28 flex-none overflow-hidden rounded-2xl bg-bone sm:h-40 sm:w-32" aria-label={`View ${p.name}`}>
        <SmartImage src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col py-1 pr-2">
        <p className="font-display text-6xl font-black leading-none tnum text-signal">{p.stock}<span className="ml-2 font-sans text-sm font-semibold text-ink">left</span></p>
        <Link to={`/product/${p.id}`} className="mt-2 truncate font-semibold hover:underline">{p.name}</Link>
        <StockIndicator stock={p.stock} total={p.totalStock} className="mt-2" />
        <div className="mt-auto flex items-center justify-between pt-3">
          <span><b className="text-lg">{money(p.price)}</b> <s className="text-sm text-stone">{money(p.originalPrice)}</s></span>
          <button onClick={() => addToCart(p, { sourceEl: ref.current })} aria-label={`Add ${p.name} to cart`} className="grid h-10 w-10 place-items-center rounded-full bg-ink text-bone transition hover:bg-signal"><Plus className="h-5 w-5" /></button>
        </div>
      </div>
    </motion.article>
  )
}

export default function LimitedStock() {
  const { products } = useStore()
  const list = products.filter((p) => p.stock > 0 && p.stock <= 10).sort((a, b) => a.stock - b.stock).slice(0, 6)
  if (!list.length) return null
  return (
    <section className="bg-bone py-20 md:py-28" aria-labelledby="limited-heading">
      <div className="container-x">
        <Reveal className="max-w-2xl">
          <h2 id="limited-heading" className="h-display text-6xl sm:text-7xl md:text-8xl">Almost gone</h2>
          <p className="mt-3 text-lg text-stone">Ten or fewer left of each. Once they sell out, they don&rsquo;t come back at this price.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p, i) => <Reveal key={p.id} delay={(i % 3) * 0.06}><Row p={p} /></Reveal>)}
        </div>
      </div>
    </section>
  )
}
