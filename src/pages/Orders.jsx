import { AlertCircle, PackageOpen } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import SmartImage from '../components/SmartImage'
import useRemote from '../hooks/useRemote'
import { api } from '../lib/api'
import { money } from '../lib/format'

const STATUS = {
  CONFIRMED: ['Confirmed', 'bg-signal/10 text-signal'],
  PROCESSING: ['Processing', 'bg-amber-100 text-amber-800'],
  SHIPPED: ['Shipped', 'bg-sky-100 text-sky-800'],
  DELIVERED: ['Delivered', 'bg-emerald-100 text-emerald-800'],
  CANCELLED: ['Cancelled', 'bg-ink/10 text-ink/70'],
  PENDING: ['Pending', 'bg-ink/10 text-ink/70'],
}

function OrderCard({ o }) {
  const [label, tone] = o.paymentStatus === 'REFUNDED' ? ['Refunded', 'bg-ink/10 text-ink/70'] : STATUS[o.orderStatus] || STATUS.PENDING
  const inr = (o.amountPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: o.currency || 'INR' })
  return (
    <li className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-extrabold tnum">{o.orderNumber}</p>
          <p className="text-sm text-stone">{new Date(o.paidAt || o.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>
      </div>
      <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
        {o.items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-3 py-3">
            <SmartImage src={i.image} alt="" className="h-14 w-14 flex-none rounded-xl bg-bone object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{i.name}</p>
              <p className="text-xs text-stone">{i.color}{i.size !== 'One size' ? `, ${i.size}` : ''}, qty {i.qty}</p>
            </div>
            <p className="font-semibold">{money(i.price * i.qty)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-2 text-sm">
        <p className="text-stone">Ships to {o.shippingAddress?.city}, {o.shippingAddress?.state}</p>
        <p className="text-right"><span className="text-lg font-bold">{money(o.total)}</span><span className="block text-xs text-stone">Charged {inr}</span></p>
      </div>
    </li>
  )
}

export default function Orders() {
  const { data, loading, error, reload } = useRemote(() => api.get('/orders').then((r) => r.data.orders), [])
  return (
    <>
      <PageHeader title="My orders" subtitle="Everything you have bought from Dropline." crumbs={[['My orders']]} />
      <section className="container-x pb-24">
        {loading ? (
          <div className="grid min-h-[30svh] place-items-center" role="status" aria-label="Loading orders"><span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-signal" /></div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Could not load orders" text={error} cta="Try again" onClick={reload} />
        ) : data.length === 0 ? (
          <EmptyState icon={PackageOpen} title="No orders yet" text="When you buy something it will show up here, with its status." cta="Shop the flash sale" to="/flash-sale" />
        ) : (
          <ul className="mx-auto grid max-w-3xl gap-5">{data.map((o) => <OrderCard key={o.id} o={o} />)}</ul>
        )}
      </section>
    </>
  )
}
