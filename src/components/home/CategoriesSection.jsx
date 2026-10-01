import { ArrowRight } from 'lucide-react'
import CategoryCard from '../CategoryCard'
import Button from '../Button'
import Reveal from '../Reveal'
import { useStore } from '../../context/StoreContext'

// Bento layout: sizes vary so the section never reads as a row of identical boxes.
const spans = [
  'col-span-2 row-span-2', // sneakers
  'row-span-2', // fashion
  '', // electronics
  '', // watches
  'col-span-2', // accessories
  '', // beauty
  '', // gaming
  'col-span-2 md:col-span-4', // lifestyle
]

export default function CategoriesSection() {
  const { categories: CATEGORIES } = useStore()
  if (!CATEGORIES.length) return null
  return (
    <section className="bg-bone py-20 md:py-28" aria-labelledby="cat-heading">
      <div className="container-x">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="cat-heading" className="h-display text-6xl sm:text-7xl md:text-8xl">Shop by category</h2>
            <p className="mt-3 max-w-md text-lg text-stone">Eight worlds, one clock. Every category has deals ending tonight.</p>
          </div>
          <Button to="/categories" variant="dark" icon={<ArrowRight className="h-4 w-4" />}>All categories</Button>
        </Reveal>
        <div className="mt-12 grid auto-rows-[170px] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[200px] md:auto-rows-[230px] md:grid-cols-4 md:gap-4">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 4) * 0.05} y={30} className={`${spans[i]} min-h-0 [&>a]:h-full [&>a]:w-full`}>
              <CategoryCard category={c} big={i === 0} className="h-full w-full" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
