import { motion } from 'framer-motion'
import ProductCard from './ProductCard'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.7, 0.2, 1] } } }

/**
 * layout "grid"   – responsive grid at every size
 * layout "scroll" – horizontal snap scroller on mobile, grid from md up
 */
export default function ProductGrid({ products, layout = 'grid', cols = 'xl:grid-cols-4' }) {
  const wrap =
    layout === 'scroll'
      ? `-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:gap-x-5 md:gap-y-10 md:overflow-visible md:px-0 md:pb-0 ${cols}`
      : `grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 md:gap-y-10 ${cols}`
  return (
    <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} className={wrap}>
      {products.map((p) => (
        <motion.div key={p.id} variants={item} className={layout === 'scroll' ? 'w-[68vw] max-w-[290px] flex-none snap-start md:w-auto md:max-w-none' : ''}>
          <ProductCard product={p} />
        </motion.div>
      ))}
    </motion.div>
  )
}
