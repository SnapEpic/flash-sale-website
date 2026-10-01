import Button from './Button'

export default function EmptyState({ icon: Icon, title, text, cta, to, onClick }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-bone"><Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden /></span>
      <h2 className="h-display mt-6 text-5xl">{title}</h2>
      <p className="mt-3 text-stone">{text}</p>
      <Button to={to} onClick={onClick} className="mt-7">{cta}</Button>
    </div>
  )
}
