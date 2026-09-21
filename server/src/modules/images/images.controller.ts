import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { imagesService } from './images.service.js'
import { uploadImageSchema } from './images.validation.js'

export const imagesController = {
  upload: asyncHandler(async (req: Request, res: Response) => {
    const input = uploadImageSchema.parse(req.body)
    const image = await imagesService.upload(input)
    res.status(201).json(image)
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await imagesService.remove(req.params.id)
    res.status(204).send()
  }),
}
