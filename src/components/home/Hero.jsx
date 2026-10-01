import { motion } from 'framer-motion'
import { ArrowRight, Zap } from 'lucide-react'
import Button from '../Button'
import Countdown from '../Countdown'
import SmartImage from '../SmartImage'
import StockIndicator from '../StockIndicator'
import { useStore } from '../../context/StoreContext'
import { money } from '../../lib/format'

const float = (dy, d) => ({ animate: { y: [0, dy, 0] }, transition: { duration: d, repeat: Infinity, ease: 'easeInOut' } })

export default function Hero() {
  const { products } = useStore()
  const p = products.find((x) => x.sku === 'DL-0001') || products.find((x) => x.isFeatured) || products[0]
  const live = products.filter((x) => x.isFlashSale && x.stock > 0).length
  if (!p) return null
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink text-bone" aria-labelledby="hero-title">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div className="absolute -right-32 top-0 h-[36rem] w-[36rem] rounded-full bg-signal/40 blur-[130px]" animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.95, 0.6] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="absolute inset-0 opacity-[.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '72px 72px' }} />
        <motion.div className="absolute left-[34%] top-24 hidden h-[30rem] w-[30rem] rounded-full border border-white/10 lg:block" animate={{ rotate: 360 }} transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}>
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-signal" />
        </motion.div>
      </div>

      <div className="container-x grid min-h-[100svh] items-center gap-12 pb-16 pt-28 lg:grid-cols-12 lg:gap-6 lg:pt-32">
        <div className="lg:col-span-7">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1.5 pl-3 pr-4 text-sm">
            <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-pulseRing rounded-full bg-signal" /><span className="relative h-2 w-2 rounded-full bg-signal" /></span>
            Live now, {live} deals in stock
          </motion.p>

          <h1 id="hero-title" className="mt-6 font-display font-black uppercase leading-[.8] tracking-tight text-[clamp(6.2rem,20vw,17.5rem)]">
            <motion.span className="block" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}>Flash</motion.span>
            <motion.span
              className="block text-transparent transition-colors duration-500 hover:text-signal"
              style={{ WebkitTextStroke: '2px #ECEAE5' }}
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
            >
              Sale
            </motion.span>
          </h1>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7 }}>
            <p className="mt-8 font-display text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">The deals won&rsquo;t wait.</p>
            <p className="mt-2 max-w-md text-lg text-bone/65">Premium products at up to 60% off. Limited time, limited stock, and when it&rsquo;s gone, it&rsquo;s gone.</p>
            <Countdown variant="hero" dark className="mt-8" />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/flash-sale" size="lg" icon={<ArrowRight className="h-5 w-5" />}>Shop now</Button>
              <Button to="/categories" size="lg" variant="outlineLight">Explore deals</Button>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 1, ease: [0.2, 0.8, 0.2, 1] }} className="relative mx-auto w-full max-w-[430px] lg:col-span-5 lg:ml-auto lg:mr-0 lg:max-w-[500px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] bg-graphite ring-1 ring-white/15">
            <SmartImage src={p.images[0]} alt={`${p.name} sneaker, now ${money(p.price)}`} eager className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/10" />
          </div>

          <motion.div {...float(-10, 5)} className="absolute -left-3 -top-5 sm:-left-8">
            <motion.div animate={{ rotate: [-8, 6, -8] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="grid h-24 w-24 place-items-center rounded-full bg-signal font-display text-4xl font-black shadow-2xl shadow-signal/40 sm:h-28 sm:w-28 sm:text-5xl" aria-label={`${p.discount} percent off`}>
              -{p.discount}%
            </motion.div>
          </motion.div>

          <motion.div {...float(8, 6)} className="absolute right-3 top-4 flex items-center gap-2 rounded-full bg-ink/70 px-3.5 py-2 text-sm font-semibold backdrop-blur-md ring-1 ring-white/15">
            <Zap className="h-4 w-4 text-signal-soft" aria-hidden /> Ends soon
          </motion.div>

          <motion.div {...float(-8, 7)} className="absolute -bottom-6 left-3 w-[62%] rounded-2xl bg-ink/75 p-4 backdrop-blur-xl ring-1 ring-white/15 sm:-left-8 sm:w-[58%]">
            <StockIndicator stock={p.stock} total={p.totalStock} dark />
          </motion.div>

          <motion.div {...float(7, 6.5)} className="absolute -right-2 bottom-8 hidden rounded-2xl bg-bone p-4 text-ink shadow-2xl sm:block sm:-right-6">
            <p className="text-xs text-stone">{p.brand}</p>
            <p className="font-semibold">{p.name}</p>
            <p className="mt-1 flex items-baseline gap-2"><b className="text-2xl text-signal">{money(p.price)}</b><s className="text-sm text-stone">{money(p.originalPrice)}</s></p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
