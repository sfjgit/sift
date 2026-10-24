// File: runFormat.tsx
// Path: src/app/(app)/pipeline-runs/_components/runFormat.tsx
//
// Small formatters + pieces shared by the runs table and the run sheet.

import { Progress } from '@/components/ui/progress';
import { StepRunBadge } from '@/components/common/badges';
import type { StepRunStatus } from '@/types/crm';

export const ACTIVE_STATUSES: StepRunStatus[] = ['QUEUED', 'RUNNING'];

export const isActive = (s: StepRunStatus) => ACTIVE_STATUSES.includes(s);

/** "1h 4m", "3m 12s", "8s" — running runs measure to now */
export function fmtDuration(start?: string | null, end?: string | null, now = Date.now()) {
  if (!start) return '—';
  const ms = (end ? new Date(end).getTime() : now) - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export const fmtUsd = (v?: string | number | null) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? usd.format(n) : '—';
};

export function RunStatus({ status, progress }: { status: StepRunStatus; progress?: number | null }) {
  return (
    <span className="flex min-w-[110px] flex-col gap-1">
      <StepRunBadge status={status} />
      {status === 'RUNNING' && typeof progress === 'number' && (
        <span className="flex items-center gap-1.5">
          <Progress value={Math.max(0, Math.min(100, progress))} className="h-1 w-16" />
          <span className="tabular text-[10px] text-muted-foreground">{Math.round(progress)}%</span>
        </span>
      )}
    </span>
  );
}

/** "resultSummary.leadsFound" → "Leads found" */
export const humanizeKey = (k: string) => {
  const s = k
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
