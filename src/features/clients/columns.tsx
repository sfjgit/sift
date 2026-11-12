// File: columns.tsx
// Path: src/features/clients/columns.tsx

'use client';

import Link from 'next/link';
import { Eye, FileText, Globe, Linkedin, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientStatusBadge, CLIENT_STATUS, Pill, StepRunBadge } from '@/components/common/badges';
import { UserAvatar } from '@/components/common/UserAvatar';
import { isActive } from '@/app/(app)/pipeline-runs/_components/runFormat';
import { STEP_META } from '@/features/pipeline/stepMeta';
import { BranchesCount } from './BranchesDialog';
import type { DataTab } from './ClientDataSheet';
import type { DataColumn, FilterDef, GroupTone } from '@/components/data-table';
import { fmtDate, fmtInr, fmtNumber, fmtRelative, fullName, hostOf } from '@/lib/format';
import type { LookupRef } from '@/types/api';
import type { ClientCoverage, ClientEntityType, ClientListItem } from '@/types/crm';

export const ENTITY_TYPE: Record<ClientEntityType, string> = {
  COMPANY: 'Company',
  GOVERNMENT: 'Government',
  INSTITUTION: 'Institution',
};

const Dash = () => <span className="text-muted-foreground/70">—</span>;

const primaryOf = (c: ClientListItem) => c.locations[0];

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

// CASPA-style: one column per pipeline step — its latest run (anyone's) + Run
export const STEP_COLUMNS = [
  { key: 'reports', short: 'Reports' },
  { key: 'report_spocs', short: 'Report SPOCs' },
  { key: 'figures', short: 'CSR figures' },
  { key: 'enrich', short: 'LinkedIn' },
  { key: 'apollo', short: 'Apollo' },
  { key: 'validate', short: 'Validate' },
  { key: 'emails', short: 'Emails' },
  { key: 'branches', short: 'Find offices' },
] as const;

export type RunStepHandler = (c: ClientListItem, stepKey: string) => void;

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${Math.max(m, 1)}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  if (m < 60 * 24 * 30) return `${Math.round(m / 1440)}d`;
  return fmtDate(iso);
};

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
    <div className="flex min-w-[128px] items-center justify-between gap-1.5" data-no-row-click>
      {r ? (
        <Link
          href={`/clients/${c.id}?tab=pipeline&run=${r.id}`}
          title={[r.note, `by ${fullName(r.requestedBy)}`, fmtRelative(r.createdAt)]
            .filter(Boolean)
            .join(' — ')}
          className="flex min-w-0 items-center gap-1.5 hover:text-primary"
        >
          <StepRunBadge status={r.status} />
          <span className="text-[12px] text-muted-foreground">{ago(r.createdAt)}</span>
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
          variant="ghost"
          className="text-muted-foreground opacity-50 group-hover/row:opacity-100 hover:text-primary"
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

/** one count from the list's coverage summary; a non-zero count opens the data sheet */
function countColumn(
  id: string,
  header: string,
  label: string,
  get: (v: ClientCoverage) => number,
  tab: DataTab,
  onOpen?: OpenDataHandler
): DataColumn<ClientListItem> {
  return {
    id,
    accessorFn: c => (c.coverage ? get(c.coverage) : ''),
    header,
    meta: { label, align: 'right' },
    cell: ({ row }) => {
      const v = row.original.coverage;
      if (!v) return null;
      const n = get(v);
      return onOpen && n ? (
        <button
          type="button"
          data-no-row-click
          onClick={() => onOpen(row.original, tab)}
          className="font-medium text-primary hover:underline"
        >
          {n}
        </button>
      ) : (
        <span className="text-muted-foreground">{n}</span>
      );
    },
  };
}

const STEP_OPTIONS = STEP_COLUMNS.map(s => ({ value: s.key, label: s.short }));

export const clientFilters: FilterDef[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    group: 'Ownership',
    options: [
      { value: 'PENDING', label: 'Pending approval' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
    ],
    hint: 'Pending approval, active or inactive clients.',
  },
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
    key: 'entityType',
    label: 'Organisation type',
    type: 'select',
    multi: true,
    group: 'Company',
    options: Object.entries(ENTITY_TYPE).map(([value, label]) => ({ value, label })),
  },
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
    key: 'csrSpentMinCr',
    label: 'CSR spent from (₹ cr)',
    type: 'text',
    placeholder: 'e.g. 5',
    group: 'Company',
    hint: 'Latest year’s CSR spent, at least this many crore.',
  },
  {
    key: 'csrSpentMaxCr',
    label: 'CSR spent up to (₹ cr)',
    type: 'text',
    placeholder: 'e.g. 50',
    group: 'Company',
  },
  {
    key: 'employeeSizeId',
    label: 'Employee size',
    type: 'lookup',
    lookupType: 'EMPLOYEE_SIZE',
    multi: true,
    group: 'Company',
  },
  {
    key: 'hasBranches',
    label: 'Branch offices',
    type: 'boolean',
    trueLabel: 'Has branches',
    falseLabel: 'No branches',
    group: 'Location',
  },

  // ── location: country → state → city, all on the same client location
  {
    key: 'country',
    label: 'Country',
    type: 'geo',
    level: 'country',
    multi: true,
    group: 'Location',
    hint: 'Clients with an office in any of these countries.',
  },
  {
    key: 'state',
    label: 'State',
    type: 'geo',
    level: 'state',
    countryKey: 'country',
    multi: true,
    group: 'Location',
    hint: 'Shows the states of the countries picked above (India if none).',
  },
  {
    key: 'city',
    label: 'City',
    type: 'geo',
    level: 'city',
    countryKey: 'country',
    stateKey: 'state',
    multi: true,
    group: 'Location',
    hint: 'Pick states first to list all their cities, or search. Country, state and city must match the same office.',
  },
  // ── CSR programmes (one programme must match everything picked here)
  {
    key: 'programSectorId',
    label: 'Programme sector',
    type: 'lookup',
    lookupType: 'PROGRAM_SECTOR',
    multi: true,
    group: 'CSR programmes',
    hint: 'Schedule VII area the client funds.',
  },
  {
    key: 'programState',
    label: 'Programme state',
    type: 'geo',
    level: 'state',
    multi: true,
    group: 'CSR programmes',
    hint: 'Where the client spends its CSR money.',
  },
  {
    key: 'programDistrict',
    label: 'Programme district',
    type: 'text',
    placeholder: 'e.g. Mysuru',
    group: 'CSR programmes',
  },
  {
    key: 'programAgency',
    label: 'Implementing agency',
    type: 'text',
    placeholder: 'NGO name or CSR-1 number',
    group: 'CSR programmes',
  },
  {
    key: 'district',
    label: 'District',
    type: 'text',
    placeholder: 'e.g. Pune',
    group: 'Location',
    hint: 'Exact district name (any case).',
  },

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

export const clientFilterKeys = clientFilters.map(f => f.key);

// ── default columns ──────────────────────────────────────────────────────────
// Everyone starts with the same columns in this order (the sales team's list,
// 11 Nov 2026, then the run buttons); each user then adds / hides / moves columns from the column
// chips, and that layout is kept per user. No CSR / B2B switch.

/** bump with every change to the defaults below — everyone's columns reset once */
export const CLIENT_LAYOUT_VERSION = 3;

export const CLIENT_DEFAULT_COLUMNS = [
  'name',
  'category',
  'csrSpent',
  'industry',
  'website',
  'linkedin',
  'pincode',
  'address',
  'branches',
  // the 5 attachments
  'doc_BRSR',
  'doc_CSR_REPORT',
  'doc_IMPACT_REPORT',
  'doc_ANNUAL_REPORT',
  'doc_CSR_ACTION_PLAN',
  'programs',
  'paidUpCapital',
  'authorisedCapital',
  // run buttons are off by default: the ▶ beside select-all brings in QUICK_RUN_COLUMNS
];

/** the ▶ quick button, next to the name: Amrutha's "Run all", the CSR reports step
 *  and Vinutha's office finder */
export const QUICK_RUN_COLUMNS = ['step_run_all', 'step_reports', 'step_branches'];

/** the attachment columns, named the way the sales team knows them */
export const DOC_HEADER: Record<string, string> = {
  BRSR: 'BRS Attachment',
  CSR_REPORT: 'CSR Report Attachment',
  IMPACT_REPORT: 'Impact Assessment Report',
  ANNUAL_REPORT: 'Annual Report Attachment',
  CSR_ACTION_PLAN: 'CSR Annual Action Plan',
};

// the coloured bands over the headers (CASPA style)
const GROUPS: { label: string; tone: GroupTone; test: (id: string) => boolean }[] = [
  {
    label: 'Client',
    tone: 'blue',
    test: id =>
      [
        'name',
        'category',
        'csrSpent',
        'industry',
        'shortName',
        'entityType',
        'status',
        'cin',
        'businessUnit',
        'serviceLines',
        'assignees',
      ].includes(id),
  },
  {
    label: 'Demographics',
    tone: 'green',
    test: id =>
      [
        'website',
        'linkedin',
        'pincode',
        'address',
        'city',
        'district',
        'state',
        'country',
        'branches',
        'employeeSize',
        'employeeCount',
      ].includes(id),
  },
  { label: 'Attachments', tone: 'violet', test: id => id.startsWith('doc_') || id === 'reports' },
  {
    label: 'CSR financials',
    tone: 'rose',
    test: id =>
      [
        'programs',
        'figureYears',
        'paidUpCapital',
        'authorisedCapital',
        'csrFy',
        'csrObligation',
        'csrBudget',
        'csrUnspent',
        'revenue',
        'netProfit',
        'netWorth',
      ].includes(id),
  },
  {
    label: 'Pipeline & engagement',
    tone: 'amber',
    test: id =>
      id.startsWith('step_') ||
      [
        'spocs',
        'approvedSpocs',
        'emailPacks',
        'emailsSent',
        'missing',
        'lastRun',
        'lastRunStatus',
        'lastRunAt',
      ].includes(id),
  },
  { label: 'Technology', tone: 'slate', test: id => id.startsWith('tech_') },
  { label: 'Record', tone: 'slate', test: () => true },
];

/** columns hidden unless in the default list (locked ones always show), with their band */
export const withDefaultColumns = (
  cols: DataColumn<ClientListItem>[]
): DataColumn<ClientListItem>[] =>
  cols.map(c => {
    const id = c.id ?? '';
    if (id === '__actions') return c;
    const g = GROUPS.find(x => x.test(id))!;
    return {
      ...c,
      meta: {
        ...c.meta,
        group: g.label,
        groupTone: g.tone,
        ...(!c.meta?.locked && { defaultHidden: !CLIENT_DEFAULT_COLUMNS.includes(id) }),
      },
    };
  });

// ── cells ────────────────────────────────────────────────────────────────────

const money = (v?: string | null) =>
  v ? <span className="tabular whitespace-nowrap">{fmtInr(v)}</span> : <Dash />;
const text = (v?: string | number | null) =>
  v === null || v === undefined || v === '' ? <Dash /> : <span className="truncate">{v}</span>;
const latestCsr = (c: ClientListItem) => c.csrFinancials?.[0];
const latestCorp = (c: ClientListItem) => c.corporateFinancials?.[0];
const num = (v?: string | null) => (v ? Number(v) : null);

export interface ClientColumnContext {
  actions?: (c: ClientListItem) => React.ReactNode;
  onRunStep?: (stepKey: string) => RunStepHandler | undefined;
  onOpenData?: OpenDataHandler;
  /** TECH_CATEGORY rows — one column each */
  techCategories?: LookupRef[];
  /** DOCUMENT_TYPE rows — one column each */
  documentTypes?: LookupRef[];
}

export const clientColumns = ({
  actions,
  onRunStep,
  onOpenData,
  techCategories = [],
  documentTypes = [],
}: ClientColumnContext): DataColumn<ClientListItem>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Client',
    meta: { label: 'Client', sortKey: 'name', locked: true },
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex w-[280px] items-center gap-2">
          <Link
            href={`/clients/${c.id}`}
            title={[c.name, c.shortName].filter(Boolean).join(' · ')}
            className="min-w-0 truncate font-medium hover:text-primary"
          >
            {c.name}
          </Link>
        </div>
      );
    },
  },
  {
    id: 'shortName',
    accessorKey: 'shortName',
    header: 'Short name',
    meta: { label: 'Short name' },
    cell: ({ row }) => text(row.original.shortName),
  },
  {
    id: 'entityType',
    accessorFn: c => ENTITY_TYPE[c.entityType],
    header: 'Type',
    meta: { label: 'Organisation type' },
    cell: ({ row }) => ENTITY_TYPE[row.original.entityType],
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
    cell: ({ row }) => text(row.original.industry?.label),
  },
  {
    id: 'category',
    accessorFn: c => c.category?.label ?? '',
    header: 'Category',
    meta: { label: 'Client category' },
    cell: ({ row }) => text(row.original.category?.label),
  },

  {
    id: 'csrSpent',
    accessorFn: c => num(c.csrSpentRs) ?? '',
    header: 'CSR spent',
    meta: { label: 'CSR spent (₹)', sortKey: 'csrSpentRs', align: 'right' },
    cell: ({ row }) =>
      row.original.csrSpentRs ? (
        <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
          {row.original.csrFy && (
            <span className="rounded-full bg-violet-100 px-1.5 py-px text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {row.original.csrFy}
            </span>
          )}
          <span className="font-semibold text-success tabular">
            {fmtInr(row.original.csrSpentRs)}
          </span>
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    id: 'csrFy',
    accessorKey: 'csrFy',
    header: 'CSR FY',
    meta: { label: 'CSR spent — FY' },
    cell: ({ row }) => text(row.original.csrFy),
  },
  {
    id: 'csrObligation',
    accessorFn: c => num(latestCsr(c)?.obligationRs) ?? '',
    header: 'CSR obligation',
    meta: { label: 'CSR obligation (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCsr(row.original)?.obligationRs),
  },
  {
    id: 'csrBudget',
    accessorFn: c => num(latestCsr(c)?.budgetRs) ?? '',
    header: 'CSR budget',
    meta: { label: 'CSR budget (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCsr(row.original)?.budgetRs),
  },
  {
    id: 'csrUnspent',
    accessorFn: c => num(latestCsr(c)?.unspentRs) ?? '',
    header: 'CSR unspent',
    meta: { label: 'CSR unspent (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCsr(row.original)?.unspentRs),
  },
  {
    id: 'revenue',
    accessorFn: c => num(latestCorp(c)?.revenueRs) ?? '',
    header: 'Revenue',
    meta: { label: 'Revenue (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCorp(row.original)?.revenueRs),
  },
  {
    id: 'netProfit',
    accessorFn: c => num(latestCorp(c)?.netProfitRs) ?? '',
    header: 'Net profit',
    meta: { label: 'Net profit (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCorp(row.original)?.netProfitRs),
  },
  {
    id: 'netWorth',
    accessorFn: c => num(latestCorp(c)?.netWorthRs) ?? '',
    header: 'Net worth',
    meta: { label: 'Net worth (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCorp(row.original)?.netWorthRs),
  },
  {
    id: 'paidUpCapital',
    accessorFn: c => num(latestCorp(c)?.paidUpCapitalRs) ?? '',
    header: 'Paid-up capital',
    meta: { label: 'Paid-up capital (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCorp(row.original)?.paidUpCapitalRs),
  },
  {
    id: 'authorisedCapital',
    accessorFn: c => num(latestCorp(c)?.authorisedCapitalRs) ?? '',
    header: 'Authorised capital',
    meta: { label: 'Authorised capital (latest FY)', align: 'right' },
    cell: ({ row }) => money(latestCorp(row.original)?.authorisedCapitalRs),
  },
  {
    id: 'cin',
    accessorKey: 'cin',
    header: 'CIN',
    meta: { label: 'CIN' },
    cell: ({ row }) =>
      row.original.cin ? (
        <span className="font-mono text-[13px]">{row.original.cin}</span>
      ) : (
        <Dash />
      ),
  },
  {
    id: 'address',
    accessorFn: c => primaryOf(c)?.addressLine ?? '',
    header: 'Address',
    meta: { label: 'Head office address' },
    cell: ({ row }) => text(primaryOf(row.original)?.addressLine),
  },
  {
    id: 'city',
    accessorFn: c => primaryOf(c)?.city ?? '',
    header: 'City',
    meta: { label: 'City' },
    cell: ({ row }) => text(primaryOf(row.original)?.city),
  },
  {
    id: 'district',
    accessorFn: c => primaryOf(c)?.district ?? '',
    header: 'District',
    meta: { label: 'District' },
    cell: ({ row }) => text(primaryOf(row.original)?.district),
  },
  {
    id: 'state',
    accessorFn: c => primaryOf(c)?.state ?? '',
    header: 'State',
    meta: { label: 'State' },
    cell: ({ row }) => text(primaryOf(row.original)?.state),
  },
  {
    id: 'country',
    accessorFn: c => primaryOf(c)?.country ?? '',
    header: 'Country',
    meta: { label: 'Country' },
    cell: ({ row }) => text(primaryOf(row.original)?.country),
  },
  {
    id: 'pincode',
    accessorFn: c => primaryOf(c)?.pincode ?? '',
    header: 'PIN',
    meta: { label: 'PIN code' },
    cell: ({ row }) => text(primaryOf(row.original)?.pincode),
  },
  {
    id: 'employeeSize',
    accessorFn: c => c.employeeSize?.label ?? '',
    header: 'Employee size',
    meta: { label: 'Employee size', sortKey: 'employeeCount' },
    cell: ({ row }) => text(row.original.employeeSize?.label),
  },
  {
    id: 'employeeCount',
    accessorFn: c => c.employeeCount ?? '',
    header: 'Employees',
    meta: { label: 'Employees (count)', align: 'right' },
    cell: ({ row }) =>
      row.original.employeeCount === null ? <Dash /> : fmtNumber(row.original.employeeCount),
  },
  {
    id: 'website',
    accessorKey: 'website',
    header: 'Website',
    meta: { label: 'Website' },
    cell: ({ row }) => {
      const w = row.original.coverage?.website;
      return (
        <div className="flex max-w-60 flex-col gap-0.5">
          {row.original.website ? (
            <a
              href={row.original.website}
              target="_blank"
              rel="noreferrer"
              data-no-row-click
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="size-3.5 shrink-0" />
              <span className="truncate">{hostOf(row.original.website)}</span>
            </a>
          ) : (
            <Dash />
          )}
          {/* the website check: waiting for an admin, or who changed the website lately */}
          {w?.waiting ? (
            <span
              className="text-[11px] font-medium text-warning"
              title={`Asked by ${w.waiting.by}`}
            >
              Waiting for admin · {fmtRelative(w.waiting.since)}
            </span>
          ) : w?.changed ? (
            <span
              className="text-[11px] text-success"
              title="The website was changed — run the steps again if needed"
            >
              Updated{w.changed.by ? ` by ${w.changed.by}` : ''} · {fmtRelative(w.changed.at)}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: 'linkedin',
    accessorKey: 'linkedinUrl',
    header: 'LinkedIn',
    meta: { label: 'LinkedIn', align: 'center' },
    cell: ({ row }) =>
      row.original.linkedinUrl ? (
        <a
          href={row.original.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          data-no-row-click
          aria-label={`LinkedIn page of ${row.original.name}`}
          className="inline-flex text-[#0a66c2] hover:opacity-80"
        >
          <Linkedin className="size-4" />
        </a>
      ) : (
        <Dash />
      ),
  },
  {
    id: 'branches',
    accessorFn: c => c._count.branches,
    header: 'Branch offices',
    meta: { label: 'Branch offices', align: 'right' },
    // the count opens the offices as a table; finding them is its own column (Find offices)
    cell: ({ row }) => (
      <BranchesCount
        clientId={row.original.id}
        clientName={row.original.name}
        count={row.original._count.branches}
      />
    ),
  },
  {
    id: 'reports',
    accessorFn: c => c.coverage?.reports ?? 0,
    header: 'Reports',
    meta: { label: 'Reports / attachments (all)', align: 'right' },
    cell: ({ row }) => {
      const n = row.original.coverage?.reports ?? 0;
      return onOpenData && n ? (
        <button
          type="button"
          data-no-row-click
          onClick={() => onOpenData(row.original, 'reports')}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <FileText className="size-3.5" />
          {n}
        </button>
      ) : (
        <span className="text-muted-foreground">{n}</span>
      );
    },
  },
  // one column per document type: the years held
  ...documentTypes.map(
    (t): DataColumn<ClientListItem> => ({
      id: `doc_${t.code}`,
      accessorFn: c =>
        (c.documents ?? [])
          .filter(d => d.type.id === t.id)
          .map(d => d.fy)
          .join(', '),
      header: DOC_HEADER[t.code] ?? t.label,
      meta: { label: `Attachment: ${DOC_HEADER[t.code] ?? t.label}` },
      cell: ({ row }) => {
        const years = (row.original.documents ?? []).filter(d => d.type.id === t.id).map(d => d.fy);
        if (!years.length) return <Dash />;
        return (
          <button
            type="button"
            data-no-row-click
            title={years.join(', ')}
            onClick={() => onOpenData?.(row.original, 'reports')}
            className="inline-flex max-w-44 items-center gap-1 text-success hover:underline"
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="truncate">
              {years[0]}
              {years.length > 1 && ` +${years.length - 1}`}
            </span>
          </button>
        );
      },
    })
  ),
  // one column per technology area (CASPA's cloud / erp / crm … columns)
  ...techCategories.map(
    (t): DataColumn<ClientListItem> => ({
      id: `tech_${t.code}`,
      accessorFn: c => c.technologies?.find(x => x.category.id === t.id)?.details ?? '',
      header: t.label,
      meta: { label: `Technology: ${t.label}` },
      cell: ({ row }) => {
        const d = row.original.technologies?.find(x => x.category.id === t.id)?.details;
        return d ? (
          <span className="block max-w-56 truncate" title={d}>
            {d}
          </span>
        ) : (
          <Dash />
        );
      },
    })
  ),
  {
    id: 'businessUnit',
    accessorFn: c => c.businessUnit?.name ?? '',
    header: 'BU',
    meta: { label: 'Business unit' },
    cell: ({ row }) =>
      row.original.businessUnit ? (
        <span className="whitespace-nowrap" title={row.original.businessUnit.name}>
          {row.original.businessUnit.name}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    id: 'serviceLines',
    accessorFn: c => c.serviceLines.map(s => s.serviceLine.name).join(', '),
    header: 'Service lines',
    meta: { label: 'Service lines' },
    cell: ({ row }) => {
      const sls = row.original.serviceLines;
      if (!sls.length) return <Dash />;
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          {sls.map(s => (
            <span key={s.serviceLine.id} className="rounded bg-muted px-1.5 text-[13px]">
              {s.serviceLine.code ?? s.serviceLine.name}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: 'assignees',
    accessorFn: c => c.assignments.map(a => fullName(a.user)).join(', '),
    header: 'Assigned to',
    meta: { label: 'Assigned to' },
    cell: ({ row }) => <AssigneesCell c={row.original} />,
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
  ...[{ key: 'run_all', short: 'Run all' }, ...STEP_COLUMNS].map(
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
  countColumn(
    'approvedSpocs',
    'Approved SPOCs',
    'SPOCs approved for outreach',
    v => v.approvedSpocs,
    'spocs',
    onOpenData
  ),
  countColumn(
    'figureYears',
    'CSR years',
    'Years of CSR figures',
    v => v.figureYears,
    'figures',
    onOpenData
  ),
  countColumn('programs', 'Programmes', 'CSR / skilling programmes', v => v.programs, 'figures', onOpenData),
  countColumn(
    'emailPacks',
    'Email packs',
    'Outreach email packs',
    v => v.outreachPacks,
    'emails',
    onOpenData
  ),
  countColumn(
    'emailsSent',
    'Emails sent',
    'Outreach emails sent',
    v => v.outreachSent,
    'emails',
    onOpenData
  ),
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
        <span className="flex items-center gap-1" title={gaps.join(', ')}>
          <Pill tone="warning" dot={false}>
            {gaps[0]}
          </Pill>
          {gaps.length > 1 && (
            <span className="text-[12px] font-medium text-warning">+{gaps.length - 1}</span>
          )}
        </span>
      );
    },
  },
  {
    id: 'lastRun',
    accessorFn: c => c.coverage?.lastRun?.step.label ?? '',
    header: 'Last run',
    meta: { label: 'Last pipeline run (step)' },
    cell: ({ row }) => {
      const r = row.original.coverage?.lastRun;
      if (!row.original.coverage) return null;
      if (!r) return <span className="text-muted-foreground">Never run</span>;
      return (
        <Link
          href={`/clients/${row.original.id}?tab=pipeline&run=${r.id}`}
          className="whitespace-nowrap hover:text-primary"
          data-no-row-click
        >
          {r.step.label}
        </Link>
      );
    },
  },
  {
    id: 'lastRunStatus',
    accessorFn: c => c.coverage?.lastRun?.status ?? '',
    header: 'Run status',
    meta: { label: 'Last run status' },
    cell: ({ row }) => {
      const r = row.original.coverage?.lastRun;
      return r ? <StepRunBadge status={r.status} /> : <Dash />;
    },
  },
  {
    id: 'lastRunAt',
    accessorFn: c => (c.coverage?.lastRun ? fmtDate(c.coverage.lastRun.createdAt) : ''),
    header: 'Run on',
    meta: { label: 'Last run on' },
    cell: ({ row }) => {
      const r = row.original.coverage?.lastRun;
      return r ? (
        <span className="whitespace-nowrap text-muted-foreground" title={fmtDate(r.createdAt)}>
          {fmtRelative(r.createdAt)}
        </span>
      ) : (
        <Dash />
      );
    },
  },
  {
    id: 'createdBy',
    accessorFn: c => fullName(c.createdBy),
    header: 'Added by',
    meta: { label: 'Added by' },
    cell: ({ row }) => fullName(row.original.createdBy),
  },
  {
    id: 'createdAt',
    accessorFn: c => fmtDate(c.createdAt),
    header: 'Added',
    meta: { label: 'Added on', sortKey: 'createdAt' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'approvedAt',
    accessorFn: c => (c.approvedAt ? fmtDate(c.approvedAt) : ''),
    header: 'Approved on',
    meta: { label: 'Approved on' },
    cell: ({ row }) =>
      row.original.approvedAt ? (
        <span className="whitespace-nowrap">{fmtDate(row.original.approvedAt)}</span>
      ) : (
        <Dash />
      ),
  },
  {
    id: 'approvedBy',
    accessorFn: c => (c.approvedBy ? fullName(c.approvedBy) : ''),
    header: 'Approved by',
    meta: { label: 'Approved by' },
    cell: ({ row }) => (row.original.approvedBy ? fullName(row.original.approvedBy) : <Dash />),
  },
  {
    id: 'updatedAt',
    accessorFn: c => fmtDate(c.updatedAt),
    header: 'Last updated',
    meta: { label: 'Last updated', sortKey: 'updatedAt' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {fmtRelative(row.original.updatedAt)}
      </span>
    ),
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
