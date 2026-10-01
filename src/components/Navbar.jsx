import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, LogOut, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react'
import Logo from './Logo'
import useCountdown from '../hooks/useCountdown'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { pad } from '../lib/format'

const LINKS = [
  { to: '/', label: 'Home', id: 'home' },
  { to: '/flash-sale', label: 'Flash Sale', id: 'flash' },
  { to: '/categories', label: 'Categories', id: 'categories' },
  { to: '/flash-sale?sort=newest', label: 'New Arrivals', id: 'new' },
]

function SaleIndicator({ dark }) {
  const { saleEnd } = useStore()
  const t = useCountdown(saleEnd)
  return (
    <Link
      to="/flash-sale"
      className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold xl:inline-flex ${dark ? 'border-white/20 hover:bg-white/10' : 'border-ink/15 hover:bg-ink/5'}`}
      aria-label={t.ended ? 'Sale ended' : 'Flash sale is live'}
    >
      <span className="relative flex h-2 w-2">
        {!t.ended && <span className="absolute inset-0 animate-pulseRing rounded-full bg-signal" />}
        <span className={`relative h-2 w-2 rounded-full ${t.ended ? 'bg-stone' : 'bg-signal'}`} />
      </span>
      {t.ended ? 'Sale ended' : <span className="tnum">Live {t.days > 0 ? `${t.days}d ` : ''}{pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}</span>}
    </Link>
  )
}

function AccountButton({ iconBtn }) {
  const { user, logout } = useAuth()
  const { toast } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!user) {
    return <Link to="/login" className={`${iconBtn} hidden sm:grid`} aria-label="Sign in"><User className="h-5 w-5" /></Link>
  }
  const signOut = async () => {
    setOpen(false)
    try { await logout() } catch { /* cookie is cleared server-side; local state is reset regardless */ }
    toast('Signed out', { sub: 'See you at the next drop.' })
    navigate('/')
  }
  return (
    <div ref={ref} className="relative hidden sm:block">
      <button onClick={() => setOpen((o) => !o)} className={iconBtn} aria-label={`Account menu for ${user.name}`} aria-haspopup="menu" aria-expanded={open}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-signal text-xs font-bold uppercase text-white">{user.name.trim()[0]}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-paper p-2 text-ink shadow-2xl ring-1 ring-ink/10">
          <div className="border-b border-ink/10 px-3 pb-3 pt-2">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-stone">{user.email}</p>
          </div>
          <Link role="menuitem" to="/orders" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-ink/5"><Package className="h-4 w-4" aria-hidden /> My orders</Link>
          <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-ink/5"><LogOut className="h-4 w-4" aria-hidden /> Sign out</button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, logout } = useAuth()
  const { totals, wishlist, setSearchOpen, bump, toast } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)

  const darkPage = pathname === '/' || pathname === '/flash-sale'
  const dark = darkPage || menu

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => setMenu(false), [pathname, params])
  useEffect(() => {
    document.documentElement.style.overflow = menu ? 'hidden' : ''
    return () => { document.documentElement.style.overflow = '' }
  }, [menu])
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  const isNewest = params.get('sort') === 'newest'
  const activeId = pathname === '/' ? 'home'
    : pathname === '/flash-sale' ? (isNewest ? 'new' : 'flash')
    : pathname.startsWith('/categor') ? 'categories' : null

  const surface = menu ? 'border-transparent'
    : scrolled ? (darkPage ? 'border-white/10 bg-ink/75 backdrop-blur-xl' : 'border-ink/10 bg-paper/80 backdrop-blur-xl') : 'border-transparent'
  const iconBtn = `relative grid h-11 w-11 place-items-center rounded-full transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-ink/5'}`

  return (
    <>
      <a href="#main" className="sr-only z-[100] rounded-full bg-signal px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${dark ? 'on-dark text-bone' : 'text-ink'} ${surface}`}>
        <div className="container-x flex h-[72px] items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <Link key={l.id} to={l.to} aria-current={activeId === l.id ? 'page' : undefined}
                className={`relative rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${activeId === l.id ? '' : dark ? 'text-bone/70 hover:text-bone' : 'text-ink/60 hover:text-ink'}`}>
                {activeId === l.id && (
                  <motion.span layoutId="nav-pill" className={`absolute inset-0 -z-10 rounded-full ${dark ? 'bg-white/12' : 'bg-ink/8'}`} transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                )}
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <SaleIndicator dark={dark} />
            <button onClick={() => setSearchOpen(true)} className={`${iconBtn} lg:w-auto lg:gap-2 lg:px-4 lg:text-[15px] lg:font-medium`} aria-label="Search products">
              <Search className="h-5 w-5" />
              <span className="hidden lg:inline">Search</span>
              <kbd className={`hidden rounded border px-1.5 text-[11px] font-normal xl:inline ${dark ? 'border-white/20 text-bone/60' : 'border-ink/20 text-stone'}`}>Ctrl K</kbd>
            </button>
            <AccountButton iconBtn={iconBtn} />
            <Link to="/wishlist" className={iconBtn} aria-label={`Wishlist, ${wishlist.length} saved`}>
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-white">{wishlist.length}</span>}
            </Link>
            <CartButton iconBtn={iconBtn} count={totals.count} bump={bump} />
            <button onClick={() => setMenu((m) => !m)} className={`${iconBtn} lg:hidden`} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
              {menu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            id="mobile-menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
            className="on-dark fixed inset-0 z-40 overflow-y-auto bg-ink px-5 pb-10 pt-28 text-bone lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {[...LINKS, { to: '/wishlist', label: 'Wishlist', id: 'wl' }, ...(user ? [{ to: '/orders', label: 'Orders', id: 'orders' }] : []), { to: '/about', label: 'About', id: 'about' }, { to: '/contact', label: 'Contact', id: 'contact' }].map((l, i) => (
                <motion.div key={l.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.45 }}>
                  <Link to={l.to} className="flex items-center justify-between border-b border-white/10 py-4 font-display text-5xl font-extrabold uppercase tracking-tight">
                    {l.label}
                    {l.id === 'flash' && <span className="rounded-full bg-signal px-3 py-1 font-sans text-xs font-bold normal-case tracking-normal">Live</span>}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <button onClick={() => { setMenu(false); setSearchOpen(true) }} className="mt-8 flex h-14 w-full items-center gap-3 rounded-full bg-white/10 px-5 text-left text-bone/80">
              <Search className="h-5 w-5" aria-hidden /> Search products
            </button>
            <div className="mt-4 flex flex-col gap-3">
              {user ? (
                <>
                  <p className="px-1 text-sm text-bone/60">Signed in as <span className="font-semibold text-bone">{user.name}</span></p>
                  <button onClick={async () => { setMenu(false); try { await logout() } catch { /* ignore */ } toast('Signed out'); navigate('/') }} className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/25 font-semibold"><LogOut className="h-5 w-5" aria-hidden /> Sign out</button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/login" className="grid h-14 place-items-center rounded-full border border-white/25 font-semibold">Sign in</Link>
                  <Link to="/register" className="grid h-14 place-items-center rounded-full bg-signal font-semibold text-white">Create account</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function CartButton({ iconBtn, count, bump }) {
  const { setCartOpen } = useStore()
  return (
    <button data-cart-target onClick={() => setCartOpen(true)} className={iconBtn} aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
      <motion.span key={bump} animate={bump ? { scale: [1, 1.3, 0.95, 1], rotate: [0, -14, 10, 0] } : undefined} transition={{ duration: 0.5 }} className="grid place-items-center">
        <ShoppingBag className="h-5 w-5" />
      </motion.span>
      <AnimatePresence>
        {count > 0 && (
          <motion.span key={count} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-white">
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
