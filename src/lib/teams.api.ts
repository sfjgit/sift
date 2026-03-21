import api from './api';

export interface CreateTeamPayload {
  name: string;
  description?: string;
  category?: string;
  businessUnitId?: string;
  parentTeamId?: string;
  dataPolicy?: 'SHARED' | 'LEAD_ONLY';
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface AddMembersPayload {
  members: { userId: string; teamRole?: 'LEAD' | 'CO_LEAD' | 'MEMBER' }[];
}

export interface GetTeamsParams {
  page?: number;
  limit?: number;
  search?: string;
  businessUnitId?: string;
  isActive?: boolean;
}

export const teamsApi = {
  getAll: (params?: GetTeamsParams) => api.get('/teams', { params }),

  create: (data: CreateTeamPayload) => api.post('/teams', data),

  update: (id: string, data: UpdateTeamPayload) => api.patch(`/teams/${id}`, data),

  addMembers: (id: string, data: AddMembersPayload) => api.post(`/teams/${id}/members`, data),

  removeMember: (id: string, userId: string) => api.delete(`/teams/${id}/members/${userId}`),

  getMembers: (id: string) => api.get(`/teams/${id}/members`),
};
