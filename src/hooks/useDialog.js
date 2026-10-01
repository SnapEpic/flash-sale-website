import { useEffect } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'

// Locks page scroll, closes on Escape, traps Tab focus, and restores focus on close.
export default function useDialog(ref, onClose) {
  useEffect(() => {
    const previous = document.activeElement
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    const el = ref.current
    const focusables = () => (el ? [...el.querySelectorAll(FOCUSABLE)] : [])
    const t = setTimeout(() => {
      const target = el?.querySelector('[data-autofocus]') || focusables()[0]
      target?.focus()
    }, 60)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      html.style.overflow = prevOverflow
      previous?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
