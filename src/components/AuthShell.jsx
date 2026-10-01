import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff, Flame, ShieldCheck, Timer } from 'lucide-react'

export const fieldClass = 'mt-2 h-14 w-full rounded-2xl border border-ink/15 bg-white px-4 outline-none transition focus:border-signal aria-[invalid=true]:border-red-500'

/** A labelled input with an inline error line (same look as the Contact form). Hint/error are linked with aria-describedby. */
export const Field = forwardRef(function Field({ label, error, type = 'text', hint, ...rest }, ref) {
  const [show, setShow] = useState(false)
  const id = useId()
  const isPassword = type === 'password'
  const noteId = error || hint ? `${id}-note` : undefined
  return (
    <div className="text-sm">
      <label htmlFor={id} className="font-semibold">{label}</label>
      <div className="relative">
        <input id={id} ref={ref} type={isPassword && show ? 'text' : type} className={`${fieldClass} ${isPassword ? 'pr-12' : ''}`} aria-invalid={!!error} aria-describedby={noteId} {...rest} />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-4 grid h-10 w-10 place-items-center rounded-full text-stone hover:text-ink">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {error ? <p id={noteId} role="alert" className="mt-1 text-sm text-red-600">{error}</p> : hint && <p id={noteId} className="mt-1 text-xs text-stone">{hint}</p>}
    </div>
  )
})

const PERKS = [
  [Timer, 'Early access', 'Your bag is saved to your account, so nothing disappears when the tab closes.'],
  [Flame, 'Real stock, held for you', 'When you start checkout we hold your items for 10 minutes while you pay.'],
  [ShieldCheck, 'Secure payments', 'Payments are handled by Razorpay. We never see or store your card.'],
]

/** Two-column frame shared by Login and Register. The left column is hidden on small screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <section className="container-x grid min-h-[100svh] items-center gap-12 pb-16 pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-20 lg:pt-32">
      <div className="hidden lg:block">
        <h1 className="h-display text-7xl xl:text-8xl">Get in before it&rsquo;s gone.</h1>
        <ul className="mt-10 max-w-lg space-y-6">
          {PERKS.map(([Icon, t, d]) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-signal/10 text-signal"><Icon className="h-5 w-5" aria-hidden /></span>
              <div><p className="font-semibold">{t}</p><p className="text-sm text-stone">{d}</p></div>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/5 sm:p-8">
        <h2 className="h-display text-5xl lg:text-6xl">{title}</h2>
        <p className="mt-2 text-stone">{subtitle}</p>
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-sm text-stone">{footer}</p>
      </div>
    </section>
  )
}
