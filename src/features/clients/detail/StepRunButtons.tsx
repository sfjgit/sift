// File: StepRunButtons.tsx
// Path: src/features/clients/detail/StepRunButtons.tsx
//
// The pipeline's run buttons, wherever they belong on the client page: all of
// them on top, and in each section the steps that fill it (Branch offices →
// Find offices, SPOCs → Report SPOCs / LinkedIn / Apollo / Validate …). Each
// button shows how its last run went. Clicking opens the same run dialog as the
// Pipeline section, so every rule still applies there (permissions, re-run
// dates, run slots, offline engine).

'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Play, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isActive } from '@/app/(app)/pipeline-runs/_components/runFormat';
import { usePermissions } from '@/features/auth/usePermissions';
import { STEP_META } from '@/features/pipeline/stepMeta';
import { pipelineApi } from '@/lib/api/endpoints';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StepOverviewRow } from '@/types/crm';

export const STEP_SHORT: Record<string, string> = {
  run_all: 'Run all steps',
  reports: 'Reports',
  report_spocs: 'Report SPOCs',
  figures: 'CSR figures',
  enrich: 'LinkedIn',
  apollo: 'Apollo',
  validate: 'Validate',
  emails: 'Emails',
  branches: 'Find offices',
};

/** every step, in the order the pipeline runs them */
export const ALL_STEP_KEYS = [
  'reports',
  'report_spocs',
  'figures',
  'enrich',
  'apollo',
  'validate',
  'emails',
  'branches',
];

const dot = (s: StepOverviewRow) => {
  const st = s.lastRun?.status;
  if (!st) return 'bg-muted-foreground/30';
  if (isActive(st)) return 'bg-info animate-pulse';
  if (st === 'DONE') return 'bg-success';
  if (st === 'EMPTY') return 'bg-warning';
  if (st === 'STOPPED') return 'bg-muted-foreground/50';
  return 'bg-destructive';
};

const hint = (s: StepOverviewRow) => {
  const last = s.lastRun
    ? `Last run ${fmtRelative(s.lastRun.createdAt)} — ${s.lastRun.status.toLowerCase().replace(/_/g, ' ')}`
    : 'Not run yet';
  const blocked = s.rerunBlocked ? ` · ${s.rerunBlocked.message}` : '';
  const off = s.service.isActive ? '' : ' · the engine is switched off';
  return `${STEP_META[s.key]?.description ?? s.label}\n${last}${blocked}${off}`;
};

export function useStepOverview(clientId: string) {
  return useQuery({
    queryKey: ['step-runs', 'overview', clientId],
    queryFn: () => pipelineApi.overview(clientId),
  });
}

export function StepRunButtons({
  clientId,
  keys,
  onRun,
  withRunAll = false,
  label,
  className,
  onColor = false,
}: {
  clientId: string;
  keys: string[];
  onRun: (stepKey: string) => void;
  withRunAll?: boolean;
  /** a caption before the buttons (the top bar says "Pipeline") */
  label?: React.ReactNode;
  className?: string;
  /** white pills, for a coloured bar */
  onColor?: boolean;
}) {
  const { can } = usePermissions();
  const q = useStepOverview(clientId);
  if (!can('step_runs.run') || !q.data) return null;

  const byKey = new Map(q.data.steps.map(s => [s.key, s]));
  const runAll = withRunAll ? byKey.get('run_all') : undefined;
  const steps = keys
    .map(k => byKey.get(k))
    .filter((s): s is StepOverviewRow => !!s)
    .filter(s => s.key !== 'emails' || can('outreach.generate'));
  if (!steps.length && !runAll) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} data-no-row-click>
      {label && (
        <span className="mr-1.5 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      )}
      {runAll && (
        <Button
          size="sm"
          className="h-7 rounded-full px-3 text-[12.5px] shadow-sm"
          onClick={() => onRun('run_all')}
          disabled={
            !runAll.service.isActive || (!!runAll.lastRun && isActive(runAll.lastRun.status))
          }
          title={hint(runAll)}
        >
          {runAll.lastRun && isActive(runAll.lastRun.status) ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Rocket />
          )}
          {STEP_SHORT.run_all}
        </Button>
      )}
      {steps.map(s => {
        const Icon = STEP_META[s.key]?.icon;
        const running = !!s.lastRun && isActive(s.lastRun.status);
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onRun(s.key)}
            disabled={!s.service.isActive || running}
            title={hint(s)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border pr-2.5 pl-1 text-[12.5px] font-semibold shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
              onColor
                ? 'border-white/50 bg-white/15 text-white hover:bg-white hover:text-slate-900'
                : 'border-primary/30 bg-primary/8 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground'
            )}
          >
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full',
                onColor ? 'bg-white text-slate-900' : 'bg-primary text-primary-foreground'
              )}
            >
              {running ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play className="size-2.5! translate-x-px fill-current" />
              )}
            </span>
            {Icon && <Icon />}
            {STEP_SHORT[s.key] ?? s.label}
            <span className={cn('size-1.5 rounded-full', dot(s))} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
