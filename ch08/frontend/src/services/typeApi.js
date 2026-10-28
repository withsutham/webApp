import { api } from './api';

export const typeApi = {
  getAll: async () => {
    const response = await api.get('/type');
    return response.data;
  },
};
