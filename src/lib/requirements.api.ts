import api from './api';

export interface CreateRequirementPayload {
  title: string;
  description?: string;
  clientId: string;
  clientContactId?: string;
  businessUnitId?: string;
  jobType: 'CONTRACT' | 'PERMANENT' | 'CONTRACT_TO_HIRE' | 'FREELANCE';
  remoteType: 'ONSITE' | 'REMOTE' | 'HYBRID';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  totalOpenings?: number;
  location?: string;
  country?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  startDate?: string;
  endDate?: string;
  respondBy?: string;
}

export interface GetRequirementsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  clientId?: string;
  businessUnitId?: string;
  jobType?: string;
  remoteType?: string;
}

export interface AssignRequirementPayload {
  assignmentType: 'INDIVIDUAL' | 'TEAM';
  recruiterId?: string;
  teamId?: string;
  allocatedOpenings?: number;
}

export interface ChangeStatusPayload {
  status: string;
  reason?: string;
}

export const requirementsApi = {
  getAll: (params?: GetRequirementsParams) => api.get('/requirements', { params }),

  getOne: (id: string) => api.get(`/requirements/${id}`),

  create: (data: CreateRequirementPayload) => api.post('/requirements', data),

  approve: (id: string, data: { approved: boolean; reason?: string }) =>
    api.patch(`/requirements/${id}/approve`, data),

  changeStatus: (id: string, data: ChangeStatusPayload) =>
    api.patch(`/requirements/${id}/status`, data),

  assign: (id: string, data: AssignRequirementPayload) =>
    api.post(`/requirements/${id}/assign`, data),

  addNote: (id: string, content: string) => api.post(`/requirements/${id}/notes`, { content }),

  getHistory: (id: string) => api.get(`/requirements/${id}/history`),

  fillAssignment: (id: string, assignmentId: string, data: { filledCount: number }) =>
    api.patch(`/requirements/${id}/assignments/${assignmentId}/fill`, data),

  uploadDocument: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/requirements/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  resolveIssue: (id: string, documentId: string) =>
    api.patch(`/requirements/${id}/documents/${documentId}/resolve`),
};
