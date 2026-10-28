import { api } from './api'

export const ratingApi = {
  create: async (menuId, score) => {
    const response = await api.post(`/menu/${menuId}/ratings`, { score })
    return response.data
  },
  update: async (menuId, score) => {
    const response = await api.put(`/menu/${menuId}/ratings/me`, { score })
    return response.data
  },
}
