import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import SmartImage from '../SmartImage'
import Reveal from '../Reveal'
import { useStore } from '../../context/StoreContext'

const FEATURED = ['Stridewell', 'Halden', 'Sonora', 'Fjell', 'Voss', 'Pulse']

export default function BrandShowcase() {
  const { products } = useStore()
  const brands = FEATURED.map((b) => {
    const items = products.filter((p) => p.brand === b)
    return { name: b, count: items.length, top: Math.max(0, ...items.map((i) => i.discount)), hero: items[0] }
  }).filter((b) => b.count > 0)
  const [active, setActive] = useState(0)
  const current = brands[active] || brands[0]
  if (!current) return null
  return (
    <section className="on-dark overflow-hidden bg-ink py-20 text-bone md:py-28" aria-labelledby="brands-heading">
      <div className="container-x">
        <Reveal>
          <h2 id="brands-heading" className="h-display text-6xl sm:text-7xl md:text-8xl">Brands on the drop</h2>
          <p className="mt-3 max-w-md text-lg text-bone/60">Independent labels and modern icons. Point at a name to see what&rsquo;s on sale.</p>
        </Reveal>
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <ul className="border-t border-white/10">
            {brands.map((b, i) => (
              <li key={b.name} className="border-b border-white/10">
                <Link
                  to={`/flash-sale?q=${encodeURIComponent(b.name)}`}
                  onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}
                  className={`group flex items-center justify-between gap-4 py-4 transition-all duration-300 sm:py-5 ${active === i ? 'pl-4 text-bone' : 'text-bone/40 hover:text-bone/80'}`}
                >
                  <span className="font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl">{b.name}</span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className="hidden sm:inline">{b.count} {b.count === 1 ? 'deal' : 'deals'}, up to {b.top}% off</span>
                    <ArrowUpRight className={`h-6 w-6 transition-all duration-300 ${active === i ? 'text-signal-soft' : ''} group-hover:translate-x-1 group-hover:-translate-y-1`} aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[2rem] bg-graphite lg:block">
            <AnimatePresence mode="popLayout">
              <motion.div key={current.name} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0">
                <SmartImage src={current.hero.images[0]} alt={`${current.name} ${current.hero.name}`} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-6">
                  <p className="text-sm text-bone/70">{current.name}</p>
                  <p className="text-xl font-semibold">{current.hero.name}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
