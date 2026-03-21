import api from './api';

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: string;
  businessUnitId?: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  workingLocation?: string;
  timezone?: string;
  dateOfBirth?: string;
  dateOfJoin?: string;
}

export const usersApi = {
  getAll: (params?: GetUsersParams) => api.get('/users', { params }),

  getOne: (id: string) => api.get(`/users/${id}`),

  update: (id: string, data: UpdateUserPayload) => api.patch(`/users/${id}`, data),

  deactivate: (id: string) => api.patch(`/users/${id}/deactivate`),

  setReportingManager: (id: string, reportingToId: string) =>
    api.patch(`/users/${id}/reporting-to`, { reportingToId }),

  getSubordinates: (id: string) => api.get(`/users/${id}/subordinates`),
};
