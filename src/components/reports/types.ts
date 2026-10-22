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
// RECRUITERS TAB — ACTIVITY ONLY — GET /reports/recruiters/activity
// Counts = unique candidates; Placed = still placed; money capped at openings.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityBucket = 'sourced' | 'active' | 'pipeline' | 'placed' | 'dropped';

export interface ActivityStageMeta extends StageMeta {
  code: string;
  isSourced: boolean;
  pipeline: boolean;
  grandCount: number;
}

export interface RecruiterActivityTeam {
  members: number;
  assignedReqCount: number;
  funnelValue: number;
  pipelineValue: number;
  achievedValue: number;
  achievedPct: number;
  candidates: number;
  moves: number;
  placed: number;
  pipeline: number;
  reversed: number;
}

export interface RecruiterActivityRow {
  id: string;
  recruiterId: string;
  name: string;
  email: string;
  role: string | null;
  department: { id: string; name: string } | null;
  managerName: string | null;
  depth: number | null; // 0 = you, 1 = direct report, …
  isActive: boolean;
  serviceLine: ServiceLineRef | null;

  // Activity (unique candidates)
  candidates: number;
  totalTransitions: number; // moves
  sourcedCount: number; // added
  activeCount: number;
  nearTerminalCount: number; // pipeline
  terminalCount: number; // placed (still placed)
  reversedCount: number;
  offPipelineCount: number; // dropped
  stageCounts: Record<string, number>;
  stageMoves: Record<string, number>;

  // Money
  assignedReqCount: number;
  funnelValue: number;
  pipelineValue: number;
  achievedValue: number;
  achievedPct: number;
  unassignedPlaced: number;

  team: RecruiterActivityTeam | null;
}

export interface RecruiterActivityGroup {
  serviceLine: ServiceLineRef | null;
  stages: ActivityStageMeta[];
  data: RecruiterActivityRow[];
  total: number;
  totalTransitions: number;
}

export interface RecruiterActivitySummary {
  people: number;
  candidates: number;
  moves: number;
  added: number;
  active: number;
  pipeline: number;
  placed: number;
  reversed: number;
  dropped: number;
  requirementCount: number;
  unassignedPlaced: number;
  achievedPct: number;
  sale: SaleValueSummary; // Funnel / Pipeline / Achieved totals, each requirement once
}

export interface RecruiterActivityResponse {
  success: boolean;
  groups: RecruiterActivityGroup[];
  meta: {
    window: string;
    standardOnly: boolean;
    total: number;
    totalTransitions: number;
    multiLine: boolean;
    capped: boolean;
    summary: RecruiterActivitySummary;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY — current-state recruiter endpoints (no longer used by the Recruiters
// tab). Kept so older components that still import them keep compiling.
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
    requirementCount: number;
    unassignedPlaced?: number;
    achievedPct?: number;
    byRecruiter: Record<string, RecruiterSaleShare>;
  };
}

export interface RequirementBreakdown {
  requirementId: string;
  reqCode: string;
  title: string;
  client: { id: string; name: string } | null;
  status: string;
  sourced: number;
  stageCounts: Record<string, number>;
  totalOpenings?: number;
  submitted?: number;
  offered?: number;
  placed?: number;
  nearTerminal?: number;
  inPipeline?: number;
  offPipeline?: number;
  isAssigned?: boolean;
  saleValue?: number | null;
  achievedValue?: number | null;
  nearTerminalValue?: number | null;
  joined: number;
  active: number;
  dropped: number;
}

export interface RecruiterRow {
  id: string;
  email: string;
  sourced: number;
  stageCounts: Record<string, number>;
  requirementBreakdown: RequirementBreakdown[];
  name?: string;
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
// CANDIDATE DRILL ROW — shared shape from the requirement / overview drills
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
