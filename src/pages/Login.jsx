import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import AuthShell, { Field } from '../components/AuthShell'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { errorMessage, fieldErrors } from '../lib/api'

export default function Login() {
  const { user, login } = useAuth()
  const { toast } = useStore()
  const location = useLocation()
  const from = location.state?.from || '/'
  const [v, setV] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))

  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) er.email = 'Enter a valid email address.'
    if (!v.password) er.password = 'Enter your password.'
    setErrors(er); setFormError('')
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const u = await login({ email: v.email.trim(), password: v.password })
      toast(`Welcome back, ${u.name.split(' ')[0]}`)
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err, 'Could not sign you in.'))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in" subtitle="Welcome back. Your bag and wishlist are waiting."
      footer={<>New to Dropline? <Link to="/register" state={location.state} className="font-semibold text-ink underline underline-offset-4">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="grid gap-5">
        {formError && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</p>}
        <Field label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="email" inputMode="email" />
        <Field label="Password" type="password" value={v.password} onChange={set('password')} error={errors.password} autoComplete="current-password" />
        <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthShell>
  )
}
