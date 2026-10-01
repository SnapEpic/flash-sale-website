import { Link } from 'react-router-dom'

export default function Logo({ className = '' }) {
  return (
    <Link to="/" aria-label="Dropline home" className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#4A5CFF" />
        <path d="M18.5 5 9 18h6.5L14 27l9-13h-6.2z" fill="#fff" />
      </svg>
      <span className="font-display text-[1.7rem] font-extrabold uppercase leading-none tracking-tight">Dropline</span>
    </Link>
  )
}
