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
}

export type UserInput = Omit<User, 'id'>
