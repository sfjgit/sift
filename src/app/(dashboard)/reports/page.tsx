/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: page.tsx
// Path: src/app/(dashboard)/reports/page.tsx

import { useState, useMemo, useCallback } from 'react';
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

import type {
  RecruiterGroup,
  RecruiterResponse,
  RequirementGroup,
  RequirementReportResponse,
  ServiceLineRef,
} from '@/components/reports/types';
import { DrillDrawer } from '@/components/reports/DrillDrawer';
import type { DrillTarget } from '@/components/reports/DrillDrawer';
import { OverviewSection } from '@/components/reports/OverviewSection';
import { SalesSection } from '@/components/reports/SalesSection';
import { TeamTreePicker } from '@/components/reports/TeamTreePicker';
import type { TeamSelection } from '@/components/reports/TeamTreePicker';

import { Empty, FUNNEL_COLORS, KPI, Skel } from '@/components/reports/reportUi';
import { RecruiterTable } from '@/components/reports/RecruiterTable';
import { RequirementTable } from '@/components/reports/RequirementTable';

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
  clientId?: string;
  serviceLineId?: string;
  businessUnitId?: string;
  departmentId?: string;
  createdById?: string;
  status?: string;
}

type TabKey = 'overview' | 'recruiters' | 'requirements' | 'candidates' | 'sales';

// Sales drill payload — matches what SalesSection passes to onDrill
interface SalesDrillPayload {
  label: string;
  type?: string;
  stageId?: string;
  reqId?: string;
}

interface CandidateReportData {
  totalCandidates: number;
  funnelByStage: {
    stageId: string;
    code: string;
    label: string;
    order: number;
    isStandard: boolean;
    count: number;
    pct: number;
  }[];
  dispositionSummary: Record<string, number>;
  avgPipelineDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE / TIME WINDOW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_WIN: WinState = {
  mode: 'preset',
  range: '',
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

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD UTIL
// ─────────────────────────────────────────────────────────────────────────────

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS BAR
// ─────────────────────────────────────────────────────────────────────────────

const ALL_REPORT_STATUSES = [
  { key: 'ACTIVE', label: 'Active', dot: 'bg-emerald-500' },
  { key: 'DRAFT', label: 'Draft', dot: 'bg-slate-400' },
  { key: 'PENDING_APPROVAL', label: 'Pending', dot: 'bg-amber-500' },
  { key: 'ON_HOLD', label: 'On Hold', dot: 'bg-orange-500' },
  { key: 'CLOSED', label: 'Closed', dot: 'bg-red-500' },
  { key: 'CANCELLED', label: 'Cancelled', dot: 'bg-gray-500' },
] as const;

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
    enabled: activeTab === 'requirements',
  });

  const serviceLines: any[] = overviewFilters?.serviceLines ?? [];
  const businessUnits: any[] = overviewFilters?.businessUnits ?? [];
  const departments: any[] = overviewFilters?.departments ?? [];
  const clients: any[] = overviewFilters?.clients ?? [];

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

  const set = (k: keyof Filters, v: string) =>
    onChange({ ...filters, [k]: v === 'ALL' ? undefined : v || undefined });

  const showStatus =
    activeTab === 'requirements' || activeTab === 'recruiters' || activeTab === 'sales';
  const showCreatedBy = activeTab === 'requirements';
  const showDept = activeTab === 'overview' || activeTab === 'recruiters';

  const hasFilters = !!(
    filters.clientId ||
    filters.serviceLineId ||
    filters.businessUnitId ||
    filters.departmentId ||
    filters.createdById ||
    filters.status ||
    teamSelection
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Row 1: time window */}
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

      {/* Row 2: entity filters */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Filter className="h-4 w-4 shrink-0 text-slate-400" />

        <Select value={filters.clientId ?? 'ALL'} onValueChange={v => set('clientId', v)}>
          <SelectTrigger className="h-8 w-40 border-slate-200 text-xs font-medium">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.serviceLineId ?? 'ALL'} onValueChange={v => set('serviceLineId', v)}>
          <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
            <SelectValue placeholder="All service lines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All service lines</SelectItem>
            {serviceLines.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {businessUnits.length > 0 && (
          <Select
            value={filters.businessUnitId ?? 'ALL'}
            onValueChange={v => set('businessUnitId', v)}
          >
            <SelectTrigger className="h-8 w-40 border-slate-200 text-xs font-medium">
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
          <Select value={filters.departmentId ?? 'ALL'} onValueChange={v => set('departmentId', v)}>
            <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showStatus && (
          <Select
            value={filters.status ?? 'ALL'}
            onValueChange={v => onChange({ ...filters, status: v === 'ALL' ? undefined : v })}
          >
            <SelectTrigger className="h-8 w-40 border-slate-200 text-xs font-medium">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {ALL_REPORT_STATUSES.map(s => (
                <SelectItem key={s.key} value={s.key}>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showCreatedBy &&
          sortedRoleGroups.map(([roleName, users]) => {
            const sel = (users as any[]).find(u => u.id === filters.createdById);
            const displayRole = roleName
              .replaceAll('_', ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
            return (
              <Select
                key={roleName}
                value={sel?.id ?? 'ALL'}
                onValueChange={v =>
                  onChange({ ...filters, createdById: v === 'ALL' ? undefined : v })
                }
              >
                <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
                  <SelectValue placeholder={displayRole} />
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
            );
          })}

        <TeamTreePicker value={teamSelection} onChange={onTeamSelection} />

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
            <X className="h-3 w-3" /> Clear all
          </button>
        )}

        {!filters.serviceLineId && activeTab !== 'sales' && activeTab !== 'overview' && (
          <span className="ml-1 text-[11px] font-semibold text-slate-400">
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
// RECRUITER SECTION
// ─────────────────────────────────────────────────────────────────────────────

function RecruiterSection({
  resp,
  loading,
  reqFilter,
  onReqFilter,
  onDownloadAll,
  onDownloadSelected,
}: {
  resp?: RecruiterResponse;
  loading: boolean;
  reqFilter: string;
  onReqFilter: (v: string) => void;
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
}) {
  const [activeKey, setActiveKey] = useState<string>('');
  if (loading)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skel rows={6} />
      </div>
    );

  const groups: RecruiterGroup[] = resp?.groups ?? [];
  if (!groups.length) return <Empty msg="No recruiter data for this window." />;

  const active = groups.find(g => keyOf(g) === activeKey) ?? groups[0];
  const rows = active.data;

  const reqOptions = (() => {
    const m = new Map<string, string>();
    for (const r of rows)
      for (const rq of r.requirementBreakdown)
        m.set(rq.requirementId, `${rq.reqCode} · ${rq.title}`);
    return [...m.entries()].map(([id, label]) => ({ id, label }));
  })();

  const totals = {
    sourced: rows.reduce((s, r) => s + r.sourced, 0),
    joined: rows.reduce((s, r) => s + r.joined, 0),
    active: rows.reduce((s, r) => s + r.active, 0),
    dropped: rows.reduce((s, r) => s + r.dropped, 0),
    recruiters: new Set(rows.map(r => r.id)).size,
  };

  return (
    <div className="space-y-5">
      <LineTabs groups={groups} activeKey={keyOf(active)} onSelect={setActiveKey} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KPI label="Recruiters" value={totals.recruiters} color="#4F46E5" />
        <KPI label="Sourced" value={totals.sourced} color="#0891B2" />
        <KPI label="Active" value={totals.active} color="#059669" />
        <KPI
          label="Joined"
          value={totals.joined}
          color="#7C3AED"
          trend="up"
          sub={
            totals.sourced > 0
              ? `${((totals.joined / totals.sourced) * 100).toFixed(1)}%`
              : undefined
          }
        />
        <KPI
          label="Dropped"
          value={totals.dropped}
          color="#DC2626"
          trend={totals.dropped > 0 ? 'down' : undefined}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-black uppercase tracking-wider text-slate-600">
          Filter by requirement
        </span>
        <Select value={reqFilter || 'ALL'} onValueChange={v => onReqFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="h-9 w-80 border-2 border-slate-200 text-[13px] font-semibold">
            <SelectValue placeholder="All requirements" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All requirements</SelectItem>
            {reqOptions.map(o => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {reqFilter && (
          <button
            onClick={() => onReqFilter('')}
            className="flex h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-[13px] font-semibold text-red-600 hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
      <RecruiterTable
        key={keyOf(active)}
        title={active.serviceLine?.name ?? null}
        serviceLineId={active.serviceLine?.id}
        data={active.data}
        stages={active.stages}
        onDownloadAll={onDownloadAll}
        onDownloadSelected={onDownloadSelected}
      />
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
        onDownloadAll={onDownloadAll}
        onDownloadSelected={onDownloadSelected}
        onDownloadRow={onDownloadRow}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATES SECTION
// ─────────────────────────────────────────────────────────────────────────────

const DISP_COLORS: Record<string, string> = {
  ACTIVE: '#3B82F6',
  PLACED: '#10B981',
  DROPPED: '#EF4444',
  DUPLICATE: '#94A3B8',
  ON_HOLD: '#F59E0B',
};

function CandidatesSection({
  data,
  loading,
  onExportAll,
  onExportStage,
  selectedStageIds,
  onStageToggle,
}: {
  data?: { data: CandidateReportData };
  loading: boolean;
  onExportAll: () => void;
  onExportStage: (stageIds: string[]) => void;
  selectedStageIds: string[];
  onStageToggle: (stageId: string) => void;
}) {
  if (loading) return <Skel rows={8} />;
  const d = data?.data;
  if (!d || d.totalCandidates === 0) return <Empty msg="No candidates in this window." />;
  const max = Math.max(1, ...d.funnelByStage.map(s => s.count));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Total Candidates" value={d.totalCandidates} color="#4F46E5" />
        <KPI label="Avg Pipeline Days" value={d.avgPipelineDays} color="#0891B2" />
        <KPI label="Active" value={d.dispositionSummary['ACTIVE'] ?? 0} color="#059669" />
        <KPI label="Dropped" value={d.dispositionSummary['DROPPED'] ?? 0} color="#DC2626" />
      </div>

      <div className="rounded-xl border-2 border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-[13px] font-black uppercase tracking-wider text-slate-700">
          Pipeline stages — click to select for export
        </h3>
        <div className="mb-4 flex items-center gap-2">
          {selectedStageIds.length > 0 && (
            <>
              <span className="rounded-lg bg-indigo-100 px-3 py-1.5 text-[13px] font-black text-indigo-800">
                {selectedStageIds.length} stage{selectedStageIds.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => onExportStage(selectedStageIds)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-[13px] font-bold text-white hover:bg-indigo-700"
              >
                Export selected stages
              </button>
            </>
          )}
          <button
            onClick={onExportAll}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border-2 border-slate-200 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
          >
            Export all
          </button>
        </div>
        <div className="space-y-2.5">
          {d.funnelByStage.map((s, i) => {
            const pct = Math.round((s.count / max) * 100);
            const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
            const isSel = selectedStageIds.includes(s.stageId);
            return (
              <button
                key={s.stageId}
                onClick={() => onStageToggle(s.stageId)}
                className={`flex w-full items-center gap-3 rounded-lg p-1.5 transition-all ${isSel ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1' : 'hover:bg-slate-50'}`}
              >
                <span className="w-44 shrink-0 truncate text-right text-[13px] font-bold text-slate-800">
                  {s.label}
                </span>
                <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="flex h-full items-center justify-between rounded-md px-3 transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, 6)}%`,
                      backgroundColor: color,
                      opacity: isSel ? 1 : 0.85,
                    }}
                  >
                    <span className="text-[13px] font-black text-white">{s.count}</span>
                    <span className="text-[11px] font-bold text-white/90">{s.pct}%</span>
                  </div>
                </div>
                {isSel && <CheckSquare className="h-5 w-5 shrink-0 text-indigo-600" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-lg border-2 border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="w-44 shrink-0 text-right text-[13px] font-black text-indigo-800">
            {selectedStageIds.length > 0 ? 'Selected total' : 'Grand total'}
          </span>
          <span className="text-[18px] font-black text-indigo-900">
            {selectedStageIds.length > 0
              ? d.funnelByStage
                  .filter(s => selectedStageIds.includes(s.stageId))
                  .reduce((sum, s) => sum + s.count, 0)
              : d.totalCandidates}{' '}
            <span className="text-[14px] font-bold text-indigo-700">candidates</span>
          </span>
        </div>
      </div>

      <div className="rounded-xl border-2 border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-[13px] font-black uppercase tracking-wider text-slate-700">
          Disposition breakdown
        </h3>
        {(() => {
          const entries = Object.entries(d.dispositionSummary)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1]);
          const total = entries.reduce((s, [, v]) => s + v, 0);
          if (!total) return <Empty msg="No disposition data." />;
          return (
            <div className="space-y-4">
              <div className="flex h-6 w-full overflow-hidden rounded-full">
                {entries.map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      width: `${(v / total) * 100}%`,
                      backgroundColor: DISP_COLORS[k] ?? '#94A3B8',
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {entries.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: DISP_COLORS[k] ?? '#94A3B8' }}
                    />
                    <span className="text-[12px] font-bold text-slate-700">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[13px] font-black text-slate-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES DRILL DRAWER — standalone wrapper that fetches from /reports/sales/drill
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SALES DRILL DRAWER — shows REQUIREMENT stats, not candidate names
// CSMs care: which reqs have activity, fill rate, sale value, stage counts
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  ON_HOLD: 'bg-orange-50 text-orange-700',
  CLOSED: 'bg-red-50 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function fmtCurrencyDrill(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

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
        {/* Header */}
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

        {/* Summary strip — totals across all rows in this drill */}
        {!loading && rows.length > 0 && (
          <div className="flex items-center gap-6 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[12px]">
            <span className="font-black text-slate-700">{totals.reqs} reqs</span>
            <span className="font-black text-emerald-700">{totals.placed} placed</span>
            <span className="font-semibold text-blue-600">{totals.active} active</span>
            <span className="font-semibold text-red-500">{totals.dropped} dropped</span>
            <span className="ml-auto font-black text-indigo-700">
              {fmtCurrencyDrill(totals.saleValue ?? 0)} total sale value
            </span>
          </div>
        )}

        {/* Body — requirement cards */}
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
              {rows.map((r: any) => {
                const maxStage = Math.max(...(r.stageBreakdown ?? []).map((s: any) => s.count), 1);
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm"
                  >
                    {/* Req header */}
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
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          {r.client && <span>{r.client.name}</span>}
                          {r.serviceLine && <span>· {r.serviceLine.name}</span>}
                          <span>
                            · {r.totalOpenings} opening{r.totalOpenings !== 1 ? 's' : ''}
                          </span>
                          <span>· Created by {r.createdBy}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[16px] font-black text-emerald-700">
                          {fmtCurrencyDrill(r.saleValue)}
                        </p>
                        <p className="text-[11px] text-slate-400">sale value</p>
                      </div>
                    </div>

                    {/* Pipeline stat pills */}
                    <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-black text-emerald-700">
                        {r.pipeline.placed} placed
                      </span>
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-600">
                        {r.pipeline.active} active
                      </span>
                      {r.pipeline.nearTerminal > 0 && (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-600">
                          {r.pipeline.nearTerminal} near close
                        </span>
                      )}
                      {r.pipeline.sourced > 0 && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                          {r.pipeline.sourced} sourced
                        </span>
                      )}
                      {r.pipeline.dropped > 0 && (
                        <span className="rounded-lg bg-red-50 px-2.5 py-1 font-semibold text-red-500">
                          {r.pipeline.dropped} dropped
                        </span>
                      )}
                      <span className="ml-auto rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {r.pipeline.total} total
                      </span>
                      {r.fillRate > 0 && (
                        <span className="rounded-lg bg-purple-50 px-2.5 py-1 font-bold text-purple-700">
                          {r.fillRate}% fill rate
                        </span>
                      )}
                    </div>

                    {/* Stage breakdown bars */}
                    {r.stageBreakdown?.length > 0 && (
                      <div className="space-y-1.5">
                        {r.stageBreakdown.map((s: any, idx: number) => {
                          const barPct = Math.max((s.count / maxStage) * 100, 4);
                          const color = s.isTerminal
                            ? '#059669'
                            : ['#4F46E5', '#7C3AED', '#0891B2', '#D97706', '#6366F1'][idx % 5];
                          return (
                            <div key={s.stageId} className="flex items-center gap-2">
                              <span className="w-32 shrink-0 truncate text-right text-[10px] font-semibold text-slate-500">
                                {s.label}
                              </span>
                              <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
                                <div
                                  className="flex h-full items-center rounded-md px-2"
                                  style={{ width: `${barPct}%`, backgroundColor: color }}
                                >
                                  <span className="text-[10px] font-black text-white">
                                    {s.count}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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

  const handleStageToggle = useCallback((stageId: string) => {
    setSelectedStageIds(prev =>
      prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
    );
  }, []);

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(winToParams(win)).forEach(([k, v]) => p.set(k, v));
    if (filters.clientId) p.set('clientId', filters.clientId);
    if (filters.serviceLineId) p.set('serviceLineId', filters.serviceLineId);
    if (filters.businessUnitId) p.set('businessUnitId', filters.businessUnitId);
    if (filters.departmentId) p.set('departmentId', filters.departmentId);
    if (filters.createdById) p.set('createdById', filters.createdById);
    if (filters.status) p.set('status', filters.status);
    if (standardOnly) p.set('standardOnly', 'true');
    if (teamSelection) {
      p.set('userIds', teamSelection.memberIds.join(','));
      p.set('teamRootId', teamSelection.id);
    }
    return p;
  }, [win, filters, standardOnly, teamSelection]);

  const baseQs = baseParams.toString();

  const recParams = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    if (recReqFilter) p.set('requirementId', recReqFilter);
    return p.toString();
  }, [baseQs, recReqFilter]);

  // ── Queries ─────────────────────────────────────────────────────────────────
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
    queryKey: ['report-requirements', baseQs],
    queryFn: async () =>
      (await axios.get(`/reports/requirements?${baseQs}`)).data as RequirementReportResponse,
    enabled: hasAccess && activeTab === 'requirements',
    staleTime: 60_000,
  });

  const candidateQuery = useQuery({
    queryKey: ['report-candidates', baseQs],
    queryFn: async () => (await axios.get(`/reports/candidates?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'candidates',
    staleTime: 60_000,
  });

  const salesQuery = useQuery({
    queryKey: ['report-sales', baseQs],
    queryFn: async () => (await axios.get(`/reports/sales?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'sales',
    staleTime: 60_000,
  });

  // ── Download helper ──────────────────────────────────────────────────────────
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

  const handleCandidateExportAll = useCallback(() => {
    download(`/reports/candidates/export?${baseQs}`, `candidates-all-${dateStr}.xlsx`, 'cand-all');
  }, [baseQs, download, dateStr]);

  const handleCandidateExportStages = useCallback(
    (stageIds: string[]) => {
      const p = new URLSearchParams(baseQs);
      p.set('stageIds', stageIds.join(','));
      download(
        `/reports/candidates/export?${p}`,
        `candidates-stages-${dateStr}.xlsx`,
        'cand-stages'
      );
    },
    [baseQs, download, dateStr]
  );

  if (!hasAccess)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">You do not have access to reports.</p>
      </div>
    );

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

      {/* Filters */}
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

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={v => {
          const next = v as TabKey;
          if (next === 'overview' || next === 'candidates' || next === 'sales') {
            setFilters(f => ({ ...f, status: undefined, createdById: undefined }));
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
            value="recruiters"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <Users className="h-3.5 w-3.5" /> Recruiters
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <FileText className="h-3.5 w-3.5" /> Requirements
          </TabsTrigger>
          <TabsTrigger
            value="candidates"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <UserCheck className="h-3.5 w-3.5" /> Candidates
          </TabsTrigger>
          <TabsTrigger
            value="sales"
            className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <BarChart2 className="h-3.5 w-3.5" /> Sales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewSection
            data={overviewQuery.data}
            loading={overviewQuery.isLoading}
            onDrill={setDrillTarget}
            baseQs={baseQs}
          />
        </TabsContent>

        <TabsContent value="recruiters" className="mt-5">
          <RecruiterSection
            resp={recruiterQuery.data}
            loading={recruiterQuery.isLoading}
            reqFilter={recReqFilter}
            onReqFilter={setRecReqFilter}
            onDownloadAll={handleRecruiterAll}
            onDownloadSelected={handleRecruiterSelected}
          />
        </TabsContent>

        <TabsContent value="requirements" className="mt-5">
          <RequirementSection
            resp={requirementQuery.data}
            loading={requirementQuery.isLoading}
            onDownloadRow={handleRequirementRow}
            onDownloadAll={handleRequirementAll}
            onDownloadSelected={handleRequirementSelected}
          />
        </TabsContent>

        <TabsContent value="candidates" className="mt-5">
          <CandidatesSection
            data={candidateQuery.data}
            loading={candidateQuery.isLoading}
            onExportAll={handleCandidateExportAll}
            onExportStage={handleCandidateExportStages}
            selectedStageIds={selectedStageIds}
            onStageToggle={handleStageToggle}
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-5">
          <SalesSection
            data={salesQuery.data?.data ?? null}
            loading={salesQuery.isLoading}
            onDrill={setSalesDrillPayload}
          />
        </TabsContent>
      </Tabs>

      {/* Overview DrillDrawer — uses its own internal fetch via baseQs */}
      <DrillDrawer target={drillTarget} baseQs={baseQs} onClose={() => setDrillTarget(null)} />

      {/* Sales DrillDrawer — separate component, fetches from /reports/sales/drill */}
      {salesDrillPayload && (
        <SalesDrillDrawer payload={salesDrillPayload} onClose={() => setSalesDrillPayload(null)} />
      )}
    </div>
  );
}
