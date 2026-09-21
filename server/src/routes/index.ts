import { Router } from 'express'
import { usersRouter } from '../modules/users/users.routes.js'
import { imagesRouter } from '../modules/images/images.routes.js'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }))
apiRouter.use('/users', usersRouter)
apiRouter.use('/images', imagesRouter)
