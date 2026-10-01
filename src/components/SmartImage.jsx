import { useState } from 'react'
import { Package } from 'lucide-react'

// Lazy image with a graceful fallback so the UI never shows a broken-image icon.
export default function SmartImage({ src, alt = '', className = '', eager = false, ...rest }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div role="img" aria-label={alt} className={`grid place-items-center bg-gradient-to-br from-graphite to-ink text-bone/50 ${className}`}>
        <Package strokeWidth={1.2} className="h-1/4 w-1/4 max-h-16 max-w-16" aria-hidden />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  )
}
