import { apiClient } from './api';

export const categoryApi = {
  list: () => apiClient.get('/api/categories'),
  create: (data: { name: string }) => apiClient.post('/api/categories', data),
  update: (id: number, data: { name: string }) => apiClient.patch(`/api/categories/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/categories/${id}`),
};
