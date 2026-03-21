import api from './api';

export interface CreateRolePayload {
  name: string;
  description?: string;
}

export interface SetPermissionsPayload {
  permissions: {
    module: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    scope: 'OWN' | 'TEAM' | 'BU' | 'ALL';
  }[];
}

export const rolesApi = {
  getAll: () => api.get('/roles'),

  create: (data: CreateRolePayload) => api.post('/roles', data),

  delete: (id: string) => api.delete(`/roles/${id}`),

  setPermissions: (id: string, data: SetPermissionsPayload) =>
    api.put(`/roles/${id}/permissions`, data),
};
