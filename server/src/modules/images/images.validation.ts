import { z } from 'zod'

export const uploadImageSchema = z.object({
  originalName: z.string().trim().min(1, 'originalName is required'),
  dataUrl: z
    .string()
    .min(1, 'dataUrl is required')
    .refine((value) => value.startsWith('data:'), 'dataUrl must be a data URL'),
  mimeType: z.string().trim().min(1, 'mimeType is required'),
  size: z.number().nonnegative(),
})
