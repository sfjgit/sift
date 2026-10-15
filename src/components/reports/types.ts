// File: types.ts
// Path: src/components/reports/types.ts

// ─────────────────────────────────────────────────────────────────────────────
// SHARED REFS
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceLineRef {
  id: string;
  name: string;
}

export interface StageMetaServiceLine {
  id: string;
  name: string;
}

export interface StageMeta {
  id: string;
  label: string;
  order: number;
  isStandard: boolean;
  isTerminal?: boolean;
  isNearTerminal?: boolean;
  serviceLineId: string | null;
  serviceLine: StageMetaServiceLine | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT ROW
// ─────────────────────────────────────────────────────────────────────────────

export type SaleValueBasis = 'SALE_VALUE' | 'BAND' | 'FIXED_PCT' | 'NOT_FOUND';

export interface RequirementRow {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  jobType: string;
  remoteType: string;
  totalOpenings: number;
  city: string | null;
  country: string | null;
  respondBy: string | null;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  createdAt: string;
  createdMonth?: string; // YYYY-MM (server timezone)
  createdMonthLabel?: string; // Jul 2026
  deletedAt: string | null;
  aging: number | null;

  // Funnel (sale value)
  salaryMin: number | null;
  salaryMax: number | null;
  saleValue: number | null;
  computedSaleValue: number | null;
  saleValueBasis: SaleValueBasis | null;
  bandCode: string | null;
  bandName: string | null;
  bandValue: number | null;
  clientPct: number | null;
  // Achieved — capped at openings
  terminalCount: number;
  achievedValue: number | null;
  achievedPct: number;
  // Pipeline (near close) — capped at remaining openings
  nearTerminalCount?: number;
  nearTerminalValue?: number | null;
  nearTerminalPct?: number;

  // Stage counts keyed by stage id
  stageCounts: Record<string, number>;
  totalCandidates: number;

  client: { id: string; name: string } | null;
  clientSpoc: { id: string; firstName: string; lastName: string } | null;
  businessUnit: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT REPORT RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

export interface SaleValueSummary {
  totalSaleValue: number; // Funnel
  totalAchievedValue: number;
  totalNearTerminalValue: number; // Pipeline
  includedCount: number;
  omittedCount: number;
  byBasis: Record<string, { count: number; total: number }>;
}

/** Which slice of the summary is filtering the table. null = everything. */
export type SaleBucket = 'nearTerminal' | 'terminal' | null;

export interface RequirementGroup {
  serviceLine: ServiceLineRef | null;
  stages: StageMeta[];
  data: RequirementRow[];
  total: number;
}

export interface RequirementReportResponse {
  success: boolean;
  groups: RequirementGroup[];
  saleValueSummary: SaleValueSummary;
  meta: {
    window: string;
    standardOnly: boolean;
    total: number;
    multiLine: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER SALE SUMMARY — GET /reports/recruiters/sale-summary
// Team totals over UNIQUE requirements assigned to the team, capped at openings.
// ─────────────────────────────────────────────────────────────────────────────

export interface RecruiterSaleShare {
  nearTerminal: number;
  terminal: number;
  nearTerminalValue: number;
  achievedValue: number;
}

export interface RecruiterSaleSummaryResponse {
  success: boolean;
  data: {
    summary: SaleValueSummary;
    nearTerminalCandidates: number;
    terminalCandidates: number;
    sourcedCandidates?: number;
    requirementCount: number; // unique requirements assigned
    unassignedPlaced?: number;
    achievedPct?: number;
    byRecruiter: Record<string, RecruiterSaleShare>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER ROW — GET /reports/recruiters
// Legacy fields kept exactly as before so existing components keep compiling;
// new-flow fields are optional additions.
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementBreakdown {
  requirementId: string;
  reqCode: string;
  title: string;
  client: { id: string; name: string } | null;
  status: string;
  sourced: number;
  stageCounts: Record<string, number>;
  // new flow
  totalOpenings?: number;
  submitted?: number;
  offered?: number;
  placed?: number;
  nearTerminal?: number;
  inPipeline?: number;
  offPipeline?: number; // dropped
  isAssigned?: boolean;
  saleValue?: number | null; // funnel of this req (only when assigned)
  achievedValue?: number | null;
  nearTerminalValue?: number | null;
  // legacy (kept as-is so existing components compile)
  joined: number;
  active: number;
  dropped: number;
}

export interface RecruiterTeamRollup {
  members: number;
  assignedReqCount: number;
  saleValue: number;
  achievedValue: number;
  nearTerminalValue: number;
  achievedPct: number;
  sourced: number;
  placed: number;
  nearTerminal: number;
}

export interface RecruiterRow {
  id: string;
  email: string;
  sourced: number;
  stageCounts: Record<string, number>;
  requirementBreakdown: RequirementBreakdown[];
  // new flow
  name?: string;
  department?: { id: string; name: string } | null;
  managerName?: string | null;
  depth?: number | null; // 0 = you, 1 = direct report, …
  isActive?: boolean;
  submitted?: number;
  offered?: number;
  placed?: number;
  nearTerminal?: number;
  inPipeline?: number;
  offPipeline?: number; // dropped
  submissionRate?: number;
  offerRate?: number;
  placementRate?: number;
  avgTimeToSubmitDays?: number | null;
  assignedReqCount?: number;
  saleValue?: number; // funnel of assigned reqs
  achievedValue?: number;
  nearTerminalValue?: number;
  achievedPct?: number;
  unassignedPlaced?: number;
  team?: RecruiterTeamRollup | null;
  // legacy (kept as-is so existing components compile)
  firstName: string;
  lastName: string;
  role: string;
  joined: number;
  active: number;
  dropped: number;
}

export interface RecruiterGroup {
  serviceLine: ServiceLineRef | null;
  stages: StageMeta[];
  data: RecruiterRow[];
  total: number;
}

export interface RecruiterResponse {
  success: boolean;
  groups: RecruiterGroup[];
  meta: {
    window: string;
    standardOnly: boolean;
    total?: number;
    multiLine?: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE DRILL ROW — shared shape from every drill endpoint
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateDrillRow {
  pipelineId: string;
  addedOn: string;
  pipelineDays: number;
  stageAging?: string;
  stageLabel: string;
  isTerminal: boolean;
  isNearTerminal: boolean;
  isDropped?: boolean;
  isOnHold: boolean;
  stageReachedAt?: string | null;
  stageMovedBy?: string | null;
  submittedAt?: string | null;
  offerStatus?: string | null;
  offeredCtc?: number | null;
  currentCtc?: number | null;
  expectedCtc?: number | null;
  negotiatedCtc?: number | null;
  // joining — LWD, else today + notice period days
  lastWorkingDate?: string | null;
  noticeDays?: number | null;
  joiningDate?: string | null;
  joiningSource?: 'LWD' | 'NOTICE_PERIOD' | null;
  joiningSourceLabel?: string | null;
  monthOfJoining?: string | null;
  daysToJoin?: number | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  currentTitle?: string;
  currentCompany?: string;
  recruiterName: string;
  reqCode: string;
  reqTitle: string;
  clientName: string;
}
