import { ChevronDown } from 'lucide-react'
import { SORTS } from '../lib/filters'

export default function SortSelect({ value, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Sort products</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 appearance-none rounded-full border border-ink/15 bg-white pl-4 pr-10 text-sm font-medium outline-none hover:border-ink/40 focus-visible:border-signal">
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4" aria-hidden />
    </label>
  )
}
