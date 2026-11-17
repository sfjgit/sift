// File: RunResults.tsx
// Path: src/features/pipeline/RunResults.tsx
//
// The results of one run (the page a finished run opens): every row the run
// touched, marked —
//   New            a row the CRM did not have
//   Changed        values replaced, old → new
//   Already there  found again, nothing to change
//   Kept CRM value the engine said something else; the CRM value stays (see "Needs a look")
//   Locked         a person entered / corrected it, so the engine leaves it alone
// Offices also list the ones already on file that this run did not find.
// "Run all steps" shows each step's results in turn.

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileText,
  IndianRupee,
  Lock,
  Mail,
  MapPin,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill, StepRunBadge, type Tone } from '@/components/common/badges';
import { EmptyState, ErrorState } from '@/components/common/states';
import { PageHeader } from '@/components/common/PageHeader';
import { clientHooks } from '@/hooks/queries';
import { pipelineApi } from '@/lib/api/endpoints';
import { fmtDateTime, fmtInr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ReviewItems } from '@/app/(app)/pipeline-runs/_components/RunSheet';
import { humanizeKey, isActive } from '@/app/(app)/pipeline-runs/_components/runFormat';
import type {
  ClientLocation,
  RunChange,
  RunChangeKind,
  RunChangeType,
  RunViewData,
  StepRunDetail,
} from '@/types/crm';

const MARK: Record<RunChangeType, { label: string; tone: Tone; row: string }> = {
  added: { label: 'New', tone: 'success', row: 'bg-success/[0.06]' },
  updated: { label: 'Changed', tone: 'info', row: 'bg-info/[0.06]' },
  same: { label: 'Already there', tone: 'neutral', row: '' },
  kept: { label: 'Kept CRM value', tone: 'warning', row: 'bg-warning/[0.05]' },
  locked: { label: 'Locked', tone: 'neutral', row: '' },
};

const KIND: Record<
  RunChangeKind,
  { title: string; icon: LucideIcon; tab: string; href?: (id: string) => string }
> = {
  offices: { title: 'Offices', icon: Building2, tab: 'branches' },
  spocs: { title: 'SPOCs', icon: UsersRound, tab: 'spocs', href: id => `/spocs/${id}` },
  financials: { title: 'CSR figures', icon: IndianRupee, tab: 'skilling' },
  programs: { title: 'CSR programmes', icon: ClipboardList, tab: 'skilling' },
  documents: { title: 'Reports', icon: FileText, tab: 'reports' },
  outreach: { title: 'Email packs', icon: Mail, tab: 'outreach' },
};
const ORDER: RunChangeKind[] = ['offices', 'spocs', 'financials', 'programs', 'documents', 'outreach'];

const FIELD: Record<string, string> = {
  obligationRs: 'Obligation',
  budgetRs: 'Budget',
  spentRs: 'Spent',
  unspentRs: 'Unspent',
  unspentTransferredRs: 'Unspent transferred',
  sectorText: 'Sector',
  locationNote: 'Locations',
  isOngoing: 'Ongoing',
  isLocalArea: 'Local area',
  linkedinUrl: 'LinkedIn',
  totalExpYears: 'Experience (yrs)',
  currentOrgExpYears: 'Years at company',
  lastName: 'Last name',
};
const fieldLabel = (f: string) => FIELD[f] ?? humanizeKey(f);
const show = (field: string, v: string | null) =>
  v === null ? '—' : field.endsWith('Rs') ? fmtInr(v) : v;

type Filter = 'all' | 'new' | 'changed' | 'same';
const inFilter = (c: RunChange, f: Filter) =>
  f === 'all' ||
  (f === 'new' && c.change === 'added') ||
  (f === 'changed' && (c.change === 'updated' || c.change === 'kept')) ||
  (f === 'same' && (c.change === 'same' || c.change === 'locked'));

function FieldDiffs({ c }: { c: RunChange }) {
  const fields = c.fields ?? [];
  if (!fields.length) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-xs">
      {fields.map(f => (
        <li key={f.field} className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-muted-foreground">{fieldLabel(f.field)}:</span>
          {c.change === 'kept' ? (
            <>
              <span className="font-medium">{show(f.field, f.from)}</span>
              <span className="text-muted-foreground">
                kept — engine found {show(f.field, f.to)}
              </span>
            </>
          ) : c.change === 'locked' ? (
            <span className="text-muted-foreground">
              engine found {show(f.field, f.to)}, kept {show(f.field, f.from)}
            </span>
          ) : f.from === null ? (
            <span className="font-medium text-success">{show(f.field, f.to)} (filled in)</span>
          ) : (
            <>
              <span className="text-destructive/80 line-through">{show(f.field, f.from)}</span>
              <ArrowRight className="size-3 self-center text-muted-foreground" />
              <span className="font-medium text-success">{show(f.field, f.to)}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function Row({ c, kind }: { c: RunChange; kind: RunChangeKind }) {
  const m = MARK[c.change];
  const href = c.id ? KIND[kind].href?.(c.id) : undefined;
  return (
    <li className={cn('flex items-start gap-3 px-3 py-2', m.row)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {href ? (
            <Link href={href} className="text-[14px] font-medium hover:text-primary">
              {c.label}
            </Link>
          ) : (
            <span className="text-[14px] font-medium">{c.label}</span>
          )}
          {c.sub && <span className="text-xs text-muted-foreground">{c.sub}</span>}
        </div>
        <FieldDiffs c={c} />
      </div>
      <Pill tone={m.tone} className="shrink-0">
        {c.change === 'locked' && <Lock className="size-3" />}
        {m.label}
      </Pill>
    </li>
  );
}

const officeLine = (l: ClientLocation) =>
  [l.addressLine, l.city, l.state, l.pincode].filter(Boolean).join(', ');

/** offices already on file that this run did not find */
function OtherOffices({ clientId, touched }: { clientId: string; touched: Set<string> }) {
  const [open, setOpen] = useState(false);
  const { data } = clientHooks.useDetail(clientId);
  const rest = (data?.locations ?? []).filter(l => l.isActive && !touched.has(l.id));
  if (!rest.length) return null;
  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 text-left text-xs font-medium text-primary hover:underline"
      >
        {open ? 'Hide' : 'Show'} {rest.length} other office{rest.length === 1 ? '' : 's'} already
        on file (not found this time)
      </button>
      {open && (
        <ul className="divide-y border-t">
          {rest.map(l => (
            <li key={l.id} className="flex items-start gap-3 px-3 py-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <div className="min-w-0 flex-1 text-[13px]">
                <span className="font-medium text-foreground">
                  {l.name ?? l.type?.label ?? 'Office'}
                </span>{' '}
                <span className="text-xs">{officeLine(l)}</span>
              </div>
              <Pill tone="neutral" className="shrink-0">
                On file
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Counts({ changes }: { changes: RunChange[] }) {
  const n = (t: RunChangeType) => changes.filter(c => c.change === t).length;
  const items: [string, number, Tone][] = [
    ['new', n('added'), 'success'],
    ['changed', n('updated'), 'info'],
    ['already there', n('same'), 'neutral'],
    ['kept CRM value', n('kept'), 'warning'],
    ['locked', n('locked'), 'neutral'],
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items
        .filter(([, v]) => v > 0)
        .map(([l, v, tone]) => (
          <Pill key={l} tone={tone}>
            <span className="font-semibold tabular-nums">{v}</span> {l}
          </Pill>
        ))}
    </div>
  );
}

/** one run's changes, grouped by what they are */
function RunChanges({ run }: { run: StepRunDetail }) {
  const [filter, setFilter] = useState<Filter>('all');
  const view = (run.viewData ?? {}) as RunViewData;
  const changes = view.changes;
  const clientId = run.client.id;

  const groups = useMemo(
    () =>
      ORDER.map(kind => ({
        kind,
        all: (changes ?? []).filter(c => c.kind === kind),
      })).filter(g => g.all.length),
    [changes]
  );

  if (isActive(run.status))
    return <p className="text-sm text-muted-foreground">Still running — results appear here when it finishes.</p>;

  if (!changes)
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {run.note ?? 'Finished.'} This run finished before change marking was added — the
          details are in the run sheet.
        </p>
        <ReviewItems value={run.viewData} />
      </div>
    );

  if (!changes.length)
    return (
      <div className="space-y-3">
        <EmptyState
          compact
          title={run.status === 'DONE' ? 'Nothing was added or changed' : (run.note ?? 'No results')}
          description={run.errorMessage ?? run.howToContinue ?? undefined}
        />
        <ReviewItems value={run.viewData} />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Counts changes={changes} />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'new', label: 'New' },
            { value: 'changed', label: 'Changed' },
            { value: 'same', label: 'Unchanged' },
          ]}
        />
      </div>

      {groups.map(({ kind, all }) => {
        const rows = all.filter(c => inFilter(c, filter));
        const k = KIND[kind];
        const added = all.filter(c => c.change === 'added').length;
        const changed = all.filter(c => c.change === 'updated').length;
        return (
          <section key={kind} className="overflow-hidden rounded-xl border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-surface px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <k.icon className="size-4 text-primary" /> {k.title}
                <span className="text-xs font-normal text-muted-foreground">
                  {[added && `${added} new`, changed && `${changed} changed`, `${all.length} in this run`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <Link
                href={`/clients/${clientId}?tab=${k.tab}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open on the client <ArrowRight className="size-3" />
              </Link>
            </header>
            {rows.length ? (
              <ul className="divide-y">
                {rows.map((c, i) => (
                  <Row key={`${c.id ?? c.label}-${i}`} c={c} kind={kind} />
                ))}
              </ul>
            ) : (
              <p className="px-3 py-3 text-xs text-muted-foreground">Nothing in this filter.</p>
            )}
            {kind === 'offices' && filter === 'all' && (
              <OtherOffices
                clientId={clientId}
                touched={new Set(all.map(c => c.id).filter((id): id is string => !!id))}
              />
            )}
          </section>
        );
      })}

      <ReviewItems value={run.viewData} />
    </div>
  );
}

const runKey = (id: string) => ['step-runs', 'detail', id];

export function RunResults({ runId }: { runId: string }) {
  const q = useQuery({
    queryKey: runKey(runId),
    queryFn: () => pipelineApi.run(runId),
    refetchInterval: s => (s.state.data && isActive(s.state.data.status) ? 5000 : false),
  });
  const run = q.data;
  const children = useQueries({
    queries: (run?.childRuns ?? []).map(c => ({
      queryKey: runKey(c.id),
      queryFn: () => pipelineApi.run(c.id),
      refetchInterval: isActive(c.status) ? 5000 : (false as const),
    })),
  });

  if (q.isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (q.error || !run) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${run.step.label} — results`}
        crumbs={[
          { label: 'Pipeline runs', href: '/pipeline-runs' },
          { label: run.client.name, href: `/clients/${run.client.id}` },
        ]}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/clients/${run.client.id}`}>Open {run.client.name}</Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StepRunBadge status={run.status} />
          <span>{run.note}</span>
          {run.finishedAt && <span>· finished {fmtDateTime(run.finishedAt)}</span>}
        </div>
      </PageHeader>

      {run.childRuns.length ? (
        run.childRuns.map((c, i) => {
          const d = children[i]?.data;
          return (
            <div key={c.id} className="space-y-2">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                {c.step.label} <StepRunBadge status={c.status} />
              </h2>
              {d ? <RunChanges run={d} /> : <Skeleton className="h-24 w-full" />}
            </div>
          );
        })
      ) : (
        <RunChanges run={run} />
      )}
    </div>
  );
}
