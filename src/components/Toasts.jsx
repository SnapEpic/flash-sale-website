import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import SmartImage from './SmartImage'

export default function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[95] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:px-6 sm:pb-6" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id} layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="on-dark pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink p-3 pr-2 text-bone shadow-2xl ring-1 ring-white/10"
          >
            {t.image ? (
              <SmartImage src={t.image} alt="" className="h-12 w-12 flex-none rounded-xl object-cover" />
            ) : (
              <span className={`grid h-12 w-12 flex-none place-items-center rounded-xl ${t.error ? 'bg-red-500' : 'bg-signal'}`}>{t.error ? <AlertCircle className="h-5 w-5" aria-hidden /> : <Check className="h-5 w-5" aria-hidden />}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">{t.error ? <AlertCircle className="h-4 w-4 flex-none text-red-400" aria-hidden /> : <Check className="h-4 w-4 flex-none text-signal-soft" aria-hidden />}{t.title}</p>
              {t.sub && <p className="truncate text-xs text-bone/60">{t.sub}</p>}
            </div>
            {t.action && (
              <button onClick={() => { t.action.onClick(); dismissToast(t.id) }} className="flex-none rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" className="flex-none rounded-full p-2 text-bone/50 hover:text-bone">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
