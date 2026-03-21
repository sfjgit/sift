import api from './api';

export interface CreateBUPayload {
  name: string;
  parentBUId?: string;
}

export interface UpdateBUPayload {
  name?: string;
  parentBUId?: string;
}

export const businessUnitsApi = {
  getAll: () => api.get('/business-units'),

  create: (data: CreateBUPayload) => api.post('/business-units', data),

  update: (id: string, data: UpdateBUPayload) => api.patch(`/business-units/${id}`, data),

  getTree: (id: string) => api.get(`/business-units/${id}/tree`),
};
