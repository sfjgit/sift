// File: support.ts
// Path: src/types/support.ts

export type TicketKind = 'BUG' | 'FEATURE';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';

export interface TicketListItem {
  id: string;
  number: number;
  kind: TicketKind;
  title: string;
  status: string;
  severity: Severity | null;
  pageUrl: string | null;
  reproRequested: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  reporter: string | null;
  assignee: { id: string; name: string | null } | null;
  hasScreenshot: boolean;
  recordings: number;
  comments: number;
}

export interface TicketListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  support: boolean;
  counts: { kind: TicketKind; status: string; count: number }[];
  pipeline: Record<TicketKind, string[]>;
  labels: Record<string, string>;
}

export interface Finding {
  level: 'error' | 'warn' | 'info';
  title: string;
  detail?: string;
}
export interface ServerError {
  requestId: string;
  at: string;
  method: string;
  path: string;
  status: number;
  message: string;
  code?: string;
  stack?: string;
}
export interface Diagnosis {
  at: string;
  summary: string;
  area: string;
  findings: Finding[];
  steps: string[];
  serverErrors: ServerError[];
  ai?: {
    at: string;
    summary: string;
    likelyCause: string;
    whereToLook: string[];
    suggestedFix: string;
    confidence: 'low' | 'medium' | 'high';
  };
}

export interface TicketContext {
  env?: Record<string, unknown>;
  page?: { url?: string; title?: string };
  network?: {
    method: string;
    url: string;
    status: number;
    ms: number;
    at: string;
    requestId?: string;
    message?: string;
  }[];
  console?: { level: 'error' | 'warn'; msg: string; stack?: string; at: string }[];
  crumbs?: { at: string; type: string; label: string; path?: string }[];
}

export interface TicketDetail {
  id: string;
  number: number;
  kind: TicketKind;
  title: string;
  description: string | null;
  expected: string | null;
  status: string;
  severity: Severity | null;
  pageUrl: string | null;
  reproRequested: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  context: TicketContext | null;
  diagnosis: Diagnosis | null;
  reporter: { id: string; name: string | null };
  assignee: { id: string; name: string | null } | null;
  attachments: {
    id: string;
    kind: 'SCREENSHOT' | 'REPLAY' | 'REPRO';
    mime: string;
    sizeBytes: number;
    durationMs: number | null;
    createdAt: string;
  }[];
  events: {
    id: string;
    type: string;
    body: string | null;
    data: Record<string, unknown> | null;
    author: string | null;
    createdAt: string;
  }[];
  pipeline: string[];
  labels: Record<string, string>;
  canManage: boolean;
  canDiagnose: boolean;
}

export interface NewTicket {
  kind: TicketKind;
  title: string;
  description?: string;
  expected?: string;
  severity?: Severity;
  pageUrl?: string;
  context?: unknown;
  screenshot?: string;
  replay?: string;
  replayMs?: number;
}
