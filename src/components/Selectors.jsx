import { Minus, Plus } from 'lucide-react'

export function ColorPicker({ colors, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Colour <span className="font-normal text-stone">{value}</span></legend>
      <div className="mt-2 flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <button
            key={c.name} type="button" onClick={() => onChange(c.name)} aria-pressed={value === c.name} aria-label={c.name}
            className={`grid h-10 w-10 place-items-center rounded-full border-2 transition ${value === c.name ? 'border-signal' : 'border-transparent hover:border-ink/20'}`}
          >
            <span className="h-7 w-7 rounded-full ring-1 ring-ink/15" style={{ background: c.hex }} />
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function SizePicker({ sizes, value, onChange }) {
  if (sizes.length === 1 && sizes[0] === 'One size') return null
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Size <span className="font-normal text-stone">{value}</span></legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {sizes.map((s) => (
          <button
            key={s} type="button" onClick={() => onChange(s)} aria-pressed={value === s}
            className={`h-11 min-w-[3rem] rounded-full border px-4 text-sm font-medium transition ${value === s ? 'border-ink bg-ink text-bone' : 'border-ink/15 hover:border-ink/50'}`}
          >
            {s}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function QtyStepper({ value, onChange, min = 1, max = 10, label = 'Quantity' }) {
  return (
    <div role="group" aria-label={label} className="inline-flex h-11 items-center rounded-full border border-ink/15">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity" className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5 disabled:opacity-30">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-7 text-center text-sm font-semibold tnum" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity" className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5 disabled:opacity-30">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
