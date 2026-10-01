import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useLocalStorage from '../hooks/useLocalStorage'
import { api, errorCode, errorMessage } from '../lib/api'
import { useAuth } from './AuthContext'

const StoreContext = createContext(null)

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

const POLL_MS = 20000 // how often stock, sale clock and cart are refreshed in the background
const DEFAULT_CONFIG = { freeShippingAt: 150, shippingFee: 9, usdToInr: 83, reservationTtlSeconds: 600 }

/**
 * Everything the storefront shares: the live catalogue (from the API), the signed-in user's cart and
 * wishlist (stored in MongoDB), the flash-sale clock (from Redis) and UI state (overlays, toasts).
 */
export function StoreProvider({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locRef = useRef(location)
  locRef.current = location

  const [catalog, setCatalog] = useState({ status: 'loading', products: [], categories: [], error: '' })
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [sale, setSale] = useState({ saleEnd: Date.now(), live: true })
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [recent, setRecent] = useLocalStorage('dropline:recent', [])

  const [quickView, setQuickView] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState(null) // null, or { mode: 'cart' } / { mode: 'buyNow', item }

  const [toasts, setToasts] = useState([])
  const [flies, setFlies] = useState([])
  const [bump, setBump] = useState(0)
  const toastId = useRef(0)

  // The old demo kept the cart and wishlist in the browser. They live on the server now.
  useEffect(() => {
    try { window.localStorage.removeItem('dropline:cart'); window.localStorage.removeItem('dropline:wishlist'); window.localStorage.removeItem('dropline:sale-end') } catch { /* ignore */ }
  }, [])

  /* ---------- toasts ---------- */
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((title, opts = {}) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-2), { id, title, ...opts }])
    setTimeout(() => dismissToast(id), opts.duration || (opts.error ? 5200 : 3400))
  }, [dismissToast])

  /* ---------- catalogue + flash-sale clock ---------- */
  const loadCatalog = useCallback(async (quiet = false) => {
    if (!quiet) setCatalog((c) => ({ ...c, status: 'loading', error: '' }))
    try {
      const [p, c, s, cfg] = await Promise.all([
        api.get('/products', { params: { limit: 100 } }),
        api.get('/categories'),
        api.get('/flash-sale/status'),
        api.get('/config'),
      ])
      setCatalog({ status: 'ready', products: p.data.products, categories: c.data.categories, error: '' })
      setConfig(cfg.data)
      // Correct for the visitor's clock being wrong: measure the sale end against the SERVER's clock.
      const next = s.data.endsAt - s.data.serverTime + Date.now()
      setSale((prev) => (Math.abs(prev.saleEnd - next) > 2500 ? { saleEnd: next, live: s.data.live } : { ...prev, live: s.data.live }))
    } catch (err) {
      if (!quiet) setCatalog((c) => ({ ...c, status: 'error', error: errorMessage(err, 'We could not load the shop.') }))
    }
  }, [])

  useEffect(() => {
    loadCatalog(false)
    const id = setInterval(() => { if (!document.hidden) loadCatalog(true) }, POLL_MS)
    return () => clearInterval(id)
  }, [loadCatalog])

  const restartSale = useCallback(async () => {
    try {
      await api.post('/flash-sale/restart')
      await loadCatalog(true)
      toast('Flash sale restarted')
    } catch (err) { toast(errorMessage(err), { error: true }) }
  }, [loadCatalog, toast])

  const byId = useMemo(() => new Map(catalog.products.map((p) => [p.id, p])), [catalog.products])
  const getProduct = useCallback((id) => byId.get(String(id)), [byId])
  const getCategory = useCallback((slug) => catalog.categories.find((c) => c.slug === slug), [catalog.categories])
  const categoryCount = useCallback((slug) => getCategory(slug)?.productCount ?? 0, [getCategory])
  const brands = useMemo(() => [...new Set(catalog.products.map((p) => p.brand))], [catalog.products])

  /* ---------- sign-in gate ---------- */
  const requireLogin = useCallback((message = 'Sign in to continue') => {
    const l = locRef.current
    toast(message, { sub: 'It only takes a moment.' })
    setCartOpen(false); setQuickView(null); setSearchOpen(false)
    navigate('/login', { state: { from: l.pathname + l.search } })
    return false
  }, [navigate, toast])

  /* ---------- cart (MongoDB, per user) ---------- */
  const loadCart = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get('/cart')
      setCart(data.items)
      if (data.items.some((i) => i.priceChanged)) toast('Some prices changed since you added them', { sub: 'Your bag shows the latest prices.' })
    } catch { /* keep the last known cart; the next poll will retry */ }
  }, [user, toast])

  useEffect(() => { if (user) loadCart(); else { setCart([]); setWishlist([]); setCheckout(null) } }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) return undefined
    const id = setInterval(() => { if (!document.hidden) loadCart() }, POLL_MS)
    return () => clearInterval(id)
  }, [user, loadCart])

  const launchFly = useCallback((src, el) => {
    const target = document.querySelector('[data-cart-target]')
    if (!el || !target) return
    const a = el.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    if (!a.width || !b.width) return
    const w = Math.min(a.width, 200)
    const h = Math.min(a.height, 240)
    const fly = {
      id: ++toastId.current, src, w, h,
      x0: a.left + a.width / 2 - w / 2, y0: a.top + a.height / 2 - h / 2,
      x1: b.left + b.width / 2 - w / 2, y1: b.top + b.height / 2 - h / 2,
    }
    setFlies((f) => [...f, fly])
  }, [])
  const landFly = useCallback((id) => {
    setFlies((f) => f.filter((x) => x.id !== id))
    setBump((n) => n + 1)
  }, [])

  const addToCart = useCallback(async (product, { color, size, qty = 1, sourceEl, silent } = {}) => {
    if (!user) return requireLogin('Sign in to add items to your bag')
    try {
      const { data } = await api.post('/cart/items', {
        productId: product.id, color: color ?? product.colors[0].name, size: size ?? product.sizes[0], qty,
      })
      setCart(data.items)
      if (!silent) {
        toast('Added to your bag', { sub: product.name, image: product.images[0], action: { label: 'View bag', onClick: () => setCartOpen(true) } })
        if (sourceEl) launchFly(product.images[0], sourceEl)
        else setBump((n) => n + 1)
      }
      return true
    } catch (err) {
      toast(errorMessage(err), { sub: product.name, error: true })
      if (['OUT_OF_STOCK', 'SALE_ENDED'].includes(errorCode(err))) loadCatalog(true)
      return false
    }
  }, [user, requireLogin, toast, launchFly, loadCatalog])

  const setQty = useCallback(async (key, qty) => {
    const next = Math.max(0, Math.min(10, qty))
    const before = cart
    setCart((c) => (next === 0 ? c.filter((x) => x.id !== key) : c.map((x) => (x.id === key ? { ...x, qty: next } : x)))) // optimistic
    try {
      const { data } = await api.put(`/cart/items/${key}`, { qty: next })
      setCart(data.items)
    } catch (err) {
      setCart(before)
      toast(errorMessage(err), { error: true })
      loadCart()
    }
  }, [cart, toast, loadCart])

  const removeFromCart = useCallback(async (key) => {
    const before = cart
    setCart((c) => c.filter((x) => x.id !== key))
    try {
      const { data } = await api.delete(`/cart/items/${key}`)
      setCart(data.items)
    } catch (err) { setCart(before); toast(errorMessage(err), { error: true }) }
  }, [cart, toast])

  const clearCart = useCallback(async () => {
    setCart([])
    try { await api.delete('/cart') } catch { /* next poll re-syncs */ }
  }, [])

  const lines = useMemo(
    () => cart.map((i) => ({
      key: i.id, id: i.productId, color: i.color, size: i.size, qty: i.qty,
      available: i.available, soldOut: i.soldOut, insufficient: i.insufficient, priceChanged: i.priceChanged,
      product: byId.get(i.productId),
    })).filter((l) => l.product),
    [cart, byId],
  )
  const totals = useMemo(() => {
    let original = 0, subtotal = 0, count = 0
    lines.forEach((l) => {
      original += l.product.originalPrice * l.qty
      subtotal += l.product.price * l.qty
      count += l.qty
    })
    const shipping = subtotal === 0 || subtotal >= config.freeShippingAt ? 0 : config.shippingFee
    return { count, original, subtotal, savings: original - subtotal, shipping, total: subtotal + shipping }
  }, [lines, config])

  /* ---------- wishlist (MongoDB, per user) ---------- */
  useEffect(() => {
    if (!user) return
    api.get('/wishlist').then((r) => setWishlist(r.data.productIds)).catch(() => {})
  }, [user])
  const isWished = useCallback((id) => wishlist.includes(id), [wishlist])
  const toggleWishlist = useCallback(async (product) => {
    if (!user) return requireLogin('Sign in to save items to your wishlist')
    const has = wishlist.includes(product.id)
    setWishlist((w) => (has ? w.filter((x) => x !== product.id) : [...w, product.id])) // optimistic
    toast(has ? 'Removed from your wishlist' : 'Saved to your wishlist', { sub: product.name, image: product.images[0] })
    try {
      const { data } = has ? await api.delete(`/wishlist/${product.id}`) : await api.post(`/wishlist/${product.id}`)
      setWishlist(data.productIds)
    } catch (err) {
      setWishlist((w) => (has ? [...w, product.id] : w.filter((x) => x !== product.id)))
      toast(errorMessage(err), { error: true })
    }
  }, [user, wishlist, requireLogin, toast])

  /* ---------- checkout ---------- */
  const openCheckout = useCallback((opts = { mode: 'cart' }) => {
    if (!user) return requireLogin('Sign in to check out')
    setCartOpen(false); setQuickView(null)
    setCheckout(opts)
    return true
  }, [user, requireLogin])
  const closeCheckout = useCallback(() => setCheckout(null), [])
  const setCheckoutOpen = useCallback((v) => (v ? openCheckout({ mode: 'cart' }) : setCheckout(null)), [openCheckout])
  const buyNow = useCallback((product, { color, size, qty = 1 } = {}) => {
    openCheckout({ mode: 'buyNow', item: { productId: product.id, color: color ?? product.colors[0].name, size: size ?? product.sizes[0], qty } })
  }, [openCheckout])
  const afterOrder = useCallback(() => { loadCart(); loadCatalog(true) }, [loadCart, loadCatalog])

  /* ---------- recent searches ---------- */
  const addRecent = useCallback((term) => {
    const t = term.trim()
    if (!t) return
    setRecent((r) => [t, ...r.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 5))
  }, [setRecent])
  const clearRecent = useCallback(() => setRecent([]), [setRecent])

  const value = useMemo(() => ({
    products: catalog.products, categories: catalog.categories, catalogStatus: catalog.status, catalogError: catalog.error, reloadCatalog: () => loadCatalog(false),
    getProduct, getCategory, categoryCount, brands, config,
    cart, lines, totals, addToCart, setQty, removeFromCart, clearCart, buyNow,
    wishlist, isWished, toggleWishlist,
    recent, addRecent, clearRecent,
    saleEnd: sale.saleEnd, saleLive: sale.live, restartSale,
    quickView, openQuickView: setQuickView, closeQuickView: () => setQuickView(null),
    searchOpen, setSearchOpen, cartOpen, setCartOpen,
    checkout, checkoutOpen: !!checkout, setCheckoutOpen, openCheckout, closeCheckout, afterOrder,
    toasts, toast, dismissToast, flies, landFly, bump,
  }), [catalog, loadCatalog, getProduct, getCategory, categoryCount, brands, config, cart, lines, totals, addToCart, setQty, removeFromCart, clearCart, buyNow, wishlist, isWished, toggleWishlist, recent, addRecent, clearRecent, sale, restartSale, quickView, searchOpen, cartOpen, checkout, openCheckout, closeCheckout, setCheckoutOpen, afterOrder, toasts, toast, dismissToast, flies, landFly, bump])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
