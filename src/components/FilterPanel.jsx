import { X } from 'lucide-react'
import Overlay from './Overlay'
import Button from './Button'
import { useStore } from '../context/StoreContext'
import { DEFAULT_FILTERS, isFiltered } from '../lib/filters'
import { money } from '../lib/format'

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`h-10 rounded-full border px-4 text-sm font-medium transition ${active ? 'border-ink bg-ink text-bone' : 'border-ink/15 hover:border-ink/50'}`}>
      {children}
    </button>
  )
}

function Group({ title, children }) {
  return (
    <fieldset className="border-t border-ink/10 py-5 first:border-t-0 first:pt-0">
      <legend className="mb-3 float-left w-full text-sm font-bold">{title}</legend>
      <div className="clear-both flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

export default function FilterPanel({ filters, setFilters, categoryCounts }) {
  const { categories: CATEGORIES } = useStore()
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const toggleCat = (slug) => set({ categories: filters.categories.includes(slug) ? filters.categories.filter((c) => c !== slug) : [...filters.categories, slug] })
  return (
    <div>
      <Group title="Category">
        {CATEGORIES.map((c) => (
          <Chip key={c.slug} active={filters.categories.includes(c.slug)} onClick={() => toggleCat(c.slug)}>
            {c.name} <span className="opacity-50">{categoryCounts[c.slug] ?? 0}</span>
          </Chip>
        ))}
      </Group>
      <fieldset className="border-t border-ink/10 py-5">
        <legend className="float-left mb-3 w-full text-sm font-bold">Price <span className="font-normal text-stone">up to {money(filters.maxPrice)}</span></legend>
        <input type="range" min="20" max="600" step="10" value={filters.maxPrice} onChange={(e) => set({ maxPrice: Number(e.target.value) })} aria-label="Maximum price" className="clear-both h-2 w-full cursor-pointer" />
      </fieldset>
      <Group title="Discount">
        {[[0, 'Any'], [30, '30%+'], [50, '50%+'], [60, '60%+']].map(([v, l]) => <Chip key={v} active={filters.minDiscount === v} onClick={() => set({ minDiscount: v })}>{l}</Chip>)}
      </Group>
      <Group title="Rating">
        {[[0, 'Any'], [4, '4.0+'], [4.5, '4.5+'], [4.8, '4.8+']].map(([v, l]) => <Chip key={v} active={filters.minRating === v} onClick={() => set({ minRating: v })}>{l}</Chip>)}
      </Group>
      <Group title="Availability">
        {[['all', 'All'], ['low', 'Almost gone'], ['in', 'Plenty left']].map(([v, l]) => <Chip key={v} active={filters.availability === v} onClick={() => set({ availability: v })}>{l}</Chip>)}
      </Group>
      {isFiltered(filters) && (
        <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-2 text-sm font-semibold underline underline-offset-4">Clear all filters</button>
      )}
    </div>
  )
}

export function FilterSheet({ open, onClose, resultCount, ...panel }) {
  return (
    <Overlay open={open} onClose={onClose} label="Filters" variant="sheet" className="flex max-h-[88svh] w-full flex-col rounded-t-3xl bg-paper shadow-2xl">
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-ink/15" aria-hidden />
      <div className="flex items-center justify-between px-5 pb-2 pt-3">
        <h2 className="text-lg font-bold">Filters</h2>
        <button onClick={onClose} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4"><FilterPanel {...panel} /></div>
      <div className="safe-bottom border-t border-ink/10 px-5 pt-4">
        <Button variant="dark" className="w-full" onClick={onClose}>Show {resultCount} {resultCount === 1 ? 'item' : 'items'}</Button>
      </div>
    </Overlay>
  )
}
