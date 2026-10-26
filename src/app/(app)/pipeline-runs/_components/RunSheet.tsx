// File: RunSheet.tsx
// Path: src/app/(app)/pipeline-runs/_components/RunSheet.tsx
//
// Right-hand detail for one step run: what happened, why it failed and what
// to do next, the result, credits used, child runs and the event timeline.
// Polls while the run is still queued / running.

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Coins, Lightbulb, SearchX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { DetailList } from '@/components/common/Panel';
import { Pill, STEP_STATUS, StepRunBadge } from '@/components/common/badges';
import { PersonCell } from '@/components/common/UserAvatar';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ApiError } from '@/lib/api/client';
import { pipelineApi } from '@/lib/api/endpoints';
import { fmtDateTime, fmtNumber, fmtRelative, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { RunViewData, StepRunDetail } from '@/types/crm';
import { fmtDuration, fmtUsd, humanizeKey, isActive } from './runFormat';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const renderValue = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return fmtNumber(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.every(x => typeof x !== 'object')) return v.join(', ');
  return <code className="font-mono text-xs break-all">{JSON.stringify(v)}</code>;
};

// { spocs: { created: 2, updated: 1 }, engine: { "Needs review": 2 } } → one row per group, chips inside
function ResultSummary({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-sm text-muted-foreground">No result recorded.</p>;
  if (!isPlainObject(value) || !Object.keys(value).length) {
    return (
      <pre className="max-h-80 overflow-auto rounded-lg border bg-surface p-3 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  const scalars = Object.entries(value).filter(([, v]) => !isPlainObject(v));
  const groups = Object.entries(value).filter(([, v]) => isPlainObject(v) && Object.keys(v).length) as [string, Record<string, unknown>][];
  return (
    <div className="space-y-2">
      {scalars.length > 0 && (
        <div className="rounded-lg border bg-surface p-3">
          <DetailList items={scalars.map(([k, v]) => ({ label: humanizeKey(k), value: renderValue(v) }))} />
        </div>
      )}
      {groups.map(([group, v]) => (
        <div key={group} className="rounded-lg border bg-surface p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {group === 'engine' ? 'Reported by the pipeline' : humanizeKey(group)}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {Object.entries(v).map(([k, x]) => (
              <li key={k} className="inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-1 text-xs ring-1 ring-border">
                <span className="text-muted-foreground">{humanizeKey(k)}</span>
                <span className="font-medium tabular">{renderValue(x) ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// what the CRM did not take from the pipeline, for a person to look at
function ReviewItems({ value }: { value: unknown }) {
  const v = (isPlainObject(value) ? value : {}) as RunViewData;
  const conflicts = v.conflicts ?? [];
  const skipped = v.skipped ?? [];
  const flagged = v.flaggedFigures ?? [];
  if (!conflicts.length && !skipped.length && !flagged.length) return null;
  return (
    <Section title="Needs a look">
      <div className="space-y-2">
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <p className="mb-2 text-[13px] font-medium">
              {conflicts.length} value{conflicts.length === 1 ? '' : 's'} differ from the CRM — the CRM value was kept
            </p>
            <ul className="space-y-1.5 text-xs">
              {conflicts.slice(0, 50).map((c, i) => (
                <li key={i} className="flex flex-wrap gap-x-1.5">
                  <Link href={`/spocs/${c.spocId}`} className="font-medium hover:text-primary">
                    {c.name}
                  </Link>
                  <span className="text-muted-foreground">{humanizeKey(c.field)}:</span>
                  {c.current && <span className="line-through opacity-70">{c.current}</span>}
                  <span>→ {String(c.proposed)}</span>
                  {(c.source || c.reason) && <span className="text-muted-foreground">({c.reason ?? c.source})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {flagged.length > 0 && (
          <div className="rounded-lg border bg-surface p-3 text-xs">
            <p className="mb-1.5 text-[13px] font-medium">{flagged.length} CSR figure year(s) flagged, not saved</p>
            <ul className="space-y-1">
              {flagged.map((f, i) => (
                <li key={i}>
                  <span className="font-medium">{f.fy}</span>
                  {f.reviewReason && <span className="text-muted-foreground"> — {f.reviewReason}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {skipped.length > 0 && (
          <div className="rounded-lg border bg-surface p-3 text-xs">
            <p className="mb-1.5 text-[13px] font-medium">{skipped.length} row(s) skipped</p>
            <ul className="space-y-1">
              {skipped.slice(0, 50).map((x, i) => (
                <li key={i}>
                  <span className="font-medium">{x.name ?? humanizeKey(x.kind)}</span>
                  <span className="text-muted-foreground"> — {x.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

function RunBody({ run, onOpenRun }: { run: StepRunDetail; onOpenRun: (id: string) => void }) {
  const credits = run.credits && Object.entries(run.credits);
  const failed = ['FAILED', 'DISPATCH_FAILED', 'TIMED_OUT'].includes(run.status);

  return (
    <div className="space-y-6 px-5 pb-8">
      {run.status === 'RUNNING' && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>In progress</span>
            {typeof run.progress === 'number' && <span className="tabular">{Math.round(run.progress)}%</span>}
          </div>
          <Progress value={run.progress ?? 0} className="h-1.5" />
        </div>
      )}

      {run.note && <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px]">{run.note}</p>}

      {(failed || run.errorMessage) && (
        <div className="space-y-2">
          <div className="flex gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-[13px]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="font-medium text-destructive">
                {run.errorMessage || STEP_STATUS[run.status]?.label || 'Something went wrong'}
              </p>
              {run.errorCode && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{run.errorCode}</p>}
            </div>
          </div>
          {run.howToContinue && (
            <div className="flex gap-2.5 rounded-lg border border-info/25 bg-info/8 px-3 py-2.5 text-[13px]">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-info" />
              <div>
                <p className="font-medium">How to continue</p>
                <p className="mt-0.5 text-muted-foreground">{run.howToContinue}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <Section title="Details">
        <DetailList
          items={[
            { label: 'Client', value: <Link href={`/clients/${run.client.id}`} className="font-medium hover:text-primary">{run.client.name}</Link> },
            {
              label: 'SPOC',
              value: run.spoc && (
                <Link href={`/spocs/${run.spoc.id}`} className="hover:text-primary">
                  {fullName(run.spoc)}
                </Link>
              ),
            },
            { label: 'Requested by', value: <PersonCell person={run.requestedBy} size="xs" /> },
            { label: 'Queued', value: fmtDateTime(run.createdAt) },
            { label: 'Started', value: run.startedAt && fmtDateTime(run.startedAt) },
            { label: 'Finished', value: run.finishedAt && fmtDateTime(run.finishedAt) },
            { label: 'Duration', value: run.startedAt && fmtDuration(run.startedAt, run.finishedAt) },
            { label: 'Cost', value: run.costUsd !== null && fmtUsd(run.costUsd) },
          ]}
        />
      </Section>

      <Section title="Result">
        <ResultSummary value={run.resultSummary} />
      </Section>

      <ReviewItems value={run.viewData} />

      {credits && credits.length > 0 && (
        <Section title="Credits used">
          <ul className="flex flex-wrap gap-2">
            {credits.map(([k, v]) => (
              <li key={k} className="inline-flex items-center gap-1.5 rounded-lg border bg-surface px-2.5 py-1 text-xs">
                <Coins className="size-3.5 text-warning" />
                <span className="text-muted-foreground">{humanizeKey(k)}</span>
                <span className="tabular font-medium">{fmtNumber(v)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {run.childRuns?.length > 0 && (
        <Section title={`Child runs (${run.childRuns.length})`}>
          <ul className="divide-y rounded-lg border">
            {run.childRuns.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpenRun(c.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.step?.label ?? 'Step'}</span>
                    <span className="block text-xs text-muted-foreground">{fmtRelative(c.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StepRunBadge status={c.status} />
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Timeline">
        {run.events?.length ? (
          <ol className="relative space-y-4 border-l pl-5">
            {run.events.map((e, i) => {
              const tone = e.toStatus ? STEP_STATUS[e.toStatus]?.tone : undefined;
              return (
                <li key={e.id} className="relative">
                  <span
                    className={cn(
                      'absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-popover',
                      tone === 'success' ? 'bg-success'
                      : tone === 'danger' ? 'bg-destructive'
                      : tone === 'info' ? 'bg-info'
                      : tone === 'warning' ? 'bg-warning'
                      : i === run.events.length - 1 ? 'bg-primary' : 'bg-muted-foreground/40'
                    )}
                  />
                  <p className="text-[13px]">{e.message}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span title={fmtDateTime(e.createdAt)}>{fmtDateTime(e.createdAt)}</span>
                    {e.toStatus && e.fromStatus !== e.toStatus && (
                      <>
                        <span>·</span>
                        {e.fromStatus && <span>{STEP_STATUS[e.fromStatus]?.label ?? e.fromStatus} →</span>}
                        <span className="font-medium text-foreground/80">{STEP_STATUS[e.toStatus]?.label ?? e.toStatus}</span>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        )}
      </Section>
    </div>
  );
}

export function RunSheet({
  runId,
  onOpenChange,
  onOpenRun,
}: {
  runId: string | null;
  onOpenChange: (open: boolean) => void;
  onOpenRun: (id: string) => void;
}) {
  const { data: run, isLoading, error, refetch } = useQuery({
    queryKey: ['step-runs', 'detail', runId],
    queryFn: () => pipelineApi.run(runId!),
    enabled: !!runId,
    refetchInterval: q => (q.state.data && isActive(q.state.data.status) ? 5000 : false),
  });
  const { can } = usePermissions();
  const confirm = useConfirm();
  const stop = useAction(pipelineApi.stop, { success: 'Stop requested', invalidate: [['step-runs']] });

  return (
    <Sheet open={!!runId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader className="sticky top-0 z-10 border-b bg-popover/95 px-5 py-4 backdrop-blur">
          {isLoading || !run ? (
            <>
              <SheetTitle className="sr-only">Pipeline run</SheetTitle>
              <SheetDescription className="sr-only">Loading run details</SheetDescription>
              {isLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <SheetTitle className="text-base font-semibold">{run.step?.label ?? 'Pipeline run'}</SheetTitle>
                <StepRunBadge status={run.status} />
                <Pill tone="neutral" dot={false}>
                  {run.step?.target === 'SPOC' ? 'SPOC step' : 'Client step'}
                </Pill>
                {isActive(run.status) && can('step_runs.cancel') && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="ml-auto"
                    disabled={stop.isPending}
                    onClick={async () => {
                      if (await confirm({ title: 'Stop this run?', description: 'What it has already found is kept.', confirmLabel: 'Stop' }))
                        stop.mutate(run.id);
                    }}
                  >
                    <Square /> Stop
                  </Button>
                )}
              </div>
              <SheetDescription>
                {run.client?.name}
                {run.spoc ? ` · ${fullName(run.spoc)}` : ''} · {fmtRelative(run.createdAt)}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="pt-5">
          {isLoading ? (
            <div className="space-y-4 px-5">
              <Skeleton className="h-16" />
              <Skeleton className="h-40" />
              <Skeleton className="h-32" />
            </div>
          ) : error ? (
            error instanceof ApiError && error.status === 404 ? (
              <EmptyState
                compact
                icon={SearchX}
                title="Run not found"
                description="It doesn’t exist or it’s outside the runs you can see."
              />
            ) : (
              <ErrorState error={error} onRetry={() => refetch()} />
            )
          ) : run ? (
            <RunBody run={run} onOpenRun={onOpenRun} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
