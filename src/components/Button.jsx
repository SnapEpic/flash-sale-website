import { Link } from 'react-router-dom'

const base = 'group/btn inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[.98] select-none whitespace-nowrap disabled:pointer-events-none disabled:opacity-50'
const variants = {
  primary: 'bg-signal text-white hover:bg-signal-deep',
  dark: 'bg-ink text-bone hover:bg-graphite',
  light: 'bg-bone text-ink hover:bg-white',
  outlineLight: 'border border-white/30 text-bone hover:bg-white/10',
  outlineDark: 'border border-ink/25 text-ink hover:bg-ink/5',
}
const sizes = { sm: 'h-10 px-4 text-sm', md: 'h-12 px-6 text-[15px]', lg: 'h-14 px-8 text-base' }

export default function Button({ to, href, variant = 'primary', size = 'md', icon, className = '', children, ...rest }) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`
  const content = (
    <>
      {children}
      {icon && <span className="transition-transform duration-300 group-hover/btn:translate-x-1">{icon}</span>}
    </>
  )
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{content}</a>
  return <button type="button" className={cls} {...rest}>{content}</button>
}
