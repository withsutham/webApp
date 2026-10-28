import { api } from './api'

export const authApi = {
  register: async (details) => {
    const response = await api.post('/auth/register', details)
    return response.data
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },
  me: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}
