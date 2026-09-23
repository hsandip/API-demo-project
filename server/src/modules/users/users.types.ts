export interface UserDocument {
  url: string
  name: string
  mimeType: string
  size: number
}

// Mirrors vite-project/src/types/user.ts's `User` — this is the same shape
// the frontend's usersApi already expects back from the local API.
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  username: string
  age?: number | null
  gender?: string | null
  image?: string | null
  document?: UserDocument | null
  // Only used server-side to order the default (unsorted) list view newest
  // first — see users.service.ts. Not one of the frontend's user-facing
  // sortable columns.
  created_at?: string
}

export type UserInput = Omit<User, 'id'>
