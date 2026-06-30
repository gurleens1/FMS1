/**
 * categoryAssigneeApi.ts
 * API service for managing category-assignee relationships
 */
import { apiClient } from './api';

export const categoryAssigneeApi = {
  // Get all assignees for a specific category
  listByCategory: (categoryId: number) =>
    apiClient.get(`/api/categories/${categoryId}/assignees`),

  // Add an assignee to a category
  add: (categoryId: number, assigneeId: number) =>
    apiClient.post(`/api/categories/${categoryId}/assignees`, { assigneeId }),

  // Remove an assignee from a category
  remove: (categoryId: number, assigneeId: number) =>
    apiClient.delete(`/api/categories/${categoryId}/assignees/${assigneeId}`),
};
