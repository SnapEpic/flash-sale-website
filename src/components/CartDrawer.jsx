import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import Overlay from './Overlay'
import Button from './Button'
import SmartImage from './SmartImage'
import { QtyStepper } from './Selectors'
import { useStore } from '../context/StoreContext'
import { money } from '../lib/format'

export function LineNotice({ line }) {
  if (line.soldOut) return <p className="mt-1 text-xs font-semibold text-red-600">Sold out. Remove it to check out.</p>
  if (line.insufficient) return <p className="mt-1 text-xs font-semibold text-red-600">Only {line.available} left. Lower the quantity.</p>
  if (line.priceChanged) return <p className="mt-1 text-xs font-semibold text-signal">Price updated</p>
  return null
}

export function ShippingProgress({ subtotal }) {
  const { config } = useStore()
  const FREE_SHIPPING_AT = config.freeShippingAt
  const left = Math.max(0, FREE_SHIPPING_AT - subtotal)
  return (
    <div>
      <p className="flex items-center gap-2 text-sm">
        <Truck className="h-4 w-4 text-signal" aria-hidden />
        {left === 0 ? <span className="font-semibold">You&rsquo;ve unlocked free shipping</span> : <span>Add <b>{money(left)}</b> more for free shipping</span>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-signal transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_AT) * 100)}%` }} />
      </div>
    </div>
  )
}

export default function CartDrawer() {
  const { cartOpen, setCartOpen, lines, totals, setQty, removeFromCart, setCheckoutOpen } = useStore()
  const close = () => setCartOpen(false)
  return (
    <Overlay open={cartOpen} onClose={close} label="Your bag" variant="right" className="flex h-full w-full max-w-md flex-col bg-paper shadow-2xl">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <h2 className="text-lg font-bold">Your bag <span className="font-normal text-stone">({totals.count})</span></h2>
        <button onClick={close} aria-label="Close bag" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5"><X className="h-5 w-5" /></button>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-bone"><ShoppingBag className="h-7 w-7" aria-hidden /></span>
          <p className="text-lg font-semibold">Your bag is empty</p>
          <p className="max-w-xs text-sm text-stone">Live deals won&rsquo;t last. Pick something before the timer runs out.</p>
          <Button to="/flash-sale" onClick={close}>Shop the flash sale</Button>
        </div>
      ) : (
        <>
          <div className="border-b border-ink/10 px-5 py-4"><ShippingProgress subtotal={totals.subtotal} /></div>
          <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-5">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-4 py-4">
                <Link to={`/product/${l.product.id}`} onClick={close} className="h-24 w-20 flex-none overflow-hidden rounded-xl bg-bone">
                  <SmartImage src={l.product.images[0]} alt={l.product.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold leading-snug">{l.product.name}</p>
                    <p className="font-bold">{money(l.product.price * l.qty)}</p>
                  </div>
                  <p className="text-xs text-stone">{l.color}{l.size !== 'One size' ? `, ${l.size}` : ''}</p>
                  <LineNotice line={l} />
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <QtyStepper value={l.qty} max={Math.max(1, Math.min(10, l.available ?? 10))} onChange={(n) => setQty(l.key, n)} label={`Quantity for ${l.product.name}`} />
                    <button onClick={() => removeFromCart(l.key)} aria-label={`Remove ${l.product.name}`} className="grid h-10 w-10 place-items-center rounded-full text-stone hover:bg-ink/5 hover:text-ink"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="safe-bottom border-t border-ink/10 bg-white px-5 pt-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-stone"><dt>You save</dt><dd className="font-semibold text-signal">-{money(totals.savings)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button to="/cart" variant="outlineDark" onClick={close}>View bag</Button>
              <Button disabled={lines.some((l) => l.soldOut || l.insufficient)} onClick={() => { close(); setCheckoutOpen(true) }}>Checkout</Button>
            </div>
          </div>
        </>
      )}
    </Overlay>
  )
}
