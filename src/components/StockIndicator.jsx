import { motion } from 'framer-motion'

export default function StockIndicator({ stock, total, dark = false, size = 'sm', className = '' }) {
  const soldOut = stock <= 0
  const pct = soldOut ? 0 : Math.max(5, Math.round((stock / total) * 100))
  const low = stock <= 12
  const label = soldOut ? 'Sold out' : stock <= 5 ? 'Almost gone' : stock <= 12 ? 'Selling fast' : 'In stock'
  const hot = dark ? 'text-signal-soft' : 'text-signal'
  return (
    <div className={className}>
      <div className={`flex items-baseline justify-between ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        <span className={low ? `font-semibold ${hot}` : dark ? 'text-bone/60' : 'text-stone'}>{label}</span>
        <span className={dark ? 'text-bone/80' : 'text-ink/80'}>{soldOut ? 'None left' : stock <= 20 ? `Only ${stock} left` : `${stock} left`}</span>
      </div>
      <div
        role="progressbar" aria-label="Stock remaining" aria-valuemin={0} aria-valuemax={total} aria-valuenow={stock}
        className={`mt-1.5 overflow-hidden rounded-full ${size === 'lg' ? 'h-2.5' : 'h-1.5'} ${dark ? 'bg-white/15' : 'bg-ink/10'}`}
      >
        <motion.div
          initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
          className={`h-full rounded-full ${dark ? 'bg-signal-soft' : 'bg-signal'}`}
        />
      </div>
    </div>
  )
}
