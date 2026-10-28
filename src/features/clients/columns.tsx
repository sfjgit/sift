// File: columns.tsx
// Path: src/features/clients/columns.tsx

'use client';

import Link from 'next/link';
import { Eye, FileText, Globe, Mail, Play, ReceiptIndianRupee, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompanyMark } from '@/components/common/CompanyMark';
import { ClientStatusBadge, CLIENT_STATUS, Pill, StepRunBadge } from '@/components/common/badges';
import { PersonCell, UserAvatar } from '@/components/common/UserAvatar';
import { isActive } from '@/app/(app)/pipeline-runs/_components/runFormat';
import { STEP_META } from '@/features/pipeline/stepMeta';
import type { DataTab } from './ClientDataSheet';
import type { DataColumn, FilterDef } from '@/components/data-table';
import { fmtDate, fmtRelative, fullName, hostOf, placeOf } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ClientCoverage, ClientListItem } from '@/types/crm';

/** What a client is missing before the pipeline (or outreach) can do its job. */
export const clientGaps = (c: ClientListItem): string[] => {
  const v = c.coverage;
  if (!v) return [];
  return [
    !c.website && 'No website',
    !v.reports && 'No reports',
    !v.spocs && 'No SPOCs',
    v.spocs > 0 && !v.approvedSpocs && 'None approved',
    !v.figureYears && !v.programs && 'No figures',
  ].filter((g): g is string => !!g);
};

function Stat({
  icon: Icon,
  value,
  label,
  title,
  onClick,
}: {
  icon: typeof FileText;
  value: React.ReactNode;
  label?: string;
  title: string;
  /** opens the client data sheet on this tab — never the client page */
  onClick?: () => void;
}) {
  const zero = value === 0;
  const body = (
    <>
      <Icon className="size-3.5" />
      <span className={cn(!zero && 'font-medium text-foreground')}>{value}</span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </>
  );
  const cls = cn(
    'inline-flex items-center gap-1 whitespace-nowrap',
    zero && 'text-muted-foreground/60'
  );
  if (!onClick)
    return (
      <span title={title} className={cls}>
        {body}
      </span>
    );
  return (
    <button
      type="button"
      title={`${title} — click to view`}
      onClick={onClick}
      className={cn(cls, '-mx-1 rounded-md px-1 py-0.5 hover:bg-primary/10 hover:text-primary')}
    >
      {body}
    </button>
  );
}

// CASPA-style: one column per pipeline step — its latest run (anyone's) + Run
export const STEP_COLUMNS = [
  { key: 'reports', short: 'Reports' },
  { key: 'report_spocs', short: 'Report SPOCs' },
  { key: 'figures', short: 'CSR figures' },
  { key: 'enrich', short: 'LinkedIn' },
  { key: 'apollo', short: 'Apollo' },
  { key: 'validate', short: 'Validate' },
  { key: 'emails', short: 'Emails' },
] as const;

export type RunStepHandler = (c: ClientListItem, stepKey: string) => void;

function StepCell({
  c,
  stepKey,
  onRun,
}: {
  c: ClientListItem;
  stepKey: string;
  onRun?: RunStepHandler;
}) {
  const r = c.coverage?.steps[stepKey];
  const running = !!r && isActive(r.status);
  return (
    <div className="flex min-w-[132px] items-center justify-between gap-1.5" data-no-row-click>
      {r ? (
        <Link
          href={`/clients/${c.id}?tab=pipeline&run=${r.id}`}
          title={[r.note, `by ${fullName(r.requestedBy)}`].filter(Boolean).join(' — ')}
          className="flex min-w-0 flex-col gap-0.5 hover:text-primary"
        >
          <StepRunBadge status={r.status} />
          <span className="truncate text-[11px] text-muted-foreground">
            {fmtRelative(r.createdAt)} · {r.requestedBy.firstName}
          </span>
        </Link>
      ) : (
        <span className="text-xs text-muted-foreground/70">Not run</span>
      )}
      {r && !onRun && (
        <Button asChild size="icon-xs" variant="ghost" aria-label="View run">
          <Link href={`/clients/${c.id}?tab=pipeline&run=${r.id}`}>
            <Eye />
          </Link>
        </Button>
      )}
      {onRun && !running && (
        <Button
          size="icon-xs"
          variant="outline"
          aria-label={`Run step for ${c.name}`}
          title="Run this step"
          onClick={() => onRun(c, stepKey)}
        >
          <Play />
        </Button>
      )}
    </div>
  );
}

function AssigneesCell({ c }: { c: ClientListItem }) {
  if (!c.assignments.length) return <span className="text-xs text-muted-foreground">Nobody</span>;
  const [first, ...rest] = c.assignments;
  return (
    <div
      className="flex min-w-[140px] items-center gap-1.5"
      title={c.assignments.map(a => fullName(a.user)).join(', ')}
    >
      <span className="flex -space-x-1.5">
        {c.assignments.slice(0, 3).map(a => (
          <UserAvatar key={a.user.id} person={a.user} className="ring-2 ring-card" />
        ))}
      </span>
      <span className="truncate text-xs">
        {fullName(first!.user)}
        {rest.length > 0 && <span className="text-muted-foreground"> +{rest.length}</span>}
      </span>
    </div>
  );
}

export type OpenDataHandler = (c: ClientListItem, tab: DataTab) => void;

function CoverageCell({
  c,
  v,
  onOpen,
}: {
  c: ClientListItem;
  v: ClientCoverage;
  onOpen?: OpenDataHandler;
}) {
  const open = (tab: DataTab) => (onOpen ? () => onOpen(c, tab) : undefined);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" data-no-row-click>
      <Stat
        icon={FileText}
        value={v.reports}
        title={`${v.reports} report(s) downloaded`}
        onClick={open('reports')}
      />
      <Stat
        onClick={open('spocs')}
        icon={Users}
        value={v.spocs}
        label={v.spocs ? `(${v.approvedSpocs}✓)` : undefined}
        title={`${v.spocs} SPOC(s), ${v.approvedSpocs} approved for outreach`}
      />
      <Stat
        onClick={open('figures')}
        icon={ReceiptIndianRupee}
        value={v.figureYears || v.programs}
        title={`${v.figureYears} year(s) of CSR figures, ${v.programs} programme(s)`}
      />
      <Stat
        onClick={open('emails')}
        icon={Mail}
        value={v.outreachPacks}
        label={v.outreachPacks ? `(${v.outreachSent} sent)` : undefined}
        title={`${v.outreachPacks} email pack(s), ${v.outreachSent} sent`}
      />
    </div>
  );
}

const STEP_OPTIONS = STEP_COLUMNS.map(s => ({ value: s.key, label: s.short }));

export const clientFilters: FilterDef[] = [
  // ── ownership
  {
    key: 'assignedTo',
    label: 'Assignment',
    type: 'select',
    group: 'Ownership',
    options: [
      { value: 'me', label: 'Assigned to me' },
      { value: 'none', label: 'Nobody assigned' },
    ],
    hint: 'Quick switch: your clients, or clients nobody works yet.',
  },
  {
    key: 'assignedToId',
    label: 'Assigned to',
    type: 'user',
    multi: true,
    group: 'Ownership',
    hint: 'Clients assigned to any of these people.',
  },
  {
    key: 'assignedById',
    label: 'Assigned by',
    type: 'user',
    multi: true,
    group: 'Ownership',
    hint: 'Who gave the client out. With “Assigned to”, both must match the same assignment.',
  },
  {
    key: 'handlerId',
    label: 'SPOC handler',
    type: 'user',
    multi: true,
    group: 'Ownership',
    hint: 'Clients where one of these people handles an active SPOC.',
  },
  {
    key: 'createdById',
    label: 'Added by',
    type: 'user',
    multi: true,
    group: 'Ownership',
    hint: 'Who created the client.',
  },
  {
    key: 'businessUnitId',
    label: 'Business unit',
    type: 'master',
    kind: 'business-units',
    multi: true,
    group: 'Ownership',
  },
  {
    key: 'serviceLineId',
    label: 'Service line',
    type: 'master',
    kind: 'service-lines',
    multi: true,
    group: 'Ownership',
  },

  // ── company
  {
    key: 'industryId',
    label: 'Industry',
    type: 'lookup',
    lookupType: 'INDUSTRY',
    multi: true,
    group: 'Company',
  },
  {
    key: 'categoryId',
    label: 'Category',
    type: 'lookup',
    lookupType: 'CLIENT_CATEGORY',
    multi: true,
    group: 'Company',
  },
  {
    key: 'state',
    label: 'State',
    type: 'text',
    placeholder: 'e.g. Karnataka',
    group: 'Company',
    hint: 'Any active location in this state.',
  },
  { key: 'city', label: 'City', type: 'text', placeholder: 'e.g. Bengaluru', group: 'Company' },

  // ── pipeline & data
  {
    key: 'missing',
    label: 'Missing',
    type: 'select',
    multi: true,
    group: 'Pipeline & data',
    options: [
      { value: 'website', label: 'No website' },
      { value: 'reports', label: 'No reports' },
      { value: 'spocs', label: 'No SPOCs' },
      { value: 'approved', label: 'No approved SPOC' },
      { value: 'figures', label: 'No CSR figures' },
      { value: 'outreach', label: 'No outreach yet' },
    ],
    hint: 'Pick several to find clients missing all of them.',
  },
  {
    key: 'stepsDone',
    label: 'Steps done',
    type: 'select',
    multi: true,
    group: 'Pipeline & data',
    options: STEP_OPTIONS,
    hint: 'Every picked step has finished for the client.',
  },
  {
    key: 'stepsNotDone',
    label: 'Steps not done yet',
    type: 'select',
    multi: true,
    group: 'Pipeline & data',
    options: STEP_OPTIONS,
    hint: 'None of the picked steps has finished yet — the work still to do.',
  },
  {
    key: 'pipeline',
    label: 'Pipeline',
    type: 'select',
    group: 'Pipeline & data',
    options: [
      { value: 'never', label: 'Never run' },
      { value: 'run', label: 'Run at least once' },
      { value: 'failed', label: 'Has a failed run' },
    ],
  },
  {
    key: 'outreachStatus',
    label: 'Email status',
    type: 'select',
    multi: true,
    group: 'Pipeline & data',
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'REVIEWED', label: 'Reviewed' },
      { value: 'SENT', label: 'Sent' },
      { value: 'REPLIED', label: 'Replied' },
      { value: 'NO_REPLY', label: 'No reply' },
      { value: 'BOUNCED', label: 'Bounced' },
    ],
    hint: 'Clients with at least one email pack in any of these states.',
  },

  // ── dates
  { key: 'createdFrom', label: 'Added from', type: 'date', group: 'Dates' },
  { key: 'createdTo', label: 'Added until', type: 'date', group: 'Dates' },
  {
    key: 'lastRunFrom',
    label: 'Pipeline run from',
    type: 'date',
    group: 'Dates',
    hint: 'A step was started for the client in this window.',
  },
  { key: 'lastRunTo', label: 'Pipeline run until', type: 'date', group: 'Dates' },
];

/** status lives in the tabs above the table, but is still a URL / view filter */
export const clientFilterKeys = ['status', ...clientFilters.map(f => f.key)];

export const clientColumns = (
  actions?: (c: ClientListItem) => React.ReactNode,
  onRunStep?: (stepKey: string) => RunStepHandler | undefined,
  onOpenData?: OpenDataHandler
): DataColumn<ClientListItem>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Client',
    meta: { label: 'Client', sortKey: 'name', locked: true },
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex min-w-[220px] items-center gap-2.5">
          <CompanyMark name={c.name} />
          <div className="min-w-0">
            <Link
              href={`/clients/${c.id}`}
              className="block truncate font-medium hover:text-primary"
            >
              {c.name}
            </Link>
            <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {c.shortName && <span>{c.shortName}</span>}
              {c.shortName && c.website && <span>·</span>}
              {c.website && (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Globe className="size-3" />
                  {hostOf(c.website)}
                </a>
              )}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status', sortKey: 'status', exportValue: c => CLIENT_STATUS[c.status].label },
    cell: ({ row }) => <ClientStatusBadge status={row.original.status} />,
  },
  {
    id: 'industry',
    accessorFn: c => c.industry?.label ?? '',
    header: 'Industry',
    meta: { label: 'Industry' },
    cell: ({ row }) =>
      row.original.industry?.label ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: 'category',
    accessorFn: c => c.category?.label ?? '',
    header: 'Category',
    meta: { label: 'Category' },
    cell: ({ row }) =>
      row.original.category?.label ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: 'assignees',
    accessorFn: c => c.assignments.map(a => fullName(a.user)).join(', '),
    header: 'Assigned to',
    meta: { label: 'Assigned to' },
    cell: ({ row }) => <AssigneesCell c={row.original} />,
  },
  ...STEP_COLUMNS.map(
    ({ key, short }): DataColumn<ClientListItem> => ({
      id: `step_${key}`,
      accessorFn: c => {
        const r = c.coverage?.steps[key];
        return r ? `${r.status} ${fmtDate(r.createdAt)} (${fullName(r.requestedBy)})` : 'Not run';
      },
      header: () => {
        const Icon = STEP_META[key]?.icon;
        return (
          <span className="inline-flex items-center gap-1">
            {Icon && <Icon className="size-3.5" />}
            {short}
          </span>
        );
      },
      meta: { label: `Step: ${short}` },
      cell: ({ row }) => <StepCell c={row.original} stepKey={key} onRun={onRunStep?.(key)} />,
    })
  ),
  {
    id: 'coverage',
    accessorFn: c =>
      c.coverage
        ? `${c.coverage.reports} reports · ${c.coverage.spocs} SPOCs (${c.coverage.approvedSpocs} approved) · ${c.coverage.figureYears} years of figures · ${c.coverage.outreachPacks} email packs (${c.coverage.outreachSent} sent)`
        : '',
    header: 'Have',
    meta: { label: 'Have (reports · SPOCs · figures · emails)' },
    cell: ({ row }) =>
      row.original.coverage ? (
        <CoverageCell c={row.original} v={row.original.coverage} onOpen={onOpenData} />
      ) : null,
  },
  {
    id: 'missing',
    accessorFn: c => clientGaps(c).join(', '),
    header: 'Missing',
    meta: { label: 'Missing' },
    cell: ({ row }) => {
      const gaps = clientGaps(row.original);
      if (!row.original.coverage) return null;
      if (!gaps.length) return <Pill tone="success">Complete</Pill>;
      return (
        <div className="flex min-w-[150px] max-w-[220px] flex-wrap gap-1">
          {gaps.map(g => (
            <Pill key={g} tone="warning" dot={false}>
              {g}
            </Pill>
          ))}
        </div>
      );
    },
  },
  {
    id: 'lastRun',
    accessorFn: c =>
      c.coverage?.lastRun
        ? `${c.coverage.lastRun.step.label}: ${c.coverage.lastRun.status}`
        : 'Never run',
    header: 'Last run',
    meta: { label: 'Last pipeline run', defaultHidden: true },
    cell: ({ row }) => {
      const r = row.original.coverage?.lastRun;
      if (!row.original.coverage) return null;
      if (!r) return <span className="text-xs text-muted-foreground">Never run</span>;
      return (
        <Link
          href={`/clients/${row.original.id}?tab=pipeline&run=${r.id}`}
          className="flex min-w-[160px] flex-col gap-0.5 hover:text-primary"
          data-no-row-click
        >
          <span className="flex items-center gap-1.5">
            <StepRunBadge status={r.status} />
            <span className="text-xs text-muted-foreground">{fmtRelative(r.createdAt)}</span>
          </span>
          <span className="truncate text-xs">{r.step.label}</span>
        </Link>
      );
    },
  },
  {
    id: 'ownership',
    accessorFn: c =>
      [c.businessUnit?.name, ...c.serviceLines.map(s => s.serviceLine.name)]
        .filter(Boolean)
        .join(' · '),
    header: 'BU / Service lines',
    meta: { label: 'BU / Service lines' },
    cell: ({ row }) => {
      const c = row.original;
      if (!c.businessUnit && !c.serviceLines.length)
        return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap items-center gap-1 whitespace-nowrap text-xs">
          {c.businessUnit && (
            <span className="font-medium">{c.businessUnit.code ?? c.businessUnit.name}</span>
          )}
          {c.serviceLines.map(s => (
            <span
              key={s.serviceLine.id}
              className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
            >
              {s.serviceLine.code ?? s.serviceLine.name}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: 'location',
    accessorFn: c => placeOf(c.locations[0]),
    header: 'Location',
    meta: { label: 'Location' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{placeOf(row.original.locations[0])}</span>
    ),
  },
  {
    id: 'spocs',
    accessorFn: c => c._count.spocs,
    header: 'SPOCs',
    meta: { label: 'SPOCs', align: 'right' },
    cell: ({ row }) => (
      <span className={row.original._count.spocs ? 'font-medium' : 'text-muted-foreground'}>
        {row.original._count.spocs}
      </span>
    ),
  },
  {
    id: 'createdBy',
    accessorFn: c => fullName(c.createdBy),
    header: 'Added by',
    meta: { label: 'Added by' },
    cell: ({ row }) => <PersonCell person={row.original.createdBy} />,
  },
  {
    id: 'createdAt',
    accessorFn: c => fmtDate(c.createdAt),
    header: 'Added',
    meta: { label: 'Added', sortKey: 'createdAt' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'updatedAt',
    accessorFn: c => fmtDate(c.updatedAt),
    header: 'Last updated',
    meta: { label: 'Last updated', sortKey: 'updatedAt', defaultHidden: true },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtRelative(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: 'cin',
    accessorKey: 'cin',
    header: 'CIN',
    meta: { label: 'CIN', defaultHidden: true },
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.cin ?? '—'}</span>,
  },
  {
    id: 'website',
    accessorKey: 'website',
    header: 'Website',
    meta: { label: 'Website', defaultHidden: true },
    cell: ({ row }) => hostOf(row.original.website) ?? '—',
  },
  ...(actions
    ? [
        {
          id: '__actions',
          header: '',
          enableHiding: false,
          meta: { locked: true, label: 'Actions', width: 44 },
          cell: ({ row }) => <div data-no-row-click>{actions(row.original)}</div>,
        } satisfies DataColumn<ClientListItem>,
      ]
    : []),
];
