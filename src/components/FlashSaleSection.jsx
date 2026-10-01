import { Zap } from 'lucide-react'
import ProductGrid from './ProductGrid'
import Countdown from './Countdown'
import Button from './Button'
import Reveal from './Reveal'
import { ArrowRight } from 'lucide-react'

export default function FlashSaleSection({ products }) {
  return (
    <section className="py-20 md:py-28" aria-labelledby="flash-heading">
      <div className="container-x">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-signal/10 px-3 py-1.5 text-sm font-semibold text-signal">
              <Zap className="h-4 w-4" aria-hidden /> Live now
            </p>
            <h2 id="flash-heading" className="h-display mt-4 text-6xl sm:text-7xl md:text-8xl">Flash sale</h2>
            <p className="mt-3 max-w-md text-lg text-stone">Grab it before it&rsquo;s gone. Prices drop back when the clock hits zero.</p>
          </div>
          <div className="flex flex-col gap-4 md:items-end">
            <Countdown variant="boxes" />
            <Button to="/flash-sale" variant="dark" icon={<ArrowRight className="h-4 w-4" />} className="self-start md:self-end">View all deals</Button>
          </div>
        </Reveal>
        <div className="mt-12">
          <ProductGrid products={products} layout="scroll" />
        </div>
      </div>
    </section>
  )
}
