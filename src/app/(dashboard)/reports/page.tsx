/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: page.tsx
// Path: src/app/(dashboard)/reports/page.tsx

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
  RequirementGroup,
  RequirementReportResponse,
  SaleValueSummary,
  ServiceLineRef,
} from '@/components/reports/types';
import { DrillDrawer } from '@/components/reports/DrillDrawer';
import type { DrillTarget } from '@/components/reports/DrillDrawer';
import { OverviewSection } from '@/components/reports/OverviewSection';
import { SalesSection } from '@/components/reports/SalesSection';
import { TeamTreePicker } from '@/components/reports/TeamTreePicker';
import type { TeamSelection } from '@/components/reports/TeamTreePicker';
import { Empty, FUNNEL_COLORS, KPI, Skel } from '@/components/reports/reportUi';
import { RequirementTable, SortKey } from '@/components/reports/RequirementTable';
import { RecruiterSection } from '@/components/reports/RecruiterSection';
import { RecruiterStatsBar } from '@/components/reports/RecruiterStatsBar';
import { FunnelStatsDrawer } from '@/components/reports/FunnelStatsDrawer';
import type { FunnelStatsDrawerTarget } from '@/components/reports/FunnelStatsDrawer';

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
// WINDOW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_WIN: WinState = { mode: 'preset', range: '', hours: 8, fromDate: '', toDate: '' };

const PRESETS: { k: WinState['range']; l: string }[] = [
  { k: '', l: 'All time' },
  { k: 'today', l: 'Today' },
  { k: 'yesterday', l: 'Yesterday' },
  { k: 'last7', l: 'Last 7 days' },
  { k: 'last30', l: 'Last 30 days' },
  { k: 'thisMonth', l: 'This month' },
];
const HOUR_OPTS = [8, 12, 24, 48, 72];

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

  // Build display label
  const selectedMonthVals = mojMonths
    .filter(k => k.startsWith(effectiveYear + '-'))
    .map(k => k.split('-')[2]);

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
      <button
        onMouseDown={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className={`flex h-8 items-center justify-between gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
          hasSelection
            ? 'border-emerald-400 bg-emerald-50 font-bold text-emerald-700'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        <Calendar className="h-3 w-3 shrink-0" />
        <span>{buttonLabel}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          className="absolute left-0 top-9 z-50 w-72 rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {/* Year input row */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Year
            </span>
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
              className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-400"
            />
            {hasSelection && (
              <button
                onMouseDown={e => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="ml-auto text-[10px] font-bold text-red-500 hover:text-red-700"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Month checkboxes — 3-column grid */}
          <div className="grid grid-cols-3 gap-1 p-3">
            {MONTH_OPTIONS.map(opt => {
              const checked = mojMonths.includes(keyFor(opt.value));
              return (
                <button
                  key={opt.value}
                  onMouseDown={e => {
                    e.stopPropagation();
                    toggleMonth(opt.value);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                    checked
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="h-3 w-3 shrink-0" />
                  ) : (
                    <Square className="h-3 w-3 shrink-0 text-slate-300" />
                  )}
                  {opt.label.slice(0, 3)}
                </button>
              );
            })}
          </div>

          {/* Selection summary */}
          {mojMonths.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-500">
                <span className="font-black text-emerald-700">{mojMonths.length}</span> month
                {mojMonths.length !== 1 ? 's' : ''} selected in{' '}
                <span className="font-black text-slate-700">{effectiveYear}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT STATS BAR
// ─────────────────────────────────────────────────────────────────────────────

function RequirementStatsBar({
  summary,
  totalReqs,
  onDrill,
}: {
  summary: SaleValueSummary;
  totalReqs: number;
  onDrill: (type: 'nearTerminal' | 'terminal') => void;
}) {
  const {
    totalSaleValue,
    totalAchievedValue,
    totalNearTerminalValue,
    includedCount,
    omittedCount,
    byBasis,
  } = summary;

  const nearTerminalCandidates = (summary as any).nearTerminalCandidates ?? null;
  const terminalCandidates = (summary as any).terminalCandidates ?? null;

  const achievedPct =
    totalSaleValue > 0 ? Math.round((totalAchievedValue / totalSaleValue) * 100) : 0;

  const pipelinePct =
    totalSaleValue > 0 ? Math.round(((totalNearTerminalValue ?? 0) / totalSaleValue) * 100) : 0;

  return (
    <div className="flex flex-wrap items-stretch gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* 1. Total Sale Value */}
      <div className="flex min-w-[150px] flex-1 flex-col justify-center rounded-lg bg-emerald-50 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
          Total Sale Value
        </p>
        <p className="text-[22px] font-black text-emerald-800">{fmtCurrency(totalSaleValue)}</p>
        <p className="text-[11px] font-semibold text-emerald-600">
          {includedCount} computed
          {omittedCount > 0 && (
            <span className="ml-1 font-black text-red-500">· {omittedCount} no data</span>
          )}
        </p>
      </div>

      {/* 2. Pipeline Value — nearTerminal value */}
      <button
        onClick={() => onDrill('nearTerminal')}
        className="group flex min-w-[150px] flex-1 flex-col justify-center rounded-lg bg-amber-50 px-4 py-3 text-left transition-all hover:bg-amber-100 hover:shadow-md"
      >
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
          Pipeline Value
        </p>
        <p className="text-[22px] font-black text-amber-800 group-hover:text-amber-900">
          {fmtCurrency(totalNearTerminalValue ?? 0)}
        </p>
        <p className="text-[11px] font-semibold text-amber-600">
          {pipelinePct}% of target · <span className="underline underline-offset-2">view →</span>
        </p>
      </button>

      {/* 3. NDA Released / Offered — nearTerminal COUNT */}
      <button
        onClick={() => onDrill('nearTerminal')}
        className="group flex min-w-[150px] flex-1 flex-col justify-center rounded-lg bg-orange-50 px-4 py-3 text-left transition-all hover:bg-orange-100 hover:shadow-md"
      >
        <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">
          NDA Released / Offered
        </p>
        <p className="text-[22px] font-black text-orange-800 group-hover:text-orange-900">
          {nearTerminalCandidates ?? '—'}
        </p>
        <p className="text-[11px] font-semibold text-orange-600">
          candidates · <span className="underline underline-offset-2">view →</span>
        </p>
      </button>

      {/* 4. Achieved Value — terminal value */}
      <button
        onClick={() => onDrill('terminal')}
        className="group flex min-w-[150px] flex-1 flex-col justify-center rounded-lg bg-purple-50 px-4 py-3 text-left transition-all hover:bg-purple-100 hover:shadow-md"
      >
        <p className="text-[10px] font-black uppercase tracking-wider text-purple-600">
          Achieved Value
        </p>
        <p className="text-[22px] font-black text-purple-800 group-hover:text-purple-900">
          {fmtCurrency(totalAchievedValue)}
        </p>
        <p className="text-[11px] font-semibold text-purple-600">
          {achievedPct}% of target · <span className="underline underline-offset-2">view →</span>
        </p>
      </button>

      {/* 5. Deal Closed / Training Started — terminal COUNT */}
      <button
        onClick={() => onDrill('terminal')}
        className="group flex min-w-[150px] flex-1 flex-col justify-center rounded-lg bg-indigo-50 px-4 py-3 text-left transition-all hover:bg-indigo-100 hover:shadow-md"
      >
        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
          Deal Closed / Training Started
        </p>
        <p className="text-[22px] font-black text-indigo-800 group-hover:text-indigo-900">
          {terminalCandidates ?? '—'}
        </p>
        <p className="text-[11px] font-semibold text-indigo-600">
          candidates · <span className="underline underline-offset-2">view →</span>
        </p>
      </button>

      <div className="hidden w-px self-stretch bg-slate-100 sm:block" />

      {/* Basis breakdown */}
      <div className="flex flex-1 flex-wrap items-center gap-2 self-center">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Basis
        </span>
        {byBasis['SALE_VALUE']?.count > 0 && (
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
            Direct: <span className="font-black">{byBasis['SALE_VALUE'].count}</span>
            <span className="ml-1 text-[10px] opacity-70">
              {fmtCurrency(byBasis['SALE_VALUE'].total)}
            </span>
          </span>
        )}
        {byBasis['BAND']?.count > 0 && (
          <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700">
            Band: <span className="font-black">{byBasis['BAND'].count}</span>
            <span className="ml-1 text-[10px] opacity-70">
              {fmtCurrency(byBasis['BAND'].total)}
            </span>
          </span>
        )}
        {byBasis['FIXED_PCT']?.count > 0 && (
          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700">
            Fixed %: <span className="font-black">{byBasis['FIXED_PCT'].count}</span>
            <span className="ml-1 text-[10px] opacity-70">
              {fmtCurrency(byBasis['FIXED_PCT'].total)}
            </span>
          </span>
        )}
        {omittedCount > 0 && (
          <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-500">
            ⚠ No data: {omittedCount}
          </span>
        )}
      </div>

      {/* Total reqs count */}
      <div className="flex flex-col items-end justify-center self-center pl-2">
        <p className="text-[28px] font-black leading-none text-slate-800">{totalReqs}</p>
        <p className="text-[11px] font-semibold text-slate-400">requirements</p>
      </div>
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

  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onMouseDown={e => {
          e.stopPropagation();
          if (!disabled) setOpen(o => !o);
        }}
        className={`flex h-8 w-full items-center justify-between gap-1 rounded-md border px-2 text-xs ${
          selected.length
            ? 'border-indigo-400 bg-indigo-50 font-bold text-indigo-700'
            : 'border-slate-200 text-slate-500'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <span className="truncate">
          {selected.length === 0
            ? label
            : selected.length === 1
              ? (allOptions.find(o => o.id === selected[0])?.label ?? label)
              : `${selected.length} selected`}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          className="absolute left-0 top-9 z-50 min-w-56 max-w-72 rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {label}
            </span>
            {selected.length > 0 && (
              <button
                onMouseDown={e => {
                  e.stopPropagation();
                  onChange([]);
                }}
                className="text-[10px] font-bold text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {grouped
              ? grouped.map(g => (
                  <div key={g.groupLabel}>
                    <p className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {g.groupLabel}
                    </p>
                    {g.options.map(o => {
                      const on = selected.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          onMouseDown={e => {
                            e.stopPropagation();
                            toggle(o.id);
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-slate-50 ${
                            on
                              ? 'font-semibold text-indigo-700'
                              : (o as any).inActive
                                ? 'text-red-400'
                                : 'text-slate-600'
                          }`}
                        >
                          {on ? (
                            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                          ) : (
                            <Square
                              className={`h-3.5 w-3.5 shrink-0 ${(o as any).inActive ? 'text-red-300' : 'text-slate-300'}`}
                            />
                          )}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                ))
              : (options ?? []).map(o => {
                  const on = selected.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onMouseDown={e => {
                        e.stopPropagation();
                        toggle(o.id);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-slate-50 ${on ? 'font-semibold text-indigo-700' : 'text-slate-600'}`}
                    >
                      {on ? (
                        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      ) : (
                        <Square className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                      {o.label}
                    </button>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS BAR
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
  const [roleFiltersOpen, setRoleFiltersOpen] = useState(false);

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
    activeTab === 'recruiters' ? 'Filter by requirement creator (CSM)' : 'Filter by creator role';
  // Active MOJ label for the summary text below the picker
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

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Time window */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {(['preset', 'hours', 'range'] as WindowMode[]).map((m, idx) => (
            <button
              key={m}
              onClick={() => onWin({ ...win, mode: m })}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                win.mode === m
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {['Quick', 'By hours', 'Custom range'][idx]}
            </button>
          ))}
        </div>

        {win.mode === 'preset' &&
          PRESETS.map(p => (
            <button
              key={p.k}
              onClick={() => onWin({ ...win, range: p.k })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                win.range === p.k
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.l}
            </button>
          ))}

        {win.mode === 'hours' && (
          <div className="flex flex-wrap items-center gap-2">
            {HOUR_OPTS.map(h => (
              <button
                key={h}
                onClick={() => onWin({ ...win, hours: h })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  win.hours === h
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {h}h
              </button>
            ))}
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">CUSTOM</span>
              <input
                type="number"
                min={1}
                value={win.hours}
                onChange={e => onWin({ ...win, hours: Math.max(1, Number(e.target.value) || 1) })}
                className="w-14 bg-transparent text-xs text-slate-700 outline-none"
              />
              <span className="text-[10px] font-bold text-slate-400">hrs</span>
            </div>
          </div>
        )}

        {win.mode === 'range' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">FROM</span>
              <input
                type="date"
                value={win.fromDate}
                onChange={e => onWin({ ...win, fromDate: e.target.value })}
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">TO</span>
              <input
                type="date"
                value={win.toDate}
                onChange={e => onWin({ ...win, toDate: e.target.value })}
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
          </div>
        )}

        <span className="ml-auto rounded-lg bg-indigo-100 px-3 py-1.5 text-[12px] font-black text-indigo-700">
          {winLabel(win)}
        </span>
      </div>

      {/* Entity filters */}
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <MultiSelectDropdown
          label="All Clients"
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
            <SelectTrigger className="h-8 w-full border-slate-200 text-xs font-medium">
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

        <div className="flex items-center gap-1.5">
          <TeamTreePicker value={teamSelection} onChange={onTeamSelection} />
        </div>
      </div>

      {/* MOJ filter — multi-select month checkboxes */}
      {showMoj && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Month of Joining
            </span>
            {((filters.mojMonths?.length ?? 0) > 0 || filters.mojYear) && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                {filters.mojMonths?.length ? `${filters.mojMonths.length} selected` : 'year only'}
              </span>
            )}
          </div>

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

          {/* Active selection summary */}
          {mojSummaryLabel && (
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold text-slate-500">
                Showing candidates joining in{' '}
                <span className="font-black text-emerald-700">{mojSummaryLabel}</span>
              </p>
              <button
                onClick={() => onChange({ ...filters, mojMonths: undefined, mojYear: undefined })}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creator filter */}
      {showCreatedBy && sortedRoleGroups.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setRoleFiltersOpen(o => !o)}
            className="flex w-full items-center gap-2 text-left"
          >
            <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              {creatorSectionLabel}
            </span>
            {activeRoleFilterCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
                {activeRoleFilterCount}
              </span>
            )}
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 text-slate-400 transition-transform ${
                roleFiltersOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {roleFiltersOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {sortedRoleGroups.map(([roleName, users]) => {
                const sel = (users as any[]).find(u => u.id === filters.createdById);
                const displayRole = roleName
                  .replaceAll('_', ' ')
                  .replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={roleName} className="flex flex-col gap-1">
                    <span className="truncate text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {displayRole}
                    </span>
                    <Select
                      value={sel?.id ?? 'ALL'}
                      onValueChange={v =>
                        onChange({ ...filters, createdById: v === 'ALL' ? undefined : v })
                      }
                    >
                      <SelectTrigger className="h-8 w-full border-slate-200 text-xs font-medium">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All {displayRole}</SelectItem>
                        {(users as any[])
                          .sort((a, b) => a.label.localeCompare(b.label))
                          .map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Standard stages toggle + clear */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        {activeTab === 'requirements' && (
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => onChange({ ...filters, dateFilterMode: undefined })}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                !filters.dateFilterMode || filters.dateFilterMode === 'activity'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pipeline activity
            </button>
            <button
              onClick={() => onChange({ ...filters, dateFilterMode: 'createdAt' })}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                filters.dateFilterMode === 'createdAt'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Requirement created
            </button>
          </div>
        )}
        <button
          onClick={() => onStandardOnly(!standardOnly)}
          className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
            standardOnly
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {standardOnly ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          Standard stages only
        </button>

        {hasFilters && (
          <button
            onClick={() => {
              onChange({});
              onTeamSelection(null);
            }}
            className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            <X className="h-3 w-3" /> Clear all filters
          </button>
        )}

        {!filters.serviceLineIds?.length && activeTab !== 'sales' && activeTab !== 'overview' && (
          <span className="ml-auto text-[11px] font-semibold text-slate-400">
            Tables split by service line — pick one for flat view.
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LINE TABS
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
    <div className="flex items-center gap-1 overflow-x-auto border-b-2 border-slate-200">
      {groups.map(g => {
        const k = keyOf(g);
        const active = k === activeKey;
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[14px] font-bold transition-colors ${
              active
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <Layers className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
            {nameOf(g)}
            <span
              className={`rounded-full px-2 py-0.5 text-[12px] font-black ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
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
}) {
  const [activeKey, setActiveKey] = useState<string>('');
  if (loading) return <Skel rows={6} />;
  const groups: RequirementGroup[] = resp?.groups ?? [];
  if (!groups.length) return <Empty msg="No requirements found for this window." />;
  const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];

  return (
    <div className="space-y-5">
      <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />
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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES DRILL DRAWER
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

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
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
  const [statsOpen, setStatsOpen] = useState(false);
  const [reqSortBy, setReqSortBy] = useState<SortKey | null>(null);
  const [reqSortDir, setReqSortDir] = useState<'asc' | 'desc' | null>(null);
  const [funnelDrawerTarget, setFunnelDrawerTarget] = useState<FunnelStatsDrawerTarget | null>(
    null
  );

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

  const salesQuery = useQuery({
    queryKey: ['report-sales', baseQs],
    queryFn: async () => (await axios.get(`/reports/sales?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'sales',
    staleTime: 60_000,
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
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">You do not have access to reports.</p>
      </div>
    );

  // Merge funnel candidate counts into the summary object
  const reqSaleValueSummary: SaleValueSummary | null = requirementQuery.data?.saleValueSummary
    ? {
        ...requirementQuery.data.saleValueSummary,
        // @ts-expect-error errr
        nearTerminalCandidates: funnelStatsQuery.data?.summary?.nearTerminalCandidates ?? null,
        terminalCandidates: funnelStatsQuery.data?.summary?.terminalCandidates ?? null,
      }
    : null;

  const reqTotalCount: number = requirementQuery.data?.meta?.total ?? 0;

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-[28px] font-black tracking-tight text-slate-900">Reports</h1>
          </div>
          <p className="text-[13px] font-semibold text-slate-500">
            Live monitoring · Recruiter performance · Requirement analytics · Candidate pipeline ·
            Sales
          </p>
        </div>
        {downloading && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Preparing download…
          </div>
        )}
      </div>

      {/* Filters toggle */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={`flex items-center gap-2 self-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            filtersOpen
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {filtersOpen ? 'Hide filters' : 'Show filters'}
          {hasActiveFilters && (
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </button>

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
      </div>

      {/* Requirements stats bar */}
      {activeTab === 'requirements' && reqSaleValueSummary && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setStatsOpen(o => !o)}
            className={`flex items-center gap-2 self-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              statsOpen
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            {statsOpen ? 'Hide sale summary' : 'Show sale summary'}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${statsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {statsOpen && (
            <RequirementStatsBar
              summary={reqSaleValueSummary}
              totalReqs={reqTotalCount}
              onDrill={type => setFunnelDrawerTarget({ type })}
            />
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={v => {
          const next = v as TabKey;
          if (next !== 'recruiters') {
            setFilters(f => ({ ...f, mojMonth: undefined, mojYear: undefined }));
          }
          if (next === 'overview' || next === 'candidates' || next === 'sales') {
            setFilters(f => ({ ...f, statuses: undefined, createdById: undefined }));
          }
          setSelectedStageIds([]);
          setActiveTab(next);
        }}
      >
        <TabsList className="h-10 gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabsTrigger
            value="overview"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <FileText className="h-3.5 w-3.5" /> Requirements
          </TabsTrigger>
          <TabsTrigger
            value="recruiters"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <Users className="h-3.5 w-3.5" /> Recruiters
          </TabsTrigger>
          <TabsTrigger
            value="candidates"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <UserCheck className="h-3.5 w-3.5" /> Candidates
          </TabsTrigger>
          {/* <TabsTrigger
            value="sales"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <BarChart2 className="h-3.5 w-3.5" /> Sales
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewSection
            data={overviewQuery.data}
            loading={overviewQuery.isLoading}
            onDrill={setDrillTarget}
            baseQs={baseQs}
          />
        </TabsContent>
        <TabsContent value="requirements" className="mt-5">
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
          />
        </TabsContent>
        <TabsContent value="recruiters" className="mt-5">
          <RecruiterStatsBar baseQs={recParams} />
          <RecruiterSection
            resp={recruiterQuery.data}
            loading={recruiterQuery.isLoading}
            reqFilter={recReqFilter}
            onReqFilter={setRecReqFilter}
            onDownloadAll={handleRecruiterAll}
            onDownloadSelected={handleRecruiterSelected}
            baseQs={recParams}
          />
        </TabsContent>
        <TabsContent value="candidates" className="mt-5">
          <CandidatesSection baseQs={baseQs} />
        </TabsContent>
        <TabsContent value="sales" className="mt-5">
          <SalesSection
            data={salesQuery.data?.data ?? null}
            loading={salesQuery.isLoading}
            onDrill={setSalesDrillPayload}
          />
        </TabsContent>
      </Tabs>

      {/* Drawers */}
      <DrillDrawer target={drillTarget} baseQs={baseQs} onClose={() => setDrillTarget(null)} />
      {salesDrillPayload && (
        <SalesDrillDrawer payload={salesDrillPayload} onClose={() => setSalesDrillPayload(null)} />
      )}
      <FunnelStatsDrawer
        target={funnelDrawerTarget}
        baseQs={baseQs}
        onClose={() => setFunnelDrawerTarget(null)}
      />
    </div>
  );
}
