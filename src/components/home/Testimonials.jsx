import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star } from 'lucide-react'

const QUOTES = [
  { name: 'Priya Nair', role: 'Bought the Halo ANC headphones', text: 'I watched the stock bar drop from 20 to 7 while I was still deciding. Ordered, and they arrived in two days. Best flight-day purchase I have made.' },
  { name: 'Marcus Hale', role: 'Bought the Apex Runner', text: 'Genuinely premium. The shoe feels like something twice the price, and the site made the whole thing feel like an event instead of a chore.' },
  { name: 'Ananya Rao', role: 'Bought the Meridian Chronograph', text: 'Checked three other stores first. Nobody came close on price, and the packaging felt like opening a gift to myself.' },
]

export default function Testimonials() {
  const [i, setI] = useState(0)
  const q = QUOTES[i]
  return (
    <section className="py-20 md:py-28" aria-labelledby="quotes-heading">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div>
          <h2 id="quotes-heading" className="h-display text-6xl sm:text-7xl">Shoppers say</h2>
          <p className="mt-4 flex items-center gap-2 text-stone">
            <span className="flex" aria-hidden>{[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-4 w-4 fill-ink text-ink" />)}</span>
            4.8 average across 21,000 orders
          </p>
          <div role="tablist" aria-label="Choose a testimonial" className="mt-8 flex gap-3">
            {QUOTES.map((x, idx) => (
              <button key={x.name} role="tab" aria-selected={i === idx} aria-label={`Testimonial from ${x.name}`} onClick={() => setI(idx)}
                className={`grid h-14 w-14 place-items-center rounded-full font-bold transition ${i === idx ? 'bg-signal text-white' : 'bg-bone text-ink hover:bg-ink hover:text-bone'}`}>
                {x.name.split(' ').map((w) => w[0]).join('')}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-h-[300px]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.figure key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <blockquote className="text-2xl font-medium leading-snug tracking-tight sm:text-3xl lg:text-[2.6rem] lg:leading-[1.15]">&ldquo;{q.text}&rdquo;</blockquote>
              <figcaption className="mt-8 border-l-2 border-signal pl-4">
                <p className="font-bold">{q.name}</p>
                <p className="text-sm text-stone">{q.role}</p>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
