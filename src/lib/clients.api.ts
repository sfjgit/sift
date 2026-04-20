import { useAxios } from '@/hooks/useAxios';

export interface CreateClientPayload {
  name: string;
  vmsName?: string;
  category?: string;
  industry?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  businessUnitId?: string;
}

export interface GetClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  businessUnitId?: string;
}

export interface AddContactPayload {
  firstName: string;
  lastName?: string;
  designation?: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  isPrimary?: boolean;
}

export interface AssignHandlerPayload {
  userId: string;
  role: 'PRIMARY' | 'SECONDARY' | 'BACKUP';
}

export function useClients() {
  const api = useAxios();
  return {
    getAll: (params?: GetClientsParams) => api.get('/clients', { params }),
    getOne: (id: string) => api.get(`/clients/${id}`),
    create: (data: CreateClientPayload) => api.post('/clients', data),
    approve: (id: string) => api.patch(`/clients/${id}/approve`),
    addContact: (id: string, data: AddContactPayload) => api.post(`/clients/${id}/contacts`, data),
    assignContactHandler: (id: string, contactId: string, data: AssignHandlerPayload) =>
      api.post(`/clients/${id}/contacts/${contactId}/handlers`, data),
  };
}
