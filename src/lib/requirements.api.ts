import { useAxios } from '@/hooks/useAxios';
import { BusinessUnit } from './business-units.api';

// =======================
// Requirement Types
// =======================
export type JobType = 'PERMANENT' | 'CONTRACT' | 'CONTRACT_TO_HIRE' | 'FREELANCE';
export type RemoteType = 'ONSITE' | 'REMOTE' | 'HYBRID';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RequirementStatus = 'ACTIVE' | 'DRAFT' | 'CLOSED' | 'ON_HOLD';

export interface Client {
  id: string;
  name: string;
  vmsName?: string | null;
  category?: string | null;
  industry?: string | null;
  website?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | null;
  businessUnitId?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  parentClientId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
}

export interface Requirement {
  id: string;
  reqCode: string;
  title: string;
  description?: string | null;
  clientId?: string | null;
  clientContactId?: string | null;
  businessUnitId?: string | null;
  jobType: JobType;
  remoteType: RemoteType;
  priority: Priority;
  totalOpenings: number;
  filledOpenings: number;
  location?: string | null;
  country?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  respondBy?: string | null;
  turnaroundDays?: number | null;
  closedAt?: string | null;
  status: RequirementStatus;
  createdById?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  deliveryLeadId?: string | null;
  teamLeadId?: string | null;
  createdAt: string;
  updatedAt: string;

  client?: Client | null;
  clientContact?: User | null;
  businessUnit?: BusinessUnit | null; // you can define a type if needed
  createdBy?: User | null;
  approvedBy?: User | null;
  deliveryLead?: User | null;
  teamLead?: User | null;
}

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

export interface ApproveRequirementPayload {
  deliveryLeadId?: string;
  teamLeadId?: string;
  approved?: boolean; // optional if needed
  reason?: string;
}

// export const requirementsApi = {
//   getAll: (params?: GetRequirementsParams) => api.get('/requirements', { params }),

//   getOne: (id: string) => api.get(`/requirements/${id}`),

//   create: (data: CreateRequirementPayload) => api.post('/requirements', data),

//   approve: (id: string, data: { approved: boolean; reason?: string }) =>
//     api.patch(`/requirements/${id}/approve`, data),

//   changeStatus: (id: string, data: ChangeStatusPayload) =>
//     api.patch(`/requirements/${id}/status`, data),

//   assign: (id: string, data: AssignRequirementPayload) =>
//     api.post(`/requirements/${id}/assign`, data),

//   addNote: (id: string, notes: string) => api.post(`/requirements/${id}/notes`, { notes }),

//   getHistory: (id: string) => api.get(`/requirements/${id}/history`),

//   fillAssignment: (id: string, assignmentId: string, data: { filledCount: number }) =>
//     api.patch(`/requirements/${id}/assignments/${assignmentId}/fill`, data),

//   uploadDocument: (id: string, file: File) => {
//     const form = new FormData();
//     form.append('file', file);
//     return api.post(`/requirements/${id}/documents`, form, {
//       headers: { 'Content-Type': 'multipart/form-data' },
//     });
//   },

//   resolveIssue: (id: string, documentId: string) =>
//     api.patch(`/requirements/${id}/documents/${documentId}/resolve`),
// };

export function useRequirementsApi() {
  const api = useAxios();
  return {
    getAll: (params?: GetRequirementsParams) => api.get('/requirements', { params }),

    getOne: (id: string) => api.get(`/requirements/${id}`),

    create: (data: CreateRequirementPayload) => api.post('/requirements', data),

    approve: (requirementId: string, payload: ApproveRequirementPayload) =>
      api.patch(`/requirements/${requirementId}/approve`, payload),

    changeStatus: (id: string, data: ChangeStatusPayload) =>
      api.patch(`/requirements/${id}/status`, data),

    assign: (id: string, data: AssignRequirementPayload) =>
      api.post(`/requirements/${id}/assign`, data),

    addNote: (id: string, notes: string) => api.post(`/requirements/${id}/notes`, { notes }),

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
}
