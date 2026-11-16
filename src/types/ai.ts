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

export type AiComponent = 'kpi' | 'bar' | 'line' | 'pie' | 'table' | 'org';
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
  | { kind: 'rows'; columns: AiColumn[]; rows: Record<string, string | number | null>[]; total: number }
  | { kind: 'tree'; root: import('@/features/org/types').OrgNode; total: number };

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

// ── threads (saved conversations) ────────────────────────────────────────────

export type AiTurnKind = 'canvas' | 'clarify' | 'rejected' | 'error' | 'explain' | 'edit' | 'new' | 'action';

/** an action the assistant proposes; it runs only when the person confirms */
export interface AiActionProposal {
  type: 'assign_clients' | 'reassign_spocs' | 'set_sales_status';
  title: string;
  detail: string;
  count: number;
  sample: string[];
  body: Record<string, unknown>;
}

export interface AiTurn {
  id: string;
  seq: number;
  input: string;
  kind: AiTurnKind;
  /** what the assistant said: what changed, the question, the explanation (markdown) */
  message: string | null;
  /** clarify: the "do you mean" choices */
  options: string[] | null;
  /** llm | memory | local — memory and local cost nothing */
  tier: string;
  createdAt: string;
}

export interface AiThreadRef {
  id: string;
  title: string;
  page: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiThreadListItem extends AiThreadRef {
  _count: { turns: number };
}

export interface AiCanvasView {
  spec: AiCanvasSpec;
  blocks: AiRenderedBlock[];
}

export interface AiThread extends AiThreadRef {
  turns: AiTurn[];
  canvas: AiCanvasView | null;
  /** the saved canvas no longer fits your access or the catalog */
  stale: boolean;
}

export interface AiThreadReply {
  kind: AiTurnKind;
  /** null when nothing was saved (a failed first message, or "new chat") */
  thread: AiThreadRef | null;
  turn: AiTurn | null;
  message: string | null;
  options?: string[];
  canvas?: AiCanvasView;
  matched?: { label: string; kind: string }[];
  /** a new topic: it went to a new thread, the old one is kept */
  startedNew?: boolean;
  /** answered from memory or locally — no AI call */
  free: boolean;
  /** something to do on the page: re-filter / open a page, or open its stats view */
  action?: { type: 'navigate'; url: string; samePage: boolean } | { type: 'stats' };
  /** an action to confirm (assign, set status) */
  proposal?: AiActionProposal;
  quota?: AiQuota;
}

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
