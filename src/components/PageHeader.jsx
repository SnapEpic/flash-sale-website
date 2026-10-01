import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function PageHeader({ title, subtitle, crumbs = [], children }) {
  return (
    <header className="container-x pb-10 pt-32 md:pb-14 md:pt-40">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-stone">
        <Link to="/" className="hover:text-ink">Home</Link>
        {crumbs.map(([label, to]) => (
          <span key={label} className="flex items-center gap-1"><ChevronRight className="h-4 w-4" aria-hidden />{to ? <Link to={to} className="hover:text-ink">{label}</Link> : <span aria-current="page" className="text-ink">{label}</span>}</span>
        ))}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="h-display text-6xl sm:text-7xl md:text-8xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-xl text-lg text-stone">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  )
}
