import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/api'

/**
 * Load data from the API with loading / error states and optional background polling.
 *   const { data, loading, error, reload } = useRemote(() => api.get('/x').then(r => r.data), [dep], { pollMs: 15000 })
 * Polling refreshes quietly (no spinner) so live numbers like stock update in place.
 */
export default function useRemote(fetcher, deps = [], { pollMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const fetchRef = useRef(fetcher)
  fetchRef.current = fetcher

  const run = useCallback(async (quiet = false) => {
    if (!quiet) setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const data = await fetchRef.current()
      setState({ data, loading: false, error: '' })
    } catch (err) {
      setState((s) => (quiet ? s : { data: null, loading: false, error: errorMessage(err, 'Could not load this page.') }))
    }
  }, [])

  useEffect(() => {
    let alive = true
    const guarded = (quiet) => { if (alive) run(quiet) }
    guarded(false)
    const id = pollMs ? setInterval(() => { if (!document.hidden) guarded(true) }, pollMs) : null
    return () => { alive = false; if (id) clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: () => run(false) }
}
