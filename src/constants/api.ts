export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
  },
  users: {
    list: '/users',
    detail: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    remove: (id: string) => `/users/${id}`,
  },
  images: {
    upload: '/images',
    remove: (id: string) => `/images/${id}`,
  },
} as const
