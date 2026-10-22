// File: page.tsx
// Path: src/app/(dashboard)/reports/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, useCallback, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart2,
  FileText,
  Filter,
  LayoutDashboard,
  Layers,
  RefreshCw,
  Square,
  CheckSquare,
  Users,
  UserCheck,
  X,
  Calendar,
  Search,
  CalendarCheck,
  Building2,
  UserCog,
  Activity,
  CalendarPlus,
  RotateCcw,
  CircleDot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { CandidatesSection } from '@/components/reports/CandidatesSection';
import type {
  RecruiterActivityResponse,
  RequirementGroup,
  RequirementReportResponse,
  SaleBucket,
  ServiceLineRef,
} from '@/components/reports/types';
import { DrillDrawer } from '@/components/reports/DrillDrawer';
import type { DrillTarget } from '@/components/reports/DrillDrawer';
import { OverviewSection } from '@/components/reports/OverviewSection';
import { SalesSection } from '@/components/reports/SalesSection';
import { TeamTreePicker } from '@/components/reports/TeamTreePicker';
import type { TeamSelection } from '@/components/reports/TeamTreePicker';
import { Empty, Skel } from '@/components/reports/reportUi';
import { RequirementTable, SortKey } from '@/components/reports/RequirementTable';
import {
  RecruiterSection,
  ActivityDrillDrawer,
  type ActivityDrillTarget,
} from '@/components/reports/RecruiterSection';
import { useTour } from '@/features/tour/useTour';
import { TourButton } from '@/features/tour/TourButton';
import { tourTarget } from '@/features/tour/tour.constants';
import type { TourHandlers } from '@/features/tour/types';
import {
  REPORTS_TOUR_TARGETS,
  reportsTour,
  type ReportsTourRequirement,
} from '@/features/tour/tours/reports.tour';

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type WindowMode = 'preset' | 'hours' | 'range';

interface WinState {
  mode: WindowMode;
  range: '' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';
  hours: number;
  fromDate: string;
  toDate: string;
}

type TabKey = 'overview' | 'recruiters' | 'requirements' | 'candidates' | 'sales';

type DatePreset = '' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';

/** One independent date filter on the requirements tab */
interface DateFilter {
  range: Exclude<DatePreset, ''> | 'custom';
  from: string;
  to: string;
}

/** Shape of data.people from GET /reports/overview/filters */
interface PersonOption {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
  roleName: string | null;
  /** requirements (created/assigned) or candidates (recruiter) */
  count: number;
}

interface PeopleOptions {
  createdBy: PersonOption[];
  assignedBy: PersonOption[];
  assignedTo: PersonOption[];
  recruiters: PersonOption[];
}

const EMPTY_PEOPLE: PeopleOptions = {
  createdBy: [],
  assignedBy: [],
  assignedTo: [],
  recruiters: [],
};

type PeopleFilterKey = 'createdByIds' | 'assignedByIds' | 'assignedToIds' | 'recruiterIds';

interface Filters {
  clientIds?: string[];
  clientSpocIds?: string[];
  serviceLineIds?: string[];
  businessUnitId?: string;
  departmentIds?: string[];
  createdByIds?: string[];
  assignedByIds?: string[];
  assignedToIds?: string[];
  recruiterIds?: string[];
  statuses?: string[];
  mojMonths?: string[];
  mojYear?: string;
  createdDate?: DateFilter;
  activityDate?: DateFilter;
}

interface SalesDrillPayload {
  label: string;
  type?: string;
  stageId?: string;
  reqId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PEOPLE FILTER CONFIG — single source for params, counts, clearing, rendering.
// ─────────────────────────────────────────────────────────────────────────────

const PEOPLE_FILTERS: {
  key: PeopleFilterKey;
  param: string; // backend query param (multi-value)
  option: keyof PeopleOptions; // data.people.<option>
  label: string;
  countUnit: string; // what person.count means
  labelByTab?: Partial<Record<TabKey, string>>;
  tabs: TabKey[];
}[] = [
  {
    key: 'createdByIds',
    param: 'createdById',
    option: 'createdBy',
    label: 'Created by',
    countUnit: 'reqs',
    labelByTab: { recruiters: 'Requirement creator (CSM)' },
    tabs: ['requirements', 'recruiters'],
  },
  {
    key: 'assignedByIds',
    param: 'assignedById',
    option: 'assignedBy',
    label: 'Assigned by',
    countUnit: 'reqs',
    tabs: ['requirements'],
  },
  {
    key: 'assignedToIds',
    param: 'assignedToId',
    option: 'assignedTo',
    label: 'Assigned to',
    countUnit: 'reqs',
    tabs: ['requirements'],
  },
  {
    key: 'recruiterIds',
    param: 'recruiterId',
    option: 'recruiters',
    label: 'Recruiter',
    countUnit: 'candidates',
    tabs: ['requirements'],
  },
];

const peopleFilterCount = (f: Filters) =>
  PEOPLE_FILTERS.reduce((n, pf) => n + (f[pf.key]?.length ?? 0), 0);

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT DATE FILTERS — two independent filters, both optional.
// prefix → backend params: <prefix>Range | <prefix>From & <prefix>To
// ─────────────────────────────────────────────────────────────────────────────

const REQ_DATE_FILTERS: {
  key: 'createdDate' | 'activityDate';
  prefix: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    key: 'createdDate',
    prefix: 'created',
    label: 'Created',
    hint: 'When the requirement was created.',
    icon: CalendarPlus,
  },
  {
    key: 'activityDate',
    prefix: 'activity',
    label: 'Activity',
    hint: 'Requirements whose candidates were added, updated or moved stage. Counts and values use only those candidates.',
    icon: Activity,
  },
];

/** Generic window params the requirements tab must NOT send */
const WINDOW_PARAM_KEYS = ['range', 'hours', 'fromDate', 'toDate'];

const isDateFilterSet = (d?: DateFilter) =>
  !!d && (d.range === 'custom' ? !!(d.from || d.to) : !!d.range);

const dateFilterCount = (f: Filters) =>
  REQ_DATE_FILTERS.filter(df => isDateFilterSet(f[df.key])).length;

function appendDateFilter(p: URLSearchParams, prefix: string, d?: DateFilter) {
  if (!isDateFilterSet(d)) return;
  if (d!.range === 'custom') {
    if (d!.from) p.set(`${prefix}From`, d!.from);
    if (d!.to) p.set(`${prefix}To`, d!.to);
  } else {
    p.set(`${prefix}Range`, d!.range);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CONFIG — flip `hidden` to bring a tab back. Components stay mounted in code.
// ─────────────────────────────────────────────────────────────────────────────

const TAB_CONFIG: {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  description: string;
  hidden?: boolean;
}[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Pipeline health at a glance',
    hidden: true,
  },
  {
    key: 'requirements',
    label: 'Requirements',
    icon: FileText,
    description: 'Openings, pipeline and sale value per requirement',
  },
  {
    key: 'recruiters',
    label: 'Recruiters',
    icon: Users,
    description: 'What each person did in the selected period',
  },
  {
    key: 'candidates',
    label: 'Candidates',
    icon: UserCheck,
    description: 'Every candidate in your scope',
    hidden: true,
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: BarChart2,
    description: 'Sale value by stage',
    hidden: true,
  },
];

const VISIBLE_TABS = TAB_CONFIG.filter(t => !t.hidden);
const DEFAULT_TAB: TabKey = VISIBLE_TABS[0]?.key ?? 'requirements';

// ─────────────────────────────────────────────────────────────────────────────
// UI TOKENS — every colour comes from the theme (globals.css)
// ─────────────────────────────────────────────────────────────────────────────

const SEG_WRAP = 'inline-flex h-8 items-center gap-0.5 rounded-lg bg-muted p-0.5';
const SEG_ITEM =
  'h-7 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
const SEG_IDLE = 'text-muted-foreground hover:text-foreground';
const SEG_ON = 'bg-card text-foreground shadow-sm';
const SEG_PRIMARY = 'bg-primary text-primary-foreground shadow-sm';
const FIELD_BOX =
  'flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30';
const ACTIVE_TRIGGER =
  'border-primary/40 bg-primary/10 font-semibold text-primary hover:bg-primary/15 hover:text-primary aria-expanded:bg-primary/15 aria-expanded:text-primary';
const COUNT_BADGE =
  'rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-primary-foreground';
const OPTION_ROW =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted';
const GROUP_LABEL = 'bg-muted/60 px-3 py-1 text-[10px] font-semibold text-muted-foreground';
const PANEL = 'overflow-hidden rounded-xl border border-border bg-card';

const formatRole = (role: string) =>
  role.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_WIN: WinState = {
  mode: 'preset',
  range: '',
  hours: 8,
  fromDate: '',
  toDate: '',
};

// Same default as the Requirements tab (Any time) so both tabs compare like-for-like
const ALL_TIME_WIN: WinState = { ...DEFAULT_WIN, range: '' };

const PRESETS: { k: WinState['range']; l: string }[] = [
  { k: '', l: 'All time' },
  { k: 'today', l: 'Today' },
  { k: 'yesterday', l: 'Yesterday' },
  { k: 'last7', l: 'Last 7 days' },
  { k: 'last30', l: 'Last 30 days' },
  { k: 'thisMonth', l: 'This month' },
];
const HOUR_OPTS = [8, 12, 24, 48, 72];

const WINDOW_MODES: { k: WindowMode; l: string }[] = [
  { k: 'preset', l: 'Quick' },
  { k: 'hours', l: 'By hours' },
  { k: 'range', l: 'Custom range' },
];

function winToParams(w: WinState): Record<string, string> {
  if (w.mode === 'hours') return { hours: String(w.hours) };
  if (w.mode === 'range') {
    const p: Record<string, string> = {};
    if (w.fromDate) p.fromDate = w.fromDate;
    if (w.toDate) p.toDate = w.toDate;
    return p;
  }
  if (w.range) return { range: w.range };
  return {};
}

function winLabel(w: WinState): string {
  if (w.mode === 'hours') return `Last ${w.hours}h`;
  if (w.mode === 'range') {
    if (!w.fromDate && !w.toDate) return 'All time';
    return `${w.fromDate || 'start'} → ${w.toDate || 'now'}`;
  }
  return PRESETS.find(p => p.k === w.range)?.l ?? 'All time';
}

const isWinAllTime = (w: WinState) => Object.keys(winToParams(w)).length === 0;

function dateFilterLabel(d?: DateFilter): string | null {
  if (!isDateFilterSet(d)) return null;
  if (d!.range === 'custom') return `${d!.from || 'start'} → ${d!.to || 'now'}`;
  return PRESETS.find(p => p.k === d!.range)?.l ?? d!.range;
}

const selectTriggerCls = (active: boolean) =>
  cn(
    'h-8! w-full rounded-lg border-border bg-background text-xs shadow-none hover:bg-muted',
    active && ACTIVE_TRIGGER
  );

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtCurrency(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Appends export options (stage picks etc.) onto a filter query string */
function withExportOptions(
  qs: string,
  opts: {
    slId?: string;
    ids?: string[];
    stageIds?: string[];
    hiddenStageIds?: string[];
    hiddenCandidateCols?: string[];
  }
): URLSearchParams {
  const p = new URLSearchParams(qs);
  if (opts.slId) p.set('serviceLineId', opts.slId);
  if (opts.ids?.length) p.set('ids', opts.ids.join(','));
  if (opts.stageIds?.length) p.set('stageIds', opts.stageIds.join(','));
  if (opts.hiddenStageIds?.length) p.set('hiddenStageIds', opts.hiddenStageIds.join(','));
  if (opts.hiddenCandidateCols?.length)
    p.set('hiddenCandidateCols', opts.hiddenCandidateCols.join(','));
  return p;
}

const ALL_REPORT_STATUSES = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// FILTER OPTIONS — one query, shared by the drawer and the applied-filter chips
// ─────────────────────────────────────────────────────────────────────────────

interface FilterOptions {
  serviceLines: { id: string; name: string }[];
  businessUnits: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  clients: { id: string; name: string; status?: string }[];
  spocs: {
    id: string;
    name: string;
    designation: string | null;
    clientId: string;
    clientName: string;
    isActive: boolean;
  }[];
  people: PeopleOptions;
}

function useReportFilterOptions(): FilterOptions {
  const axios = useAxios();
  const { data } = useQuery({
    queryKey: ['reports-overview-filters'],
    queryFn: async () => (await axios.get('/reports/overview/filters')).data?.data ?? {},
    staleTime: 300_000,
  });
  return useMemo(
    () => ({
      serviceLines: data?.serviceLines ?? [],
      businessUnits: data?.businessUnits ?? [],
      departments: data?.departments ?? [],
      clients: data?.clients ?? [],
      spocs: data?.spocs ?? [],
      people: { ...EMPTY_PEOPLE, ...(data?.people ?? {}) },
    }),
    [data]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST FIELD — inline searchable multi-select (no popovers inside drawer)
// ─────────────────────────────────────────────────────────────────────────────

type CheckOption = { id: string; label: string; meta?: string; inActive?: boolean };
type CheckGroup = { label: string; options: CheckOption[] };

function ChecklistField({
  groups,
  selected,
  onChange,
  searchPlaceholder = 'Search',
  emptyText = 'Nothing to pick here yet.',
}: {
  groups: CheckGroup[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const total = groups.reduce((n, g) => n + g.options.length, 0);

  const visible = useMemo(
    () =>
      groups
        .map(g => ({
          ...g,
          options: g.options.filter(
            o =>
              !term ||
              o.label.toLowerCase().includes(term) ||
              (o.meta ?? '').toLowerCase().includes(term) ||
              g.label.toLowerCase().includes(term)
          ),
        }))
        .filter(g => g.options.length > 0),
    [groups, term]
  );

  const visibleIds = visible.flatMap(g => g.options.map(o => o.id));
  const allOn = visibleIds.length > 0 && visibleIds.every(id => selected.includes(id));

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const toggleVisible = () =>
    onChange(
      allOn
        ? selected.filter(id => !visibleIds.includes(id))
        : [...new Set([...selected, ...visibleIds])]
    );

  const showGroupLabels = groups.length > 1 || !!groups[0]?.label;

  return (
    <div className="rounded-lg border border-border bg-background">
      {total > 6 && (
        <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="max-h-52 overflow-y-auto py-1">
        {visible.map(g => (
          <div key={g.label || '__all__'}>
            {showGroupLabels && g.label && <p className={GROUP_LABEL}>{g.label}</p>}
            {g.options.map(o => {
              const on = selected.includes(o.id);
              return (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  className={cn(
                    OPTION_ROW,
                    on
                      ? 'font-semibold text-foreground'
                      : o.inActive
                        ? 'text-muted-foreground'
                        : 'text-foreground'
                  )}
                >
                  {on ? (
                    <CheckSquare className="size-3.5 shrink-0 text-primary" />
                  ) : (
                    <Square className="size-3.5 shrink-0 text-muted-foreground/60" />
                  )}
                  <span className="min-w-0 truncate">{o.label}</span>
                  {(o.meta || o.inActive) && (
                    <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      {o.inActive && <span className="text-destructive">Inactive</span>}
                      {o.meta && <span className="tabular-nums">{o.meta}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {total ? 'No matches for that search.' : emptyText}
          </p>
        )}
      </div>

      {(visibleIds.length > 1 || selected.length > 0) && (
        <div className="flex items-center justify-between border-t border-border px-2.5 py-1.5 text-xs">
          {visibleIds.length > 1 ? (
            <button
              type="button"
              onClick={toggleVisible}
              className="font-medium text-primary hover:underline"
            >
              {allOn ? 'Unselect shown' : 'Select shown'}
            </button>
          ) : (
            <span />
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-medium text-muted-foreground hover:text-destructive"
            >
              Clear {selected.length}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAWER LAYOUT PIECES
// ─────────────────────────────────────────────────────────────────────────────

/** Which field is currently highlighted after a jump ("point to it") */
const FlashContext = createContext<string | null>(null);

function FilterBlock({
  title,
  icon: Icon,
  count = 0,
  tourKey,
  children,
}: {
  title: string;
  icon: LucideIcon;
  count?: number;
  tourKey?: string;
  children: ReactNode;
}) {
  return (
    <section
      {...(tourKey ? tourTarget(tourKey) : {})}
      className="rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {count > 0 && <span className={cn(COUNT_BADGE, 'ml-auto')}>{count} selected</span>}
      </div>
      <div className="space-y-5 p-4">{children}</div>
    </section>
  );
}

function Field({
  fieldKey,
  label,
  hint,
  children,
}: {
  fieldKey?: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const flash = useContext(FlashContext);
  const on = !!fieldKey && flash === fieldKey;
  return (
    <div
      id={fieldKey ? `rf-${fieldKey}` : undefined}
      className={cn(
        'scroll-mt-24 space-y-1.5 rounded-lg transition-all duration-500',
        on && 'bg-primary/5 ring-2 ring-primary/50 ring-offset-4 ring-offset-card'
      )}
    >
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE PICKERS
// ─────────────────────────────────────────────────────────────────────────────

/** Requirements tab — preset or custom range, "Any time" = not applied */
function DateFilterPicker({
  value,
  onChange,
}: {
  value?: DateFilter;
  onChange: (v?: DateFilter) => void;
}) {
  const selectValue = value ? value.range : 'ANY';
  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={r =>
          r === 'ANY'
            ? onChange(undefined)
            : onChange({
                range: r as DateFilter['range'],
                from: r === 'custom' ? (value?.from ?? '') : '',
                to: r === 'custom' ? (value?.to ?? '') : '',
              })
        }
      >
        <SelectTrigger className={selectTriggerCls(isDateFilterSet(value))}>
          <SelectValue placeholder="Any time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ANY">Any time</SelectItem>
          {PRESETS.filter(p => p.k).map(p => (
            <SelectItem key={p.k} value={p.k}>
              {p.l}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {value?.range === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <label className={FIELD_BOX}>
            <span className="text-xs text-muted-foreground">From</span>
            <input
              type="date"
              value={value.from}
              onChange={e => onChange({ ...value, from: e.target.value })}
              className="w-full bg-transparent text-xs text-foreground outline-none"
            />
          </label>
          <label className={FIELD_BOX}>
            <span className="text-xs text-muted-foreground">To</span>
            <input
              type="date"
              value={value.to}
              onChange={e => onChange({ ...value, to: e.target.value })}
              className="w-full bg-transparent text-xs text-foreground outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}

/** Other tabs — the generic report window */
function WindowPicker({ win, onWin }: { win: WinState; onWin: (w: WinState) => void }) {
  return (
    <div className="space-y-2">
      <div className={SEG_WRAP}>
        {WINDOW_MODES.map(m => (
          <button
            type="button"
            key={m.k}
            onClick={() => onWin({ ...win, mode: m.k })}
            className={cn(SEG_ITEM, win.mode === m.k ? SEG_ON : SEG_IDLE)}
          >
            {m.l}
          </button>
        ))}
      </div>

      {win.mode === 'preset' && (
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              type="button"
              key={p.k}
              onClick={() => onWin({ ...win, range: p.k })}
              className={cn(
                'h-7 rounded-md border px-2.5 text-xs font-medium transition-colors',
                win.range === p.k
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              )}
            >
              {p.l}
            </button>
          ))}
        </div>
      )}

      {win.mode === 'hours' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {HOUR_OPTS.map(h => (
            <button
              type="button"
              key={h}
              onClick={() => onWin({ ...win, hours: h })}
              className={cn(
                'h-7 rounded-md border px-2.5 text-xs font-medium tabular-nums transition-colors',
                win.hours === h
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              )}
            >
              {h}h
            </button>
          ))}
          <label className={FIELD_BOX}>
            <input
              type="number"
              min={1}
              value={win.hours}
              onChange={e => onWin({ ...win, hours: Math.max(1, Number(e.target.value) || 1) })}
              className="w-12 bg-transparent text-xs tabular-nums text-foreground outline-none"
            />
            <span className="text-xs text-muted-foreground">hrs</span>
          </label>
        </div>
      )}

      {win.mode === 'range' && (
        <div className="grid grid-cols-2 gap-2">
          <label className={FIELD_BOX}>
            <span className="text-xs text-muted-foreground">From</span>
            <input
              type="date"
              value={win.fromDate}
              onChange={e => onWin({ ...win, fromDate: e.target.value })}
              className="w-full bg-transparent text-xs text-foreground outline-none"
            />
          </label>
          <label className={FIELD_BOX}>
            <span className="text-xs text-muted-foreground">To</span>
            <input
              type="date"
              value={win.toDate}
              onChange={e => onWin({ ...win, toDate: e.target.value })}
              className="w-full bg-transparent text-xs text-foreground outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}

/** Month of joining — inline year + month grid */
function MojInline({
  mojMonths,
  mojYear,
  onChange,
}: {
  mojMonths: string[];
  mojYear: string;
  onChange: (months: string[], year: string) => void;
}) {
  const year = mojYear || mojMonths[0]?.split('-')[0] || String(new Date().getFullYear());
  const keyFor = (m: string) => `${year}-${m}`;
  const monthOf = (k: string) => k.split('-')[1] ?? k;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className={FIELD_BOX}>
          <span className="text-xs text-muted-foreground">Year</span>
          <input
            type="number"
            min={2020}
            max={2035}
            value={year}
            onChange={e => {
              const yr = e.target.value.trim();
              if (!yr) return onChange([], '');
              onChange(
                mojMonths.map(k => `${yr}-${monthOf(k)}`),
                yr
              );
            }}
            className="w-14 bg-transparent text-xs tabular-nums text-foreground outline-none"
          />
        </label>
        {(mojMonths.length > 0 || mojYear) && (
          <button
            type="button"
            onClick={() => onChange([], '')}
            className="text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {MONTH_OPTIONS.map(opt => {
          const key = keyFor(opt.value);
          const on = mojMonths.includes(key);
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() =>
                onChange(on ? mojMonths.filter(k => k !== key) : [...mojMonths, key], year)
              }
              className={cn(
                'h-8 rounded-md text-xs font-medium transition-colors',
                on ? SEG_PRIMARY : 'bg-muted/60 text-foreground hover:bg-muted'
              )}
            >
              {opt.label.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS DRAWER — edits a draft; nothing refetches until "Apply filters"
// ─────────────────────────────────────────────────────────────────────────────

interface AppliedState {
  filters: Filters;
  win: WinState;
  team: TeamSelection | null;
}

function FiltersSheetBody({
  activeTab,
  options,
  initial,
  focusKey,
  onApply,
  onCancel,
}: {
  activeTab: TabKey;
  options: FilterOptions;
  initial: AppliedState;
  focusKey: string | null;
  onApply: (next: AppliedState) => void;
  onCancel: () => void;
}) {
  const [filters, setDraft] = useState<Filters>(initial.filters);
  const [win, setWin] = useState<WinState>(initial.win);
  const [team, setTeam] = useState<TeamSelection | null>(initial.team);
  const [flash, setFlash] = useState<string | null>(null);
  const set = (patch: Partial<Filters>) => setDraft(f => ({ ...f, ...patch }));

  // Scroll to a field and highlight it for a moment
  const jumpTo = useCallback((key: string) => {
    document.getElementById(`rf-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(key);
    window.setTimeout(() => setFlash(k => (k === key ? null : k)), 1800);
  }, []);

  // Opened from a chip → point straight at that filter (after the slide-in)
  useEffect(() => {
    if (!focusKey) return;
    const t = window.setTimeout(() => jumpTo(focusKey), 260);
    return () => window.clearTimeout(t);
  }, [focusKey, jumpTo]);

  const isReq = activeTab === 'requirements';
  const showStatus =
    activeTab === 'requirements' || activeTab === 'recruiters' || activeTab === 'sales';
  const showDept = activeTab === 'overview' || activeTab === 'recruiters';
  const showMoj = activeTab === 'recruiters';
  const peopleFilters = PEOPLE_FILTERS.filter(
    pf => pf.tabs.includes(activeTab) && options.people[pf.option].length > 0
  );

  // ── option groups ─────────────────────────────────────────────────────
  const clientGroups: CheckGroup[] = useMemo(
    () =>
      [
        {
          label: 'Active',
          options: options.clients
            .filter(c => c.status === 'ACTIVE')
            .map(c => ({ id: c.id, label: c.name })),
        },
        {
          label: 'Inactive',
          options: options.clients
            .filter(c => c.status !== 'ACTIVE')
            .map(c => ({ id: c.id, label: c.name, inActive: true })),
        },
      ].filter(g => g.options.length > 0),
    [options.clients]
  );

  const spocGroups: CheckGroup[] = useMemo(() => {
    const pool = filters.clientIds?.length
      ? options.spocs.filter(s => filters.clientIds!.includes(s.clientId))
      : options.spocs;
    const byClient = new Map<string, CheckGroup>();
    for (const s of pool) {
      if (!byClient.has(s.clientId)) byClient.set(s.clientId, { label: s.clientName, options: [] });
      byClient.get(s.clientId)!.options.push({
        id: s.id,
        label: s.name,
        meta: s.designation ?? undefined,
        inActive: s.isActive === false,
      });
    }
    return [...byClient.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [options.spocs, filters.clientIds]);

  const peopleGroups = (list: PersonOption[], unit: string): CheckGroup[] => {
    const byRole = new Map<string, CheckGroup>();
    for (const p of list) {
      const role = formatRole(p.roleName ?? 'Other');
      if (!byRole.has(role)) byRole.set(role, { label: role, options: [] });
      byRole.get(role)!.options.push({
        id: p.id,
        label: p.name,
        meta: `${p.count} ${unit}`,
        inActive: !p.isActive,
      });
    }
    return [...byRole.values()].sort((a, b) => a.label.localeCompare(b.label));
  };

  // ── counts ────────────────────────────────────────────────────────────
  const dateCount = isReq ? dateFilterCount(filters) : isWinAllTime(win) ? 0 : 1;
  const clientCount =
    (team ? 1 : 0) + (filters.clientIds?.length ?? 0) + (filters.clientSpocIds?.length ?? 0);
  const businessCount =
    (filters.serviceLineIds?.length ?? 0) +
    (filters.businessUnitId ? 1 : 0) +
    (showDept ? (filters.departmentIds?.length ?? 0) : 0);
  const peopleCount = peopleFilters.reduce((n, pf) => n + (filters[pf.key]?.length ?? 0), 0);

  // Draft selections — shown at the top, click to jump to the field
  const draftChips = buildFilterChips({
    activeTab,
    filters,
    win,
    team,
    options,
    setFilters: setDraft,
    setWin,
    setTeam,
  });

  const resetAll = () => {
    setDraft({});
    if (!isReq) setWin(ALL_TIME_WIN);
    setTeam(null);
  };

  return (
    <FlashContext.Provider value={flash}>
      <SheetHeader className="border-b border-border px-6 py-4 pr-14">
        <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
        <SheetDescription className="text-xs">
          Pick what to include. Nothing changes on the report until you apply.
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
        {/* Selected so far — click any chip to jump to it */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 border-b border-border bg-popover/95 px-6 py-2.5 backdrop-blur">
          <span className="mr-1 text-xs font-semibold text-foreground">Selected</span>
          {draftChips.length ? (
            draftChips.map(c => (
              <FilterChipView key={c.key} chip={c} onSelect={() => jumpTo(c.key)} />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">
              Nothing yet. Everything in your scope is included.
            </span>
          )}
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-3">
          {/* ── Column 1: when + status + business ─────────────────────── */}
          <div className="space-y-4">
            <FilterBlock
              title="Dates"
              icon={Calendar}
              count={dateCount}
              tourKey={REPORTS_TOUR_TARGETS.filterDate}
            >
              {isReq ? (
                REQ_DATE_FILTERS.map(df => (
                  <Field key={df.key} fieldKey={df.key} label={df.label} hint={df.hint}>
                    <DateFilterPicker
                      value={filters[df.key]}
                      onChange={v => set({ [df.key]: v } as Partial<Filters>)}
                    />
                  </Field>
                ))
              ) : (
                <Field fieldKey="win" label="Report window">
                  <WindowPicker win={win} onWin={setWin} />
                </Field>
              )}
            </FilterBlock>

            {showStatus && (
              <FilterBlock
                title="Requirement status"
                icon={CircleDot}
                count={filters.statuses?.length ?? 0}
              >
                <Field fieldKey="status" label="Status">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_REPORT_STATUSES.map(st => {
                      const on = filters.statuses?.includes(st.key) ?? false;
                      return (
                        <button
                          type="button"
                          key={st.key}
                          onClick={() =>
                            set({
                              statuses: on
                                ? (filters.statuses ?? []).filter(x => x !== st.key)
                                : [...(filters.statuses ?? []), st.key],
                            })
                          }
                          className={cn(
                            'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                            on
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-foreground hover:bg-muted'
                          )}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </FilterBlock>
            )}

            <FilterBlock title="Business" icon={Layers} count={businessCount}>
              <Field fieldKey="sl" label="Service lines">
                <ChecklistField
                  groups={[
                    {
                      label: '',
                      options: options.serviceLines.map(s => ({ id: s.id, label: s.name })),
                    },
                  ]}
                  selected={filters.serviceLineIds ?? []}
                  onChange={ids => set({ serviceLineIds: ids })}
                />
              </Field>

              {options.businessUnits.length > 0 && (
                <Field fieldKey="bu" label="Business unit">
                  <Select
                    value={filters.businessUnitId ?? 'ALL'}
                    onValueChange={v => set({ businessUnitId: v === 'ALL' ? undefined : v })}
                  >
                    <SelectTrigger className={selectTriggerCls(!!filters.businessUnitId)}>
                      <SelectValue placeholder="All business units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All business units</SelectItem>
                      {options.businessUnits.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {showDept && options.departments.length > 0 && (
                <Field fieldKey="dept" label="Departments">
                  <ChecklistField
                    groups={[
                      {
                        label: '',
                        options: options.departments.map(d => ({ id: d.id, label: d.name })),
                      },
                    ]}
                    selected={filters.departmentIds ?? []}
                    onChange={ids => set({ departmentIds: ids })}
                  />
                </Field>
              )}
            </FilterBlock>

            {showMoj && (
              <FilterBlock
                title="Month of joining"
                icon={CalendarCheck}
                count={(filters.mojMonths?.length ?? 0) + (filters.mojYear ? 1 : 0)}
                tourKey={REPORTS_TOUR_TARGETS.filterMoj}
              >
                <Field fieldKey="moj" label="Joining month">
                  <MojInline
                    mojMonths={filters.mojMonths ?? []}
                    mojYear={filters.mojYear ?? ''}
                    onChange={(months, year) =>
                      set({
                        mojMonths: months.length ? months : undefined,
                        mojYear: !months.length && year ? year : undefined,
                      })
                    }
                  />
                </Field>
              </FilterBlock>
            )}
          </div>

          {/* ── Column 2: team + clients ───────────────────────────────── */}
          <div className="space-y-4">
            <FilterBlock
              title="Team and clients"
              icon={Building2}
              count={clientCount}
              tourKey={REPORTS_TOUR_TARGETS.filterScope}
            >
              <Field fieldKey="team" label="Team">
                <TeamTreePicker value={team} onChange={setTeam} />
              </Field>

              <Field fieldKey="clients" label="Clients">
                <ChecklistField
                  groups={clientGroups}
                  selected={filters.clientIds ?? []}
                  onChange={ids => set({ clientIds: ids, clientSpocIds: [] })}
                  searchPlaceholder="Search clients"
                />
              </Field>

              <Field
                fieldKey="spocs"
                label="Client SPOCs"
                hint={filters.clientIds?.length ? 'Only SPOCs of the selected clients.' : undefined}
              >
                <ChecklistField
                  groups={spocGroups}
                  selected={filters.clientSpocIds ?? []}
                  onChange={ids => set({ clientSpocIds: ids })}
                  searchPlaceholder="Search SPOCs or clients"
                  emptyText="No SPOCs for the selected clients."
                />
              </Field>
            </FilterBlock>
          </div>

          {/* ── Column 3: people ───────────────────────────────────────── */}
          <div className="space-y-4">
            {peopleFilters.length > 0 && (
              <FilterBlock
                title="People"
                icon={UserCog}
                count={peopleCount}
                tourKey={REPORTS_TOUR_TARGETS.filterCreator}
              >
                {peopleFilters.map(pf => (
                  <Field
                    key={pf.key}
                    fieldKey={pf.key}
                    label={pf.labelByTab?.[activeTab] ?? pf.label}
                  >
                    <ChecklistField
                      groups={peopleGroups(options.people[pf.option], pf.countUnit)}
                      selected={filters[pf.key] ?? []}
                      onChange={ids =>
                        set({ [pf.key]: ids.length ? ids : undefined } as Partial<Filters>)
                      }
                      searchPlaceholder="Search name or role"
                    />
                  </Field>
                ))}
              </FilterBlock>
            )}
          </div>
        </div>
      </div>

      <SheetFooter className="flex-row items-center gap-2 border-t border-border px-6 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={resetAll}
          disabled={draftChips.length === 0}
          className="mr-auto"
        >
          <RotateCcw /> Reset all
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onApply({ filters, win, team })}>
          Apply filters
          {draftChips.length > 0 && (
            <span className="rounded-full bg-primary-foreground px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-primary">
              {draftChips.length}
            </span>
          )}
        </Button>
      </SheetFooter>
    </FlashContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLIED FILTERS BAR — always visible, every filter removable in one click
// ─────────────────────────────────────────────────────────────────────────────

interface FilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

function namesOf<T extends { id: string }>(
  ids: string[] | undefined,
  list: T[],
  name: (t: T) => string
): string | null {
  if (!ids?.length) return null;
  if (ids.length === 1)
    return name(list.find(x => x.id === ids[0]) ?? ({ id: ids[0] } as T)) || '1 selected';
  return `${ids.length} selected`;
}

function buildFilterChips(args: {
  activeTab: TabKey;
  filters: Filters;
  win: WinState;
  team: TeamSelection | null;
  options: FilterOptions;
  setFilters: (fn: (f: Filters) => Filters) => void;
  setWin: (w: WinState) => void;
  setTeam: (t: TeamSelection | null) => void;
}): FilterChip[] {
  const { activeTab, filters, win, team, options, setFilters, setWin, setTeam } = args;
  const chips: FilterChip[] = [];
  const drop = (patch: Partial<Filters>) => () => setFilters(f => ({ ...f, ...patch }));
  const push = (key: string, label: string, value: string | null, onRemove: () => void) => {
    if (value) chips.push({ key, label, value, onRemove });
  };

  if (activeTab === 'requirements') {
    for (const df of REQ_DATE_FILTERS)
      push(df.key, df.label, dateFilterLabel(filters[df.key]), drop({ [df.key]: undefined }));
  } else if (!isWinAllTime(win)) {
    push('win', 'Date', winLabel(win), () => setWin(ALL_TIME_WIN));
  }

  if (team) {
    const t = team as any;
    push('team', 'Team', t.label ?? t.name ?? `${team.memberIds.length} people`, () =>
      setTeam(null)
    );
  }

  push(
    'clients',
    'Client',
    namesOf(filters.clientIds, options.clients, c => c.name),
    drop({ clientIds: undefined, clientSpocIds: undefined })
  );
  push(
    'spocs',
    'SPOC',
    namesOf(filters.clientSpocIds, options.spocs, s => s.name),
    drop({ clientSpocIds: undefined })
  );
  push(
    'sl',
    'Service line',
    namesOf(filters.serviceLineIds, options.serviceLines, s => s.name),
    drop({ serviceLineIds: undefined })
  );
  push(
    'bu',
    'Business unit',
    filters.businessUnitId
      ? (options.businessUnits.find(b => b.id === filters.businessUnitId)?.name ?? '1 selected')
      : null,
    drop({ businessUnitId: undefined })
  );
  push(
    'dept',
    'Department',
    namesOf(filters.departmentIds, options.departments, d => d.name),
    drop({ departmentIds: undefined })
  );
  push(
    'status',
    'Status',
    namesOf(
      filters.statuses,
      ALL_REPORT_STATUSES.map(s => ({ id: s.key, label: s.label })),
      s => s.label
    ),
    drop({ statuses: undefined })
  );

  for (const pf of PEOPLE_FILTERS) {
    if (!pf.tabs.includes(activeTab)) continue;
    push(
      pf.key,
      pf.labelByTab?.[activeTab] ?? pf.label,
      namesOf(filters[pf.key], options.people[pf.option], p => p.name),
      drop({ [pf.key]: undefined })
    );
  }

  if (activeTab === 'recruiters') {
    const months = filters.mojMonths ?? [];
    const moj = months.length
      ? months.length === 1
        ? `${MONTH_OPTIONS.find(o => o.value === months[0].split('-')[1])?.label ?? months[0]} ${months[0].split('-')[0]}`
        : `${months.length} months`
      : (filters.mojYear ?? null);
    push('moj', 'Joining', moj, drop({ mojMonths: undefined, mojYear: undefined }));
  }

  return chips;
}

/** One filter chip: click the body to open/jump, click × to remove */
function FilterChipView({ chip, onSelect }: { chip: FilterChip; onSelect: () => void }) {
  return (
    <span className="inline-flex h-7 max-w-80 items-center rounded-md border border-primary/25 bg-primary/5 text-xs">
      <button
        type="button"
        onClick={onSelect}
        title={`Edit ${chip.label}`}
        className="flex h-full min-w-0 items-center gap-1.5 rounded-l-md pl-2.5 pr-1.5 transition-colors hover:bg-primary/10"
      >
        <span className="text-muted-foreground">{chip.label}</span>
        <span className="truncate font-semibold text-foreground">{chip.value}</span>
      </button>
      <button
        type="button"
        onClick={chip.onRemove}
        aria-label={`Remove ${chip.label} filter`}
        className="flex h-full w-6 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function AppliedFiltersBar({
  chips,
  onClearAll,
  onOpen,
  emptyLabel,
}: {
  chips: FilterChip[];
  onClearAll: () => void;
  onOpen: (focusKey?: string) => void;
  emptyLabel: string;
}) {
  return (
    <div
      {...tourTarget(REPORTS_TOUR_TARGETS.window)}
      className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border bg-card px-6 py-2"
    >
      <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Filter className="size-3.5 text-primary" />
        {chips.length ? 'Filtered by' : 'No filters'}
      </span>
      {chips.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {emptyLabel}{' '}
          <button
            type="button"
            onClick={() => onOpen()}
            className="font-medium text-primary hover:underline"
          >
            Add a filter
          </button>
        </p>
      ) : (
        <>
          {chips.map(c => (
            <FilterChipView key={c.key} chip={c} onSelect={() => onOpen(c.key)} />
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="ml-1 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALE OVERVIEW
// Counts row  — requirements · candidates · pipeline · placed (click → list)
// Value row   — Funnel (total computed value) · Pipeline · Achieved
//               Pipeline / Achieved also slice the table (same bucket as before)
// ─────────────────────────────────────────────────────────────────────────────

interface SaleSummaryLike {
  totalSaleValue: number;
  totalAchievedValue: number;
  totalNearTerminalValue: number;
  includedCount?: number;
  omittedCount?: number;
  byBasis?: Record<string, { count: number; total: number }>;
}

/** Display names for the value basis buckets returned by the API */
const BASIS_LABELS: Record<string, string> = {
  SALE_VALUE: 'direct value',
  BAND: 'band',
  FIXED_PCT: '% of salary',
};

type CandidateListType = 'all' | 'pipeline' | 'placed';

interface OverviewCounts {
  requirements: number;
  requirementsLabel: string;
  candidates: number | null;
  pipeline: number | null;
  placed: number | null;
}

function SaleOverview({
  summary,
  counts,
  bucket,
  onBucketChange,
  onOpenCandidates,
  tourKey,
}: {
  summary: SaleSummaryLike;
  counts: OverviewCounts;
  bucket: SaleBucket;
  onBucketChange: (b: SaleBucket) => void;
  onOpenCandidates: (type: CandidateListType) => void;
  tourKey?: string;
}) {
  const funnel = summary.totalSaleValue || 0;
  const achieved = summary.totalAchievedValue || 0;
  const pipeline = summary.totalNearTerminalValue || 0;
  const pct = (v: number) => (funnel > 0 ? (v / funnel) * 100 : 0);
  const omitted = summary.omittedCount ?? 0;

  const basisLine = Object.entries(summary.byBasis ?? {})
    .filter(([k, v]) => BASIS_LABELS[k] && v.count > 0)
    .map(([k, v]) => `${v.count} by ${BASIS_LABELS[k]}`)
    .join(', ');

  const countTiles: {
    key: string;
    label: string;
    value: number | null;
    list: CandidateListType | null;
  }[] = [
    { key: 'reqs', label: counts.requirementsLabel, value: counts.requirements, list: null },
    { key: 'cands', label: 'Candidates', value: counts.candidates, list: 'all' },
    { key: 'pipe', label: 'In pipeline', value: counts.pipeline, list: 'pipeline' },
    { key: 'placed', label: 'Placed', value: counts.placed, list: 'placed' },
  ];

  // Order: Funnel → Pipeline → Achieved
  const valueCards: {
    key: string;
    label: string;
    value: number;
    sub: string;
    dot: string;
    bucket: SaleBucket;
  }[] = [
    {
      key: 'funnel',
      label: 'Funnel',
      value: funnel,
      sub:
        omitted > 0
          ? `${omitted} requirements have no value yet`
          : basisLine || 'Total computed value',
      dot: 'bg-muted-foreground/30',
      bucket: null,
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      value: pipeline,
      sub: `${Math.round(pct(pipeline))}% of funnel`,
      dot: 'bg-primary/45',
      bucket: 'nearTerminal',
    },
    {
      key: 'achieved',
      label: 'Achieved',
      value: achieved,
      sub: `${Math.round(pct(achieved))}% of funnel`,
      dot: 'bg-primary',
      bucket: 'terminal',
    },
  ];

  return (
    <section {...(tourKey ? tourTarget(tourKey) : {})} className={PANEL}>
      {/* ── Counts ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-border border-b border-border sm:grid-cols-4 sm:divide-x">
        {countTiles.map(t => {
          const clickable = !!t.list && (t.value ?? 0) > 0;
          return (
            <button
              type="button"
              key={t.key}
              disabled={!clickable}
              onClick={() => t.list && onOpenCandidates(t.list)}
              className="group px-5 py-4 text-left transition-colors enabled:hover:bg-muted/50 disabled:cursor-default"
            >
              <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
              <span className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {t.value != null ? t.value.toLocaleString('en-IN') : '—'}
              </span>
              <span
                className={cn(
                  'mt-0.5 block text-[11px] font-medium text-primary opacity-0 transition-opacity',
                  clickable && 'group-hover:opacity-100'
                )}
              >
                View candidates
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Value ──────────────────────────────────────────────────────── */}
      <div className="p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Where the funnel stands</span>
          {bucket && (
            <button
              type="button"
              onClick={() => onBucketChange(null)}
              className="font-medium text-primary hover:underline"
            >
              Show all requirements
            </button>
          )}
        </div>

        {/* Track = funnel; filled from the left: achieved, then pipeline */}
        <div className="mt-2.5 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
          {[
            { key: 'achieved', value: achieved, cls: 'bg-primary', b: 'terminal' as SaleBucket },
            {
              key: 'pipeline',
              value: pipeline,
              cls: 'bg-primary/45',
              b: 'nearTerminal' as SaleBucket,
            },
          ].map(seg =>
            seg.value > 0 ? (
              <div
                key={seg.key}
                style={{ width: `${pct(seg.value)}%` }}
                className={cn(
                  'h-full transition-opacity',
                  seg.cls,
                  bucket && seg.b !== bucket && 'opacity-25'
                )}
              />
            ) : null
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {valueCards.map(c => {
            const on = !!c.bucket && bucket === c.bucket;
            return (
              <button
                type="button"
                key={c.key}
                disabled={!c.bucket}
                onClick={() => onBucketChange(on ? null : c.bucket)}
                title={
                  c.bucket
                    ? `Show only requirements with ${c.label.toLowerCase()} candidates`
                    : undefined
                }
                className={cn(
                  'rounded-lg border px-4 py-3 text-left transition-colors disabled:cursor-default',
                  on
                    ? 'border-primary/40 bg-primary/10'
                    : c.bucket
                      ? 'border-border enabled:hover:bg-muted/60'
                      : 'border-border bg-muted/30'
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className={cn('size-2 rounded-full', c.dot)} />
                  {c.label}
                </span>
                <span className="mt-1 block text-xl font-semibold tracking-tight tabular-nums text-foreground">
                  {fmtCurrency(c.value)}
                </span>
                <span className="block text-[11px] text-muted-foreground">{c.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATES SHEET — the people behind the counts.
// Who, which requirement, owner recruiter, stage, when + who moved them there,
// offer, joining (LWD / notice period) and MOJ.
// ─────────────────────────────────────────────────────────────────────────────

const CANDIDATE_LIST_TYPES: {
  key: CandidateListType;
  label: string;
  /** /reports/recruiters/drill uses its own type names */
  recruiterDrillType: string;
}[] = [
  { key: 'all', label: 'All candidates', recruiterDrillType: 'recruiter' },
  { key: 'pipeline', label: 'In pipeline', recruiterDrillType: 'near_terminal' },
  { key: 'placed', label: 'Placed', recruiterDrillType: 'placed' },
];

interface CandidateSheetState {
  source: 'requirements' | 'recruiters';
  type: CandidateListType;
}

const fmtDate = (d?: string | Date | null) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

function CandidatesSheet({
  state,
  qs,
  counts,
  onType,
  onClose,
}: {
  state: CandidateSheetState | null;
  qs: string;
  counts: Partial<Record<CandidateListType, number | null>>;
  onType: (t: CandidateListType) => void;
  onClose: () => void;
}) {
  const axios = useAxios();
  const [query, setQuery] = useState('');

  const typeMeta = CANDIDATE_LIST_TYPES.find(t => t.key === state?.type);
  const url = !state
    ? null
    : state.source === 'requirements'
      ? `/reports/requirements/candidates?${qs}&type=${state.type}`
      : `/reports/recruiters/drill?${qs}&type=${typeMeta?.recruiterDrillType}`;

  const { data, isLoading } = useQuery({
    queryKey: ['report-candidate-list', url],
    queryFn: async () => (await axios.get(url!)).data,
    enabled: !!url,
    staleTime: 60_000,
  });

  const rows: any[] = data?.data ?? [];
  const capped = !!data?.meta?.capped;
  const term = query.trim().toLowerCase();
  const shown = term
    ? rows.filter(r =>
        [
          r.candidateName,
          r.candidateEmail,
          r.reqCode,
          r.reqTitle,
          r.clientName,
          r.recruiterName,
          r.stageLabel,
        ]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(term))
      )
    : rows;

  // Stage flags only: placed → dropped → on hold → pipeline → active
  const status = (r: any) =>
    r.isTerminal
      ? { label: 'Placed', cls: 'bg-primary text-primary-foreground' }
      : r.isDropped
        ? { label: 'Dropped', cls: 'bg-destructive/10 text-destructive' }
        : r.isOnHold
          ? { label: 'On hold', cls: 'bg-muted text-muted-foreground' }
          : r.isNearTerminal
            ? { label: 'Pipeline', cls: 'bg-primary/15 text-primary' }
            : { label: 'Active', cls: 'bg-muted text-foreground' };

  return (
    <Sheet open={!!state} onOpenChange={o => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[min(1280px,96vw)]! max-w-none! gap-0 p-0 sm:max-w-none!"
      >
        <SheetHeader className="border-b border-border px-6 py-4 pr-14">
          <SheetTitle className="text-lg font-semibold">
            {typeMeta?.label ?? 'Candidates'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Same filters as the report. Each row shows who moved the candidate into the current
            stage and when.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
          <div className={SEG_WRAP}>
            {CANDIDATE_LIST_TYPES.map(t => (
              <button
                type="button"
                key={t.key}
                onClick={() => onType(t.key)}
                className={cn(SEG_ITEM, state?.type === t.key ? SEG_ON : SEG_IDLE)}
              >
                {t.label}
                {counts[t.key] != null && (
                  <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[t.key]}</span>
                )}
              </button>
            ))}
          </div>
          <label className={cn(FIELD_BOX, 'w-72')}>
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search candidate, requirement, client, recruiter"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <span className="ml-auto text-xs text-muted-foreground">
            {isLoading ? 'Loading' : `${shown.length} shown`}
            {capped && ' (first 1,000)'}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No candidates here for the current filters.
            </p>
          ) : (
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="text-[11px] font-semibold text-muted-foreground">
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">Requirement</th>
                  <th className="px-4 py-2.5">Recruiter</th>
                  <th className="px-4 py-2.5">Stage</th>
                  <th className="px-4 py-2.5">Moved there</th>
                  <th className="px-4 py-2.5">Offer</th>
                  <th className="px-4 py-2.5">Joining</th>
                  <th className="px-4 py-2.5 text-right">In pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map(r => {
                  const st = status(r);
                  return (
                    <tr key={r.pipelineId} className="align-top hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{r.candidateName}</p>
                        <p className="text-muted-foreground">
                          {[r.currentTitle, r.currentCompany].filter(Boolean).join(' at ') || '—'}
                        </p>
                        <p className="text-muted-foreground">
                          {[r.candidateEmail, r.candidatePhone].filter(Boolean).join(', ')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{r.reqCode}</p>
                        <p className="max-w-56 truncate text-muted-foreground" title={r.reqTitle}>
                          {r.reqTitle}
                        </p>
                        <p className="text-muted-foreground">{r.clientName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{r.recruiterName || '—'}</p>
                        {r.createdByName && (
                          <p className="text-muted-foreground">Req by {r.createdByName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            st.cls
                          )}
                        >
                          {st.label}
                        </span>
                        <p className="mt-1 text-foreground">{r.stageLabel}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{fmtDate(r.stageReachedAt) ?? '—'}</p>
                        <p className="text-muted-foreground">
                          {r.stageMovedBy ? `by ${r.stageMovedBy}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="tabular-nums text-foreground">
                          {r.offeredCtc != null ? fmtCurrency(Number(r.offeredCtc)) : '—'}
                        </p>
                        <p className="text-muted-foreground">{r.offerStatus ?? ''}</p>
                        {r.expectedCtc != null && (
                          <p className="text-muted-foreground">
                            Expects {fmtCurrency(Number(r.expectedCtc))}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{r.monthOfJoining ?? '—'}</p>
                        {r.joiningDate && (
                          <p className="text-muted-foreground">
                            {fmtDate(r.joiningDate)}
                            {r.daysToJoin != null && r.daysToJoin >= 0 && `, in ${r.daysToJoin}d`}
                          </p>
                        )}
                        {r.joiningSourceLabel && (
                          <p className="text-muted-foreground">
                            From {r.joiningSourceLabel.toLowerCase()}
                            {r.joiningSource === 'NOTICE_PERIOD' &&
                              r.noticeDays != null &&
                              ` (${r.noticeDays}d)`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {r.pipelineDays}d
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATED-MONTH TIMELINE — where the listed requirements were created.
// Bar height = requirements; filled part = share of that month's sale value
// already achieved. Click a month to filter; click again to clear.
// ─────────────────────────────────────────────────────────────────────────────

const BAR_MAX_PX = 64;

function CreatedMonthTimeline({
  months,
  activeMonth,
  onPick,
}: {
  months: CreatedMonthStat[];
  activeMonth: string | null;
  onPick: (month: string | null) => void;
}) {
  if (!months.length) return null;
  const maxReq = Math.max(...months.map(m => m.requirements), 1);
  const totalReq = months.reduce((n, m) => n + m.requirements, 0);
  const first = months[0].label;
  const last = months[months.length - 1].label;

  return (
    <section className={PANEL}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Requirements by created month</h2>
        <p className="text-xs text-muted-foreground">
          {totalReq} requirement{totalReq !== 1 ? 's' : ''} created
          {months.length > 1 ? ` between ${first} and ${last}` : ` in ${first}`}. The filled part of
          each bar is the share of the funnel achieved.
        </p>
        {activeMonth && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            Show all months
          </button>
        )}
      </div>

      <div className="flex items-end gap-1 overflow-x-auto px-3 pb-2 pt-3">
        {months.map(m => {
          const on = activeMonth === m.month;
          const dim = !!activeMonth && !on;
          const h = Math.max(10, Math.round((m.requirements / maxReq) * BAR_MAX_PX));
          const pct =
            m.computedSaleValue > 0
              ? Math.min(100, (m.achievedValue / m.computedSaleValue) * 100)
              : 0;
          return (
            <button
              type="button"
              key={m.month}
              onClick={() => onPick(on ? null : m.month)}
              title={`${m.label}: ${m.requirements} requirements, ${fmtCurrency(m.computedSaleValue)} funnel, ${fmtCurrency(m.achievedValue)} achieved (${Math.round(pct)}%), ${m.terminalCount} placed, ${m.nearTerminalCount} in pipeline`}
              className={cn(
                'flex w-20 shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                on ? 'bg-primary/10' : 'hover:bg-muted',
                dim && 'opacity-45'
              )}
            >
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {m.requirements}
              </span>
              <div className="flex items-end" style={{ height: BAR_MAX_PX }}>
                <div
                  className="flex w-7 flex-col justify-end overflow-hidden rounded-md bg-primary/15"
                  style={{ height: h }}
                >
                  <div className="w-full bg-primary" style={{ height: `${pct}%` }} />
                </div>
              </div>
              <span
                className={cn('text-[11px] font-medium', on ? 'text-primary' : 'text-foreground')}
              >
                {m.label}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {m.achievedValue > 0 ? fmtCurrency(m.achievedValue) : 'No closures'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LINE TABS — spreadsheet sheet tabs
// ─────────────────────────────────────────────────────────────────────────────

const keyOf = (g: { serviceLine: ServiceLineRef | null }) => g.serviceLine?.id ?? '__none__';
const nameOf = (g: { serviceLine: ServiceLineRef | null }) => g.serviceLine?.name ?? 'Unassigned';

function LineTabs({
  groups,
  activeKey,
  onSelect,
}: {
  groups: { serviceLine: ServiceLineRef | null; total: number }[];
  activeKey: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div
      {...tourTarget(REPORTS_TOUR_TARGETS.serviceLines)}
      className="flex items-end gap-1 overflow-x-auto border-b border-border bg-muted/60 px-3 pt-2"
    >
      {groups.map(g => {
        const k = keyOf(g);
        const active = k === activeKey;
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={cn(
              '-mb-px flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border px-3 py-1.5 text-xs transition-colors',
              active
                ? 'border-border border-b-card bg-card font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Layers className={cn('size-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
            {nameOf(g)}
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] font-semibold leading-4 tabular-nums',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              )}
            >
              {g.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALE BUCKET + CREATED-MONTH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type ReqRow = RequirementGroup['data'][number];

/** Same slice rule used by the table AND sent to the export */
const rowInBucket = (r: ReqRow, bucket: SaleBucket) =>
  bucket === 'terminal'
    ? (r.terminalCount ?? 0) > 0
    : bucket === 'nearTerminal'
      ? (r.nearTerminalCount ?? 0) > 0
      : true;

interface CreatedMonthStat {
  month: string; // YYYY-MM (server timezone)
  label: string; // Jul 2026
  requirements: number;
  computedSaleValue: number;
  terminalCount: number;
  achievedValue: number;
  nearTerminalCount: number;
}

/** Month key/label come from the server; createdAt is only a fallback */
const rowMonth = (r: any): { month: string; label: string } => {
  if (r.createdMonth)
    return { month: r.createdMonth, label: r.createdMonthLabel ?? r.createdMonth };
  const d = new Date(r.createdAt);
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { month, label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }) };
};

function buildCreatedMonths(rows: ReqRow[]): CreatedMonthStat[] {
  const map = new Map<string, CreatedMonthStat>();
  for (const r of rows as any[]) {
    const { month, label } = rowMonth(r);
    const m = map.get(month) ?? {
      month,
      label,
      requirements: 0,
      computedSaleValue: 0,
      terminalCount: 0,
      achievedValue: 0,
      nearTerminalCount: 0,
    };
    m.requirements++;
    m.computedSaleValue += r.computedSaleValue ?? 0;
    m.terminalCount += r.terminalCount ?? 0;
    m.achievedValue += r.achievedValue ?? 0;
    m.nearTerminalCount += r.nearTerminalCount ?? 0;
    map.set(month, m);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** "YYYY-MM" → full-month custom Created filter */
function monthToDateFilter(month: string): DateFilter {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    range: 'custom',
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Which month chip is active (Created filter set to exactly one full month) */
function activeCreatedMonth(d?: DateFilter): string | null {
  if (!d || d.range !== 'custom' || !d.from || !d.to) return null;
  const month = d.from.slice(0, 7);
  const full = monthToDateFilter(month);
  return d.from === full.from && d.to === full.to ? month : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT SECTION
// ─────────────────────────────────────────────────────────────────────────────

function RequirementSection({
  resp,
  loading,
  onDownloadRow,
  onDownloadAll,
  onDownloadSelected,
  sortBy,
  sortDir,
  onSortChange,
  bucket = null,
}: {
  resp?: RequirementReportResponse;
  loading: boolean;
  onDownloadRow: (id: string, reqCode: string) => void;
  onDownloadAll: (
    slId?: string,
    stageIds?: string[],
    hiddenStageIds?: string[],
    hiddenCandidateCols?: string[]
  ) => void;
  onDownloadSelected: (
    ids: string[],
    slId?: string,
    stageIds?: string[],
    hiddenStageIds?: string[],
    hiddenCandidateCols?: string[]
  ) => void;
  sortBy: SortKey | null;
  sortDir: 'asc' | 'desc' | null;
  onSortChange: (key: SortKey | null, dir: 'asc' | 'desc' | null) => void;
  /** Sale summary filter — narrows rows to near-close or placed. */
  bucket?: SaleBucket;
}) {
  const [activeKey, setActiveKey] = useState<string>('');
  if (loading)
    return (
      <div className="p-3">
        <Skel rows={6} />
      </div>
    );
  const groups: RequirementGroup[] = (resp?.groups ?? [])
    .map(g => {
      if (!bucket) return g;
      const data = g.data.filter(r => rowInBucket(r, bucket));
      return { ...g, data, total: data.length };
    })
    .filter(g => g.data.length > 0);
  if (!groups.length)
    return (
      <div className="p-3">
        <Empty
          msg={
            bucket
              ? 'No requirements in this slice. Click the highlighted stat again to clear it.'
              : 'No requirements match these filters. Widen the dates or remove a filter.'
          }
        />
      </div>
    );
  const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];

  return (
    <div className="flex flex-col">
      <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />
      <div className="p-3">
        <RequirementTable
          key={keyOf(active)}
          title={active.serviceLine?.name ?? null}
          serviceLineId={active.serviceLine?.id}
          data={active.data}
          stages={active.stages}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={onSortChange}
          onDownloadAll={onDownloadAll}
          onDownloadSelected={onDownloadSelected}
          onDownloadRow={onDownloadRow}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES DRILL DRAWER (tab hidden, kept intact)
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  ON_HOLD: 'bg-orange-50 text-orange-700',
  CLOSED: 'bg-red-50 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function SalesDrillDrawer({
  payload,
  onClose,
}: {
  payload: SalesDrillPayload;
  onClose: () => void;
}) {
  const axios = useAxios();
  const drillQuery = useQuery({
    queryKey: ['sales-drill-req', payload],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (payload.type) p.set('type', payload.type);
      if (payload.stageId) p.set('stageId', payload.stageId);
      if (payload.reqId) p.set('reqId', payload.reqId);
      return (await axios.get(`/reports/sales/drill?${p}`)).data;
    },
  });

  const rows: any[] = drillQuery.data?.data?.rows ?? [];
  const totals: any = drillQuery.data?.data?.totals ?? {};
  const loading = drillQuery.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-black text-slate-900">{payload.label}</h2>
            <p className="text-[12px] text-slate-400">
              {loading ? 'Loading…' : `${rows.length} requirement${rows.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex items-center gap-6 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[12px]">
            <span className="font-black text-slate-700">{totals.reqs} reqs</span>
            <span className="font-black text-emerald-700">{totals.placed} placed</span>
            <span className="font-semibold text-blue-600">{totals.active} active</span>
            <span className="font-semibold text-red-500">{totals.dropped} dropped</span>
            <span className="ml-auto font-black text-indigo-700">
              {fmtCurrency(totals.saleValue ?? 0)} total sale value
            </span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[13px] text-slate-400">
              No requirements match this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r: any) => (
                <div
                  key={r.id}
                  className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          {r.reqCode}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[r.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] font-black text-slate-900">
                        {r.title}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[16px] font-black text-emerald-700">
                        {fmtCurrency(r.saleValue ?? 0)}
                      </p>
                      <p className="text-[11px] text-slate-400">sale value</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const axios = useAxios();
  const { user } = useAuth();
  const { canView } = usePermission('reports');
  const hasAccess = user?.isSuperAdmin || canView;
  const filterOptions = useReportFilterOptions();

  const [activeTab, setActiveTab] = useState<TabKey>(DEFAULT_TAB);
  const [filters, setFilters] = useState<Filters>({});
  const [win, setWin] = useState<WinState>(DEFAULT_WIN);
  const [standardOnly] = useState(false);
  const [recDrill, setRecDrill] = useState<ActivityDrillTarget | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [salesDrillPayload, setSalesDrillPayload] = useState<SalesDrillPayload | null>(null);
  const [teamSelection, setTeamSelection] = useState<TeamSelection | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterFocus, setFilterFocus] = useState<string | null>(null);
  const [candidateSheet, setCandidateSheet] = useState<CandidateSheetState | null>(null);
  const [reqSortBy, setReqSortBy] = useState<SortKey | null>(null);
  const [reqSortDir, setReqSortDir] = useState<'asc' | 'desc' | null>(null);
  // Sale summary filters — one per tab, so switching tabs keeps each slice
  const [reqBucket, setReqBucket] = useState<SaleBucket>(null);
  const [recBucket, setRecBucket] = useState<SaleBucket>(null);

  const activeTabMeta = TAB_CONFIG.find(t => t.key === activeTab);

  // Clears filters that don't exist on the next tab (driven by config)
  const handleTabChange = useCallback((next: TabKey) => {
    setFilters(f => {
      const nf: Filters = { ...f };
      if (next !== 'recruiters') {
        nf.mojMonths = undefined;
        nf.mojYear = undefined;
      }
      if (next !== 'requirements') {
        nf.createdDate = undefined;
        nf.activityDate = undefined;
      }
      if (next === 'overview' || next === 'candidates' || next === 'sales') {
        nf.statuses = undefined;
      }
      for (const pf of PEOPLE_FILTERS) {
        if (!pf.tabs.includes(next)) nf[pf.key] = undefined;
      }
      return nf;
    });
    setActiveTab(next);
  }, []);

  // ── Applied filter chips (always visible) ────────────────────────────────
  const chips = buildFilterChips({
    activeTab,
    filters,
    win,
    team: teamSelection,
    options: filterOptions,
    setFilters,
    setWin,
    setTeam: setTeamSelection,
  });

  const openFilters = useCallback((focusKey?: string) => {
    setFilterFocus(focusKey ?? null);
    setFiltersOpen(true);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setTeamSelection(null);
    if (activeTab !== 'requirements') setWin(ALL_TIME_WIN);
  }, [activeTab]);

  // ── ONE params builder — every report call + export derives from this ────
  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(winToParams(win)).forEach(([k, v]) => p.set(k, v));
    (filters.clientIds ?? []).forEach(id => p.append('clientId', id));
    (filters.clientSpocIds ?? []).forEach(id => p.append('clientSpocId', id));
    (filters.serviceLineIds ?? []).forEach(id => p.append('serviceLineId', id));
    if (filters.businessUnitId) p.set('businessUnitId', filters.businessUnitId);
    (filters.departmentIds ?? []).forEach(id => p.append('departmentId', id));
    (filters.statuses ?? []).forEach(s => p.append('status', s));
    for (const pf of PEOPLE_FILTERS) {
      (filters[pf.key] ?? []).forEach(id => p.append(pf.param, id));
    }
    if (standardOnly) p.set('standardOnly', 'true');
    if (teamSelection) {
      p.set('userIds', teamSelection.memberIds.join(','));
      p.set('teamRootId', teamSelection.id);
    }
    return p;
  }, [win, filters, standardOnly, teamSelection]);

  const baseQs = baseParams.toString();

  // Recruiter tab: base + MOJ
  const recParams = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    const months = filters.mojMonths ?? [];
    if (months.length) {
      months.forEach(m => p.append('mojMonth', m));
    } else if (filters.mojYear) {
      p.set('mojYear', filters.mojYear);
    }
    return p.toString();
  }, [baseQs, filters.mojMonths, filters.mojYear]);

  // Requirements tab FILTERS (no sort) — shared by table, funnel stats AND exports.
  // Generic window params are dropped — requirements use their own two date filters
  const reqFilterQs = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    WINDOW_PARAM_KEYS.forEach(k => p.delete(k));
    for (const df of REQ_DATE_FILTERS) appendDateFilter(p, df.prefix, filters[df.key]);
    return p.toString();
  }, [baseQs, filters.createdDate, filters.activityDate]);

  // Export = table filters + the summary-bar slice currently applied on screen
  const reqExportQs = useMemo(() => {
    const p = new URLSearchParams(reqFilterQs);
    if (reqBucket) p.set('bucket', reqBucket);
    return p.toString();
  }, [reqFilterQs, reqBucket]);

  // Requirements table = filters + sort
  const reqParams = useMemo(() => {
    const p = new URLSearchParams(reqFilterQs);
    if (reqSortBy) {
      p.set('sortBy', reqSortBy);
      p.set('sortDir', reqSortDir ?? 'asc');
    }
    return p.toString();
  }, [reqFilterQs, reqSortBy, reqSortDir]);

  // ── Queries ───────────────────────────────────────────────────────────────
  const overviewQuery = useQuery({
    queryKey: ['report-overview-v2', baseQs],
    queryFn: async () => (await axios.get(`/reports/overview?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'overview',
    staleTime: 60_000,
  });

  // Recruiters tab — ONE call: activity rows + stats summary (logs only)
  const recruiterActivityQuery = useQuery({
    queryKey: ['report-recruiters-activity', recParams],
    queryFn: async () =>
      (await axios.get(`/reports/recruiters/activity?${recParams}`))
        .data as RecruiterActivityResponse,
    enabled: hasAccess && activeTab === 'recruiters',
    staleTime: 60_000,
  });

  const requirementQuery = useQuery({
    queryKey: ['report-requirements', reqParams],
    queryFn: async () =>
      (await axios.get(`/reports/requirements?${reqParams}`)).data as RequirementReportResponse,
    enabled: hasAccess && activeTab === 'requirements',
    staleTime: 60_000,
  });

  const salesQuery = useQuery({
    queryKey: ['report-sales', baseQs],
    queryFn: async () => (await axios.get(`/reports/sales?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'sales',
    staleTime: 60_000,
  });

  // ── Created-month breakdown — from exactly the rows the table shows ──────
  const createdMonths = useMemo(() => {
    const rows = (requirementQuery.data?.groups ?? []).flatMap(g => g.data);
    return buildCreatedMonths(rows.filter(r => rowInBucket(r, reqBucket)));
  }, [requirementQuery.data, reqBucket]);

  // Counts from exactly the rows the table shows (respects the slice)
  const reqCounts = useMemo(() => {
    const rows = (requirementQuery.data?.groups ?? [])
      .flatMap(g => g.data)
      .filter(r => rowInBucket(r, reqBucket)) as any[];
    return {
      requirements: rows.length,
      candidates: rows.reduce((n, r) => n + (r.totalCandidates ?? 0), 0),
      pipeline: rows.reduce((n, r) => n + (r.nearTerminalCount ?? 0), 0),
      placed: rows.reduce((n, r) => n + (r.terminalCount ?? 0), 0),
    };
  }, [requirementQuery.data, reqBucket]);

  const pickCreatedMonth = useCallback((month: string | null) => {
    setFilters(f => ({ ...f, createdDate: month ? monthToDateFilter(month) : undefined }));
  }, []);

  // ── Guided tour ───────────────────────────────────────────────────────────
  const tourHandlers = useMemo<TourHandlers<ReportsTourRequirement>>(
    () => ({
      tab: value => {
        const next = VISIBLE_TABS.find(t => t.key === value)?.key;
        if (next && next !== activeTab) handleTabChange(next);
      },
      filtersOpen: value => setFiltersOpen(Boolean(value)),
    }),
    [activeTab, handleTabChange]
  );

  useTour(reportsTour, {
    handlers: tourHandlers,
    ready: !!hasAccess && !requirementQuery.isLoading,
  });

  // ── Download helper ───────────────────────────────────────────────────────
  const download = useCallback(
    async (url: string, filename: string, key: string) => {
      if (downloading) return;
      setDownloading(key);
      try {
        const res = await axios.get(url, { responseType: 'blob' });
        downloadBlob(res.data, filename);
      } catch (e) {
        console.error(e);
      } finally {
        setDownloading(null);
      }
    },
    [axios, downloading]
  );

  const dateStr = new Date().toISOString().split('T')[0];

  const handleRequirementAll = useCallback(
    (
      slId?: string,
      stageIds?: string[],
      hiddenStageIds?: string[],
      hiddenCandidateCols?: string[]
    ) => {
      const p = withExportOptions(reqExportQs, {
        slId,
        stageIds,
        hiddenStageIds,
        hiddenCandidateCols,
      });
      download(`/reports/requirements/export?${p}`, `requirements-${dateStr}.xlsx`, 'req-all');
    },
    [reqExportQs, download, dateStr]
  );

  const handleRequirementSelected = useCallback(
    (
      ids: string[],
      slId?: string,
      stageIds?: string[],
      hiddenStageIds?: string[],
      hiddenCandidateCols?: string[]
    ) => {
      const p = withExportOptions(reqFilterQs, {
        ids,
        slId,
        stageIds,
        hiddenStageIds,
        hiddenCandidateCols,
      });
      download(
        `/reports/requirements/export?${p}`,
        `requirements-selected-${dateStr}.xlsx`,
        'req-sel'
      );
    },
    [reqFilterQs, download, dateStr]
  );

  // Single row — still sends filters so team / recruiter candidate scoping applies
  const handleRequirementRow = useCallback(
    (id: string, reqCode: string) => {
      download(
        `/reports/requirements/${id}/export?${reqFilterQs}`,
        `requirement-${reqCode}-${dateStr}.xlsx`,
        `req-${id}`
      );
    },
    [reqFilterQs, download, dateStr]
  );

  if (!hasAccess)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">You do not have access to reports.</p>
      </div>
    );

  const reqSaleValueSummary = requirementQuery.data?.saleValueSummary ?? null;
  const recSummary = recruiterActivityQuery.data?.meta?.summary ?? null;
  const isFetching =
    (activeTab === 'requirements' && requirementQuery.isFetching) ||
    (activeTab === 'recruiters' && recruiterActivityQuery.isFetching);

  return (
    <Tabs
      value={activeTab}
      onValueChange={v => handleTabChange(v as TabKey)}
      className="flex min-h-screen flex-col gap-0 bg-background"
    >
      {/* ── Header: title · tabs · actions ─────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="flex h-14 items-stretch gap-6 px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart2 className="size-4" />
            </span>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-foreground">Reports</h1>
              <p className="hidden text-xs text-muted-foreground md:block">
                {activeTabMeta?.description}
              </p>
            </div>
          </div>

          <TabsList
            {...tourTarget(REPORTS_TOUR_TARGETS.tabs)}
            className="h-auto gap-1 self-stretch rounded-none bg-transparent p-0"
          >
            {VISIBLE_TABS.map(t => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="h-full flex-none gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-sm font-medium text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Icon className="size-4" /> {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="ml-auto flex items-center gap-2">
            {(downloading || isFetching) && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" />
                {downloading ? 'Preparing download' : 'Updating'}
              </span>
            )}

            <TourButton tourId={reportsTour.id} tourKey={REPORTS_TOUR_TARGETS.tourButton} />

            <Button
              type="button"
              variant={chips.length ? 'default' : 'outline'}
              {...tourTarget(REPORTS_TOUR_TARGETS.filtersToggle)}
              onClick={() => openFilters()}
              className="text-xs"
            >
              <Filter />
              Filters
              {chips.length > 0 && (
                <span className="rounded-full bg-primary-foreground px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-primary">
                  {chips.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Applied filters — always visible ──────────────────────────── */}
      <AppliedFiltersBar
        chips={chips}
        onClearAll={clearAllFilters}
        onOpen={openFilters}
        emptyLabel={
          activeTab === 'requirements'
            ? 'Showing every requirement in your scope, any time.'
            : 'Showing all activity in your scope, any time.'
        }
      />

      {/* ── Filters drawer ────────────────────────────────────────────── */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="w-[min(1200px,96vw)]! max-w-none! gap-0 p-0 sm:max-w-none!"
        >
          {filtersOpen && (
            <FiltersSheetBody
              activeTab={activeTab}
              options={filterOptions}
              initial={{ filters, win, team: teamSelection }}
              focusKey={filterFocus}
              onCancel={() => setFiltersOpen(false)}
              onApply={next => {
                setFilters(next.filters);
                setWin(next.win);
                setTeamSelection(next.team);
                setFiltersOpen(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 space-y-4 bg-muted/20 px-6 py-5">
        {activeTab === 'requirements' && reqSaleValueSummary && (
          <SaleOverview
            summary={reqSaleValueSummary}
            counts={{ ...reqCounts, requirementsLabel: 'Requirements' }}
            bucket={reqBucket}
            onBucketChange={setReqBucket}
            onOpenCandidates={type => setCandidateSheet({ source: 'requirements', type })}
            tourKey={REPORTS_TOUR_TARGETS.summary}
          />
        )}

        {activeTab === 'requirements' && !requirementQuery.isLoading && (
          <CreatedMonthTimeline
            months={createdMonths}
            activeMonth={activeCreatedMonth(filters.createdDate)}
            onPick={pickCreatedMonth}
          />
        )}

        {activeTab === 'recruiters' && recSummary && (
          <SaleOverview
            summary={recSummary.sale}
            counts={{
              requirements: recSummary.requirementCount,
              requirementsLabel: 'Requirements assigned',
              candidates: recSummary.candidates,
              pipeline: recSummary.pipeline,
              placed: recSummary.placed,
            }}
            bucket={recBucket}
            onBucketChange={setRecBucket}
            onOpenCandidates={type =>
              setRecDrill(
                type === 'placed'
                  ? { title: 'Placed in this period', bucket: 'placed' }
                  : type === 'pipeline'
                    ? { title: 'Moved to pipeline in this period', bucket: 'pipeline' }
                    : { title: 'All activity in this period' }
              )
            }
          />
        )}

        {/* Hidden tab — kept wired, not reachable from UI */}
        <TabsContent value="overview" className="m-0">
          <OverviewSection
            data={overviewQuery.data}
            loading={overviewQuery.isLoading}
            onDrill={setDrillTarget}
            baseQs={baseQs}
          />
        </TabsContent>

        <TabsContent value="requirements" className="m-0">
          <div className={PANEL}>
            <RequirementSection
              resp={requirementQuery.data}
              loading={requirementQuery.isLoading}
              onDownloadRow={handleRequirementRow}
              onDownloadAll={handleRequirementAll}
              onDownloadSelected={handleRequirementSelected}
              sortBy={reqSortBy}
              sortDir={reqSortDir}
              onSortChange={(key, dir) => {
                setReqSortBy(key);
                setReqSortDir(dir);
              }}
              bucket={reqBucket}
            />
          </div>
        </TabsContent>

        <TabsContent value="recruiters" className="m-0">
          <div className={cn(PANEL, 'flex flex-col gap-3 p-3')}>
            <RecruiterSection
              resp={recruiterActivityQuery.data}
              loading={recruiterActivityQuery.isLoading}
              baseQs={recParams}
              bucket={recBucket}
              onDrill={setRecDrill}
            />
          </div>
        </TabsContent>

        {/* Hidden tab — kept wired, not reachable from UI */}
        <TabsContent value="candidates" className="m-0">
          <CandidatesSection baseQs={baseQs} />
        </TabsContent>

        {/* Hidden tab — kept wired, not reachable from UI */}
        <TabsContent value="sales" className="m-0">
          <SalesSection
            data={salesQuery.data?.data ?? null}
            loading={salesQuery.isLoading}
            onDrill={setSalesDrillPayload}
          />
        </TabsContent>
      </main>

      {/* Candidates behind the counts */}
      <CandidatesSheet
        state={candidateSheet}
        qs={reqExportQs}
        counts={{
          all: reqCounts.candidates,
          pipeline: reqCounts.pipeline,
          placed: reqCounts.placed,
        }}
        onType={type => setCandidateSheet(s => (s ? { ...s, type } : s))}
        onClose={() => setCandidateSheet(null)}
      />

      {/* Recruiters tab — the stage moves behind any number */}
      <ActivityDrillDrawer target={recDrill} baseQs={recParams} onClose={() => setRecDrill(null)} />

      {/* Drawers */}
      <DrillDrawer target={drillTarget} baseQs={reqFilterQs} onClose={() => setDrillTarget(null)} />
      {salesDrillPayload && (
        <SalesDrillDrawer payload={salesDrillPayload} onClose={() => setSalesDrillPayload(null)} />
      )}
    </Tabs>
  );
}
