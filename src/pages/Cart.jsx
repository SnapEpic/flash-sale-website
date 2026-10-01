import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import SmartImage from '../components/SmartImage'
import Button from '../components/Button'
import { QtyStepper } from '../components/Selectors'
import { LineNotice, ShippingProgress } from '../components/CartDrawer'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/format'

export default function Cart() {
  const { lines, totals, setQty, removeFromCart, toggleWishlist, isWished, setCheckoutOpen } = useStore()

  if (!lines.length) {
    return (
      <>
        <PageHeader title="Your bag" crumbs={[['Cart']]} />
        <div className="container-x pb-24"><EmptyState icon={ShoppingBag} title="Your bag is empty" text="Nothing here yet. The sale won’t last, so go find something you love." cta="Shop the flash sale" to="/flash-sale" /></div>
      </>
    )
  }

  const moveToWishlist = (l) => {
    if (!isWished(l.product.id)) toggleWishlist(l.product)
    removeFromCart(l.key)
  }

  return (
    <>
      <PageHeader title="Your bag" subtitle={`${totals.count} ${totals.count === 1 ? 'item' : 'items'} in your bag. Stock is held for you when you start checkout.`} crumbs={[['Cart']]} />
      <section className="container-x grid gap-10 pb-24 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <div className="rounded-2xl bg-bone p-4"><ShippingProgress subtotal={totals.subtotal} /></div>
          <ul className="mt-2 divide-y divide-ink/10">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.li key={l.key} layout exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="flex gap-4 py-6 sm:gap-6">
                    <Link to={`/product/${l.product.id}`} className="h-32 w-28 flex-none overflow-hidden rounded-2xl bg-bone sm:h-40 sm:w-32">
                      <SmartImage src={l.product.images[0]} alt={l.product.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-stone">{l.product.brand}</p>
                          <Link to={`/product/${l.product.id}`} className="block truncate text-lg font-semibold hover:underline">{l.product.name}</Link>
                          <p className="text-sm text-stone">{l.color}{l.size !== 'One size' ? `, ${l.size}` : ''}</p>
                          <LineNotice line={l} />
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{money(l.product.price * l.qty)}</p>
                          <s className="text-sm text-stone">{money(l.product.originalPrice * l.qty)}</s>
                        </div>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                        <QtyStepper value={l.qty} max={Math.max(1, Math.min(10, l.available ?? 10))} onChange={(n) => setQty(l.key, n)} label={`Quantity for ${l.product.name}`} />
                        <div className="flex items-center gap-1 text-sm">
                          <button onClick={() => moveToWishlist(l)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 hover:bg-ink/5"><Heart className="h-4 w-4" aria-hidden /> Save for later</button>
                          <button onClick={() => removeFromCart(l.key)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 hover:bg-ink/5"><Trash2 className="h-4 w-4" aria-hidden /> Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>

        <aside aria-label="Order summary" className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/5 sm:p-8">
            <h2 className="text-xl font-bold">Order summary</h2>
            <dl className="mt-6 space-y-3 text-[15px]">
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd className="tnum">{money(totals.original)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone">Sale discount</dt><dd className="tnum font-semibold text-signal">-{money(totals.savings)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone">Shipping</dt><dd className="tnum">{totals.shipping ? money(totals.shipping) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-ink/10 pt-4 text-xl font-bold"><dt>Total</dt><dd className="tnum">{money(totals.total)}</dd></div>
            </dl>
            <Button size="lg" className="mt-6 w-full" disabled={lines.some((l) => l.soldOut || l.insufficient)} onClick={() => setCheckoutOpen(true)}>Checkout</Button>
            <ul className="mt-6 space-y-3 text-sm text-stone">
              <li className="flex items-center gap-2"><Truck className="h-4 w-4" aria-hidden /> Free shipping over $150</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden /> 30-day returns, no questions</li>
            </ul>
          </div>
        </aside>
      </section>
    </>
  )
}
