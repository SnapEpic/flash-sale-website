import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { User, hashPassword } from '../models/User.js'
import { protect, setAuthCookie, clearAuthCookie } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'

const router = Router()

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254)
const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name.').max(60),
    email,
    password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Password is too long.')
      .regex(/[A-Za-z]/, 'Include at least one letter.').regex(/\d/, 'Include at least one number.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' })
const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.') })

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

router.post('/register', rateLimit({ name: 'register', windowSec: 3600, max: 10 }), validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists.', 'EMAIL_TAKEN', { email: 'This email is already registered.' })
  const user = await User.create({ name, email, password: await hashPassword(password) })
  setAuthCookie(res, user._id)
  res.status(201).json({ user })
}))

router.post('/login', rateLimit({ name: 'login', windowSec: 900, max: 10 }), validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password')
  const ok = user ? await user.checkPassword(req.body.password) : await bcrypt.compare(req.body.password, DUMMY_HASH).then(() => false)
  if (!user || !ok) throw new AppError(401, 'Incorrect email or password.', 'BAD_CREDENTIALS')
  setAuthCookie(res, user._id)
  res.json({ user })
}))

router.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get('/me', protect, (req, res) => res.json({ user: req.user }))

export default router
