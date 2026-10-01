// An error we throw on purpose. `message` is safe to show to end users.
export class AppError extends Error {
  constructor(status, message, code, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.isAppError = true
  }
}
export const badRequest = (m, code, d) => new AppError(400, m, code, d)
export const unauthorized = (m = 'Please sign in to continue.', code = 'UNAUTHORIZED') => new AppError(401, m, code)
export const forbidden = (m = 'You do not have permission to do that.') => new AppError(403, m, 'FORBIDDEN')
export const notFound = (m = 'Not found.') => new AppError(404, m, 'NOT_FOUND')
export const conflict = (m, code) => new AppError(409, m, code)
