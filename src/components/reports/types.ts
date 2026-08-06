// File: types.ts
// Path: src/components/reports/types.ts

export interface StageMeta {
  id: string;
  code: string;
  label: string;
  order: number;
  isStandard: boolean;
  isTerminal: boolean;
  canonicalStage: string | null;
  serviceLineId: string | null;
  serviceLine: { id: string; name: string } | null;
}

export interface ServiceLineRef {
  id: string;
  name: string;
}

export interface RequirementBreakdown {
  requirementId: string;
  reqCode: string;
  title: string;
  status: string;
  totalOpenings: number;
  client: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  businessUnit: { id: string; name: string } | null;
  sourced: number;
  submitted: number;
  offered: number;
  joined: number;
  dropped: number;
  active: number;
  stageCounts: Record<string, number>;
}

export interface RecruiterStat {
  id: string;
  name: string;
  email: string;
  sourced: number;
  submitted: number;
  offered: number;
  joined: number;
  dropped: number;
  active: number;
  submissionRate: number;
  offerRate: number;
  joinRate: number;
  avgTimeToSubmitDays: number | null;
  stageCounts: Record<string, number>;
  requirementBreakdown: RequirementBreakdown[];
}

export interface RecruiterGroup {
  serviceLine: ServiceLineRef | null;
  stages: StageMeta[];
  data: RecruiterStat[];
  total: number;
}

export interface RecruiterResponse {
  success: boolean;
  groups: RecruiterGroup[];
  meta: { scope?: string; window: string; standardOnly?: boolean; multiLine?: boolean };
}

export interface RequirementRow {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  totalCandidates: number;
  city: string | null;
  country: string | null;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
  remoteType: string;
  respondBy: string | null;
  isRespondByBreached: boolean;
  createdAt: string;
  createdById: string;
  deletedAt: string | null;
  client: { id: string; name: string } | null;
  clientSpoc: { id: string; firstName: string; lastName: string; email: string } | null;
  businessUnit: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  stageCounts: Record<string, number>;
}

export interface RequirementGroup {
  serviceLine: ServiceLineRef | null;
  stages: StageMeta[];
  data: RequirementRow[];
  total: number;
}

export interface RequirementReportResponse {
  success: boolean;
  groups: RequirementGroup[];
  meta: { total?: number; window: string; standardOnly?: boolean; multiLine?: boolean };
}

export interface OverviewResponse {
  success: boolean;
  data: {
    kpis: {
      total: number;
      submitted: number;
      offered: number;
      joined: number;
      dropped: number;
      active: number;
      submissionRate: number;
      offerRate: number;
      joinRate: number;
    };
    funnel: { stageId: string; label: string; count: number }[];
    byServiceLine: {
      serviceLineId: string | null;
      name: string;
      total: number;
      submitted: number;
      offered: number;
      joined: number;
      funnel: { stageId: string; label: string; order: number; count: number }[];
    }[];
    byBusinessUnit: {
      businessUnitId: string | null;
      name: string;
      total: number;
      joined: number;
    }[];
    dispositionCounts: Record<string, number>;
    timeSeries: { bucket: string; count: number }[];
    timeGranularity: 'hour' | 'day';
    leaderboard: { id: string; name: string; sourced: number; joined: number }[];
  };
  meta: { window: string; granularity: string; scope: string; multiLine: boolean };
}
