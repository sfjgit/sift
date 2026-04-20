import { useAxios } from '@/hooks/useAxios';

export interface CreateBUPayload {
  name: string;
  parentBUId?: string;
  isActive?: boolean;
}

export interface UpdateBUPayload {
  name?: string;
  parentBUId?: string;
  isActive?: boolean;
}

export interface BusinessUnit {
  id: string;
  name: string;
  parentBUId?: string;
  isActive: boolean;
  createdAt: string;
}

export type BUTeam = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  category: string;
  parentTeamId: string | null;
  businessUnitId: string;
  dataPolicy: 'SHARED' | 'LEAD_ONLY';
  createdAt: string;
  updatedAt: string;
};

export type BUUser = {
  id: string;
  email: string;

  passwordHash: string;
  passwordPlain: string;

  firstName: string;
  lastName: string;
  middleName: string | null;
  nickName: string | null;
  displayName: string | null;

  employeeId: string;

  phone: string | null;
  workingLocation: string | null;
  timezone: string | null;

  dateOfBirth: string | null; // ISO date
  dateOfJoin: string | null; // ISO date

  isSuperAdmin: boolean;
  isActive: boolean;

  roleId: string;
  reportingToId: string | null;
  businessUnitId: string;

  createdById: string;

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};

// export const businessUnitsApi = {
//   getAll: () => api.get('/business-units'),

//   create: (data: CreateBUPayload) => api.post('/business-units', data),

//   update: (id: string, data: UpdateBUPayload) => api.patch(`/business-units/${id}`, data),

//   getTree: (id: string) => api.get(`/business-units/${id}/tree`),
// };

export function useBusinessUnitsApi() {
  const api = useAxios();
  return {
    getAll: () => api.get('/business-units'),

    getOne: (id: string) => api.get(`/business-units/${id}`),

    create: (data: CreateBUPayload) => api.post('/business-units', data),

    update: (id: string, data: UpdateBUPayload) => api.patch(`/business-units/${id}`, data),

    getTree: (id: string) => api.get(`/business-units/${id}/tree`),
  };
}
