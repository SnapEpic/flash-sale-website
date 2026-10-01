import { motion } from 'framer-motion'
import { useStore } from '../context/StoreContext'

// Product thumbnail that arcs from the clicked card to the cart icon.
export default function FlyLayer() {
  const { flies, landFly } = useStore()
  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden>
      {flies.map((f) => (
        <motion.img
          key={f.id} src={f.src} alt=""
          style={{ position: 'fixed', left: 0, top: 0, width: f.w, height: f.h, objectFit: 'cover', borderRadius: 18, boxShadow: '0 20px 50px rgba(0,0,0,.35)' }}
          initial={{ x: f.x0, y: f.y0, scale: 1, opacity: 1 }}
          animate={{
            x: [f.x0, f.x1],
            y: [f.y0, Math.min(f.y0, f.y1) - 90, f.y1],
            scale: [1, 0.55, 0.1],
            opacity: [1, 1, 0.7],
          }}
          transition={{
            duration: 0.85,
            x: { duration: 0.85, ease: [0.45, 0, 0.55, 1] },
            y: { duration: 0.85, times: [0, 0.4, 1], ease: 'easeInOut' },
            scale: { duration: 0.85, times: [0, 0.4, 1] },
          }}
          onAnimationComplete={() => landFly(f.id)}
        />
      ))}
    </div>
  )
}
