import { badRequest } from '../utils/AppError.js'

// validate(zodSchema) parses req.body; on failure responds 400 with a per-field error map.
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {})
  if (result.success) {
    req.body = result.data
    return next()
  }
  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!errors[key]) errors[key] = issue.message
  }
  next(badRequest('Please fix the highlighted fields.', 'VALIDATION_ERROR', errors))
}
