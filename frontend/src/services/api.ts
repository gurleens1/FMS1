/**
 * api.ts — Centralized API Client
 */
import axios from 'axios';

const env = (import.meta as any).env;
const BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

const storedToken = localStorage.getItem('fms_auth_token');
if (storedToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fms_auth_token');
      localStorage.removeItem('fms_auth_user');
      delete apiClient.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: any) => apiClient.post('/api/auth/login', data),
  forgotPassword: (data: { email: string }) => apiClient.post('/api/auth/forgot-password', data),
  verifyOtp: (data: { email: string; otp: string }) => apiClient.post('/api/auth/verify-otp', data),
  resetPassword: (data: any) => apiClient.post('/api/auth/reset-password', data),
};

export const dashboardApi = {
  getSummary: (params?: any) => apiClient.get('/api/dashboard/summary', { params }),
  getOverview: (params?: any) => apiClient.get('/api/dashboard/overview', { params }),
  getEmployees: (params: Record<string, string | number | undefined>) =>
    apiClient.get('/api/dashboard/employees', { params }),
  deleteParentTicket: (id: number) => apiClient.delete(`/api/feedback/parent/${id}`),
};

export const feedbackApi = {
  list: (params: Record<string, unknown>) => apiClient.get('/api/feedback', { params }),
  get: (id: number) => apiClient.get(`/api/feedback/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/api/feedback', data),
  update: (id: number, data: Record<string, unknown>) => apiClient.patch(`/api/feedback/${id}`, data),
  uploadAttachment: (id: number, data: { fileName: string; fileData: string; mimeType: string }) =>
    apiClient.post(`/api/feedback/${id}/attachments`, data),
};

export const employeeApi = {
  list: () => apiClient.get('/api/employees'),
  lookup: (email: string) => apiClient.get('/api/employees/lookup', { params: { email } }),
};

export const userApi = {
  me: () => apiClient.get('/api/users/me'),
  assignees: () => apiClient.get('/api/users/assignees'),
};

export const userMgmtApi = {
  list: (params?: Record<string, string>) => apiClient.get('/api/user-management', { params }),
  get: (id: number) => apiClient.get(`/api/user-management/${id}`),
  create: (data: any) => apiClient.post('/api/user-management', data),
  update: (id: number, data: any) => apiClient.patch(`/api/user-management/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/user-management/${id}`),
};

export const exportApi = {
  csv: (params: Record<string, unknown>) =>
    apiClient.get('/api/export/csv', { params, responseType: 'blob' }),
};

// FIXED: Added the required 'generate' and 'latest' routes so the Insights button works!
export const insightsApi = {
  list: () => apiClient.get('/api/insights'),
  latest: () => apiClient.get('/api/insights/latest'),
  generate: () => apiClient.post('/api/insights/generate'),
};