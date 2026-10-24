// File: RunSheet.tsx
// Path: src/app/(app)/pipeline-runs/_components/RunSheet.tsx
//
// Right-hand detail for one step run: what happened, why it failed and what
// to do next, the result, credits used, child runs and the event timeline.
// Polls while the run is still queued / running.

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Coins, Lightbulb, SearchX } from 'lucide-react';
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
import type { StepRunDetail } from '@/types/crm';
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

function ResultSummary({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-sm text-muted-foreground">No result recorded.</p>;
  const flat = isPlainObject(value) && Object.values(value).every(v => !isPlainObject(v) || Object.keys(v).length <= 3);
  if (flat && Object.keys(value).length) {
    return (
      <div className="rounded-lg border bg-surface p-3">
        <DetailList items={Object.entries(value).map(([k, v]) => ({ label: humanizeKey(k), value: renderValue(v) }))} />
      </div>
    );
  }
  return (
    <pre className="max-h-80 overflow-auto rounded-lg border bg-surface p-3 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
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
