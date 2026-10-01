import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, SearchX, SlidersHorizontal, X } from 'lucide-react'
import Countdown from '../components/Countdown'
import ProductGrid from '../components/ProductGrid'
import FilterPanel, { FilterSheet } from '../components/FilterPanel'
import SortSelect from '../components/SortSelect'
import EmptyState from '../components/EmptyState'
import useRemote from '../hooks/useRemote'
import { api } from '../lib/api'
import { DEFAULT_FILTERS, applyFilters, isFiltered, sortProducts } from '../lib/filters'

export default function FlashSale() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const sort = params.get('sort') || 'popular'
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sheet, setSheet] = useState(false)

  // Plain view: the Redis-cached flash-sale endpoint. With a search term: the real product search.
  // Both return live stock, and we re-poll every 15s so the stock bars move while you watch.
  const { data, loading, error, reload } = useRemote(
    () => (q ? api.get('/products/search', { params: { q, flashSale: true } }) : api.get('/products/flash-sale')).then((r) => r.data.products),
    [q], { pollMs: 15000 },
  )
  const base = useMemo(() => data || [], [data])
  const categoryCounts = useMemo(() => base.reduce((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {}), [base])
  const list = useMemo(() => sortProducts(applyFilters(base, filters), sort), [base, filters, sort])

  const setSort = (v) => { const n = new URLSearchParams(params); n.set('sort', v); setParams(n, { replace: true }) }
  const clearQ = () => { const n = new URLSearchParams(params); n.delete('q'); setParams(n, { replace: true }) }
  const activeCount = filters.categories.length + (filters.maxPrice < 600) + (filters.minDiscount > 0) + (filters.minRating > 0) + (filters.availability !== 'all')

  return (
    <>
      <section className="on-dark relative overflow-hidden bg-ink pb-12 pt-32 text-bone md:pb-16 md:pt-40">
        <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-signal/35 blur-[110px]" />
        <div className="container-x relative flex flex-wrap items-end justify-between gap-8">
          <div>
            <h1 className="h-display text-7xl sm:text-8xl md:text-[9rem]">{newestView(sort) ? 'New arrivals' : 'Flash sale'}</h1>
            <p className="mt-3 max-w-lg text-lg text-bone/65">{newestView(sort) ? 'The latest drops, newest first, all still at sale prices.' : 'Grab it before it’s gone. Every price here drops back when the clock runs out.'}</p>
          </div>
          <Countdown variant="boxes" dark />
        </div>
      </section>

      <section className="container-x py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky top-28">
              <h2 className="mb-5 text-lg font-bold">Filters</h2>
              <FilterPanel filters={filters} setFilters={setFilters} categoryCounts={categoryCounts} />
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-5">
              <p className="text-sm text-stone" aria-live="polite"><b className="text-ink">{loading && !data ? '…' : list.length}</b> {list.length === 1 ? 'deal' : 'deals'}{q && <> for &ldquo;{q}&rdquo;</>}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setSheet(true)} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-sm font-medium lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters{activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-signal text-xs text-white">{activeCount}</span>}
                </button>
                <SortSelect value={sort} onChange={setSort} />
              </div>
            </div>
            {q && (
              <button onClick={clearQ} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-bone">Search: {q} <X className="h-4 w-4" aria-hidden /><span className="sr-only">Clear search</span></button>
            )}
            <div className="mt-8">
              {loading && !data ? (
                <div className="grid min-h-[30svh] place-items-center" role="status" aria-label="Loading deals"><span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-signal" /></div>
              ) : error ? (
                <EmptyState icon={AlertCircle} title="Could not load the sale" text={error} cta="Try again" onClick={reload} />
              ) : list.length ? (
                <ProductGrid key={`${sort}-${q}-${list.map((p) => p.id).join('.')}`} products={list} cols="xl:grid-cols-3 2xl:grid-cols-4" />
              ) : (
                <EmptyState icon={SearchX} title="No deals match" text="Loosen a filter or clear your search to see more of the sale." cta="Reset filters" onClick={() => { setFilters(DEFAULT_FILTERS); clearQ() }} />
              )}
            </div>
            {isFiltered(filters) && list.length > 0 && <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-8 text-sm font-semibold underline underline-offset-4">Clear all filters</button>}
          </div>
        </div>
      </section>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} resultCount={list.length} filters={filters} setFilters={setFilters} categoryCounts={categoryCounts} />
    </>
  )
}

function newestView(sort) { return sort === 'newest' }
