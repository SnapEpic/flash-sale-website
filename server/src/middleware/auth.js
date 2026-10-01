import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { forbidden, unauthorized } from '../utils/AppError.js'

export const COOKIE_NAME = 'dropline_token'

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser can never read the token (XSS can't steal it)
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax', // 'none' is needed when the API and the site are on different domains
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
})

export const signToken = (userId) => jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
export const setAuthCookie = (res, userId) => res.cookie(COOKIE_NAME, signToken(userId), cookieOptions())
export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined })

function readToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME]
  const h = req.headers.authorization
  return h?.startsWith('Bearer ') ? h.slice(7) : null
}

// Requires a valid login. Sets req.user.
export const protect = asyncHandler(async (req, _res, next) => {
  const token = readToken(req)
  if (!token) throw unauthorized()
  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch (err) {
    throw err.name === 'TokenExpiredError'
      ? unauthorized('Your session has expired. Please sign in again.', 'TOKEN_EXPIRED')
      : unauthorized('Invalid session. Please sign in again.', 'TOKEN_INVALID')
  }
  const user = await User.findById(payload.sub)
  if (!user) throw unauthorized('Account no longer exists.', 'TOKEN_INVALID')
  req.user = user
  next()
})

export const adminOnly = (req, _res, next) => (req.user?.role === 'ADMIN' ? next() : next(forbidden('Admin access required.')))
