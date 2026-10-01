import { AnimatePresence, motion } from 'framer-motion'
import { Clock, RotateCcw } from 'lucide-react'
import useCountdown from '../hooks/useCountdown'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { pad } from '../lib/format'

function Roll({ value }) {
  return (
    <span className="inline-flex" aria-hidden>
      {pad(value).split('').map((ch, i) => (
        <span key={i} className="relative inline-block h-[1em] w-[.62em] overflow-hidden text-center leading-none">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={ch}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
              transition={{ duration: 0.32, ease: [0.3, 0.8, 0.3, 1] }}
              className="absolute inset-0 block"
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

function Ended({ dark, compact }) {
  const { restartSale } = useStore()
  const { isAdmin } = useAuth()
  return (
    <div className={`flex flex-wrap items-center gap-3 ${dark ? 'text-bone' : 'text-ink'}`} role="status">
      <span className={`font-display font-extrabold uppercase ${compact ? 'text-lg' : 'text-3xl'}`}>Sale ended</span>
      {isAdmin && <button
        onClick={restartSale}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${dark ? 'border-white/25 hover:bg-white/10' : 'border-ink/20 hover:bg-ink/5'}`}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Restart sale (admin)
      </button>}
    </div>
  )
}

/**
 * variant "hero"   – large glass blocks (days / hours / minutes / seconds)
 * variant "boxes"  – medium blocks for deal sections
 * variant "inline" – compact "Ends in 08:42:19" line
 */
export default function Countdown({ variant = 'boxes', dark = false, endsAt, className = '' }) {
  const { saleEnd } = useStore()
  const t = useCountdown(endsAt ?? saleEnd)
  const units = [['Days', t.days], ['Hours', t.hours], ['Minutes', t.minutes], ['Seconds', t.seconds]]
  const spoken = `${t.days} days ${t.hours} hours ${t.minutes} minutes ${t.seconds} seconds left`

  if (t.ended) return <div className={className}><Ended dark={dark} compact={variant === 'inline'} /></div>

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 text-sm font-semibold ${dark ? 'text-bone' : 'text-ink'} ${className}`} role="timer" aria-label={spoken}>
        <Clock className={`h-4 w-4 ${dark ? 'text-signal-soft' : 'text-signal'}`} aria-hidden />
        <span className={dark ? 'text-bone/60' : 'text-stone'}>Ends in</span>
        <span className="tnum" aria-hidden>
          {t.days > 0 && `${t.days}d `}{pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}
        </span>
      </span>
    )
  }

  const hero = variant === 'hero'
  return (
    <div className={`flex items-stretch ${hero ? 'gap-2 sm:gap-3' : 'gap-2'} ${className}`} role="timer" aria-label={spoken}>
      {units.map(([label, v]) => (
        <div
          key={label}
          className={`flex flex-col items-center justify-center rounded-2xl border ${
            hero ? 'min-w-[3.9rem] px-2.5 py-3 sm:min-w-[5.6rem] sm:px-4 sm:py-4' : 'min-w-[3.6rem] px-3 py-2.5 sm:min-w-[4.4rem]'
          } ${dark ? 'border-white/15 bg-white/[.06] text-bone' : 'border-ink/10 bg-white text-ink'}`}
        >
          <span className={`font-display font-extrabold tnum ${hero ? 'text-[2.2rem] sm:text-6xl' : 'text-3xl sm:text-4xl'}`}>
            <Roll value={v} />
          </span>
          <span className={`mt-1 text-[11px] font-medium sm:text-xs ${dark ? 'text-bone/60' : 'text-stone'}`}>{label}</span>
        </div>
      ))}
    </div>
  )
}
