import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, TrendingUp } from 'lucide-react'
import SmartImage from '../SmartImage'
import Reveal from '../Reveal'
import { useStore } from '../../context/StoreContext'
import { money } from '../../lib/format'

export default function Trending() {
  const { products } = useStore()
  const list = products.filter((p) => p.isTrending).sort((a, b) => b.sold - a.sold).slice(0, 6)
  if (!list.length) return null
  return (
    <section className="py-20 md:py-28" aria-labelledby="trend-heading">
      <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-32 lg:self-start">
          <h2 id="trend-heading" className="h-display text-6xl sm:text-7xl md:text-8xl">Trending now</h2>
          <p className="mt-4 max-w-sm text-lg text-stone">The six pieces everyone is buying this week, ranked by how fast they&rsquo;re selling.</p>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-bone"><TrendingUp className="h-4 w-4 text-signal-soft" aria-hidden /> Updated every hour</p>
        </Reveal>

        <ol className="divide-y divide-ink/10 border-y border-ink/10">
          {list.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.05, duration: 0.5 }}>
              <Link to={`/product/${p.id}`} className="group flex items-center gap-4 py-5 transition-all duration-300 hover:pl-3 sm:gap-6">
                <span aria-hidden className="w-12 flex-none font-display text-6xl font-black leading-none text-transparent sm:w-20 sm:text-7xl" style={{ WebkitTextStroke: '1.5px #15161A' }}>{i + 1}</span>
                <span className="sr-only">Rank {i + 1}:</span>
                <SmartImage src={p.images[0]} alt="" className="h-20 w-20 flex-none rounded-2xl bg-bone object-cover sm:h-24 sm:w-24" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{p.name}</p>
                  <p className="text-sm capitalize text-stone">{p.brand}, {p.category}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-signal"><TrendingUp className="h-3.5 w-3.5" aria-hidden /> {Math.round(p.sold / 4)} sold this week</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{money(p.price)}</p>
                  <s className="text-sm text-stone">{money(p.originalPrice)}</s>
                </div>
                <ArrowUpRight className="hidden h-6 w-6 flex-none transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 sm:block" aria-hidden />
              </Link>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
