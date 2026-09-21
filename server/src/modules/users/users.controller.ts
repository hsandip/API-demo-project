import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { usersService } from './users.service.js'
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from './users.validation.js'

export const usersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = listUsersQuerySchema.parse(req.query)
    const result = await usersService.list({
      page: query._page,
      perPage: query._per_page,
      sort: query._sort,
      where: query._where,
    })
    res.json(result)
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.getById(req.params.id)
    res.json(user)
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = createUserSchema.parse(req.body)
    const user = await usersService.create(input)
    res.status(201).json(user)
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = updateUserSchema.parse(req.body)
    const user = await usersService.update(req.params.id, input)
    res.json(user)
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await usersService.remove(req.params.id)
    res.status(204).send()
  }),
}
