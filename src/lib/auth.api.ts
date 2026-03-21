import api from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  newPassword: string;
}

export const authApi = {
  login: (data: LoginPayload) => api.post('/auth/login', data),

  logout: () => api.delete('/auth/logout'),

  refresh: () => api.post('/auth/refresh'),

  register: (data: Record<string, unknown>) => api.post('/auth/register', data),

  resetPassword: (userId: string, data: ResetPasswordPayload) =>
    api.patch(`/auth/reset-password/${userId}`, data),

  getUserCredentials: (userId: string) => api.get(`/auth/user-credentials/${userId}`),
};
