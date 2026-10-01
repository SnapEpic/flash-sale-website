import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Clock, Search, TrendingUp, X } from 'lucide-react'
import Overlay from './Overlay'
import SmartImage from './SmartImage'
import { useStore } from '../context/StoreContext'
import { POPULAR_SEARCHES } from '../data/content'
import { api, errorMessage } from '../lib/api'
import { money } from '../lib/format'

function Panel() {
  const { recent, addRecent, clearRecent, setSearchOpen } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const close = () => setSearchOpen(false)

  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  // Debounced server-side search: wait 250ms after typing stops, and cancel the previous request.
  useEffect(() => {
    const term = q.trim()
    if (!term) { setResults([]); setStatus('idle'); return undefined }
    setStatus('loading')
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/products/search', { params: { q: term }, signal: ctrl.signal })
        setResults(data.products)
        setStatus('done')
      } catch (err) {
        if (!ctrl.signal.aborted) { setResults([]); setStatus(errorMessage(err) ? 'error' : 'done') }
      }
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  const submit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    addRecent(q)
    close()
    navigate(`/flash-sale?q=${encodeURIComponent(q.trim())}`)
  }
  const pick = (term) => setQ(term)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
      <form onSubmit={submit} role="search" className="flex items-center gap-3 border-b-2 border-ink pb-3">
        <Search className="h-6 w-6 flex-none" aria-hidden />
        <input
          data-autofocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sneakers, watches, audio..."
          aria-label="Search products" autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-xl font-medium outline-none placeholder:text-stone sm:text-3xl [&::-webkit-search-cancel-button]:hidden"
        />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5"><X className="h-5 w-5" /></button>}
        <button type="button" onClick={close} className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-ink/5">Close</button>
      </form>

      {q.trim() === '' ? (
        <div className="grid gap-8 pt-6 sm:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold"><TrendingUp className="h-4 w-4 text-signal" aria-hidden /> Popular searches</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((s) => (
                <button key={s} onClick={() => pick(s)} className="h-10 rounded-full border border-ink/15 px-4 text-sm font-medium transition hover:border-ink hover:bg-ink hover:text-bone">{s}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-stone" aria-hidden /> Recent searches</h2>
              {recent.length > 0 && <button onClick={clearRecent} className="text-xs font-semibold text-stone underline underline-offset-2 hover:text-ink">Clear</button>}
            </div>
            {recent.length ? (
              <ul className="mt-3 space-y-1">
                {recent.map((r) => (
                  <li key={r}><button onClick={() => pick(r)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-ink/5">{r}<ArrowUpRight className="h-4 w-4 text-stone" aria-hidden /></button></li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-stone">Nothing yet. Your searches will show up here.</p>}
          </div>
        </div>
      ) : (
        <div className="pt-4" aria-live="polite">
          <p className="text-sm text-stone">{status === 'loading' ? 'Searching…' : status === 'error' ? 'Search is unavailable right now.' : `${results.length} ${results.length === 1 ? 'match' : 'matches'} for “${q}”`}</p>
          {status === 'error' ? (
            <p className="py-10 text-center text-stone">We could not reach the server. Check your connection and try again.</p>
          ) : status === 'loading' && results.length === 0 ? (
            <div className="grid place-items-center py-10" role="status"><span className="h-6 w-6 animate-spin rounded-full border-2 border-ink/20 border-t-signal" /></div>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-stone">No matches. Try a brand, a category, or something shorter.</p>
          ) : (
            <ul className="mt-2 max-h-[52svh] divide-y divide-ink/10 overflow-y-auto">
              {results.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link to={`/product/${p.id}`} onClick={() => { addRecent(q); close() }} className="group flex items-center gap-4 rounded-xl px-1 py-3 transition hover:bg-ink/[.04]">
                    <SmartImage src={p.images[0]} alt="" className="h-16 w-16 flex-none rounded-xl bg-bone object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-sm capitalize text-stone">{p.brand}, {p.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{money(p.price)}</p>
                      <p className="text-xs font-semibold text-signal">{p.stock <= 0 ? 'Sold out' : `-${p.discount}%`}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {results.length > 0 && (
            <button onClick={submit} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4">See all results <ArrowUpRight className="h-4 w-4" aria-hidden /></button>
          )}
        </div>
      )}
    </div>
  )
}

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore()
  return (
    <Overlay open={searchOpen} onClose={() => setSearchOpen(false)} label="Search" variant="top" className="w-full rounded-b-3xl bg-paper shadow-2xl">
      <Panel />
    </Overlay>
  )
}
