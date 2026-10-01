import { useState } from 'react'
import { Check, Clock, Mail, MapPin } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const field = 'mt-2 h-14 w-full rounded-2xl border border-ink/15 bg-white px-4 outline-none transition focus:border-signal aria-[invalid=true]:border-signal'

export default function Contact() {
  const [v, setV] = useState({ name: '', email: '', topic: 'Order help', message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!v.name.trim()) er.name = 'Tell us your name.'
    if (!/^\S+@\S+\.\S+$/.test(v.email)) er.email = 'Enter a valid email address.'
    if (v.message.trim().length < 10) er.message = 'Write at least a sentence so we can help.'
    setErrors(er)
    if (!Object.keys(er).length) setSent(true)
  }

  return (
    <>
      <PageHeader title="Contact" subtitle="Questions about an order, a drop, or a return? We reply within one working day." crumbs={[['Contact']]} />
      <section className="container-x grid gap-12 pb-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        {sent ? (
          <div role="status" className="flex flex-col items-start justify-center rounded-3xl bg-bone p-10">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-signal text-white"><Check className="h-7 w-7" aria-hidden /></span>
            <h2 className="h-display mt-6 text-5xl">Message sent</h2>
            <p className="mt-3 max-w-md text-stone">Thanks, {v.name.split(' ')[0]}. This is a demo form, so nothing was actually sent, but a real one would reach us at {v.email}.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Name
              <input value={v.name} onChange={set('name')} className={field} aria-invalid={!!errors.name} autoComplete="name" />
              {errors.name && <span role="alert" className="mt-1 block text-sm font-normal text-signal">{errors.name}</span>}
            </label>
            <label className="block text-sm font-semibold">Email
              <input type="email" value={v.email} onChange={set('email')} className={field} aria-invalid={!!errors.email} autoComplete="email" />
              {errors.email && <span role="alert" className="mt-1 block text-sm font-normal text-signal">{errors.email}</span>}
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">Topic
              <select value={v.topic} onChange={set('topic')} className={field}>{['Order help', 'Returns and refunds', 'A product question', 'Press and partnerships'].map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">Message
              <textarea rows={6} value={v.message} onChange={set('message')} className={`${field} h-auto py-4`} aria-invalid={!!errors.message} />
              {errors.message && <span role="alert" className="mt-1 block text-sm font-normal text-signal">{errors.message}</span>}
            </label>
            <button type="submit" className="h-14 rounded-full bg-signal px-8 font-semibold text-white transition hover:bg-signal-deep sm:col-span-2 sm:w-fit">Send message</button>
          </form>
        )}
        <ul className="space-y-6 self-start">
          {[[Mail, 'Email', 'hello@dropline.example'], [Clock, 'Hours', 'Mon to Fri, 9am to 6pm'], [MapPin, 'Studio', '14 Foundry Lane, Bengaluru']].map(([Icon, t, d]) => (
            <li key={t} className="flex gap-4"><span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-bone"><Icon className="h-5 w-5" aria-hidden /></span><div><p className="font-semibold">{t}</p><p className="text-stone">{d}</p></div></li>
          ))}
        </ul>
      </section>
    </>
  )
}
