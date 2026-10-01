// File: page.tsx
// Path: src/app/(dashboard)/reports/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  ChevronDown,
  Calendar,
  Search,
  Check,
  CalendarCheck,
  Building2,
  UserCog,
  SlidersHorizontal,
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
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { CandidatesSection } from '@/components/reports/CandidatesSection';
import type {
  RecruiterResponse,
  RecruiterSaleSummaryResponse,
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
import { RecruiterSection } from '@/components/reports/RecruiterSection';
import { SaleSummaryBar } from '@/components/reports/SaleSummaryBar';
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

interface Filters {
  clientIds?: string[];
  clientSpocIds?: string[];
  serviceLineIds?: string[];
  businessUnitId?: string;
  departmentIds?: string[];
  createdById?: string;
  statuses?: string[];
  mojMonths?: string[];
  mojYear?: string;
  dateFilterMode?: 'activity' | 'createdAt';
}

type TabKey = 'overview' | 'recruiters' | 'requirements' | 'candidates' | 'sales';

interface SalesDrillPayload {
  label: string;
  type?: string;
  stageId?: string;
  reqId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CONFIG — flip `hidden` to bring a tab back. Components stay mounted in code.
// ─────────────────────────────────────────────────────────────────────────────

const TAB_CONFIG: { key: TabKey; label: string; icon: LucideIcon; hidden?: boolean }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, hidden: true },
  { key: 'requirements', label: 'Requirements', icon: FileText },
  { key: 'recruiters', label: 'Recruiters', icon: Users },
  { key: 'candidates', label: 'Candidates', icon: UserCheck, hidden: true },
  { key: 'sales', label: 'Sales', icon: BarChart2, hidden: true },
];

const VISIBLE_TABS = TAB_CONFIG.filter(t => !t.hidden);
const DEFAULT_TAB: TabKey = VISIBLE_TABS[0]?.key ?? 'requirements';

// ─────────────────────────────────────────────────────────────────────────────
// UI TOKENS — one place for the spreadsheet look
// ─────────────────────────────────────────────────────────────────────────────

// Every colour comes from the theme (globals.css) — no hex, no palette classes.
const SEG_WRAP = 'inline-flex h-8 items-center gap-0.5 rounded-lg bg-muted p-0.5';
const SEG_ITEM =
  'h-7 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
const SEG_IDLE = 'text-muted-foreground hover:text-foreground';
const SEG_ON = 'bg-card text-foreground shadow-sm';
const SEG_PRIMARY = 'bg-primary text-primary-foreground shadow-sm';
const FIELD_BOX =
  'flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30';
/** Layered on <Button variant="outline"> when that filter has a value. */
const ACTIVE_TRIGGER =
  'border-primary/40 bg-primary/10 font-semibold text-primary hover:bg-primary/15 hover:text-primary aria-expanded:bg-primary/15 aria-expanded:text-primary';
const POPOVER =
  'absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg';
const COUNT_BADGE =
  'rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-primary-foreground';
const OPTION_ROW =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted';
const GROUP_LABEL = 'bg-muted/60 px-3 py-1 text-[10px] font-semibold text-muted-foreground';

const formatRole = (role: string) =>
  role.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_WIN: WinState = {
  mode: 'preset',
  range: 'thisMonth',
  hours: 8,
  fromDate: '',
  toDate: '',
};

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

// ─────────────────────────────────────────────────────────────────────────────
// RIBBON GROUP — labelled cell in the filter ribbon
// ─────────────────────────────────────────────────────────────────────────────

function RibbonGroup({
  label,
  icon: Icon,
  badge,
  children,
  className = '',
  tourKey,
}: {
  label: string;
  icon: LucideIcon;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  tourKey?: string;
}) {
  return (
    <div
      {...(tourKey ? tourTarget(tourKey) : {})}
      className={cn('flex min-w-0 items-start gap-3', className)}
    >
      <div className="flex h-8 shrink-0 items-center gap-1.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {badge}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOJ MONTH MULTI-SELECT PICKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * mojMonths entries are "YYYY-MM" (when year is set) or bare "MM" (rare).
 * The picker always works with "YYYY-MM" keys when a year is provided.
 */
function MojMonthPicker({
  mojMonths,
  mojYear,
  onChange,
}: {
  mojMonths: string[];
  mojYear: string;
  onChange: (months: string[], year: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const currentYear = String(new Date().getFullYear());
  const effectiveYear = mojYear || currentYear;

  // Build the "YYYY-MM" key for a given month value
  const keyFor = (m: string) => `${effectiveYear}-${m}`;

  const toggleMonth = (monthVal: string) => {
    const key = keyFor(monthVal);
    const next = mojMonths.includes(key) ? mojMonths.filter(k => k !== key) : [...mojMonths, key];
    onChange(next, effectiveYear);
  };

  const clearAll = () => onChange([], '');

  let buttonLabel = 'All months';
  if (mojMonths.length === 1) {
    const [yr, mm] = mojMonths[0].split('-');
    const mLabel = MONTH_OPTIONS.find(o => o.value === mm)?.label ?? mm;
    buttonLabel = `${mLabel} ${yr}`;
  } else if (mojMonths.length > 1) {
    buttonLabel = `${mojMonths.length} months`;
  }

  const hasSelection = mojMonths.length > 0 || !!mojYear;

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onMouseDown={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className={cn('w-40 justify-between text-xs font-normal', hasSelection && ACTIVE_TRIGGER)}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Calendar className="size-3.5" />
          {buttonLabel}
        </span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div onMouseDown={e => e.stopPropagation()} className={cn(POPOVER, 'w-64')}>
          {/* Year input row */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Year</span>
            <input
              type="number"
              min={2020}
              max={2035}
              value={effectiveYear}
              onChange={e => {
                const yr = e.target.value.trim();
                if (!yr) {
                  onChange([], '');
                  return;
                }
                // Re-key existing selections to the new year
                const reKeyed = mojMonths.map(k => {
                  const mm = k.split('-')[2] ?? k;
                  return `${yr}-${mm}`;
                });
                onChange(reKeyed, yr);
              }}
              className="h-7 w-20 rounded-md border border-input bg-background px-2 text-xs tabular-nums text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
            {hasSelection && (
              <button
                onMouseDown={e => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="ml-auto text-xs font-medium text-destructive hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1 p-2">
            {MONTH_OPTIONS.map(opt => {
              const checked = mojMonths.includes(keyFor(opt.value));
              return (
                <button
                  key={opt.value}
                  onMouseDown={e => {
                    e.stopPropagation();
                    toggleMonth(opt.value);
                  }}
                  className={cn(
                    'h-8 rounded-md text-xs font-medium transition-colors',
                    checked ? SEG_PRIMARY : 'bg-muted/50 text-foreground hover:bg-muted'
                  )}
                >
                  {opt.label.slice(0, 3)}
                </button>
              );
            })}
          </div>

          {/* Selection summary */}
          {mojMonths.length > 0 && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{mojMonths.length}</span>{' '}
              month{mojMonths.length !== 1 ? 's' : ''} selected in{' '}
              <span className="font-semibold text-foreground">{effectiveYear}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SELECT DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

const ALL_REPORT_STATUSES = [
  { key: 'ACTIVE', label: 'Active', dot: 'bg-emerald-500' },
  { key: 'DRAFT', label: 'Draft', dot: 'bg-slate-400' },
  { key: 'PENDING_APPROVAL', label: 'Pending', dot: 'bg-amber-500' },
  { key: 'ON_HOLD', label: 'On Hold', dot: 'bg-orange-500' },
  { key: 'CLOSED', label: 'Closed', dot: 'bg-red-500' },
  { key: 'CANCELLED', label: 'Cancelled', dot: 'bg-gray-500' },
] as const;

function MultiSelectDropdown({
  label = 'Select',
  options,
  selected,
  onChange,
  disabled,
  grouped,
}: {
  label: string;
  options?: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  grouped?: { groupLabel: string; options: { id: string; label: string }[] }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const allOptions = grouped ? grouped.flatMap(g => g.options) : (options ?? []);
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const renderOption = (o: { id: string; label: string }) => {
    const on = selected.includes(o.id);
    const inActive = (o as any).inActive;
    return (
      <button
        key={o.id}
        onMouseDown={e => {
          e.stopPropagation();
          toggle(o.id);
        }}
        className={cn(
          OPTION_ROW,
          on ? 'font-semibold text-foreground' : inActive ? 'text-destructive' : 'text-foreground'
        )}
      >
        {on ? (
          <CheckSquare className="size-3.5 shrink-0 text-primary" />
        ) : (
          <Square
            className={cn(
              'size-3.5 shrink-0',
              inActive ? 'text-destructive/50' : 'text-muted-foreground/60'
            )}
          />
        )}
        {o.label}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative w-40">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        onMouseDown={e => {
          e.stopPropagation();
          if (!disabled) setOpen(o => !o);
        }}
        className={cn(
          'w-full justify-between text-xs font-normal',
          selected.length > 0 && ACTIVE_TRIGGER
        )}
      >
        <span className="truncate">
          {selected.length === 0
            ? label
            : selected.length === 1
              ? (allOptions.find(o => o.id === selected[0])?.label ?? label)
              : `${selected.length} selected`}
        </span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div onMouseDown={e => e.stopPropagation()} className={cn(POPOVER, 'min-w-56 max-w-72')}>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            {selected.length > 0 && (
              <button
                onMouseDown={e => {
                  e.stopPropagation();
                  onChange([]);
                }}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {grouped
              ? grouped.map(g => (
                  <div key={g.groupLabel}>
                    <p className={GROUP_LABEL}>{g.groupLabel}</p>
                    {g.options.map(renderOption)}
                  </div>
                ))
              : (options ?? []).map(renderOption)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR PICKER — one searchable, role-grouped single select
// (replaces one dropdown per role; still sets the same `createdById`)
// ─────────────────────────────────────────────────────────────────────────────

function CreatorPicker({
  groups,
  value,
  onChange,
}: {
  groups: [string, any[]][];
  value?: string;
  onChange: (id?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const selected = useMemo(() => {
    if (!value) return null;
    for (const [role, users] of groups) {
      const user = users.find(u => u.id === value);
      if (user) return { roleLabel: formatRole(role), user };
    }
    return null;
  }, [groups, value]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return groups
      .map(([role, users]) => {
        const roleLabel = formatRole(role);
        const roleHit = !term || roleLabel.toLowerCase().includes(term);
        const list = [...users]
          .sort((x, y) => x.label.localeCompare(y.label))
          .filter(u => roleHit || u.label.toLowerCase().includes(term));
        return { role, roleLabel, users: list };
      })
      .filter(g => g.users.length > 0);
  }, [groups, query]);

  const pick = (id?: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onMouseDown={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className={cn('w-64 justify-between text-xs font-normal', selected && ACTIVE_TRIGGER)}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <>
              <span className="font-medium opacity-70">{selected.roleLabel}</span>
              <span className="mx-1 opacity-40">·</span>
              {selected.user.label}
            </>
          ) : (
            'Anyone'
          )}
        </span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div onMouseDown={e => e.stopPropagation()} className={cn(POPOVER, 'w-80')}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search person or role"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            <button
              onMouseDown={e => {
                e.stopPropagation();
                pick(undefined);
              }}
              className={cn(
                OPTION_ROW,
                !value ? 'font-semibold text-foreground' : 'text-foreground'
              )}
            >
              <Check className={cn('size-3.5 shrink-0 text-primary', value && 'invisible')} />
              Anyone
            </button>

            {filtered.map(g => (
              <div key={g.role}>
                <p className={cn(GROUP_LABEL, 'flex items-center justify-between')}>
                  {g.roleLabel}
                  <span className="tabular-nums">{g.users.length}</span>
                </p>
                {g.users.map(u => {
                  const on = u.id === value;
                  return (
                    <button
                      key={u.id}
                      onMouseDown={e => {
                        e.stopPropagation();
                        pick(u.id);
                      }}
                      className={cn(
                        OPTION_ROW,
                        on ? 'font-semibold text-foreground' : 'text-foreground'
                      )}
                    >
                      <Check className={cn('size-3.5 shrink-0 text-primary', !on && 'invisible')} />
                      <span className="truncate">{u.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No one matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS RIBBON — everything visible at once, one collapse (owned by page)
// ─────────────────────────────────────────────────────────────────────────────

function FiltersBar({
  filters,
  onChange,
  win,
  onWin,
  standardOnly,
  onStandardOnly,
  activeTab,
  teamSelection,
  onTeamSelection,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  win: WinState;
  onWin: (w: WinState) => void;
  standardOnly: boolean;
  onStandardOnly: (v: boolean) => void;
  activeTab: TabKey;
  teamSelection: TeamSelection | null;
  onTeamSelection: (sel: TeamSelection | null) => void;
}) {
  const axios = useAxios();

  const { data: overviewFilters } = useQuery({
    queryKey: ['reports-overview-filters'],
    queryFn: async () => (await axios.get('/reports/overview/filters')).data?.data ?? {},
    staleTime: 300_000,
  });

  const { data: createdByRes } = useQuery({
    queryKey: ['rf-created-by'],
    queryFn: async () => {
      const rows = (await axios.get('/users?limit=200&isActive=true')).data?.data ?? [];
      return rows.map((u: any) => ({
        id: u.id,
        label:
          u.displayName?.trim() || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        roleName: u.role?.name?.trim() || 'OTHER',
      }));
    },
    staleTime: 300_000,
    enabled: activeTab === 'requirements' || activeTab === 'recruiters',
  });

  const serviceLines: any[] = overviewFilters?.serviceLines ?? [];
  const businessUnits: any[] = overviewFilters?.businessUnits ?? [];
  const departments: any[] = overviewFilters?.departments ?? [];
  const clients: any[] = overviewFilters?.clients ?? [];

  const allSpocs: {
    id: string;
    name: string;
    designation: string | null;
    clientId: string;
    clientName: string;
    isActive: boolean;
  }[] = overviewFilters?.spocs ?? [];

  const visibleSpocs = useMemo(
    () =>
      filters.clientIds?.length
        ? allSpocs.filter(s => filters.clientIds!.includes(s.clientId))
        : allSpocs,
    [allSpocs, filters.clientIds]
  );

  const spocsByClient = useMemo(() => {
    const map = new Map<string, { clientName: string; spocs: typeof allSpocs }>();
    for (const s of visibleSpocs) {
      if (!map.has(s.clientId)) map.set(s.clientId, { clientName: s.clientName, spocs: [] });
      map.get(s.clientId)!.spocs.push(s);
    }
    return [...map.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [visibleSpocs]);

  const spocGrouped = useMemo(() => {
    const result: {
      groupLabel: string;
      options: { id: string; label: string; inActive?: boolean }[];
    }[] = [];
    for (const g of spocsByClient) {
      const active = g.spocs.filter(s => s.isActive !== false);
      const inActive = g.spocs.filter(s => s.isActive === false);
      if (active.length) {
        result.push({
          groupLabel: `${g.clientName} — Active`,
          options: active.map(s => ({
            id: s.id,
            label: s.name + (s.designation ? ` · ${s.designation}` : ''),
          })),
        });
      }
      if (inActive.length) {
        result.push({
          groupLabel: `${g.clientName} — InActive`,
          options: inActive.map(s => ({
            id: s.id,
            label: s.name + (s.designation ? ` · ${s.designation}` : ''),
            inActive: true,
          })),
        });
      }
    }
    return result;
  }, [spocsByClient]);

  const createdBys = (createdByRes ?? []) as any[];
  const createdByGroups = createdBys.reduce(
    (g: any, u: any) => {
      const role = u.roleName || 'OTHER';
      if (!g[role]) g[role] = [];
      g[role].push(u);
      return g;
    },
    {} as Record<string, any[]>
  );
  const sortedRoleGroups = Object.entries(createdByGroups).sort(([a], [b]) => a.localeCompare(b));

  const showStatus =
    activeTab === 'requirements' || activeTab === 'recruiters' || activeTab === 'sales';
  const showCreatedBy = activeTab === 'requirements' || activeTab === 'recruiters';
  const showDept = activeTab === 'overview' || activeTab === 'recruiters';
  const showMoj = activeTab === 'recruiters';

  const hasFilters = !!(
    filters.clientIds?.length ||
    filters.clientSpocIds?.length ||
    filters.serviceLineIds?.length ||
    filters.businessUnitId ||
    filters.departmentIds?.length ||
    filters.statuses?.length ||
    filters.createdById ||
    filters.mojMonths?.length ||
    teamSelection
  );

  const activeRoleFilterCount = filters.createdById ? 1 : 0;
  const creatorSectionLabel =
    activeTab === 'recruiters' ? 'Requirement creator (CSM)' : 'Created by';
  // Active MOJ label for the summary text beside the picker
  const mojSummaryLabel = useMemo(() => {
    const months = filters.mojMonths ?? [];
    const yr = filters.mojYear ?? months[0]?.split('-')[0];
    if (!months.length && !filters.mojYear) return null;
    if (!months.length && filters.mojYear) return filters.mojYear;
    if (months.length === 1) {
      const [y, mm] = months[0].split('-');
      const mName = MONTH_OPTIONS.find(o => o.value === mm)?.label ?? mm;
      return `${mName} ${y}`;
    }
    const names = months.map(k => {
      const mm = k.split('-')[2] ?? k;
      return MONTH_OPTIONS.find(o => o.value === mm)?.label?.slice(0, 3) ?? mm;
    });
    return `${names.join(', ')} ${yr}`;
  }, [filters.mojMonths, filters.mojYear]);

  const countBadge = (n: number) => (n > 0 ? <span className={COUNT_BADGE}>{n}</span> : null);

  const scopeCount =
    (filters.clientIds?.length ?? 0) +
    (filters.clientSpocIds?.length ?? 0) +
    (filters.serviceLineIds?.length ?? 0) +
    (filters.businessUnitId ? 1 : 0) +
    (filters.departmentIds?.length ?? 0) +
    (filters.statuses?.length ?? 0) +
    (teamSelection ? 1 : 0);

  const selectTrigger = (active: boolean) =>
    cn(
      'h-8! rounded-lg border-border bg-background text-xs shadow-none hover:bg-muted',
      active && ACTIVE_TRIGGER
    );

  return (
    <div className="border-b border-border bg-card">
      {/* ── Row 1: when + how ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3 px-4 py-3">
        <RibbonGroup label="Date" icon={Calendar} tourKey={REPORTS_TOUR_TARGETS.filterDate}>
          <div className={SEG_WRAP}>
            {WINDOW_MODES.map(m => (
              <button
                key={m.k}
                onClick={() => onWin({ ...win, mode: m.k })}
                className={cn(SEG_ITEM, win.mode === m.k ? SEG_ON : SEG_IDLE)}
              >
                {m.l}
              </button>
            ))}
          </div>

          {win.mode === 'preset' && (
            <div className={SEG_WRAP}>
              {PRESETS.map(p => (
                <button
                  key={p.k}
                  onClick={() => onWin({ ...win, range: p.k })}
                  className={cn(SEG_ITEM, win.range === p.k ? SEG_PRIMARY : SEG_IDLE)}
                >
                  {p.l}
                </button>
              ))}
            </div>
          )}

          {win.mode === 'hours' && (
            <>
              <div className={SEG_WRAP}>
                {HOUR_OPTS.map(h => (
                  <button
                    key={h}
                    onClick={() => onWin({ ...win, hours: h })}
                    className={cn(
                      SEG_ITEM,
                      'tabular-nums',
                      win.hours === h ? SEG_PRIMARY : SEG_IDLE
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <label className={FIELD_BOX}>
                <span className="text-xs text-muted-foreground">Custom</span>
                <input
                  type="number"
                  min={1}
                  value={win.hours}
                  onChange={e => onWin({ ...win, hours: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-12 bg-transparent text-xs tabular-nums text-foreground outline-none"
                />
                <span className="text-xs text-muted-foreground">hrs</span>
              </label>
            </>
          )}

          {win.mode === 'range' && (
            <>
              <label className={FIELD_BOX}>
                <span className="text-xs text-muted-foreground">From</span>
                <input
                  type="date"
                  value={win.fromDate}
                  onChange={e => onWin({ ...win, fromDate: e.target.value })}
                  className="w-28 bg-transparent text-xs text-foreground outline-none"
                />
              </label>
              <label className={FIELD_BOX}>
                <span className="text-xs text-muted-foreground">To</span>
                <input
                  type="date"
                  value={win.toDate}
                  onChange={e => onWin({ ...win, toDate: e.target.value })}
                  className="w-28 bg-transparent text-xs text-foreground outline-none"
                />
              </label>
            </>
          )}
        </RibbonGroup>

        <RibbonGroup
          label="View"
          icon={SlidersHorizontal}
          tourKey={REPORTS_TOUR_TARGETS.filterView}
        >
          {activeTab === 'requirements' && (
            <div className={SEG_WRAP}>
              <button
                onClick={() => onChange({ ...filters, dateFilterMode: undefined })}
                className={cn(
                  SEG_ITEM,
                  !filters.dateFilterMode || filters.dateFilterMode === 'activity'
                    ? SEG_ON
                    : SEG_IDLE
                )}
              >
                Pipeline activity
              </button>
              <button
                onClick={() => onChange({ ...filters, dateFilterMode: 'createdAt' })}
                className={cn(SEG_ITEM, filters.dateFilterMode === 'createdAt' ? SEG_ON : SEG_IDLE)}
              >
                Requirement created
              </button>
            </div>
          )}

          <Button
            type="button"
            variant={standardOnly ? 'default' : 'outline'}
            onClick={() => onStandardOnly(!standardOnly)}
            className="text-xs"
          >
            {standardOnly ? <CheckSquare /> : <Square />}
            Standard stages only
          </Button>

          {!filters.serviceLineIds?.length && activeTab !== 'sales' && activeTab !== 'overview' && (
            <span className="text-xs text-muted-foreground">
              Split by service line. Pick one for a flat view.
            </span>
          )}
        </RibbonGroup>

        {hasFilters && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onChange({});
              onTeamSelection(null);
            }}
            className="ml-auto text-xs"
          >
            <X /> Clear all filters
          </Button>
        )}
      </div>

      {/* ── Row 2: who ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3 border-t border-border px-4 py-3">
        <RibbonGroup
          label="Scope"
          icon={Building2}
          badge={countBadge(scopeCount)}
          tourKey={REPORTS_TOUR_TARGETS.filterScope}
        >
          {/* Team always first */}
          <TeamTreePicker value={teamSelection} onChange={onTeamSelection} />

          <MultiSelectDropdown
            label="All clients"
            grouped={[
              {
                groupLabel: 'Active',
                options: clients
                  .filter(c => c.status === 'ACTIVE')
                  .map(c => ({ id: c.id, label: c.name })),
              },
              {
                groupLabel: 'InActive',
                options: clients
                  .filter(c => c.status !== 'ACTIVE' && c.isActive !== true)
                  .map(c => ({ id: c.id, label: c.name, inactive: true })),
              },
            ].filter(g => g.options.length > 0)}
            selected={filters.clientIds ?? []}
            onChange={ids => onChange({ ...filters, clientIds: ids, clientSpocIds: [] })}
          />

          <MultiSelectDropdown
            label="All SPOCs"
            disabled={allSpocs.length === 0}
            grouped={spocGrouped}
            selected={filters.clientSpocIds ?? []}
            onChange={ids => onChange({ ...filters, clientSpocIds: ids })}
          />

          <MultiSelectDropdown
            label="All service lines"
            options={serviceLines.map(s => ({ id: s.id, label: s.name }))}
            selected={filters.serviceLineIds ?? []}
            onChange={ids => onChange({ ...filters, serviceLineIds: ids })}
          />

          {businessUnits.length > 0 && (
            <Select
              value={filters.businessUnitId ?? 'ALL'}
              onValueChange={v =>
                onChange({ ...filters, businessUnitId: v === 'ALL' ? undefined : v })
              }
            >
              <SelectTrigger className={cn('w-40', selectTrigger(!!filters.businessUnitId))}>
                <SelectValue placeholder="All BUs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All business units</SelectItem>
                {businessUnits.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showDept && departments.length > 0 && (
            <MultiSelectDropdown
              label="All departments"
              options={departments.map(d => ({ id: d.id, label: d.name }))}
              selected={filters.departmentIds ?? []}
              onChange={ids => onChange({ ...filters, departmentIds: ids })}
            />
          )}

          {showStatus && (
            <MultiSelectDropdown
              label="All statuses"
              options={ALL_REPORT_STATUSES.map(s => ({ id: s.key, label: s.label }))}
              selected={filters.statuses ?? []}
              onChange={ids => onChange({ ...filters, statuses: ids })}
            />
          )}
        </RibbonGroup>

        {showCreatedBy && sortedRoleGroups.length > 0 && (
          <RibbonGroup
            label={creatorSectionLabel}
            icon={UserCog}
            badge={countBadge(activeRoleFilterCount)}
            tourKey={REPORTS_TOUR_TARGETS.filterCreator}
          >
            <CreatorPicker
              groups={sortedRoleGroups as [string, any[]][]}
              value={filters.createdById}
              onChange={id => onChange({ ...filters, createdById: id })}
            />
          </RibbonGroup>
        )}

        {showMoj && (
          <RibbonGroup
            label="Month of joining"
            icon={CalendarCheck}
            tourKey={REPORTS_TOUR_TARGETS.filterMoj}
            badge={
              ((filters.mojMonths?.length ?? 0) > 0 || filters.mojYear) && (
                <span className={COUNT_BADGE}>
                  {filters.mojMonths?.length ? filters.mojMonths.length : 'year'}
                </span>
              )
            }
          >
            <MojMonthPicker
              mojMonths={filters.mojMonths ?? []}
              mojYear={filters.mojYear ?? ''}
              onChange={(months, year) =>
                onChange({
                  ...filters,
                  mojMonths: months.length ? months : undefined,
                  mojYear: !months.length && year ? year : undefined,
                })
              }
            />

            {mojSummaryLabel && (
              <span className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
                Joining in <span className="font-semibold text-foreground">{mojSummaryLabel}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Clear month of joining"
                  onClick={() => onChange({ ...filters, mojMonths: undefined, mojYear: undefined })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X />
                </Button>
              </span>
            )}
          </RibbonGroup>
        )}
      </div>
    </div>
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
  const inBucket = (r: RequirementGroup['data'][number]) =>
    bucket === 'terminal'
      ? (r.terminalCount ?? 0) > 0
      : bucket === 'nearTerminal'
        ? (r.nearTerminalCount ?? 0) > 0
        : true;
  const groups: RequirementGroup[] = (resp?.groups ?? [])
    .map(g => {
      if (!bucket) return g;
      const data = g.data.filter(inBucket);
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
              : 'No requirements found for this window.'
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

  const [activeTab, setActiveTab] = useState<TabKey>(DEFAULT_TAB);
  const [filters, setFilters] = useState<Filters>({});
  const [win, setWin] = useState<WinState>(DEFAULT_WIN);
  const [standardOnly, setStandardOnly] = useState(false);
  const [recReqFilter, setRecReqFilter] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [salesDrillPayload, setSalesDrillPayload] = useState<SalesDrillPayload | null>(null);
  const [teamSelection, setTeamSelection] = useState<TeamSelection | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reqSortBy, setReqSortBy] = useState<SortKey | null>(null);
  const [reqSortDir, setReqSortDir] = useState<'asc' | 'desc' | null>(null);
  // Sale summary filters — one per tab, so switching tabs keeps each slice
  const [reqBucket, setReqBucket] = useState<SaleBucket>(null);
  const [recBucket, setRecBucket] = useState<SaleBucket>(null);

  // Same logic as before — extracted so the tour can switch tabs through it.
  const handleTabChange = useCallback((next: TabKey) => {
    if (next !== 'recruiters') {
      setFilters(f => ({ ...f, mojMonth: undefined, mojYear: undefined }));
    }
    if (next === 'overview' || next === 'candidates' || next === 'sales') {
      setFilters(f => ({ ...f, statuses: undefined, createdById: undefined }));
    }
    setSelectedStageIds([]);
    setActiveTab(next);
  }, []);

  const handleStageToggle = useCallback((stageId: string) => {
    setSelectedStageIds(prev =>
      prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
    );
  }, []);

  const activeFilterCount = [
    ...(filters.clientIds ?? []),
    ...(filters.clientSpocIds ?? []),
    ...(filters.serviceLineIds ?? []),
    ...(filters.departmentIds ?? []),
    ...(filters.statuses ?? []),
    filters.businessUnitId,
    filters.createdById,
    ...(filters.mojMonths ?? []),
    filters.mojYear,
    teamSelection,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(winToParams(win)).forEach(([k, v]) => p.set(k, v));
    (filters.clientIds ?? []).forEach(id => p.append('clientId', id));
    (filters.clientSpocIds ?? []).forEach(id => p.append('clientSpocId', id));
    (filters.serviceLineIds ?? []).forEach(id => p.append('serviceLineId', id));
    if (filters.businessUnitId) p.set('businessUnitId', filters.businessUnitId);
    (filters.departmentIds ?? []).forEach(id => p.append('departmentId', id));
    if (filters.createdById) p.set('createdById', filters.createdById);
    (filters.statuses ?? []).forEach(s => p.append('status', s));
    if (standardOnly) p.set('standardOnly', 'true');
    if (teamSelection) {
      p.set('userIds', teamSelection.memberIds.join(','));
      p.set('teamRootId', teamSelection.id);
    }
    return p;
  }, [win, filters, standardOnly, teamSelection]);

  const baseQs = baseParams.toString();
  // Build recParams — appends each mojMonth as a separate param so backend
  // can accept ?mojMonth=2024-01&mojMonth=2024-03 (multi-value)
  const recParams = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    if (recReqFilter) p.set('requirementId', recReqFilter);
    const months = filters.mojMonths ?? [];
    if (months.length) {
      months.forEach(m => p.append('mojMonth', m));
    } else if (filters.mojYear) {
      p.set('mojYear', filters.mojYear);
    }
    return p.toString();
  }, [baseQs, recReqFilter, filters.mojMonths, filters.mojYear]);

  const reqParams = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    if (reqSortBy) {
      p.set('sortBy', reqSortBy);
      p.set('sortDir', reqSortDir ?? 'asc');
    }
    if (filters.dateFilterMode) p.set('dateFilterMode', filters.dateFilterMode);
    return p.toString();
  }, [baseQs, reqSortBy, reqSortDir, filters.dateFilterMode]);

  // ── Queries ───────────────────────────────────────────────────────────────
  const overviewQuery = useQuery({
    queryKey: ['report-overview-v2', baseQs],
    queryFn: async () => (await axios.get(`/reports/overview?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'overview',
    staleTime: 60_000,
  });

  const recruiterQuery = useQuery({
    queryKey: ['report-recruiters', recParams],
    queryFn: async () =>
      (await axios.get(`/reports/recruiters?${recParams}`)).data as RecruiterResponse,
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

  // Funnel stats — fetches nearTerminalCandidates + terminalCandidates counts
  // Uses baseQs (without sort params) so it matches the same scope as the main query
  const funnelStatsQuery = useQuery({
    queryKey: ['funnel-stats-summary', baseQs],
    queryFn: async () => (await axios.get(`/reports/requirements/funnel-stats?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'requirements',
    staleTime: 60_000,
  });

  // Recruiter share of sale value — same scope (recParams) as the recruiter table
  const recruiterSaleQuery = useQuery({
    queryKey: ['report-recruiters-sale-summary', recParams],
    queryFn: async () =>
      (await axios.get(`/reports/recruiters/sale-summary?${recParams}`))
        .data as RecruiterSaleSummaryResponse,
    enabled: hasAccess && activeTab === 'recruiters',
    staleTime: 60_000,
  });

  const salesQuery = useQuery({
    queryKey: ['report-sales', baseQs],
    queryFn: async () => (await axios.get(`/reports/sales?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'sales',
    staleTime: 60_000,
  });

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

  const handleRecruiterAll = useCallback(
    (
      slId?: string,
      stageIds?: string[],
      hiddenStageIds?: string[],
      hiddenCandidateCols?: string[]
    ) => {
      const p = new URLSearchParams(recParams);
      if (slId) p.set('serviceLineId', slId);
      if (stageIds?.length) p.set('stageIds', stageIds.join(','));
      if (hiddenStageIds?.length) p.set('hiddenStageIds', hiddenStageIds.join(','));
      if (hiddenCandidateCols?.length) p.set('hiddenCandidateCols', hiddenCandidateCols.join(','));
      download(`/reports/recruiters/export?${p}`, `recruiter-report-${dateStr}.xlsx`, 'rec-all');
    },
    [recParams, download, dateStr]
  );

  const handleRecruiterSelected = useCallback(
    (
      ids: string[],
      slId?: string,
      stageIds?: string[],
      hiddenStageIds?: string[],
      hiddenCandidateCols?: string[]
    ) => {
      const p = new URLSearchParams(recParams);
      if (slId) p.set('serviceLineId', slId);
      p.set('ids', ids.join(','));
      if (stageIds?.length) p.set('stageIds', stageIds.join(','));
      if (hiddenStageIds?.length) p.set('hiddenStageIds', hiddenStageIds.join(','));
      if (hiddenCandidateCols?.length) p.set('hiddenCandidateCols', hiddenCandidateCols.join(','));
      download(
        `/reports/recruiters/export?${p}`,
        `recruiter-report-selected-${dateStr}.xlsx`,
        'rec-sel'
      );
    },
    [recParams, download, dateStr]
  );

  const handleRequirementAll = useCallback(
    (
      slId?: string,
      stageIds?: string[],
      hiddenStageIds?: string[],
      hiddenCandidateCols?: string[]
    ) => {
      const p = new URLSearchParams(baseQs);
      if (slId) p.set('serviceLineId', slId);
      if (stageIds?.length) p.set('stageIds', stageIds.join(','));
      if (hiddenStageIds?.length) p.set('hiddenStageIds', hiddenStageIds.join(','));
      if (hiddenCandidateCols?.length) p.set('hiddenCandidateCols', hiddenCandidateCols.join(','));
      download(`/reports/requirements/export?${p}`, `requirements-${dateStr}.xlsx`, 'req-all');
    },
    [baseQs, download, dateStr]
  );

  const handleRequirementSelected = useCallback(
    (
      ids: string[],
      slId?: string,
      stageIds?: string[],
      hiddenStageIds?: string[],
      hiddenCandidateCols?: string[]
    ) => {
      const p = new URLSearchParams(baseQs);
      if (slId) p.set('serviceLineId', slId);
      p.set('ids', ids.join(','));
      if (stageIds?.length) p.set('stageIds', stageIds.join(','));
      if (hiddenStageIds?.length) p.set('hiddenStageIds', hiddenStageIds.join(','));
      if (hiddenCandidateCols?.length) p.set('hiddenCandidateCols', hiddenCandidateCols.join(','));
      download(
        `/reports/requirements/export?${p}`,
        `requirements-selected-${dateStr}.xlsx`,
        'req-sel'
      );
    },
    [baseQs, download, dateStr]
  );

  const handleRequirementRow = useCallback(
    (id: string, reqCode: string) => {
      download(
        `/reports/requirements/${id}/export`,
        `requirement-${reqCode}-${dateStr}.xlsx`,
        `req-${id}`
      );
    },
    [download, dateStr]
  );

  if (!hasAccess)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">You do not have access to reports.</p>
      </div>
    );

  const reqSaleValueSummary = requirementQuery.data?.saleValueSummary ?? null;
  const recSale = recruiterSaleQuery.data?.data ?? null;

  const reqTotalCount: number = requirementQuery.data?.meta?.total ?? 0;

  return (
    <Tabs
      value={activeTab}
      onValueChange={v => handleTabChange(v as TabKey)}
      className="flex min-h-screen flex-col gap-0 bg-background"
    >
      {/* ── Top bar: title · sheets · window · filters toggle ─────────── */}
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-stretch gap-4 border-b border-border bg-card px-4">
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart2 className="size-4" />
          </span>
          <h1 className="text-sm font-bold tracking-normal text-foreground">Reports</h1>
        </div>

        <TabsList
          {...tourTarget(REPORTS_TOUR_TARGETS.tabs)}
          className="h-auto gap-0 self-stretch rounded-none bg-transparent p-0"
        >
          {VISIBLE_TABS.map(t => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="h-full flex-none gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-xs font-medium text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Icon className="size-3.5" /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="ml-auto flex items-center gap-2">
          {downloading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5 animate-spin" /> Preparing download…
            </span>
          )}

          <TourButton tourId={reportsTour.id} tourKey={REPORTS_TOUR_TARGETS.tourButton} />

          <Button
            type="button"
            variant="outline"
            {...tourTarget(REPORTS_TOUR_TARGETS.window)}
            onClick={() => setFiltersOpen(true)}
            title="Change date window"
            className="text-xs"
          >
            <Calendar />
            <span className="tabular-nums">{winLabel(win)}</span>
          </Button>

          <Button
            type="button"
            variant={filtersOpen ? 'default' : 'outline'}
            {...tourTarget(REPORTS_TOUR_TARGETS.filtersToggle)}
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
            className="text-xs"
          >
            <Filter />
            Filters
            {hasActiveFilters && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-semibold leading-4 tabular-nums',
                  filtersOpen
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn('transition-transform', filtersOpen && 'rotate-180')} />
          </Button>
        </div>
      </header>

      {/* ── Filters ribbon (single collapse) ──────────────────────────── */}
      {filtersOpen && (
        <FiltersBar
          filters={filters}
          onChange={f => {
            setFilters(f);
            setSelectedStageIds([]);
          }}
          win={win}
          onWin={setWin}
          standardOnly={standardOnly}
          onStandardOnly={setStandardOnly}
          activeTab={activeTab}
          teamSelection={teamSelection}
          onTeamSelection={setTeamSelection}
        />
      )}

      {/* ── Summary row (always visible on requirements) ──────────────── */}
      {activeTab === 'requirements' && reqSaleValueSummary && (
        <SaleSummaryBar
          summary={reqSaleValueSummary}
          nearTerminalCandidates={funnelStatsQuery.data?.summary?.nearTerminalCandidates ?? null}
          terminalCandidates={funnelStatsQuery.data?.summary?.terminalCandidates ?? null}
          totalCount={reqTotalCount}
          totalLabel="requirements"
          bucket={reqBucket}
          onBucketChange={setReqBucket}
          tourKey={REPORTS_TOUR_TARGETS.summary}
        />
      )}
      {activeTab === 'recruiters' && recSale && (
        <SaleSummaryBar
          summary={recSale.summary}
          nearTerminalCandidates={recSale.nearTerminalCandidates}
          terminalCandidates={recSale.terminalCandidates}
          totalCount={recSale.requirementCount}
          totalLabel="requirements worked"
          bucket={recBucket}
          onBucketChange={setRecBucket}
        />
      )}

      {/* ── Sheet content ─────────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 bg-background">
        {/* Hidden tab — kept wired, not reachable from UI */}
        <TabsContent value="overview" className="m-0 p-3">
          <OverviewSection
            data={overviewQuery.data}
            loading={overviewQuery.isLoading}
            onDrill={setDrillTarget}
            baseQs={baseQs}
          />
        </TabsContent>
        <TabsContent value="requirements" className="m-0">
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
        </TabsContent>
        <TabsContent value="recruiters" className="m-0 flex flex-col gap-3 p-3">
          <RecruiterSection
            resp={recruiterQuery.data}
            loading={recruiterQuery.isLoading}
            reqFilter={recReqFilter}
            onReqFilter={setRecReqFilter}
            onDownloadAll={handleRecruiterAll}
            onDownloadSelected={handleRecruiterSelected}
            baseQs={recParams}
            bucket={recBucket}
          />
        </TabsContent>
        {/* Hidden tab — kept wired, not reachable from UI */}
        <TabsContent value="candidates" className="m-0 p-3">
          <CandidatesSection baseQs={baseQs} />
        </TabsContent>
        {/* Hidden tab — kept wired, not reachable from UI */}
        <TabsContent value="sales" className="m-0 p-3">
          <SalesSection
            data={salesQuery.data?.data ?? null}
            loading={salesQuery.isLoading}
            onDrill={setSalesDrillPayload}
          />
        </TabsContent>
      </main>

      {/* Drawers */}
      <DrillDrawer target={drillTarget} baseQs={baseQs} onClose={() => setDrillTarget(null)} />
      {salesDrillPayload && (
        <SalesDrillDrawer payload={salesDrillPayload} onClose={() => setSalesDrillPayload(null)} />
      )}
    </Tabs>
  );
}
