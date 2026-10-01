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
  deletedAt: string | null;
  aging: number | null;

  // Sale value fields
  salaryMin: number | null;
  salaryMax: number | null;
  saleValue: number | null;
  computedSaleValue: number | null;
  saleValueBasis: SaleValueBasis | null;
  bandCode: string | null;
  bandName: string | null;
  bandValue: number | null;
  clientPct: number | null;
  // Achieved
  terminalCount: number;
  achievedValue: number | null;
  achievedPct: number;
  // Near terminal (already returned by GET /reports/requirements)
  nearTerminalCount?: number;
  nearTerminalValue?: number | null;

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
  totalSaleValue: number;
  totalAchievedValue: number;
  totalNearTerminalValue: number;
  includedCount: number;
  omittedCount: number;
  byBasis: Record<string, { count: number; total: number }>;
}

/** Which slice of the sale summary is filtering the table. null = everything. */
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
// Recruiter share: each near-close / placed candidate = saleValue ÷ openings
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
    requirementCount: number;
    byRecruiter: Record<string, RecruiterSaleShare>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER ROW
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementBreakdown {
  requirementId: string;
  reqCode: string;
  title: string;
  client: { id: string; name: string } | null;
  status: string;
  sourced: number;
  joined: number;
  active: number;
  dropped: number;
  stageCounts: Record<string, number>;
}

export interface RecruiterRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  sourced: number;
  joined: number;
  active: number;
  dropped: number;
  stageCounts: Record<string, number>;
  requirementBreakdown: RequirementBreakdown[];
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
  };
}
