// File: PipelinePanel.tsx
// Path: src/features/pipeline/PipelinePanel.tsx
//
// Client → Pipeline tab: what the CRM already holds, one card per step with
// its last run and a Run button, "Run all steps", and the run history.
// Polls while anything is queued or running; results land in the CRM tabs.

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleHelp, Play, Rocket, Square, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StepRunBadge } from '@/components/common/badges';
import { ErrorState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { RunsList } from '@/features/clients/detail/RunsList';
import { RunSheet } from '@/app/(app)/pipeline-runs/_components/RunSheet';
import { isActive } from '@/app/(app)/pipeline-runs/_components/runFormat';
import { useAction } from '@/hooks/useResource';
import { pipelineApi } from '@/lib/api/endpoints';
import { fmtDate, fmtNumber, fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StepOverview } from '@/types/crm';
import { RunStepDialog } from './RunStepDialog';
import { DoneNotice, fullSlot, needsMissing, SlotChips, slotText } from './runRules';
import { STEP_META } from './stepMeta';

type Step = StepOverview['steps'][number];

const POLL_MS = 5000;

function StepCard({
  step,
  counts,
  canRun,
  canRerun,
  canStop,
  onRun,
  onStop,
  onOpen,
}: {
  step: Step;
  counts: StepOverview['counts'];
  canRun: boolean;
  canRerun: boolean;
  canStop: boolean;
  onRun: () => void;
  onStop: (runId: string) => void;
  onOpen: (runId: string) => void;
}) {
  const meta = STEP_META[step.key];
  const Icon = meta?.icon ?? Play;
  const last = step.lastRun;
  const running = !!last && isActive(last.status);
  const full = fullSlot(step);
  // done recently with nothing new: only an admin may run it again
  const doneBlock = step.rerunBlocked && !canRerun ? 'Already done — nothing new since' : null;
  const missing = needsMissing(step, counts) ?? (full ? slotText(full) : null) ?? doneBlock;
  const blocked = missing !== null;

  return (
    <li className="flex flex-col rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{step.label}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{meta?.description}</p>
        </div>
      </div>

      <div className="mt-3 min-h-10 flex-1">
        {last ? (
          <button
            type="button"
            onClick={() => onOpen(last.id)}
            className="w-full space-y-1.5 text-left"
          >
            <span className="flex items-center gap-2">
              <StepRunBadge status={last.status} />
              <span className="text-xs text-muted-foreground">{fmtRelative(last.createdAt)}</span>
            </span>
            {running && last.progress !== null && (
              <span className="block h-1.5 overflow-hidden rounded-full bg-info/15">
                <span
                  className="block h-full rounded-full bg-info transition-all"
                  style={{ width: `${last.progress}%` }}
                />
              </span>
            )}
            <span className="line-clamp-1 block text-xs text-muted-foreground hover:text-foreground">
              {last.errorMessage ?? last.note}
            </span>
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">Never run for this client.</p>
        )}
        {step.done && (!last || last.id !== step.done.runId || !step.done.byMe) && (
          <div className="mt-2">
            <DoneNotice step={step} compact />
          </div>
        )}
        {step.done && last?.id === step.done.runId && step.done.byMe && step.rerunBlocked && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Can run again from {fmtDate(step.rerunBlocked.until)}
          </p>
        )}
        <SlotChips slots={step.slots} className="mt-2" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs',
            missing
              ? doneBlock && missing === doneBlock
                ? 'text-success'
                : 'text-warning'
              : 'text-transparent'
          )}
        >
          {missing ?? '.'}
        </span>
        {running
          ? canStop && (
              <Button size="sm" variant="outline" onClick={() => onStop(last!.id)}>
                <Square /> Stop
              </Button>
            )
          : canRun && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRun}
                disabled={blocked || !step.service.isActive}
              >
                <Play /> {step.rerunBlocked ? 'Run again' : 'Run'}
              </Button>
            )}
      </div>
    </li>
  );
}

export function PipelinePanel({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { can } = usePermissions();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [dialogStep, setDialogStep] = useState<Step | null>(null);
  // notifications deep-link with ?tab=pipeline&run=<id>
  const [openRun, setOpenRun] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('run')
  );

  const q = useQuery({
    queryKey: ['step-runs', 'overview', clientId],
    queryFn: () => pipelineApi.overview(clientId),
    refetchInterval: query =>
      query.state.data?.steps.some(s => s.lastRun && isActive(s.lastRun.status)) ? POLL_MS : false,
  });

  const stop = useAction(pipelineApi.stop, {
    success: 'Stop requested',
    invalidate: [['step-runs']],
  });

  if (q.isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { counts, steps, canRerun } = q.data;
  const runAll = steps.find(s => s.key === 'run_all');
  const cards = steps.filter(s => s.key !== 'run_all');
  const offline = steps.some(s => s.service.lastHealthOk === false);
  const anyRunning = steps.some(s => s.lastRun && isActive(s.lastRun.status));
  const canRun = can('step_runs.run');
  const canRunEmails = canRun && can('outreach.generate');

  const askStop = async (runId: string) => {
    if (
      await confirm({
        title: 'Stop this run?',
        description: 'What it has already found is kept.',
        confirmLabel: 'Stop',
      })
    )
      stop.mutate(runId);
  };

  const stats = [
    { label: 'Your SPOCs', value: counts.mySpocs },
    { label: 'Your approved', value: counts.myApprovedSpocs },
    ...(counts.othersSpocs ? [{ label: 'Others’ SPOCs', value: counts.othersSpocs }] : []),
    { label: 'Reports', value: counts.documents },
    { label: 'CSR years', value: counts.financials },
    { label: 'Programs', value: counts.programs },
    { label: 'Outreach packs', value: counts.outreachPacks },
  ];

  return (
    <div className="space-y-5">
      {offline && (
        <div className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2.5 text-[13px]">
          <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            The CSR pipeline did not answer its last health check. Runs are queued and sent as soon
            as it is back.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-lg border bg-card px-3 py-1.5 shadow-card">
              <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
              <dd className="text-sm font-semibold tabular">{fmtNumber(s.value)}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/help/pipeline">
              <CircleHelp /> How it works
            </Link>
          </Button>
          {runAll && canRun && (
            <Button onClick={() => setDialogStep(runAll)} disabled={!runAll.service.isActive}>
              <Rocket /> Run all steps
            </Button>
          )}
        </div>
      </div>

      {anyRunning && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-info" /> Steps run one at a time on the pipeline;
          this page updates by itself.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(s => (
          <StepCard
            key={s.id}
            step={s}
            counts={counts}
            canRun={s.key === 'emails' ? canRunEmails : canRun}
            canRerun={canRerun}
            canStop={can('step_runs.cancel')}
            onRun={() => setDialogStep(s)}
            onStop={askStop}
            onOpen={setOpenRun}
          />
        ))}
      </ul>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          History
        </h3>
        <RunsList clientId={clientId} onOpen={setOpenRun} />
      </section>

      <RunStepDialog
        key={dialogStep?.id ?? 'none'}
        clientId={clientId}
        clientName={clientName}
        step={dialogStep}
        steps={steps}
        counts={counts}
        canRerun={canRerun}
        open={!!dialogStep}
        onOpenChange={o => !o && setDialogStep(null)}
        onStarted={r => {
          void qc.invalidateQueries({ queryKey: ['step-runs', 'overview', clientId] });
          setOpenRun(r.id);
        }}
      />
      <RunSheet runId={openRun} onOpenChange={o => !o && setOpenRun(null)} onOpenRun={setOpenRun} />
    </div>
  );
}
