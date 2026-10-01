import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useDialog from '../hooks/useDialog'

const PANEL = {
  center: { initial: { opacity: 0, y: 28, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 18, scale: 0.98 } },
  right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
  sheet: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
  top: { initial: { opacity: 0, y: -24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } },
}
const WRAP = {
  center: 'items-end justify-center sm:items-center sm:p-6',
  right: 'justify-end',
  sheet: 'items-end',
  top: 'items-start',
}

function Inner({ onClose, label, variant, className, children }) {
  const ref = useRef(null)
  useDialog(ref, onClose)
  return (
    <div className={`fixed inset-0 z-[80] flex ${WRAP[variant]}`}>
      <motion.div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} aria-hidden
      />
      <motion.div
        ref={ref} role="dialog" aria-modal="true" aria-label={label}
        {...PANEL[variant]}
        transition={{ type: 'spring', damping: 34, stiffness: 340 }}
        className={`relative ${className}`}
      >
        {children}
      </motion.div>
    </div>
  )
}

/** Accessible dialog shell: backdrop, focus trap, Escape, scroll lock, animated presence. */
export default function Overlay({ open, onClose, label, variant = 'center', className = '', children }) {
  return (
    <AnimatePresence>
      {open && <Inner key="overlay" onClose={onClose} label={label} variant={variant} className={className}>{children}</Inner>}
    </AnimatePresence>
  )
}
