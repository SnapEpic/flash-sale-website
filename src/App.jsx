import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import SearchOverlay from './components/SearchOverlay'
import QuickView from './components/QuickView'
import CheckoutModal from './components/CheckoutModal'
import Toasts from './components/Toasts'
import FlyLayer from './components/FlyLayer'
import RequireAuth from './components/RequireAuth'
import Home from './pages/Home'
import { useStore } from './context/StoreContext'
import { AlertCircle } from 'lucide-react'
import EmptyState from './components/EmptyState'

const FlashSale = lazy(() => import('./pages/FlashSale'))
const Categories = lazy(() => import('./pages/Categories'))
const Category = lazy(() => import('./pages/Category'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Cart = lazy(() => import('./pages/Cart'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Orders = lazy(() => import('./pages/Orders'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const NotFound = lazy(() => import('./pages/NotFound'))

const Fallback = () => <div className="grid min-h-[60svh] place-items-center" role="status" aria-label="Loading"><span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-signal" /></div>

// The shop cannot render without its catalogue, so show a spinner while it loads and a retry if the API is down.
function CatalogGate({ children }) {
  const { catalogStatus, catalogError, reloadCatalog } = useStore()
  if (catalogStatus === 'loading') return <Fallback />
  if (catalogStatus === 'error') return <div className="container-x pb-20 pt-40"><EmptyState icon={AlertCircle} title="Shop unavailable" text={catalogError} cta="Try again" onClick={reloadCatalog} /></div>
  return children
}

export default function App() {
  const location = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [location.pathname])

  return (
    <MotionConfig reducedMotion="user">
      <Navbar />
      <main id="main" className="min-h-screen">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            <Suspense fallback={<Fallback />}>
              <CatalogGate>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/flash-sale" element={<FlashSale />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/category/:category" element={<Category />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
                <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
                <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </CatalogGate>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <QuickView />
      <CheckoutModal />
      <Toasts />
      <FlyLayer />
    </MotionConfig>
  )
}
