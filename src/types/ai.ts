// File: ai.ts
// Path: src/types/ai.ts
//
// AI assistant layer — shapes returned by crm-core-service /ai/* (mirror of
// src/services/ai/* and src/config/queryRegistry.ts on the backend).

export type AiMode = 'OFF' | 'COMMAND' | 'CANVAS';
export type AiUsageMode = 'COMMAND' | 'CANVAS' | 'EXPORT';
export type AiQuotaPeriod = 'DAY' | 'WEEK' | 'MONTH';

export interface AiQuota {
  ok: boolean;
  used: number;
  /** null = unlimited */
  max: number | null;
  period: AiQuotaPeriod | null;
  resetsAt: string | null;
}

export interface AiMe {
  enabled: boolean;
  allowed: { command: boolean; canvas: boolean };
  active: { command: boolean; canvas: boolean };
  preference: AiMode;
  reason?: 'kill_switch' | 'org_off' | 'no_permission' | 'user_off';
  can: { export: boolean; saveTemplate: boolean; shareTemplate: boolean; manage: boolean; viewUsage: boolean };
  quota: { command: AiQuota | null; canvas: AiQuota | null; export: AiQuota | null };
  /** set when the month's budget is used up — templates only */
  basicMode: string | null;
  llmReady: boolean;
  readOnlyRole: boolean;
  maxInputChars: number;
}

export type AiCommandResult = (
  | { type: 'navigate'; url: string; summary: string; spoken?: string; matched: { label: string; kind: string }[]; note?: string }
  | { type: 'search'; q: string; message?: string }
  | { type: 'clarify'; message: string }
  | { type: 'rejected'; message: string; suggestion?: { label: string; url: string } }
  | { type: 'error'; message: string }
) & { quota: AiQuota };

// ── canvas ───────────────────────────────────────────────────────────────────

export type AiComponent = 'kpi' | 'bar' | 'line' | 'pie' | 'table';
export type AiWidth = 'full' | 'half' | 'third';
export type AiValueFormat = 'number' | 'money' | 'percent';

export interface AiColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'money' | 'date' | 'percent';
}

export type AiQueryResult =
  | { kind: 'single'; value: number | null; format: AiValueFormat; hint?: string }
  | {
      kind: 'series';
      format: AiValueFormat;
      series: { key: string; label: string }[];
      points: ({ label: string } & Record<string, number | string>)[];
    }
  | { kind: 'rows'; columns: AiColumn[]; rows: Record<string, string | number | null>[]; total: number };

export interface AiSpecBlock {
  id: string;
  component: AiComponent;
  query: string;
  params: Record<string, unknown>;
  title: string;
  width: AiWidth;
}

export interface AiCanvasSpec {
  title: string;
  blocks: AiSpecBlock[];
}

export interface AiRenderedBlock extends AiSpecBlock {
  result?: AiQueryResult;
  error?: string;
}

export type AiCanvasResult = (
  | { type: 'canvas'; spec: AiCanvasSpec; blocks: AiRenderedBlock[]; matched?: { label: string; kind: string }[] }
  | { type: 'clarify'; message: string }
  | { type: 'rejected'; message: string }
  | { type: 'error'; message: string }
) & { quota?: AiQuota };

export interface AiReportTemplate {
  id: string;
  name: string;
  prompt: string | null;
  spec: AiCanvasSpec;
  isShared: boolean;
  mine: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── settings / usage (admin) ─────────────────────────────────────────────────

export interface AiQuotaPolicy {
  id: string;
  roleId: string | null;
  mode: AiUsageMode;
  period: AiQuotaPeriod;
  maxCount: number | null;
  isActive: boolean;
}

export interface AiQuotaOverride {
  id: string;
  userId: string;
  mode: AiUsageMode;
  period: AiQuotaPeriod;
  maxCount: number | null;
  reason: string | null;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface AiPricing {
  id: string;
  provider: string;
  model: string;
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
  cacheReadPerMTokUsd: number;
  cacheWritePerMTokUsd: number;
  usdToInr: number;
  effectiveFrom: string;
  isActive: boolean;
}

export interface AiBudget {
  budgetInr: number;
  spentInr: number;
  usedPct: number;
  exhausted: boolean;
}

export interface AiSettings {
  setting: {
    id: string | null;
    commandEnabled: boolean;
    canvasEnabled: boolean;
    monthlyBudgetInr: number;
    alertThresholds: number[];
  };
  budget: AiBudget;
  roles: { id: string; name: string }[];
  policies: AiQuotaPolicy[];
  overrides: AiQuotaOverride[];
  pricing: AiPricing[];
  defaults: {
    quotas: { mode: AiUsageMode; period: AiQuotaPeriod; maxCount: number | null }[];
    model: string;
    exportRowCap: number;
  };
  system: { killSwitch: boolean; llmReady: boolean; readOnlyRole: boolean };
}

export interface AiCommandTemplate {
  id: string;
  template: string;
  action: string;
  paramMap: unknown;
  source: 'llm' | 'seed' | 'manual';
  hitCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface AiUsageFilters {
  from?: string;
  to?: string;
  roleId?: string;
  buId?: string;
  mode?: AiUsageMode;
}

export interface AiUsage {
  spec: AiCanvasSpec;
  blocks: AiRenderedBlock[];
  quotas: {
    user: string;
    role: string | null;
    mode: AiUsageMode;
    today: number;
    dailyLimit: number | null;
    thisMonth: number;
    nearLimit: boolean;
  }[];
  budget: AiBudget;
  health: { ageDays: number; hitRatePct: number | null; alert: boolean };
}
