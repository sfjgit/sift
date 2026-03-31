import { useAxios } from '@/hooks/useAxios';

export interface CreateRolePayload {
  name: string;
  description?: string;
}

// export interface SetPermissionsPayload {
//   permissions: {
//     module: string;
//     canView: boolean;
//     canAdd: boolean;
//     canEdit: boolean;
//     canDelete: boolean;
//     scope: 'OWN' | 'TEAM' | 'BU' | 'ALL';
//   }[];
// }

export type SetPermissionsPayload = {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  scope: 'OWN' | 'TEAM' | 'BU' | 'ALL';
}[];
// export const rolesApi = {
//   getAll: () => api.get('/roles'),

//   create: (data: CreateRolePayload) => api.post('/roles', data),

//   delete: (id: string) => api.delete(`/roles/${id}`),

//   setPermissions: (id: string, data: SetPermissionsPayload) =>
//     api.put(`/roles/${id}/permissions`, data),
// };

export function useRolesApi() {
  const api = useAxios();

  return {
    getAll: () => api.get('/roles'),

    create: (data: CreateRolePayload) => api.post('/roles', data),

    delete: (id: string) => api.delete(`/roles/${id}`),

    getOne: (id: string) => api.get(`/roles/${id}`),

    setPermissions: (id: string, data: SetPermissionsPayload) =>
      api.put(`/roles/${id}/permissions`, data),
  };
}
