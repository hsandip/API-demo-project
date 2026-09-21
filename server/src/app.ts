import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env, isProduction } from './config/env.js'
import { apiRouter } from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.corsOrigins,
    }),
  )
  app.use(morgan(isProduction ? 'combined' : 'dev'))
  // Raised from Express's 100kb default so base64-encoded image/document
  // uploads (~1.33x the original file size) don't hit "payload too large".
  app.use(express.json({ limit: '10mb' }))

  // Mounted at the root (not under /api) so these endpoints keep the exact
  // same paths the frontend's localApiClient already targets against
  // json-server (`/users`, `/images`) — only VITE_LOCAL_API_URL's port needs
  // to change, no service-layer code.
  app.use('/', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
