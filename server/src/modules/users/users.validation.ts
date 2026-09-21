import { z } from 'zod'

const userDocumentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().nonnegative(),
})

// Shared base fields for both create and update — `.optional().nullable()`
// on age/gender/image/document mirrors the frontend's `nullifyUndefined()`
// convention, where a cleared field is sent as `null` rather than omitted.
const userFieldsSchema = {
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Must be a valid email address'),
  phone: z.string().trim().min(1, 'Phone is required'),
  username: z.string().trim().min(1, 'Username is required'),
  age: z.number().int().positive().nullable().optional(),
  gender: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  document: userDocumentSchema.nullable().optional(),
}

// A client-generated id is honored if supplied (see users.service.ts
// `resolveId`, mirroring the previous json-server patch's behavior); the
// server falls back to generating one when absent.
export const createUserSchema = z.object({
  id: z.string().trim().min(1).optional(),
  ...userFieldsSchema,
})

export const updateUserSchema = z.object(userFieldsSchema)

export const listUsersQuerySchema = z.object({
  _page: z.coerce.number().int().positive().default(1),
  _per_page: z.coerce.number().int().positive().max(100).default(10),
  _sort: z.string().trim().min(1).optional(),
  _where: z.string().optional(),
})
