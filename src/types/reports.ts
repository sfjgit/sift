// File: reports.ts
// Path: src/types/reports.ts

export type ReportEntity = 'spocs' | 'clients';
export type TrendEntity = 'clients' | 'spocs' | 'activities' | 'notes';
export type TrendInterval = 'day' | 'week' | 'month';

export interface Overview {
  clients: {
    total: number;
    byStatus: Record<'PENDING' | 'ACTIVE' | 'INACTIVE', number>;
    newInRange: number;
  } | null;
  spocs: {
    total: number;
    mine: number;
    newInRange: number;
    byBand: Record<'READY' | 'REVIEW' | 'NOT_USABLE' | 'UNSCORED', number>;
    byEmailStatus: Record<'UNVERIFIED' | 'GOOD' | 'RISKY' | 'BAD', number>;
  } | null;
  activity: { inRange: number; notesInRange: number } | null;
  stepRuns: { inRange: number; running: number; failed: number } | null;
}

export interface KeyLabel {
  key: string;
  label: string;
}

export interface BreakdownRow extends KeyLabel {
  total: number;
  split?: Record<string, number>;
}

export interface Breakdown {
  entity: ReportEntity;
  groupBy: string;
  splitBy: string | null;
  total: number;
  rows: BreakdownRow[];
  splitKeys?: KeyLabel[];
}

export interface TrendPoint {
  bucket: string;
  total: number;
  split?: Record<string, number>;
}

export interface Trend {
  interval: TrendInterval;
  from: string;
  to: string;
  points: TrendPoint[];
  splitKeys?: KeyLabel[];
}
