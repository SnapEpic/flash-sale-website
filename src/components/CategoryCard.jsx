import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SmartImage from './SmartImage'
import { useStore } from '../context/StoreContext'

export default function CategoryCard({ category, className = '', big = false }) {
  const { categoryCount } = useStore()
  const n = categoryCount(category.slug)
  return (
    <Link
      to={`/category/${category.slug}`}
      className={`group on-dark relative isolate flex overflow-hidden rounded-3xl bg-ink text-bone ${className}`}
      aria-label={`${category.name}, ${n} deals`}
    >
      <SmartImage src={category.image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90 transition-transform duration-[900ms] ease-out group-hover:scale-110" />
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/20 to-ink/10 transition-opacity duration-500 group-hover:from-ink/90" />
      <span className="absolute inset-0 -z-10 bg-signal/0 mix-blend-multiply transition-colors duration-500 group-hover:bg-signal/30" />
      <div className="flex w-full flex-col justify-end p-5 md:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className={`h-display ${big ? 'text-6xl md:text-8xl' : 'text-4xl md:text-5xl'}`}>{category.name}</h3>
            <p className="mt-2 text-sm text-bone/75">{n} {n === 1 ? 'deal' : 'deals'} live{big ? `, ${category.blurb.toLowerCase()}` : ''}</p>
          </div>
          <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-full bg-bone text-ink transition-all duration-300 group-hover:bg-signal group-hover:text-white">
            <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}
