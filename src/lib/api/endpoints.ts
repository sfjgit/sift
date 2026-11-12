// File: endpoints.ts
// Path: src/lib/api/endpoints.ts
//
// Every crm-core-service call in one place. Plain CRUD collections use
// createResource; anything bespoke is a small typed function next to it.

import { api, ApiError, http, toApiError } from './client';
import type {
  AiCanvasResult,
  AiCanvasSpec,
  AiCommandResult,
  AiCommandTemplate,
  AiMe,
  AiMode,
  AiQuotaPolicy,
  AiReportTemplate,
  AiSettings,
  AiUsage,
  AiUsageFilters,
  AiUsageMode,
  AiQuotaPeriod,
} from '@/types/ai';
import { createResource } from './resource';
import type { ListParams } from '@/types/api';
import type {
  BulkResult,
  ClientActivity,
  ClientCorporateFinancial,
  ClientDetail,
  ClientDocument,
  ClientCsrFinancial,
  ClientCsrProgram,
  CsrAgency,
  CsrProgramInput,
  CorporateFinancialInput,
  CsrFinancialInput,
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
  OutreachPackDetail,
  OutreachStatus,
  PipelineStep,
  Spoc,
  SpocDetail,
  SpocApprovalStatus,
  SpocInput,
  StartedRun,
  StartRunInput,
  StepOverview,
  ClientAssignment,
  RunQuota,
  RunQuotaInput,
  RunSlot,
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
  NotificationSeverity,
  Role,
  RoleDetail,
  RoleGrant,
  SavedView,
  ScopeOption,
  SearchResults,
  SessionUser,
  SystemAlert,
  UserDetail,
  UserInput,
  UserListItem,
  UserOption,
} from '@/types/org';
import type { Breakdown, Overview, Trend } from '@/types/reports';
import type { ClientMapData } from '@/features/map/types';
import type { ExportDetails, ExportPart } from '@/features/clients/exportSheets';
import type {
  TypedCheck,
  WebsiteCheck,
  WebsiteHistoryRow,
  WebsiteSuggestion,
} from '@/features/website/types';

// ── auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<SessionUser>('/auth/login', { email, password }),
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
  ...createResource<ClientListItem, ClientDetail, ClientInput, Partial<ClientInput>>(
    'clients',
    '/clients'
  ),
  setStatus: (id: string, status: ClientStatus) =>
    api.patch<ClientListItem>(`/clients/${id}/status`, { status }),
  bulkStatus: (clientIds: string[], status: ClientStatus) =>
    api.patch<BulkResult>('/clients/bulk-status', { clientIds, status }),
  assignments: (id: string) => api.get<ClientAssignment[]>(`/clients/${id}/assignments`),
  setAssignments: (id: string, userIds: string[], note?: string) =>
    api.put<{ added: number; removed: number }>(`/clients/${id}/assignments`, { userIds, note }),
  bulkAssign: (
    clientIds: string[],
    userIds: string[],
    mode: 'add' | 'remove' | 'replace',
    note?: string
  ) =>
    api.post<{ clients: number; added: number; removed: number; notFound: number }>(
      '/clients/assign',
      {
        clientIds,
        userIds,
        mode,
        note,
      }
    ),
  activities: (id: string, params?: ListParams) =>
    api.page<ClientActivity>(`/clients/${id}/activities`, params),
  addNote: (id: string, content: string) =>
    api.post<ClientNote>(`/clients/${id}/notes`, { content }),
  deleteNote: (id: string, noteId: string) => api.delete(`/clients/${id}/notes/${noteId}`),
  addLocation: (id: string, body: LocationInput) =>
    api.post<ClientLocation>(`/clients/${id}/locations`, body),
  updateLocation: (id: string, locationId: string, body: LocationInput) =>
    api.patch<ClientLocation>(`/clients/${id}/locations/${locationId}`, body),
  /** replace the website (the old one stays in the history); runId = from the website check */
  replaceWebsite: (id: string, body: { website: string; runId?: string; force?: boolean }) =>
    api.post<{ website: string; rerun: string[] }>(`/clients/${id}/website`, body),
  websiteHistory: (id: string) => api.get<WebsiteHistoryRow[]>(`/clients/${id}/website-history`),
  /** an admin checks a typed website before saving it */
  checkWebsite: (id: string, website: string) =>
    api.post<TypedCheck>(`/clients/${id}/website/check`, { website }),
  /** nested data for an export's extra sheets (offices, CSR by FY, reports, SPOCs) */
  exportDetails: (ids: string[], parts: ExportPart[]) =>
    api.post<ExportDetails>('/clients/export-details', { ids, parts }),
  /** offices with coordinates of the clients you can see — the 3D office map */
  map: (clientId?: string) => api.get<ClientMapData>('/clients/map', { clientId }),
  removeLocation: (id: string, locationId: string) =>
    api.delete(`/clients/${id}/locations/${locationId}`),
  saveTechnology: (id: string, categoryId: string, details: string) =>
    api.put<ClientTechnology>(`/clients/${id}/technologies`, { categoryId, details }),
  removeTechnology: (id: string, technologyId: string) =>
    api.delete(`/clients/${id}/technologies/${technologyId}`),
  /** download: the link makes the browser save the file instead of opening it */
  documentUrl: (id: string, documentId: string, download?: boolean) =>
    api.get<{ url: string; expiresIn: number }>(
      `/clients/${id}/documents/${documentId}/url`,
      download ? { download: '1' } : undefined
    ),
  /** replaces the file already held for the same type + FY */
  uploadDocument: (id: string, file: File, typeId: string, fy: string) => {
    const form = new FormData();
    form.append('typeId', typeId);
    form.append('fy', fy);
    form.append('file', file);
    return api.upload<ClientDocument>(`/clients/${id}/documents`, form);
  },
  removeDocument: (id: string, documentId: string) =>
    api.delete(`/clients/${id}/documents/${documentId}`),
  saveCsrFinancial: (id: string, body: CsrFinancialInput) =>
    api.put<ClientCsrFinancial>(`/clients/${id}/financials`, body),
  removeCsrFinancial: (id: string, financialId: string) =>
    api.delete(`/clients/${id}/financials/${financialId}`),
  createCsrProgram: (id: string, body: CsrProgramInput) =>
    api.post<ClientCsrProgram>(`/clients/${id}/csr-programs`, body),
  updateCsrProgram: (id: string, programId: string, body: Partial<CsrProgramInput>) =>
    api.patch<ClientCsrProgram>(`/clients/${id}/csr-programs/${programId}`, body),
  removeCsrProgram: (id: string, programId: string) =>
    api.delete(`/clients/${id}/csr-programs/${programId}`),
  saveCorporateFinancial: (id: string, body: CorporateFinancialInput) =>
    api.put<ClientCorporateFinancial>(`/clients/${id}/corporate-financials`, body),
  removeCorporateFinancial: (id: string, financialId: string) =>
    api.delete(`/clients/${id}/corporate-financials/${financialId}`),
};

// ── spocs ────────────────────────────────────────────────────────────────────

export const spocsApi = {
  ...createResource<Spoc, SpocDetail, SpocInput, Partial<SpocInput>>('spocs', '/spocs'),
  assign: (id: string, assignToId: string, reason?: string) =>
    api.patch<Spoc>(`/spocs/${id}/assign`, { assignToId, reason }),
  bulkAssign: (spocIds: string[], assignToId: string, reason?: string) =>
    api.patch<BulkResult>('/spocs/bulk-assign', { spocIds, assignToId, reason }),
  decide: (spocIds: string[], decision: SpocApprovalStatus, note?: string) =>
    api.post<{ updated: number; unchanged: number; notFound: number }>('/spocs/approval', {
      spocIds,
      decision,
      note,
    }),
};

// ── users / roles / permissions ──────────────────────────────────────────────

export const usersApi = {
  ...createResource<UserListItem, UserDetail, UserInput, Partial<UserInput>>('users', '/users', {
    updateMethod: 'put',
  }),
  toggle: (id: string) => api.patch<UserListItem>(`/users/${id}/toggle`),
  resetPassword: (id: string, newPassword: string) =>
    api.patch<void>(`/users/${id}/reset-password`, { newPassword }),
  options: (params: {
    search?: string;
    for?: 'assign' | 'client_assign' | 'filter';
    limit?: number;
  }) => api.get<UserOption[]>('/users/options', params),
};

export const rolesApi = {
  ...createResource<
    Role,
    RoleDetail,
    { name: string; description?: string | null; grants?: RoleGrant[] },
    { name?: string; description?: string | null }
  >('roles', '/roles', { updateMethod: 'put' }),
  saveGrants: (roleId: string, grants: { permissionKey: string; scope?: string }[]) =>
    api.put<{ count: number }>(`/roles/${roleId}/permissions`, { grants }),
};

/** which table columns each role may not see (admin drag and drop) */
export interface ColumnAccessRole {
  id: string;
  name: string;
  isSystem: boolean;
  users: number;
}
export const columnAccessApi = {
  mine: (table: string) => api.get<{ hidden: string[] }>(`/column-access/${table}/mine`),
  get: (table: string) =>
    api.get<{ roles: ColumnAccessRole[]; hidden: Record<string, string[]> }>(
      `/column-access/${table}`
    ),
  save: (table: string, roleId: string, hidden: string[]) =>
    api.put<{ hidden: string[] }>(`/column-access/${table}/${roleId}`, { hidden }),
};

export const permissionsApi = {
  scopes: () => api.get<ScopeOption[]>('/permissions/scopes'),
  mine: () => api.get<SessionUser['permissions']>('/me/permissions'),
};

// ── org masters + lookups ────────────────────────────────────────────────────

export type MasterKind = 'business-units' | 'service-lines' | 'departments' | 'designations';

export const mastersApi = (kind: MasterKind) => ({
  ...createResource<MasterRow, MasterRow, { name: string; code?: string | null }>(
    kind,
    `/${kind}`,
    {
      updateMethod: 'put',
    }
  ),
  /** BU has no toggle route — it's updated with isActive; the rest toggle. */
  toggle: (row: MasterRow) =>
    kind === 'business-units'
      ? api.put<MasterRow>(`/${kind}/${row.id}`, { isActive: !row.isActive })
      : api.patch<MasterRow>(`/${kind}/${row.id}/toggle`),
});

export const lookupsApi = {
  types: () => api.get<LookupType[]>('/lookups/types'),
  list: (params?: { type?: LookupType; includeInactive?: boolean }) =>
    api.get<Lookup[]>('/lookups', params),
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
  overview: (params?: { from?: string; to?: string }) =>
    api.get<Overview>('/reports/overview', params),
  breakdown: (params: Record<string, string | number | boolean | undefined>) =>
    api.get<Breakdown>('/reports/breakdown', params),
  trend: (params: Record<string, string | number | undefined>) =>
    api.get<Trend>('/reports/trend', params),
  activities: (params?: ListParams) => api.page<ClientActivity>('/reports/activities', params),
};

export const searchApi = {
  query: (q: string, limit = 5) => api.get<SearchResults>('/search', { q, limit }),
};

// ── saved views / help ───────────────────────────────────────────────────────

export const viewsApi = {
  list: <C>(module: string) => api.get<SavedView<C>[]>('/views', { module }),
  create: <C>(body: {
    module: string;
    name: string;
    config: C;
    isDefault?: boolean;
    isShared?: boolean;
  }) => api.post<SavedView<C>>('/views', body),
  update: <C>(
    id: string,
    body: Partial<{ name: string; config: C; isDefault: boolean; isShared: boolean }>
  ) => api.patch<SavedView<C>>(`/views/${id}`, body),
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
  list: (params?: {
    search?: string;
    category?: string;
    module?: string;
    includeUnpublished?: boolean;
  }) => api.get<Faq[]>('/faqs', params),
  categories: () => api.get<{ category: string; count: number }[]>('/faqs/categories'),
  create: (body: FaqInput) => api.post<Faq>('/faqs', body),
  update: (id: string, body: Partial<FaqInput>) => api.put<Faq>(`/faqs/${id}`, body),
  remove: (id: string) => api.delete(`/faqs/${id}`),
  feedback: (id: string, helpful: boolean) =>
    api.post<{ helpfulCount: number; notHelpfulCount: number }>(`/faqs/${id}/feedback`, {
      helpful,
    }),
};

// ── pipeline / outreach ──────────────────────────────────────────────────────

export const pipelineApi = {
  steps: () => api.get<PipelineStep[]>('/pipeline-steps'),
  runs: (params?: ListParams) => api.page<StepRun>('/step-runs', params),
  run: (id: string) => api.get<StepRunDetail>(`/step-runs/${id}`),
  start: (body: StartRunInput) => api.post<StartedRun>('/step-runs', body),
  stop: (id: string) => api.post<void>(`/step-runs/${id}/stop`),
  overview: (clientId: string) => api.get<StepOverview>('/step-runs/overview', { clientId }),
  mySlots: (stepId?: string) =>
    api.get<{ unlimited: boolean; slots: RunSlot[] }>('/me/run-slots', { stepId }),
};

export const runQuotasApi = {
  list: () => api.get<RunQuota[]>('/run-quotas'),
  create: (body: RunQuotaInput) => api.post<RunQuota>('/run-quotas', body),
  update: (id: string, body: Partial<Pick<RunQuota, 'period' | 'maxRuns' | 'isActive'>>) =>
    api.patch<RunQuota>(`/run-quotas/${id}`, body),
  remove: (id: string) => api.delete(`/run-quotas/${id}`),
};

export const integrationsApi = {
  list: () =>
    api.get<{
      services: IntegrationService[];
      last24h: Partial<Record<StepRun['status'], number>>;
    }>('/integrations'),
  health: (id: string) => api.get<EngineHealth>(`/integrations/${id}/health`),
  testKey: (id: string, provider: string) =>
    api.post<{ ok: boolean; detail: string | null }>(`/integrations/${id}/test-key`, { provider }),
  rotateKey: (id: string) => api.post<{ key: string }>(`/integrations/${id}/rotate-key`),
  updateService: (
    id: string,
    body: Partial<
      Pick<IntegrationService, 'baseUrl' | 'isActive' | 'timeoutMins' | 'maxDispatchTries'>
    >
  ) => api.patch<IntegrationService>(`/integrations/${id}`, body),
  updateStep: (
    id: string,
    body: Partial<
      Pick<IntegrationStep, 'label' | 'isActive' | 'userClientLimit' | 'rerunAfterDays' | 'config'>
    >
  ) => api.patch<IntegrationStep>(`/integrations/steps/${id}`, body),
};

export const outreachApi = {
  list: (params?: ListParams & { status?: OutreachStatus; clientId?: string; spocId?: string }) =>
    api.page<OutreachPack>('/outreach', params) as Promise<{
      data: OutreachPack[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
        byStatus?: Partial<Record<OutreachStatus, number>>;
      };
    }>,
  get: (id: string) => api.get<OutreachPackDetail>(`/outreach/${id}`),
  setStatus: (
    id: string,
    body: { status: Exclude<OutreachStatus, 'SENT'>; note?: string; repliedAt?: string }
  ) => api.patch<OutreachPack>(`/outreach/${id}/status`, body),
  editMessage: (id: string, messageId: string, body: { subject?: string; body?: string }) =>
    api.patch<OutreachPack>(`/outreach/${id}/messages/${messageId}`, body),
  markSent: (id: string, messageId: string, body: { sent: boolean; sentAt?: string }) =>
    api.patch<OutreachPack>(`/outreach/${id}/messages/${messageId}/sent`, body),
};

export const alertsApi = {
  list: (params?: {
    status?: 'open' | 'resolved' | 'all';
    severity?: string;
    source?: string;
    page?: number;
    limit?: number;
  }) =>
    api.page<SystemAlert>('/system-alerts', params) as Promise<{
      data: SystemAlert[];
      meta: {
        total: number;
        page: number;
        limit: number;
        pages: number;
        open: Partial<Record<NotificationSeverity, number>>;
      };
    }>,
  resolve: (ids: string[]) => api.post<{ resolved: number }>('/system-alerts/resolve', { ids }),
};

// ── geo (country → state → city) ─────────────────────────────────────────────

export interface GeoCountry {
  code: string;
  name: string;
}
export interface GeoState {
  code: string;
  name: string;
  country: string;
  countryCode: string;
}
export interface GeoCity {
  name: string;
  state: string;
  country: string;
}

const csvParam = (v?: string[]) => (v?.length ? v.join(',') : undefined);

export const csrAgenciesApi = {
  list: (search?: string) =>
    api.get<(CsrAgency & { _count: { programs: number } })[]>('/csr-agencies', { search }),
};

export const geoApi = {
  countries: () => api.get<GeoCountry[]>('/geo/countries'),
  /** names or codes; none = India */
  states: (countries?: string[], q?: string) =>
    api.get<GeoState[]>('/geo/states', { country: csvParam(countries), q: q || undefined }),
  cities: (p: { countries?: string[]; states?: string[]; q?: string; limit?: number }) =>
    api.get<GeoCity[]>('/geo/cities', {
      country: csvParam(p.countries),
      state: csvParam(p.states),
      q: p.q || undefined,
      limit: p.limit,
    }),
};

// a client's website that no longer opens: what the website check found for me
export const websiteApi = {
  mine: () => api.get<WebsiteSuggestion[]>('/website-suggestions/mine'),
  one: (runId: string) => api.get<WebsiteCheck>(`/website-suggestions/${runId}`),
  dismiss: (runId: string) => api.post<void>(`/website-suggestions/${runId}/dismiss`),
  requestAdmin: (runId: string) =>
    api.post<{ alreadyAsked: boolean }>(`/website-suggestions/${runId}/request-admin`),
};

// ── AI assistant (read-only command + canvas) ────────────────────────────────

/** save a server-made file (xlsx / pptx) the browser received as a blob */
const saveBlob = (blob: Blob, fallbackName: string, disposition?: string) => {
  const name = /filename="?([^";]+)"?/.exec(disposition ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** a refused file download carries its JSON error inside a Blob — read it out */
const blobRequest = async <T,>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (err) {
    const data = (err as { response?: { status?: number; data?: unknown } }).response?.data;
    if (data instanceof Blob) {
      try {
        const body = JSON.parse(await data.text()) as { message?: string; code?: string };
        throw new ApiError((err as { response: { status: number } }).response.status, body.message ?? 'Export failed', body.code);
      } catch (inner) {
        if (inner instanceof ApiError) throw inner;
      }
    }
    throw toApiError(err);
  }
};

export const aiApi = {
  me: () => api.get<AiMe>('/ai/me'),
  setPreference: (mode: AiMode) =>
    api.put<Pick<AiMe, 'enabled' | 'allowed' | 'active' | 'preference' | 'reason'>>('/ai/me/preference', { mode }),
  command: (input: string) => api.post<AiCommandResult>('/ai/command', { input }),
  /** free rule-based insights for a page (no AI call) */
  insights: (page: 'clients' | 'spocs' | 'pipeline' | 'overview') =>
    api.get<{ page: string; lines: string[] }>('/ai/insights', { page }),
  /** the browser answered by itself (page by name, a repeat) — free, audited */
  logLocal: (input: string, url: string | null, kind: 'page' | 'repeat' | 'control') =>
    api.post('/ai/command/local', { input, url, kind }),

  generate: (prompt: string) => api.post<AiCanvasResult>('/ai/canvas/generate', { prompt }),
  run: (spec: AiCanvasSpec, templateId?: string) =>
    api.post<AiCanvasResult>('/ai/canvas/run', { spec, ...(templateId && { templateId }) }),
  templates: () => api.get<AiReportTemplate[]>('/ai/canvas/templates'),
  saveTemplate: (body: { name: string; prompt?: string; spec: AiCanvasSpec; isShared?: boolean }) =>
    api.post<AiReportTemplate>('/ai/canvas/templates', body),
  deleteTemplate: (id: string) => api.delete(`/ai/canvas/templates/${id}`),
  /** xlsx / pptx: downloads the file; pdf: checks + audits, returns the footer to print */
  exportCanvas: async (spec: AiCanvasSpec, format: 'xlsx' | 'pptx' | 'pdf') => {
    if (format === 'pdf') return api.post<{ footer: string }>('/ai/canvas/export', { spec, format });
    const res = await blobRequest(() =>
      http.post('/ai/canvas/export', { spec, format }, { responseType: 'blob', timeout: 120_000 })
    );
    saveBlob(res.data as Blob, `canvas.${format}`, res.headers['content-disposition'] as string | undefined);
    return null;
  },

  settings: () => api.get<AiSettings>('/ai/settings'),
  updateSettings: (body: Partial<Pick<AiSettings['setting'], 'commandEnabled' | 'canvasEnabled' | 'monthlyBudgetInr' | 'alertThresholds'>>) =>
    api.put<AiSettings['setting']>('/ai/settings', body),
  upsertQuotas: (policies: (Omit<AiQuotaPolicy, 'id' | 'isActive'> & { isActive?: boolean })[]) =>
    api.put<AiQuotaPolicy[]>('/ai/settings/quotas', { policies }),
  upsertOverride: (body: { userId: string; mode: AiUsageMode; period: AiQuotaPeriod; maxCount: number | null; reason?: string }) =>
    api.post('/ai/settings/overrides', body),
  deleteOverride: (id: string) => api.delete(`/ai/settings/overrides/${id}`),
  addPricing: (body: {
    provider: string;
    model: string;
    inputPerMTokUsd: number;
    outputPerMTokUsd: number;
    cacheReadPerMTokUsd: number;
    cacheWritePerMTokUsd: number;
    usdToInr: number;
    effectiveFrom?: string;
  }) => api.post('/ai/settings/pricing', body),
  commandTemplates: () => api.get<AiCommandTemplate[]>('/ai/settings/templates'),
  setCommandTemplate: (id: string, isActive: boolean) => api.patch(`/ai/settings/templates/${id}`, { isActive }),

  usage: (filters: AiUsageFilters) => api.get<AiUsage>('/ai/usage', filters),
  exportUsage: async (filters: AiUsageFilters) => {
    const res = await blobRequest(() =>
      http.get('/ai/usage/export', { params: filters, responseType: 'blob', timeout: 120_000 })
    );
    saveBlob(res.data as Blob, 'ai-usage.xlsx', res.headers['content-disposition'] as string | undefined);
  },
};
