import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address, like you@example.com.')
    setError('')
    setDone(true)
  }

  return (
    <section className="on-dark bg-signal py-20 text-white md:py-28" aria-labelledby="news-heading">
      <div className="container-x grid items-end gap-10 lg:grid-cols-2">
        <h2 id="news-heading" className="h-display text-6xl sm:text-7xl md:text-8xl xl:text-9xl">Hear about drops before they sell out</h2>
        <div>
          <p className="max-w-md text-lg text-white/85">One email on Friday with the week&rsquo;s drops, plus early access to the biggest markdowns.</p>
          {done ? (
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} role="status" className="mt-6 inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 font-semibold text-ink">
              <Check className="h-5 w-5 text-signal" aria-hidden /> You&rsquo;re on the list. See you Friday.
            </motion.p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="news-email" className="sr-only">Email address</label>
                <input id="news-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={!!error} aria-describedby={error ? 'news-error' : undefined}
                  className="h-14 min-w-0 flex-1 rounded-full bg-white/15 px-6 text-white placeholder:text-white/60 outline-none ring-1 ring-white/30 focus:bg-white/25 focus:ring-white" />
                <button type="submit" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-8 font-semibold text-bone transition hover:bg-black">
                  Join the list <ArrowRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
              {error && <p id="news-error" role="alert" className="mt-3 text-sm font-medium">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
