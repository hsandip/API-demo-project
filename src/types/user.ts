export interface UserDocument {
  url: string
  name: string
  mimeType: string
  size: number
}

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

// authId is DummyJSON's numeric login-session id — a different, unrelated ID
// domain from the local json-server User.id (string) above. Named
// distinctly so the two are never mistakenly compared or interchanged.
export interface AuthUser {
  authId: number
  username: string
  email: string
  firstName: string
  lastName: string
  image: string
}
