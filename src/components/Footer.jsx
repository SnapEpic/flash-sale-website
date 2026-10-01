import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useStore } from '../context/StoreContext'

export default function Footer() {
  const { categories } = useStore()
  const cols = [
    { title: 'Shop', links: [['Flash sale', '/flash-sale'], ['New arrivals', '/flash-sale?sort=newest'], ['Categories', '/categories'], ['Wishlist', '/wishlist'], ['My orders', '/orders']] },
    { title: 'Categories', links: categories.slice(0, 5).map((c) => [c.name, `/category/${c.slug}`]) },
    { title: 'Company', links: [['About', '/about'], ['Contact', '/contact'], ['Shipping and returns', '/contact'], ['Help centre', '/contact']] },
  ]
  return (
    <footer className="on-dark relative overflow-hidden bg-ink text-bone">
      <div className="container-x pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-bone/60">Limited time. Limited stock. Incredible deals on things worth owning.</p>
            <p className="mt-6 text-sm text-bone/50">Free shipping over $150. 30-day returns on every drop.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h2 className="text-sm font-bold">{c.title}</h2>
                <ul className="mt-4 space-y-3">
                  {c.links.map(([label, to]) => (
                    <li key={label}><Link to={to} className="text-bone/60 transition hover:text-bone">{label}</Link></li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-bone/50 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Dropline. A portfolio project: payments run in Razorpay test mode and nothing ships.</p>
          <p>Prices shown in USD.</p>
        </div>
      </div>
      <p aria-hidden className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[26vw] font-black uppercase leading-[.72] text-white/[.04] lg:text-[21vw]">Dropline</p>
    </footer>
  )
}
