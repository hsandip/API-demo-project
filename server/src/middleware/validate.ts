import type { RequestHandler } from 'express'
import type { ZodTypeAny } from 'zod'

// Validates req.body against `schema` and replaces it with the parsed
// (type-coerced, defaulted) value. Zod errors are forwarded to errorHandler.
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      next(error)
    }
  }
}
