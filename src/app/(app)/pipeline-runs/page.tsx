// File: page.tsx
// Path: src/app/(app)/pipeline-runs/page.tsx
//
// Read-only log of pipeline step runs (enrichment, validation…). Runs are
// started from the pipeline service; this page explains what happened.
// Notifications deep-link here with ?run=<id>, which opens the run sheet.

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/common/PageHeader';
import { STEP_STATUS } from '@/components/common/badges';
import { PersonCell } from '@/components/common/UserAvatar';
import { DataTable, useTableState, type DataColumn, type FilterDef } from '@/components/data-table';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { pipelineApi } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/resource';
import { fmtDateTime, fmtRelative, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ListParams } from '@/types/api';
import type { PipelineStep, StepRun, StepRunStatus } from '@/types/crm';
import { RunSheet } from './_components/RunSheet';
import { RunStatus, fmtDuration, fmtUsd, isActive } from './_components/runFormat';

const FILTER_KEYS = ['status', 'stepId', 'clientId', 'requestedById'];

// /step-runs has no search or sort — strip them so the cache key stays honest
const toApiParams = (p: ListParams): ListParams => {
  const out = { ...p };
  delete out.search;
  delete out.sortBy;
  delete out.sortDir;
  return out;
};

const columns: DataColumn<StepRun>[] = [
  {
    id: 'step',
    accessorFn: r => r.step?.label ?? '',
    header: 'Step',
    meta: { label: 'Step', locked: true },
    cell: ({ row }) => (
      <span className="block min-w-[160px]">
        <span className="block font-medium">{row.original.step?.label ?? '—'}</span>
        <span className="block text-xs text-muted-foreground">
          {row.original.step?.target === 'SPOC' ? 'SPOC step' : 'Client step'}
          {row.original._count?.childRuns ? ` · ${row.original._count.childRuns} child runs` : ''}
        </span>
      </span>
    ),
  },
  {
    id: 'client',
    accessorFn: r => r.client?.name ?? '',
    header: 'Client',
    meta: { label: 'Client' },
    cell: ({ row }) =>
      row.original.client ? (
        <Link
          href={`/clients/${row.original.client.id}`}
          className="whitespace-nowrap hover:text-primary"
        >
          {row.original.client.name}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'spoc',
    accessorFn: r => (r.spoc ? fullName(r.spoc) : ''),
    header: 'SPOC',
    meta: { label: 'SPOC' },
    cell: ({ row }) =>
      row.original.spoc ? (
        <Link
          href={`/spocs/${row.original.spoc.id}`}
          className="whitespace-nowrap hover:text-primary"
        >
          {fullName(row.original.spoc)}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'status',
    accessorFn: r => STEP_STATUS[r.status]?.label ?? r.status,
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => <RunStatus status={row.original.status} progress={row.original.progress} />,
  },
  {
    id: 'requestedBy',
    accessorFn: r => fullName(r.requestedBy),
    header: 'Requested by',
    meta: { label: 'Requested by' },
    cell: ({ row }) => <PersonCell person={row.original.requestedBy} size="xs" />,
  },
  {
    id: 'startedAt',
    accessorFn: r => fmtDateTime(r.startedAt ?? r.createdAt),
    header: 'Started',
    meta: { label: 'Started' },
    cell: ({ row }) => {
      const at = row.original.startedAt ?? row.original.createdAt;
      return (
        <span className="whitespace-nowrap text-muted-foreground" title={fmtDateTime(at)}>
          {row.original.startedAt ? fmtRelative(at) : `Queued ${fmtRelative(at)}`}
        </span>
      );
    },
  },
  {
    id: 'duration',
    accessorFn: r => fmtDuration(r.startedAt, r.finishedAt),
    header: 'Duration',
    meta: { label: 'Duration', align: 'right' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {fmtDuration(row.original.startedAt, row.original.finishedAt)}
      </span>
    ),
  },
  {
    id: 'cost',
    accessorFn: r => (r.costUsd === null ? '' : Number(r.costUsd)),
    header: 'Cost',
    meta: { label: 'Cost (USD)', align: 'right' },
    cell: ({ row }) => <span className="font-medium">{fmtUsd(row.original.costUsd)}</span>,
  },
  {
    id: 'error',
    accessorFn: r => r.errorMessage ?? '',
    header: 'Error',
    meta: { label: 'Error', defaultHidden: true },
    cell: ({ row }) => (
      <span className="block max-w-[260px] truncate text-xs text-destructive">
        {row.original.errorMessage ?? ''}
      </span>
    ),
  },
];

function StepsStrip({ steps, isLoading }: { steps?: PipelineStep[]; isLoading: boolean }) {
  if (isLoading)
    return (
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-32 rounded-full" />
        ))}
      </div>
    );
  if (!steps?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Configured steps</span>
      {steps.map(s => {
        const health = !s.service.isActive
          ? 'paused'
          : s.service.lastHealthOk === null
            ? 'unknown'
            : s.service.lastHealthOk
              ? 'ok'
              : 'down';
        const label = {
          ok: 'Service healthy',
          down: 'Service failing health checks',
          unknown: 'Health not checked yet',
          paused: 'Service paused',
        }[health];
        return (
          <Tooltip key={s.id}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-label={label}
                  className={cn(
                    'size-1.5 rounded-full',
                    health === 'ok' && 'bg-success',
                    health === 'down' && 'bg-destructive',
                    health === 'unknown' && 'bg-muted-foreground/50',
                    health === 'paused' && 'bg-warning'
                  )}
                />
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">
                  {s.target === 'SPOC' ? 'SPOC' : 'Client'}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {s.service.name} — {label}
              {s.userClientLimit ? ` · limit ${s.userClientLimit} clients per user` : ''}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

const initialRun = () =>
  typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('run');

function PipelineRunsPage() {
  // read before useTableState rewrites the URL with its own keys
  const [runId, setRunId] = useState<string | null>(initialRun);
  const table = useTableState('step_runs', FILTER_KEYS);
  const params = useMemo(() => toApiParams(table.params), [table.params]);

  const steps = useQuery({
    queryKey: ['pipeline-steps'],
    queryFn: () => pipelineApi.steps(),
    staleTime: 60_000,
  });
  const query = useQuery({
    queryKey: ['step-runs', 'list', params],
    queryFn: () => pipelineApi.runs(params),
    placeholderData: keepPreviousData,
    // keep live while anything on screen is still moving
    refetchInterval: q => (q.state.data?.data.some(r => isActive(r.status)) ? 5000 : false),
  });

  const filters = useMemo<FilterDef[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        multi: true,
        options: (Object.keys(STEP_STATUS) as StepRunStatus[]).map(s => ({
          value: s,
          label: STEP_STATUS[s].label,
        })),
      },
      {
        key: 'stepId',
        label: 'Step',
        type: 'select',
        multi: true,
        options: (steps.data ?? []).map(s => ({ value: s.id, label: s.label })),
      },
      { key: 'clientId', label: 'Client', type: 'client' },
      { key: 'requestedById', label: 'Requested by', type: 'user', multi: true },
    ],
    [steps.data]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pipeline runs"
        description="Enrichment and validation jobs for your clients and SPOCs — status, results, cost and what to do when one fails."
      >
        <StepsStrip steps={steps.data} isLoading={steps.isLoading} />
      </PageHeader>

      <DataTable
        id="step_runs"
        table={table}
        query={query}
        columns={columns}
        filters={filters}
        searchable={false}
        onRowClick={r => setRunId(r.id)}
        fetchAll={p => fetchAllPages(pipelineApi.runs, toApiParams(p))}
        exportName="pipeline-runs"
        empty={{
          title: 'No runs yet',
          description:
            'Runs are started from the pipeline service (the step buttons on a client or SPOC). Each one shows up here with its progress, result and cost.',
        }}
      />

      <RunSheet runId={runId} onOpenChange={o => !o && setRunId(null)} onOpenRun={setRunId} />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="step_runs.read">
      <PipelineRunsPage />
    </RequirePermission>
  );
}
