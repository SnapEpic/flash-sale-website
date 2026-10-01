import { useEffect, useState } from 'react'

export default function useCountdown(endsAt) {
  const calc = () => Math.max(0, endsAt - Date.now())
  const [left, setLeft] = useState(calc)
  useEffect(() => {
    setLeft(calc())
    const id = setInterval(() => setLeft(calc()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])
  const t = Math.floor(left / 1000)
  return {
    days: Math.floor(t / 86400),
    hours: Math.floor((t % 86400) / 3600),
    minutes: Math.floor((t % 3600) / 60),
    seconds: t % 60,
    ended: left <= 0,
  }
}
