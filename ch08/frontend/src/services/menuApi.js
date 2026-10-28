import { api } from './api';

export const menuApi = {
  getAll: async () => {
    const response = await api.get('/menu');
    return response.data;
  },
  create: async (menu) => {
    const response = await api.post('/menu', menu);
    return response.data;
  },
  update: async (id, menu) => {
    const response = await api.put(`/menu/${id}`, menu);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/menu/${id}`);
    return response.data;
  },
};
