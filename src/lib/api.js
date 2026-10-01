import axios from 'axios'

// One axios instance for the whole app. The auth cookie is httpOnly, so the browser attaches it
// automatically (withCredentials) and JavaScript never touches the token.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 20000,
})

// Turn any failure into a short message that is safe to show a customer.
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (axios.isCancel?.(err)) return ''
  if (err?.code === 'ECONNABORTED') return 'The request took too long. Please try again.'
  if (!err?.response) return 'Cannot reach the server. Check your connection and try again.'
  return err.response.data?.message || fallback
}

export const errorCode = (err) => err?.response?.data?.code
export const fieldErrors = (err) => err?.response?.data?.errors || {}

// Hook for places that need to react when the session dies (AuthContext registers it).
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const code = err?.response?.data?.code
    if (err?.response?.status === 401 && (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID')) onUnauthorized(code)
    return Promise.reject(err)
  },
)
