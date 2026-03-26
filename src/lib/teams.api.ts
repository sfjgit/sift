import { useAxios } from '@/hooks/useAxios';

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

export type Team = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  category: string;
  parentTeamId: string | null;
  businessUnitId: string | null;
  dataPolicy: 'SHARED' | 'LEAD_ONLY';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};

export type TeamMember = {
  id: string;
  userId: string;
  teamId: string;
  user?: {
    name: string;
  };
  teamRole: 'LEAD' | 'CO_LEAD' | 'MEMBER';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};

// export const teamsApi = {
//   getAll: (params?: GetTeamsParams) => api.get('/teams', { params }),

//   create: (data: CreateTeamPayload) => api.post('/teams', data),

//   update: (id: string, data: UpdateTeamPayload) => api.patch(`/teams/${id}`, data),

//   addMembers: (id: string, data: AddMembersPayload) => api.post(`/teams/${id}/members`, data),

//   removeMember: (id: string, userId: string) => api.delete(`/teams/${id}/members/${userId}`),

//   getMembers: (id: string) => api.get(`/teams/${id}/members`),
// };

export function useTeamsApi() {
  const api = useAxios();
  return {
    getAll: (params?: GetTeamsParams) => api.get('/teams', { params }),

    create: (data: CreateTeamPayload) => api.post('/teams', data),

    update: (id: string, data: UpdateTeamPayload) => api.patch(`/teams/${id}`, data),

    addMembers: (id: string, data: AddMembersPayload) =>
      api.post(`/teams/${id}/members`, data.members),

    removeMember: (id: string, userId: string) => api.delete(`/teams/${id}/members/${userId}`),

    getMembers: (id: string) => api.get(`/teams/${id}/members`),
  };
}
