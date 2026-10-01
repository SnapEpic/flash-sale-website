import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler } from '../lib/api'

const AuthContext = createContext(null)
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true until we know whether a session cookie is valid

  // On every page load ask the server "who am I?". This is what keeps you logged in across refreshes.
  useEffect(() => {
    let alive = true
    api.get('/auth/me')
      .then((r) => alive && setUser(r.data.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  // If any API call reports an expired/invalid token, drop the user so the UI asks them to sign in again.
  useEffect(() => { setUnauthorizedHandler(() => setUser(null)) }, [])

  const register = useCallback(async (form) => {
    const { data } = await api.post('/auth/register', form)
    setUser(data.user)
    return data.user
  }, [])
  const login = useCallback(async (form) => {
    const { data } = await api.post('/auth/login', form)
    setUser(data.user)
    return data.user
  }, [])
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } finally { setUser(null) }
  }, [])

  const value = useMemo(() => ({ user, loading, isAdmin: user?.role === 'ADMIN', register, login, logout }), [user, loading, register, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
