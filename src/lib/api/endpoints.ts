// File: endpoints.ts
// Path: src/lib/api/endpoints.ts
//
// Every crm-core-service call in one place. Plain CRUD collections use
// createResource; anything bespoke is a small typed function next to it.

import { api } from './client';
import { createResource } from './resource';
import type { ListParams } from '@/types/api';
import type {
  BulkResult,
  ClientActivity,
  ClientDetail,
  ClientInput,
  ClientListItem,
  ClientLocation,
  ClientNote,
  ClientStatus,
  ClientTechnology,
  LocationInput,
  EngineHealth,
  IntegrationService,
  IntegrationStep,
  OutreachPack,
  PipelineStep,
  Spoc,
  SpocDetail,
  SpocApprovalStatus,
  SpocInput,
  StartedRun,
  StartRunInput,
  StepOverview,
  StepRun,
  StepRunDetail,
} from '@/types/crm';
import type {
  AppNotification,
  AuthLog,
  Faq,
  Lookup,
  LookupType,
  MasterRow,
  Role,
  RoleDetail,
  RoleGrant,
  SavedView,
  ScopeOption,
  SearchResults,
  SessionUser,
  UserDetail,
  UserInput,
  UserListItem,
  UserOption,
} from '@/types/org';
import type { Breakdown, Overview, Trend } from '@/types/reports';

// ── auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) => api.post<SessionUser>('/auth/login', { email, password }),
  me: () => api.get<SessionUser>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  forgotPassword: (email: string) => api.post<void>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<void>('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { currentPassword, newPassword }),
  impersonate: (userId: string) => api.post<void>(`/admin/users/${userId}/impersonate`),
  stopImpersonation: () => api.post<void>('/admin/impersonation/stop'),
};

// ── clients ──────────────────────────────────────────────────────────────────

export const clientsApi = {
  ...createResource<ClientListItem, ClientDetail, ClientInput, Partial<ClientInput>>('clients', '/clients'),
  setStatus: (id: string, status: ClientStatus) => api.patch<ClientListItem>(`/clients/${id}/status`, { status }),
  bulkStatus: (clientIds: string[], status: ClientStatus) =>
    api.patch<BulkResult>('/clients/bulk-status', { clientIds, status }),
  activities: (id: string, params?: ListParams) => api.page<ClientActivity>(`/clients/${id}/activities`, params),
  addNote: (id: string, content: string) => api.post<ClientNote>(`/clients/${id}/notes`, { content }),
  deleteNote: (id: string, noteId: string) => api.delete(`/clients/${id}/notes/${noteId}`),
  addLocation: (id: string, body: LocationInput) => api.post<ClientLocation>(`/clients/${id}/locations`, body),
  updateLocation: (id: string, locationId: string, body: LocationInput) =>
    api.patch<ClientLocation>(`/clients/${id}/locations/${locationId}`, body),
  removeLocation: (id: string, locationId: string) => api.delete(`/clients/${id}/locations/${locationId}`),
  saveTechnology: (id: string, categoryId: string, details: string) =>
    api.put<ClientTechnology>(`/clients/${id}/technologies`, { categoryId, details }),
  removeTechnology: (id: string, technologyId: string) =>
    api.delete(`/clients/${id}/technologies/${technologyId}`),
  documentUrl: (id: string, documentId: string) =>
    api.get<{ url: string; expiresIn: number }>(`/clients/${id}/documents/${documentId}/url`),
};

// ── spocs ────────────────────────────────────────────────────────────────────

export const spocsApi = {
  ...createResource<Spoc, SpocDetail, SpocInput, Partial<SpocInput>>('spocs', '/spocs'),
  assign: (id: string, assignToId: string, reason?: string) =>
    api.patch<Spoc>(`/spocs/${id}/assign`, { assignToId, reason }),
  bulkAssign: (spocIds: string[], assignToId: string, reason?: string) =>
    api.patch<BulkResult>('/spocs/bulk-assign', { spocIds, assignToId, reason }),
  decide: (spocIds: string[], decision: SpocApprovalStatus, note?: string) =>
    api.post<{ updated: number; unchanged: number; notFound: number }>('/spocs/approval', { spocIds, decision, note }),
};

// ── users / roles / permissions ──────────────────────────────────────────────

export const usersApi = {
  ...createResource<UserListItem, UserDetail, UserInput, Partial<UserInput>>('users', '/users', {
    updateMethod: 'put',
  }),
  toggle: (id: string) => api.patch<UserListItem>(`/users/${id}/toggle`),
  resetPassword: (id: string, newPassword: string) =>
    api.patch<void>(`/users/${id}/reset-password`, { newPassword }),
  options: (params: { search?: string; for?: 'assign' | 'filter'; limit?: number }) =>
    api.get<UserOption[]>('/users/options', params),
};

export const rolesApi = {
  ...createResource<Role, RoleDetail, { name: string; description?: string | null; grants?: RoleGrant[] }, { name?: string; description?: string | null }>(
    'roles',
    '/roles',
    { updateMethod: 'put' }
  ),
  saveGrants: (roleId: string, grants: { permissionKey: string; scope?: string }[]) =>
    api.put<{ count: number }>(`/roles/${roleId}/permissions`, { grants }),
};

export const permissionsApi = {
  scopes: () => api.get<ScopeOption[]>('/permissions/scopes'),
  mine: () => api.get<SessionUser['permissions']>('/me/permissions'),
};

// ── org masters + lookups ────────────────────────────────────────────────────

export type MasterKind = 'business-units' | 'service-lines' | 'departments' | 'designations';

export const mastersApi = (kind: MasterKind) => ({
  ...createResource<MasterRow, MasterRow, { name: string; code?: string | null }>(kind, `/${kind}`, {
    updateMethod: 'put',
  }),
  /** BU has no toggle route — it's updated with isActive; the rest toggle. */
  toggle: (row: MasterRow) =>
    kind === 'business-units'
      ? api.put<MasterRow>(`/${kind}/${row.id}`, { isActive: !row.isActive })
      : api.patch<MasterRow>(`/${kind}/${row.id}/toggle`),
});

export const lookupsApi = {
  types: () => api.get<LookupType[]>('/lookups/types'),
  list: (params?: { type?: LookupType; includeInactive?: boolean }) => api.get<Lookup[]>('/lookups', params),
  create: (body: { type: LookupType; code: string; label: string; order?: number | null }) =>
    api.post<Lookup>('/lookups', body),
  update: (id: string, body: { code?: string; label?: string; order?: number | null }) =>
    api.put<Lookup>(`/lookups/${id}`, body),
  toggle: (id: string) => api.patch<Lookup>(`/lookups/${id}/toggle`),
};

// ── notifications / logs ─────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; isRead?: boolean }) =>
    api.page<AppNotification>('/notifications', params) as Promise<{
      data: AppNotification[];
      meta: { total: number; unread: number; page: number; limit: number; pages: number };
    }>,
  markRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<void>('/notifications/read-all'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications'),
};

export const authLogsApi = {
  list: (params?: ListParams) => api.page<AuthLog>('/auth-logs', params),
};

// ── reports / search ─────────────────────────────────────────────────────────

export const reportsApi = {
  overview: (params?: { from?: string; to?: string }) => api.get<Overview>('/reports/overview', params),
  breakdown: (params: Record<string, string | number | boolean | undefined>) =>
    api.get<Breakdown>('/reports/breakdown', params),
  trend: (params: Record<string, string | number | undefined>) => api.get<Trend>('/reports/trend', params),
  activities: (params?: ListParams) => api.page<ClientActivity>('/reports/activities', params),
};

export const searchApi = {
  query: (q: string, limit = 5) => api.get<SearchResults>('/search', { q, limit }),
};

// ── saved views / help ───────────────────────────────────────────────────────

export const viewsApi = {
  list: <C>(module: string) => api.get<SavedView<C>[]>('/views', { module }),
  create: <C>(body: { module: string; name: string; config: C; isDefault?: boolean; isShared?: boolean }) =>
    api.post<SavedView<C>>('/views', body),
  update: <C>(id: string, body: Partial<{ name: string; config: C; isDefault: boolean; isShared: boolean }>) =>
    api.patch<SavedView<C>>(`/views/${id}`, body),
  remove: (id: string) => api.delete(`/views/${id}`),
};

export interface FaqInput {
  question: string;
  answer: string;
  category: string;
  module?: string | null;
  order?: number;
  isPublished?: boolean;
}

export const faqsApi = {
  list: (params?: { search?: string; category?: string; module?: string; includeUnpublished?: boolean }) =>
    api.get<Faq[]>('/faqs', params),
  categories: () => api.get<{ category: string; count: number }[]>('/faqs/categories'),
  create: (body: FaqInput) => api.post<Faq>('/faqs', body),
  update: (id: string, body: Partial<FaqInput>) => api.put<Faq>(`/faqs/${id}`, body),
  remove: (id: string) => api.delete(`/faqs/${id}`),
  feedback: (id: string, helpful: boolean) =>
    api.post<{ helpfulCount: number; notHelpfulCount: number }>(`/faqs/${id}/feedback`, { helpful }),
};

// ── pipeline / outreach ──────────────────────────────────────────────────────

export const pipelineApi = {
  steps: () => api.get<PipelineStep[]>('/pipeline-steps'),
  runs: (params?: ListParams) => api.page<StepRun>('/step-runs', params),
  run: (id: string) => api.get<StepRunDetail>(`/step-runs/${id}`),
  start: (body: StartRunInput) => api.post<StartedRun>('/step-runs', body),
  stop: (id: string) => api.post<void>(`/step-runs/${id}/stop`),
  overview: (clientId: string) => api.get<StepOverview>('/step-runs/overview', { clientId }),
};

export const integrationsApi = {
  list: () =>
    api.get<{ services: IntegrationService[]; last24h: Partial<Record<StepRun['status'], number>> }>('/integrations'),
  health: (id: string) => api.get<EngineHealth>(`/integrations/${id}/health`),
  testKey: (id: string, provider: string) =>
    api.post<{ ok: boolean; detail: string | null }>(`/integrations/${id}/test-key`, { provider }),
  rotateKey: (id: string) => api.post<{ key: string }>(`/integrations/${id}/rotate-key`),
  updateService: (id: string, body: Partial<Pick<IntegrationService, 'baseUrl' | 'isActive' | 'timeoutMins' | 'maxDispatchTries'>>) =>
    api.patch<IntegrationService>(`/integrations/${id}`, body),
  updateStep: (id: string, body: Partial<Pick<IntegrationStep, 'label' | 'isActive' | 'userClientLimit' | 'config'>>) =>
    api.patch<IntegrationStep>(`/integrations/steps/${id}`, body),
};

export const outreachApi = {
  list: (params?: ListParams) => api.page<OutreachPack>('/outreach', params),
};
