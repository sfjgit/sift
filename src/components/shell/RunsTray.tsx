// File: RunsTray.tsx
// Path: src/components/shell/RunsTray.tsx
//
// Floating window (bottom right, every page): the runs you started that are
// still going — any engine — with progress, time so far and about how long is
// left (from how long the step usually takes), plus the ones that just
// finished. Click one to open its run sheet. Hidden when there is nothing.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, X, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { clientHooks } from '@/hooks/queries';
import { pipelineApi } from '@/lib/api/endpoints';
import { RunSheet } from '@/app/(app)/pipeline-runs/_components/RunSheet';
import { isActive } from '@/app/(app)/pipeline-runs/_components/runFormat';
import type { StepRun } from '@/types/crm';

type TrayRun = StepRun & { typicalSeconds?: number | null };

const RECENT_MS = 10 * 60_000; // finished runs stay listed this long
const FAST_MS = 4000;
const SLOW_MS = 30_000;

const dur = (secs: number) => {
  const s = Math.max(0, Math.round(secs));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

/** "about 2m left" from the step's usual time; "taking longer than usual" past it */
const eta = (r: TrayRun, now: number) => {
  if (!r.typicalSeconds || r.status !== 'RUNNING' || !r.startedAt) return null;
  const left = r.typicalSeconds - (now - new Date(r.startedAt).getTime()) / 1000;
  return left > 5 ? `about ${dur(left)} left` : 'taking longer than usual';
};

export function RunsTray() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const q = useQuery({
    queryKey: ['step-runs', 'tray', user?.id],
    queryFn: () => pipelineApi.runs({ requestedById: user!.id, limit: 10 }),
    enabled: !!user?.id && can('step_runs.read'),
    refetchInterval: query =>
      (query.state.data?.data ?? []).some(r => isActive(r.status)) ? FAST_MS : SLOW_MS,
    refetchIntervalInBackground: false,
  });

  // top-level runs only ("Run all steps" shows its own progress)
  const runs = ((q.data?.data ?? []) as TrayRun[]).filter(
    r =>
      !r.parentRunId &&
      !hidden.has(r.id) &&
      (isActive(r.status) || (r.finishedAt && now - new Date(r.finishedAt).getTime() < RECENT_MS))
  );
  const running = runs.filter(r => isActive(r.status));

  // the clock for elapsed / time left
  useEffect(() => {
    if (!running.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running.length]);

  // a run that just ended: refresh the clients list (it moves to the top) and the client's page
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const active = new Set(running.map(r => r.id));
    const ended = [...seen.current].filter(id => !active.has(id));
    if (ended.length) {
      void qc.invalidateQueries({ queryKey: clientHooks.keys.all });
      void qc.invalidateQueries({ queryKey: ['step-runs', 'overview'] });
    }
    seen.current = active;
  }, [running.map(r => r.id).join(','), qc]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!runs.length)
    return <RunSheet runId={sheet} onOpenChange={o => !o && setSheet(null)} onOpenRun={setSheet} />;

  return (
    <>
      <div className="fixed right-4 bottom-4 z-40 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-card shadow-lg">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center justify-between gap-2 border-b bg-surface px-3 py-2 text-left text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            {running.length ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="size-4 text-success" />
            )}
            {running.length
              ? `${running.length} run${running.length === 1 ? '' : 's'} going`
              : 'Runs finished'}
          </span>
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
        {open && (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {runs.map(r => {
              const active = isActive(r.status);
              const failed = ['FAILED', 'DISPATCH_FAILED', 'TIMED_OUT'].includes(r.status);
              const since = r.startedAt ?? r.createdAt;
              const took = r.finishedAt
                ? (new Date(r.finishedAt).getTime() - new Date(since).getTime()) / 1000
                : (now - new Date(since).getTime()) / 1000;
              const left = eta(r, now);
              return (
                <li key={r.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setSheet(r.id)}
                    className="w-full px-3 py-2.5 text-left hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2 pr-5">
                      <p className="truncate text-[13px] font-medium">{r.step.label}</p>
                      {active ? (
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {r.status === 'QUEUED' ? 'queued' : `${r.progress ?? 0}%`}
                        </span>
                      ) : failed ? (
                        <XCircle className="size-4 shrink-0 text-destructive" />
                      ) : (
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{r.client.name}</p>
                    {active && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-700"
                          style={{
                            width: `${Math.max(r.status === 'QUEUED' ? 3 : 6, r.progress ?? 0)}%`,
                          }}
                        />
                      </div>
                    )}
                    <p className="mt-1 truncate text-[12px] text-muted-foreground">
                      {active
                        ? `${dur(took)} so far${left ? ` · ${left}` : ''}`
                        : `${r.note ?? r.status.toLowerCase()} · ${dur(took)}`}
                    </p>
                    {active && r.note && (
                      <p className="truncate text-[12px] text-muted-foreground">{r.note}</p>
                    )}
                  </button>
                  {!active && (
                    <button
                      type="button"
                      aria-label="Hide"
                      onClick={() => setHidden(h => new Set(h).add(r.id))}
                      className="absolute top-2 right-2 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <RunSheet runId={sheet} onOpenChange={o => !o && setSheet(null)} onOpenRun={setSheet} />
    </>
  );
}
