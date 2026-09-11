export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    userSearch: '/users/search',
    userUpdate: (id: number) => `/users/${id}`,
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
