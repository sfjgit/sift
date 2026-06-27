// File: reports.api.ts
// Path: src/lib/reports.api.ts

import type { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobalReportParams {
  clientId?: string;
  buId?: string;
  serviceLineId?: string;
  fromDate?: string;
  toDate?: string;
}

// ── Recruiter report
export interface RecruiterStat {
  id: string;
  name: string;
  email: string;
  requirementsCount: number;
  sourced: number;
  submitted: number;
  shortlisted: number;
  offered: number;
  joined: number;
  dropped: number;
  active: number;
  submissionRate: number;
  offerRate: number;
  joinRate: number;
  avgTimeToSubmitDays: number | null;
}

// ── Candidate report
export interface FunnelStage {
  stage: string;
  count: number;
  pct: number;
}

export interface CandidateReportData {
  totalCandidates: number;
  funnelByCanonicalStage: FunnelStage[];
  dispositionSummary: Record<string, number>;
  avgPipelineDays: number;
}

// ── Requirement report
export interface RequirementReportData {
  summary: {
    total: number;
    totalOpenings: number;
    totalPlaced: number;
    fillRate: number;
    respondByBreached: number;
    turnaroundBreached: number;
  };
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byClient: { clientId: string; clientName: string; count: number }[];
  byBU: { buId: string; buName: string; count: number }[];
  byServiceLine: { serviceLineId: string; serviceLineName: string; count: number }[];
  byJobType: { jobType: string; count: number }[];
  byRemoteType: { remoteType: string; count: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const reportsApi = {
  // ── Recruiter
  getRecruiterReport: (
    axios: AxiosInstance,
    params?: GlobalReportParams & { recruiterId?: string }
  ) =>
    axios
      .get<{
        success: boolean;
        data: RecruiterStat[];
        total: number;
      }>('/reports/recruiters', { params })
      .then(r => r.data),

  exportRecruiterReport: (
    axios: AxiosInstance,
    params?: GlobalReportParams & { recruiterId?: string }
  ) =>
    axios.get('/reports/recruiters/export', {
      params,
      responseType: 'blob',
    }),

  // ── Candidates
  getCandidateReport: (axios: AxiosInstance, params?: GlobalReportParams) =>
    axios
      .get<{ success: boolean; data: CandidateReportData }>('/reports/candidates', { params })
      .then(r => r.data),

  exportCandidateReport: (
    axios: AxiosInstance,
    params?: GlobalReportParams & { canonicalStage?: string; disposition?: string }
  ) =>
    axios.get('/reports/candidates/export', {
      params,
      responseType: 'blob',
    }),

  // ── Requirements
  getRequirementReport: (axios: AxiosInstance, params?: GlobalReportParams) =>
    axios
      .get<{ success: boolean; data: RequirementReportData }>('/reports/requirements', { params })
      .then(r => r.data),

  // ── PDF export
  exportPDF: (
    axios: AxiosInstance,
    type: 'recruiters' | 'candidates' | 'requirements',
    params?: GlobalReportParams
  ) =>
    axios.get(`/reports/pdf/${type}`, {
      params,
      responseType: 'blob',
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// UTIL: trigger browser download from blob response
// ─────────────────────────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
