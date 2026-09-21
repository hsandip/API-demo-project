import { Router } from 'express'
import { imagesController } from './images.controller.js'

export const imagesRouter = Router()

imagesRouter.post('/', imagesController.upload)
imagesRouter.delete('/:id', imagesController.remove)
