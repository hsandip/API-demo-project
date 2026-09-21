import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../lib/ApiError.js'
import { isProduction } from '../config/env.js'

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `No route matches ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express identifies error middleware by arity (4 params)
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message, details: err.details })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    })
    return
  }

  console.error(err)
  res.status(500).json({ message: isProduction ? 'Internal server error' : (err as Error)?.message })
}
