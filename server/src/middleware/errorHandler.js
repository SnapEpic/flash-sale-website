export const notFoundHandler = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' })

// Every error ends up here. Users get a safe message; details go to the server log only.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500
  let message = 'Something went wrong on our side. Please try again.'
  let code = 'SERVER_ERROR'
  let details

  if (err.isAppError) {
    ;({ status, message, code, details } = err)
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Some fields are invalid.'
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]))
  } else if (err.name === 'CastError') {
    status = 400; code = 'INVALID_ID'; message = 'That id is not valid.'
  } else if (err.code === 11000) {
    status = 409; code = 'DUPLICATE'; message = 'That value already exists.'
    const field = Object.keys(err.keyPattern || {})[0]
    if (field === 'email') message = 'An account with this email already exists.'
  } else if (err.name === 'MulterError') {
    status = 400; code = 'UPLOAD_ERROR'
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 5 MB).' : 'Upload failed.'
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'BAD_JSON'; message = 'Request body is not valid JSON.'
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'TOO_LARGE'; message = 'Request is too large.'
  } else if (err.name === 'MongoServerSelectionError' || err.name === 'MongooseServerSelectionError') {
    status = 503; code = 'DB_UNAVAILABLE'; message = 'The database is temporarily unavailable. Please try again shortly.'
  } else if (err.name === 'MaxRetriesPerRequestError' || /Connection is closed|ECONNREFUSED/.test(err.message || '')) {
    status = 503; code = 'REDIS_UNAVAILABLE'; message = 'The flash-sale service is temporarily unavailable. Please try again shortly.'
  } else if (err.statusCode && err.error?.description) {
    // Razorpay SDK error shape
    status = 502; code = 'PAYMENT_GATEWAY_ERROR'; message = 'The payment provider rejected the request. Please try again.'
  }

  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err)
  const body = { message, code }
  if (details) body.errors = details
  res.status(status).json(body)
}
