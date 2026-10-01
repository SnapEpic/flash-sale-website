import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import AuthShell, { Field } from '../components/AuthShell'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { errorMessage, fieldErrors } from '../lib/api'

// Mirrors the server rules so people get instant feedback; the server still validates everything.
function validate(v) {
  const er = {}
  if (v.name.trim().length < 2) er.name = 'Enter your name.'
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) er.email = 'Enter a valid email address.'
  if (v.password.length < 8) er.password = 'Use at least 8 characters.'
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) er.password = 'Include at least one letter and one number.'
  if (v.confirmPassword !== v.password) er.confirmPassword = 'Passwords do not match.'
  return er
}

export default function Register() {
  const { user, register } = useAuth()
  const { toast } = useStore()
  const location = useLocation()
  const from = location.state?.from || '/'
  const [v, setV] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))

  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    const er = validate(v)
    setErrors(er); setFormError('')
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const u = await register({ ...v, name: v.name.trim(), email: v.email.trim() })
      toast(`Welcome to Dropline, ${u.name.split(' ')[0]}`, { sub: 'Your account is ready.' })
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err, 'Could not create your account.'))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create account" subtitle="Save your bag, track orders and check out faster."
      footer={<>Already have an account? <Link to="/login" state={location.state} className="font-semibold text-ink underline underline-offset-4">Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate className="grid gap-5">
        {formError && !Object.keys(errors).length && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</p>}
        <Field label="Full name" value={v.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Field label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="email" inputMode="email" />
        <Field label="Password" type="password" value={v.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="At least 8 characters, with a letter and a number." />
        <Field label="Confirm password" type="password" value={v.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
        <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AuthShell>
  )
}
