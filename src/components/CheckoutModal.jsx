import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, Clock, Lock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Overlay from './Overlay'
import Button from './Button'
import SmartImage from './SmartImage'
import { Field } from './AuthShell'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import useLocalStorage from '../hooks/useLocalStorage'
import { api, errorCode, errorMessage, fieldErrors } from '../lib/api'
import { money, pad } from '../lib/format'

/*
 * Checkout, step by step (this is the flash-sale flow described in the README):
 *   1. reserve   POST /checkout/reserve      Redis atomically holds the stock for 10 minutes
 *   2. address   form, validated here and again on the server
 *   3. pay       POST /orders -> POST /payment/create-order -> Razorpay popup
 *   4. verify    POST /payment/verify        the SERVER checks Razorpay's signature, then marks the order PAID
 * Closing the dialog before paying releases the hold straight away.
 */

const EMPTY_ADDRESS = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' }
const inr = (paise) => (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function validateAddress(a) {
  const er = {}
  if (a.fullName.trim().length < 2) er.fullName = 'Enter the recipient name.'
  if (!/^[+]?[\d\s-]{10,15}$/.test(a.phone.trim())) er.phone = 'Enter a valid phone number.'
  if (a.line1.trim().length < 3) er.line1 = 'Enter the street address.'
  if (a.city.trim().length < 2) er.city = 'Enter the city.'
  if (a.state.trim().length < 2) er.state = 'Enter the state.'
  if (!/^[A-Za-z0-9 -]{4,10}$/.test(a.postalCode.trim())) er.postalCode = 'Enter a valid postal code.'
  return er
}

function HoldTimer({ expiresLocal, onExpire }) {
  const [now, setNow] = useState(Date.now())
  const fired = useRef(false)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, Math.ceil((expiresLocal - now) / 1000))
  useEffect(() => {
    if (left === 0 && !fired.current) { fired.current = true; onExpire() }
  }, [left, onExpire])
  return (
    <p className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium ${left <= 60 ? 'bg-red-50 text-red-700' : 'bg-signal/10 text-signal'}`} role="timer">
      <Clock className="h-4 w-4 flex-none" aria-hidden />
      Your items are held for <b className="tnum">{pad(Math.floor(left / 60))}:{pad(left % 60)}</b>
    </p>
  )
}

const Spinner = ({ label }) => (
  <div className="flex flex-col items-center gap-4 px-6 py-16 text-center" role="status">
    <span className="h-9 w-9 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
    <p className="text-stone">{label}</p>
  </div>
)

function Notice({ icon: Icon = AlertCircle, title, text, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center sm:px-12" role="alert">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600"><Icon className="h-7 w-7" aria-hidden /></span>
      <h2 className="h-display mt-5 text-4xl">{title}</h2>
      <p className="mt-3 max-w-sm text-stone">{text}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  )
}

function Body({ onClose, cleanupRef, guardRef }) {
  const { checkout, afterOrder, setCartOpen } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [savedAddress, setSavedAddress] = useLocalStorage('dropline:address', null)

  // reserving | address | review | verifying | verify-error | confirmed | expired | failed | fatal
  const [phase, setPhase] = useState('reserving')
  const [reservation, setReservation] = useState(null)
  const [expiresLocal, setExpiresLocal] = useState(0)
  const [address, setAddress] = useState(() => ({ ...EMPTY_ADDRESS, ...(savedAddress || {}), fullName: savedAddress?.fullName || user?.name || '' }))
  const [errors, setErrors] = useState({})
  const [payError, setPayError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ title: '', text: '', code: '' })
  const [confirmed, setConfirmed] = useState(null)

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const reservationId = useRef(null)
  const orderRef = useRef(null)
  const settled = useRef(false) // true once the outcome of the payment is decided (paid / failed)
  const pendingVerify = useRef(null)
  const started = useRef(false)

  // Runs when the dialog closes. Unpaid? Give the stock back now. (Tab closed instead? The Redis TTL does it.)
  cleanupRef.current = () => {
    if (phaseRef.current !== 'confirmed' && reservationId.current) api.delete(`/checkout/reservation/${reservationId.current}`).catch(() => {})
    if (phaseRef.current === 'confirmed' || reservationId.current) afterOrder()
  }

  const start = useCallback(async () => {
    setPhase('reserving'); setPayError(''); setBusy(false); settled.current = false; guardRef.current = false
    try {
      const payload = checkout.mode === 'buyNow' ? { mode: 'buyNow', item: checkout.item } : { mode: 'cart' }
      const { data } = await api.post('/checkout/reserve', payload)
      reservationId.current = data.reservationId
      setReservation(data)
      setExpiresLocal(data.expiresAt - data.serverTime + Date.now()) // measured against the server's clock
      setPhase('address')
    } catch (err) {
      reservationId.current = null
      const code = errorCode(err)
      setMessage({
        code,
        title: code === 'OUT_OF_STOCK' ? 'Not enough stock' : code === 'SALE_ENDED' ? 'The sale has ended' : code === 'EMPTY_CART' ? 'Your bag is empty' : 'Could not start checkout',
        text: errorMessage(err),
      })
      setPhase('fatal')
      if (['OUT_OF_STOCK', 'SALE_ENDED'].includes(code)) afterOrder()
    }
  }, [checkout, guardRef, afterOrder])

  useEffect(() => {
    if (started.current) return // React StrictMode runs effects twice in development; reserve only once
    started.current = true
    start()
  }, [start])

  const set = (k) => (e) => setAddress((a) => ({ ...a, [k]: e.target.value }))
  const goReview = (e) => {
    e.preventDefault()
    const er = validateAddress(address)
    setErrors(er)
    if (Object.keys(er).length) return
    setSavedAddress(address)
    setPhase('review')
  }

  const onExpire = useCallback(() => {
    if (['address', 'review'].includes(phaseRef.current) && !guardRef.current) {
      reservationId.current = null
      setPhase('expired')
      afterOrder()
    }
  }, [guardRef, afterOrder])

  /* ---------- payment ---------- */
  const verify = async (resp) => {
    pendingVerify.current = resp
    setPhase('verifying')
    try {
      const { data } = await api.post('/payment/verify', { orderId: orderRef.current.id, ...resp })
      settled.current = true; guardRef.current = false
      setConfirmed(data.order)
      setPhase('confirmed')
      afterOrder()
    } catch (err) {
      guardRef.current = false
      if (errorCode(err) === 'SOLD_OUT_REFUNDED') {
        settled.current = true; reservationId.current = null
        setMessage({ code: 'SOLD_OUT_REFUNDED', title: 'Sold out, refund on the way', text: errorMessage(err) })
        setPhase('fatal'); afterOrder()
      } else if (err?.response && err.response.status < 500 && errorCode(err) !== 'RATE_LIMITED') {
        settled.current = true
        setMessage({ code: '', title: 'Payment could not be verified', text: errorMessage(err) })
        setPhase('fatal')
      } else {
        setPayError(errorMessage(err)) // network/server hiccup: the payment itself may be fine, so let them re-check
        setPhase('verify-error')
      }
    }
  }

  const pay = async () => {
    setPayError(''); setBusy(true); guardRef.current = true; settled.current = false
    try {
      if (!(await loadRazorpay())) throw Object.assign(new Error('script'), { local: true })
      const { data: created } = await api.post('/orders', { reservationId: reservation.reservationId, shippingAddress: address })
      orderRef.current = created.order
      const { data: p } = await api.post('/payment/create-order', { orderId: created.order.id })

      const rzp = new window.Razorpay({
        key: p.keyId, amount: p.amount, currency: p.currency, order_id: p.razorpayOrderId,
        name: 'Dropline', description: `Order ${created.order.orderNumber}`,
        prefill: p.prefill, theme: { color: '#4A5CFF' },
        handler: (resp) => verify(resp),
        modal: {
          ondismiss: () => {
            if (settled.current || phaseRef.current === 'verifying') return
            guardRef.current = false; setBusy(false)
            setPayError('The payment window was closed. Your items are still held, so you can pay again.')
          },
        },
      })
      rzp.on('payment.failed', async (resp) => {
        settled.current = true
        try { await api.post('/payment/failed', { orderId: created.order.id, reason: resp?.error?.description || 'Payment failed' }) } catch { /* the hold expires on its own */ }
        rzp.close()
        reservationId.current = null // the server released it
        guardRef.current = false; setBusy(false)
        setMessage({ code: 'PAYMENT_FAILED', title: 'Payment failed', text: `${resp?.error?.description || 'Your bank declined the payment.'} You have not been charged, and your items were released.` })
        setPhase('failed'); afterOrder()
      })
      rzp.open()
    } catch (err) {
      guardRef.current = false; setBusy(false)
      const code = errorCode(err)
      if (err.local) setPayError('We could not load the payment window. Check your connection and try again.')
      else if (['RESERVATION_EXPIRED', 'CHECKOUT_DONE', 'CHECKOUT_CANCELLED'].includes(code)) { reservationId.current = null; setPhase('expired') }
      else if (code === 'VALIDATION_ERROR') { setErrors(fieldErrors(err)); setPhase('address') }
      else setPayError(errorMessage(err))
    }
  }

  /* ---------- views ---------- */
  if (phase === 'reserving') return <Spinner label="Holding your items…" />
  if (phase === 'verifying') return <Spinner label="Confirming your payment…" />

  if (phase === 'fatal') {
    return (
      <Notice title={message.title} text={message.text}>
        {['OUT_OF_STOCK', 'EMPTY_CART'].includes(message.code) && <Button variant="dark" onClick={() => { onClose(); setCartOpen(true) }}>Review your bag</Button>}
        <Button variant={['OUT_OF_STOCK', 'EMPTY_CART'].includes(message.code) ? 'outlineDark' : 'dark'} onClick={onClose}>Close</Button>
      </Notice>
    )
  }

  if (phase === 'expired') {
    return (
      <Notice icon={Clock} title="Your hold expired" text="We only hold stock for a few minutes so other shoppers get a fair chance. Start again to re-check availability.">
        <Button onClick={start}>Restart checkout</Button>
        <Button variant="outlineDark" onClick={onClose}>Close</Button>
      </Notice>
    )
  }

  if (phase === 'failed') {
    return (
      <Notice title={message.title} text={message.text}>
        <Button onClick={start}>Try again</Button>
        <Button variant="outlineDark" onClick={onClose}>Close</Button>
      </Notice>
    )
  }

  if (phase === 'verify-error') {
    return (
      <Notice title="We could not confirm your payment yet" text={`${payError} If money was deducted, your order is confirmed automatically or refunded. You can also check again now.`}>
        <Button onClick={() => verify(pendingVerify.current)}>Check payment status</Button>
        <Button variant="outlineDark" onClick={() => { onClose(); navigate('/orders') }}>My orders</Button>
      </Notice>
    )
  }

  if (phase === 'confirmed' && confirmed) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center sm:px-12">
        <motion.svg viewBox="0 0 80 80" className="h-24 w-24" initial="hidden" animate="show" aria-hidden>
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="#4A5CFF" strokeWidth="4" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1 } }} transition={{ duration: 0.6 }} />
          <motion.path d="M24 41l11 11 21-24" fill="none" stroke="#4A5CFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1 } }} transition={{ duration: 0.45, delay: 0.5 }} />
        </motion.svg>
        <h2 className="h-display mt-6 text-5xl">Order confirmed</h2>
        <p className="mt-3 max-w-sm text-stone">Payment received and verified. This is a portfolio store running in Razorpay test mode, so nothing will actually ship.</p>
        <p className="mt-6 rounded-full bg-bone px-5 py-2 text-sm">
          Order <b className="tnum">{confirmed.orderNumber}</b>, {confirmed.items.reduce((n, i) => n + i.qty, 0)} {confirmed.items.reduce((n, i) => n + i.qty, 0) === 1 ? 'item' : 'items'}, {money(confirmed.total)}
        </p>
        <p className="mt-2 text-xs text-stone">Charged {inr(confirmed.amountPaise)} &middot; Payment {confirmed.paymentId}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => { onClose(); navigate('/orders') }}>View my orders</Button>
          <Button variant="outlineDark" onClick={onClose}>Keep shopping</Button>
        </div>
      </div>
    )
  }

  const r = reservation
  const steps = ['Address', 'Review & pay']
  const stepIndex = phase === 'address' ? 0 : 1

  return (
    <div className="p-6 sm:p-8">
      <h2 className="h-display text-5xl">Checkout</h2>
      <ol className="mt-3 flex items-center gap-2 text-xs font-semibold" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2" aria-current={i === stepIndex ? 'step' : undefined}>
            <span className={`grid h-6 w-6 place-items-center rounded-full ${i <= stepIndex ? 'bg-signal text-white' : 'bg-ink/10 text-stone'}`}>{i + 1}</span>
            <span className={i === stepIndex ? 'text-ink' : 'text-stone'}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-ink/15" aria-hidden />}
          </li>
        ))}
      </ol>
      <div className="mt-5"><HoldTimer expiresLocal={expiresLocal} onExpire={onExpire} /></div>

      {phase === 'address' && (
        <form onSubmit={goReview} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Full name" value={address.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" /></div>
          <div className="sm:col-span-2"><Field label="Phone" type="tel" value={address.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" inputMode="tel" /></div>
          <div className="sm:col-span-2"><Field label="Address" value={address.line1} onChange={set('line1')} error={errors.line1} autoComplete="address-line1" /></div>
          <div className="sm:col-span-2"><Field label="Apartment, landmark (optional)" value={address.line2} onChange={set('line2')} error={errors.line2} autoComplete="address-line2" /></div>
          <Field label="City" value={address.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
          <Field label="State" value={address.state} onChange={set('state')} error={errors.state} autoComplete="address-level1" />
          <Field label="PIN code" value={address.postalCode} onChange={set('postalCode')} error={errors.postalCode} autoComplete="postal-code" inputMode="numeric" />
          <Field label="Country" value={address.country} onChange={set('country')} error={errors.country} autoComplete="country-name" />
          <Button type="submit" size="lg" className="mt-2 w-full sm:col-span-2">Continue to payment</Button>
        </form>
      )}

      {phase === 'review' && (
        <>
          <ul className="mt-6 max-h-52 divide-y divide-ink/10 overflow-y-auto">
            {r.lines.map((l) => (
              <li key={`${l.productId}-${l.color}-${l.size}`} className="flex items-center gap-3 py-3">
                <SmartImage src={l.image} alt="" className="h-14 w-14 flex-none rounded-xl bg-bone object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{l.name}</p><p className="text-xs text-stone">{l.color}{l.size !== 'One size' ? `, ${l.size}` : ''}, qty {l.qty}</p></div>
                <p className="font-semibold">{money(l.price * l.qty)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl bg-bone p-4 text-sm">
            <p><b>{address.fullName}</b><br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.state} {address.postalCode}<br />{address.phone}</p>
            <button onClick={() => setPhase('address')} className="flex flex-none items-center gap-1 font-semibold underline underline-offset-4"><ArrowLeft className="h-4 w-4" aria-hidden /> Edit</button>
          </div>
          <dl className="mt-4 space-y-1.5 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between text-stone"><dt>Subtotal</dt><dd>{money(r.totals.subtotal)}</dd></div>
            {r.totals.discount > 0 && <div className="flex justify-between text-signal"><dt>You save</dt><dd>-{money(r.totals.discount)}</dd></div>}
            <div className="flex justify-between text-stone"><dt>Shipping</dt><dd>{r.totals.shipping ? money(r.totals.shipping) : 'Free'}</dd></div>
            <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd>{money(r.totals.total)}</dd></div>
            <div className="flex justify-between gap-3 text-xs text-stone"><dt>Charged by Razorpay in INR (1 USD = ₹{r.usdToInr})</dt><dd className="flex-none font-semibold text-ink">{inr(r.amountPaise)}</dd></div>
          </dl>
          {payError && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{payError}</p>}
          <Button size="lg" className="mt-5 w-full" onClick={pay} disabled={busy}><Lock className="h-5 w-5" aria-hidden /> {busy ? 'Opening secure payment…' : `Pay ${inr(r.amountPaise)}`}</Button>
          <p className="mt-3 text-center text-xs text-stone">Test mode: use Razorpay&rsquo;s test card 4111 1111 1111 1111 with any future expiry and any CVV. No real money moves.</p>
        </>
      )}
    </div>
  )
}

export default function CheckoutModal() {
  const { checkoutOpen, closeCheckout } = useStore()
  const cleanupRef = useRef(null)
  const guardRef = useRef(false) // true while the Razorpay window is open, so the dialog can't be closed underneath it

  const close = useCallback(() => {
    if (guardRef.current) return
    cleanupRef.current?.()
    cleanupRef.current = null
    closeCheckout()
  }, [closeCheckout])

  return (
    <Overlay open={checkoutOpen} onClose={close} label="Checkout" variant="center" className="max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-paper shadow-2xl sm:max-w-xl sm:rounded-3xl">
      <button onClick={close} aria-label="Close checkout" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5"><X className="h-5 w-5" /></button>
      <Body onClose={close} cleanupRef={cleanupRef} guardRef={guardRef} />
    </Overlay>
  )
}
