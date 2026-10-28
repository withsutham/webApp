import { api } from './api'

export const userApi = {
  getAll: async () => {
    const response = await api.get('/users')
    return response.data
  },
  updateRole: async (userId, role) => {
    const response = await api.patch(`/users/${userId}/role`, { role })
    return response.data.user
  },
}
