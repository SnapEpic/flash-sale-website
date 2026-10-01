import { Zap } from 'lucide-react'

const items = ['Free shipping over $150', 'New drops every Friday', 'Up to 60% off, while stock lasts', '30-day returns on every order', 'Authentic products, verified']

export default function Ticker() {
  const row = [...items, ...items]
  return (
    <div className="on-dark overflow-hidden bg-signal py-3.5 text-white" aria-label="Store highlights">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((k) => (
          <ul key={k} className="flex flex-none items-center" aria-hidden={k === 1}>
            {row.map((t, i) => (
              <li key={i} className="flex items-center gap-6 pr-6 font-display text-2xl font-extrabold uppercase tracking-tight">
                {t}<Zap className="h-5 w-5 fill-white" aria-hidden />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
