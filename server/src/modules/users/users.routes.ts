import { Router } from 'express'
import { usersController } from './users.controller.js'

export const usersRouter = Router()

usersRouter.get('/', usersController.list)
usersRouter.get('/:id', usersController.getById)
usersRouter.post('/', usersController.create)
usersRouter.put('/:id', usersController.update)
usersRouter.delete('/:id', usersController.remove)
