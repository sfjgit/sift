/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// File: page.tsx
// Path: src/app/(dashboard)/reports/page.tsx

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart2,
  CheckSquare,
  Clock,
  FileText,
  Filter,
  LayoutDashboard,
  Layers,
  RefreshCw,
  Square,
  Users,
  UserCheck,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';

import type {
  OverviewResponse,
  RecruiterGroup,
  RecruiterResponse,
  RequirementGroup,
  RequirementReportResponse,
  ServiceLineRef,
} from '@/components/reports/types';
import {
  Card,
  Empty,
  FUNNEL_COLORS,
  KPI,
  MiniStat,
  Skel,
  humanKey,
} from '@/components/reports/reportUi';
import { RecruiterTable } from '@/components/reports/RecruiterTable';
import { RequirementTable } from '@/components/reports/RequirementTable';

// ─────────────────────────────────────────────────────────────────────────────
// DATE / TIME WINDOW STATE
// ─────────────────────────────────────────────────────────────────────────────

type WindowMode = 'preset' | 'hours' | 'range';

interface WinState {
  mode: WindowMode;
  range: '' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';
  hours: number;
  fromDate: string;
  toDate: string;
}

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
  if (w.mode === 'hours') return `Last ${w.hours} hours`;
  if (w.mode === 'range') {
    if (!w.fromDate && !w.toDate) return 'All time';
    return `${w.fromDate || 'start'} to ${w.toDate || 'now'}`;
  }
  return PRESETS.find(p => p.k === w.range)?.l ?? 'All time';
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD util
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
// CHARTS
// ─────────────────────────────────────────────────────────────────────────────

function FunnelChart({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map(i => i.count));
  if (!items.length) return <Empty msg="No stage data." />;
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => {
        const pct = Math.round((it.count / max) * 100);
        const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        return (
          <div key={it.label + i} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate text-right text-[13px] font-bold text-slate-800">
              {it.label}
            </span>
            <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-slate-200">
              <div
                className="flex h-full items-center justify-end rounded-md px-3 transition-all duration-500"
                style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }}
              >
                <span className="text-[12px] font-black text-white">{it.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeSeriesChart({
  points,
  granularity,
}: {
  points: { bucket: string; count: number }[];
  granularity: 'hour' | 'day';
}) {
  if (points.length < 2)
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        Not enough data points to plot.
      </div>
    );
  const W = 640,
    H = 160,
    pad = 24;
  const max = Math.max(1, ...points.map(p => p.count));
  const stepX = (W - pad * 2) / (points.length - 1);
  const xy = points.map(
    (p, i) => [pad + i * stepX, H - pad - (p.count / max) * (H - pad * 2)] as const
  );
  const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${line} L${xy[xy.length - 1][0]},${H - pad} L${xy[0][0]},${H - pad} Z`;
  const fmtBucket = (b: string) =>
    granularity === 'hour' ? format(new Date(b), 'dd MMM HH:mm') : format(new Date(b), 'dd MMM');
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-[520px]">
        <defs>
          <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#tsGrad)" />
        <path d={line} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinejoin="round" />
        {xy.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#4F46E5" />
            <title>
              {fmtBucket(points[i].bucket)}: {points[i].count}
            </title>
          </g>
        ))}
        {points.map((p, i) =>
          i % Math.ceil(points.length / 8) === 0 ? (
            <text
              key={`t-${i}`}
              x={pad + i * stepX}
              y={H + 14}
              fontSize="9"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {fmtBucket(p.bucket)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

function DispositionBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <Empty msg="No disposition data." />;
  return (
    <div className="space-y-4">
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        {entries.map(([k, v], i) => (
          <div
            key={k}
            style={{
              width: `${(v / total) * 100}%`,
              backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
            }}
            title={`${humanKey(k)}: ${v}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {entries.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
            />
            <span className="text-[13px] font-bold text-slate-700">{humanKey(k)}</span>
            <span className="text-[14px] font-black text-slate-900">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Leaderboard({
  items,
}: {
  items: { id: string; name: string; sourced: number; joined: number }[];
}) {
  const max = Math.max(1, ...items.map(i => i.sourced));
  if (!items.length) return <Empty msg="No recruiter activity." />;
  return (
    <div className="space-y-3">
      {items.map((r, i) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="w-5 text-[12px] font-black text-slate-500">{i + 1}</span>
          <span className="w-40 shrink-0 truncate text-[13px] font-bold text-slate-800">
            {r.name}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded bg-slate-200">
            <div
              className="h-full rounded bg-indigo-600 transition-all"
              style={{ width: `${Math.max((r.sourced / max) * 100, 4)}%` }}
            />
          </div>
          <span className="w-10 text-right text-[14px] font-black text-slate-900">{r.sourced}</span>
          {r.joined > 0 && (
            <span className="w-20 text-right text-[12px] font-bold text-emerald-700">
              {r.joined} joined
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function BUBarChart({
  items,
}: {
  items: { businessUnitId: string | null; name: string; total: number; joined: number }[];
}) {
  const max = Math.max(1, ...items.map(i => i.total));
  if (!items.length) return <Empty msg="No business unit data." />;
  return (
    <div className="space-y-4">
      {items.map((b, i) => (
        <div key={b.businessUnitId ?? `bu-${i}`}>
          <div className="mb-1.5 flex justify-between">
            <span className="text-[14px] font-bold text-slate-800">{b.name}</span>
            <span className="text-[13px] font-semibold text-slate-600">
              {b.total} total ·{' '}
              <span className="font-black text-emerald-700">{b.joined} joined</span>
            </span>
          </div>
          <div className="relative h-6 overflow-hidden rounded bg-slate-200">
            <div
              className="h-full rounded bg-indigo-600"
              style={{ width: `${(b.total / max) * 100}%` }}
            />
            <div
              className="absolute left-0 top-0 h-full rounded bg-emerald-500"
              style={{ width: `${(b.joined / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const ALL_REPORT_STATUSES = [
  { key: 'ACTIVE', label: 'Active', dot: 'bg-emerald-500' },
  { key: 'DRAFT', label: 'Draft', dot: 'bg-slate-400' },
  { key: 'PENDING_APPROVAL', label: 'Pending', dot: 'bg-amber-500' },
  { key: 'ON_HOLD', label: 'On Hold', dot: 'bg-orange-500' },
  { key: 'CLOSED', label: 'Closed', dot: 'bg-red-500' },
  { key: 'CANCELLED', label: 'Cancelled', dot: 'bg-gray-500' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS BAR
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'recruiters' | 'requirements' | 'candidates';

interface Filters {
  clientId?: string;
  serviceLineId?: string;
  createdById?: string;
  status?: string;
}

function FiltersBar({
  filters,
  onChange,
  win,
  onWin,
  standardOnly,
  onStandardOnly,
  activeTab,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  win: WinState;
  onWin: (w: WinState) => void;
  standardOnly: boolean;
  onStandardOnly: (v: boolean) => void;
  activeTab: TabKey;
}) {
  const axios = useAxios();

  const { data: clientsRes } = useQuery({
    queryKey: ['rf-clients'],
    queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data?.data ?? [],
    staleTime: 300000,
  });

  const { data: slRes } = useQuery({
    queryKey: ['rf-sl'],
    queryFn: async () => (await axios.get('/service-lines')).data?.data ?? [],
    staleTime: 300000,
  });

  const { data: createdByRes } = useQuery({
    queryKey: ['rf-created-by'],
    queryFn: async () => {
      const rows = (await axios.get('/users?limit=100&isActive=true')).data?.data ?? [];

      return rows.map((u: any) => ({
        id: u.id,

        label:
          u.displayName?.trim() || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,

        roleId: u.role?.id ?? null,
        roleName: u.role?.name?.trim() || 'OTHER',
      }));
    },
    staleTime: 300000,
  });

  const clients: any[] = clientsRes ?? [];
  const sls: any[] = slRes ?? [];

  const createdBys: {
    id: string;
    label: string;
    roleId: string | null;
    roleName: string;
  }[] = createdByRes ?? [];

  /*
   * Group users by role.
   *
   * Example:
   *
   * {
   *   CSM: [...],
   *   TAAS_RECRUITER: [...],
   *   KAAS_RECRUITER: [...],
   *   SR_CSM: [...]
   * }
   */
  const createdByGroups = createdBys.reduce(
    (groups, user) => {
      const role = user.roleName || 'OTHER';

      if (!groups[role]) {
        groups[role] = [];
      }

      groups[role].push(user);

      return groups;
    },
    {} as Record<
      string,
      {
        id: string;
        label: string;
        roleId: string | null;
        roleName: string;
      }[]
    >
  );

  /*
   * Sort roles alphabetically.
   */
  const sortedRoleGroups = Object.entries(createdByGroups).sort(([roleA], [roleB]) =>
    roleA.localeCompare(roleB)
  );

  const set = (k: keyof Filters, v: string) =>
    onChange({
      ...filters,
      [k]: v === 'ALL' ? undefined : v || undefined,
    });

  const showStatus = activeTab === 'requirements' || activeTab === 'recruiters';

  const showCreatedBy = activeTab === 'requirements';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* =========================================================
          ROW 1: TIME WINDOW
      ========================================================= */}
      <div className="flex flex-wrap items-center gap-2">
        <Clock className="h-4 w-4 shrink-0 text-slate-400" />

        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {(
            [
              { k: 'preset', l: 'Quick' },
              { k: 'hours', l: 'By hours' },
              { k: 'range', l: 'Custom range' },
            ] as { k: WindowMode; l: string }[]
          ).map(m => (
            <button
              key={m.k}
              onClick={() => onWin({ ...win, mode: m.k })}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                win.mode === m.k
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m.l}
            </button>
          ))}
        </div>

        {/* QUICK PRESETS */}
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

        {/* HOURS */}
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
                onChange={e =>
                  onWin({
                    ...win,
                    hours: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="w-14 bg-transparent text-xs text-slate-700 outline-none"
              />

              <span className="text-[10px] font-bold text-slate-400">hrs</span>
            </div>
          </div>
        )}

        {/* CUSTOM RANGE */}
        {win.mode === 'range' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">FROM</span>

              <input
                type="date"
                value={win.fromDate}
                onChange={e =>
                  onWin({
                    ...win,
                    fromDate: e.target.value,
                  })
                }
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>

            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">TO</span>

              <input
                type="date"
                value={win.toDate}
                onChange={e =>
                  onWin({
                    ...win,
                    toDate: e.target.value,
                  })
                }
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
          </div>
        )}

        <span className="ml-auto rounded-lg bg-indigo-100 px-3 py-1.5 text-[12px] font-black text-indigo-700">
          {winLabel(win)}
        </span>
      </div>

      {/* =========================================================
          ROW 2: ENTITY FILTERS
      ========================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Filter className="h-4 w-4 shrink-0 text-slate-400" />

        {/* =======================================================
            CLIENT
        ======================================================= */}
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

        {/* =======================================================
            SERVICE LINE
        ======================================================= */}
        <Select value={filters.serviceLineId ?? 'ALL'} onValueChange={v => set('serviceLineId', v)}>
          <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
            <SelectValue placeholder="All service lines" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">All service lines</SelectItem>

            {sls.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* =======================================================
            DYNAMIC ROLE DROPDOWNS
        ======================================================= */}
        {showCreatedBy &&
          sortedRoleGroups.map(([roleName, users]) => {
            const selectedUser = users.find(user => user.id === filters.createdById);

            const displayRoleName = roleName
              .replaceAll('_', ' ')
              .replace(/\b\w/g, char => char.toUpperCase());

            return (
              <Select
                key={roleName}
                value={selectedUser?.id ?? 'ALL'}
                onValueChange={value =>
                  onChange({
                    ...filters,
                    createdById: value === 'ALL' ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
                  <SelectValue placeholder={displayRoleName} />
                </SelectTrigger>

                <SelectContent>
                  {/* RESET OPTION */}
                  <SelectItem value="ALL">All {displayRoleName}</SelectItem>

                  {/* USERS BELONGING ONLY TO THIS ROLE */}
                  {users
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            );
          })}

        {/* =======================================================
            STATUS
        ======================================================= */}
        {showStatus && (
          <>
            <Select
              value={filters.status ?? 'ALL'}
              onValueChange={v =>
                onChange({
                  ...filters,
                  status: v === 'ALL' ? undefined : v,
                })
              }
            >
              <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>

                {ALL_REPORT_STATUSES.map(s => (
                  <SelectItem key={s.key} value={s.key}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />

                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.status && (
              <button
                onClick={() =>
                  onChange({
                    ...filters,
                    status: undefined,
                  })
                }
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </>
        )}

        {/* =======================================================
            STANDARD STAGES ONLY
        ======================================================= */}
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

        {/* =======================================================
            CLEAR ALL
        ======================================================= */}
        {(filters.clientId || filters.serviceLineId || filters.createdById || filters.status) && (
          <button
            onClick={() => onChange({})}
            className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}

        {/* =======================================================
            SERVICE LINE HINT
        ======================================================= */}
        {!filters.serviceLineId && (
          <span className="ml-1 text-[12px] font-semibold text-slate-500">
            Tables split by service line — pick one to see flat.
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

function OverviewSection({ data, loading }: { data?: OverviewResponse; loading: boolean }) {
  if (loading)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );

  const d = data?.data;
  if (!d || d.kpis.total === 0) return <Empty msg="No activity in this window." />;
  const multiLine = d.byServiceLine.length > 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Candidates" value={d.kpis.total} color="#4F46E5" />
        <KPI
          label="Submitted"
          value={d.kpis.submitted}
          color="#2563EB"
          sub={`${d.kpis.submissionRate}% of sourced`}
        />
        <KPI
          label="Offered"
          value={d.kpis.offered}
          color="#D97706"
          sub={`${d.kpis.offerRate}% of submitted`}
        />
        <KPI
          label="Joined"
          value={d.kpis.joined}
          color="#059669"
          trend="up"
          sub={`${d.kpis.joinRate}% of offered`}
        />
        <KPI label="Active" value={d.kpis.active} color="#0891B2" />
        <KPI
          label="Dropped"
          value={d.kpis.dropped}
          color="#DC2626"
          trend={d.kpis.dropped > 0 ? 'down' : undefined}
        />
      </div>

      <Card title={`Candidates added (${d.timeGranularity === 'hour' ? 'hourly' : 'daily'})`}>
        <TimeSeriesChart points={d.timeSeries} granularity={d.timeGranularity} />
      </Card>

      {multiLine ? (
        <>
          <Card title="By business unit">
            <BUBarChart items={d.byBusinessUnit} />
          </Card>
          <div>
            <h3 className="mb-4 text-[15px] font-black uppercase tracking-wider text-slate-800">
              Service line funnels
            </h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {d.byServiceLine.map(line => (
                <Card key={line.serviceLineId ?? 'none'} title={line.name}>
                  <div className="mb-4 flex flex-wrap gap-5">
                    <MiniStat l="Total" v={line.total} />
                    <MiniStat l="Submitted" v={line.submitted} c="text-blue-700" />
                    <MiniStat l="Offered" v={line.offered} c="text-amber-700" />
                    <MiniStat l="Joined" v={line.joined} c="text-emerald-700" />
                  </div>
                  <FunnelChart items={line.funnel.map(f => ({ label: f.label, count: f.count }))} />
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <Card title="Stage funnel">
          <FunnelChart items={d.funnel.map(f => ({ label: f.label, count: f.count }))} />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Disposition split">
          <DispositionBars counts={d.dispositionCounts} />
        </Card>
        <Card title="Top recruiters">
          <Leaderboard items={d.leaderboard} />
        </Card>
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
    <div className="flex items-center gap-1 overflow-x-auto border-b-2 border-slate-300">
      {groups.map(g => {
        const k = keyOf(g);
        const active = k === activeKey;
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[14px] font-bold transition-colors ${active ? 'border-indigo-600 text-indigo-800' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-400'}`}
          >
            <Layers className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
            {nameOf(g)}
            <span
              className={`rounded-full px-2 py-0.5 text-[12px] font-black ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
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
// CANDIDATES SECTION (new tab)
// Shows a funnel view + stage-filtered candidate list
// Clicking a stage bar filters the list below it
// ─────────────────────────────────────────────────────────────────────────────

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
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Total Candidates" value={d.totalCandidates} color="#4F46E5" />
        <KPI label="Avg Pipeline Days" value={d.avgPipelineDays} color="#0891B2" />
        <KPI label="Active" value={d.dispositionSummary['ACTIVE'] ?? 0} color="#059669" />
        <KPI label="Dropped" value={d.dispositionSummary['DROPPED'] ?? 0} color="#DC2626" />
      </div>

      {/* Stage funnel — clickable to filter */}
      <Card title="Pipeline stages — click any stage to select for export">
        <div className="mb-4 flex items-center gap-2">
          {selectedStageIds.length > 0 && (
            <>
              <span className="rounded-lg bg-indigo-100 px-3 py-1.5 text-[13px] font-black text-indigo-800">
                {selectedStageIds.length} stage{selectedStageIds.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => onExportStage(selectedStageIds)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-[13px] font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Export selected stages
              </button>
            </>
          )}
          <button
            onClick={onExportAll}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border-2 border-slate-300 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Export all
          </button>
        </div>

        <div className="space-y-2.5">
          {d.funnelByStage.map((s, i) => {
            const pct = Math.round((s.count / max) * 100);
            const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
            const isSelected = selectedStageIds.includes(s.stageId);
            return (
              <button
                key={s.stageId}
                onClick={() => onStageToggle(s.stageId)}
                className={`flex w-full items-center gap-3 rounded-lg p-1.5 transition-all ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50' : 'hover:bg-slate-100'}`}
              >
                <span className="w-44 shrink-0 truncate text-right text-[13px] font-bold text-slate-800">
                  {s.label}
                </span>
                <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-slate-200">
                  <div
                    className="flex h-full items-center justify-between rounded-md px-3 transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, 6)}%`,
                      backgroundColor: color,
                      opacity: isSelected ? 1 : 0.85,
                    }}
                  >
                    <span className="text-[13px] font-black text-white">{s.count}</span>
                    <span className="text-[11px] font-bold text-white/90">{s.pct}%</span>
                  </div>
                </div>
                {isSelected && <CheckSquare className="h-5 w-5 shrink-0 text-indigo-600" />}
              </button>
            );
          })}
        </div>

        {/* Auto total row */}
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-indigo-50 px-4 py-3 border-2 border-indigo-200">
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
      </Card>

      {/* Disposition breakdown */}
      <Card title="Disposition breakdown">
        <DispositionBars counts={d.dispositionSummary} />
      </Card>
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
          {[...Array(5)].map((_, i) => (
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
          <SelectTrigger className="h-9 w-80 border-2 border-slate-300 text-[13px] font-semibold text-slate-800">
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
            className="flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-red-600 hover:bg-red-50 border border-red-200"
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

  // Selected stage IDs on the Candidates tab — drives both the UI total and the export
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);

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
    if (filters.createdById) p.set('createdById', filters.createdById);
    if (filters.status) p.set('status', filters.status);
    if (standardOnly) p.set('standardOnly', 'true');
    return p;
  }, [win, filters, standardOnly]);

  const baseQs = baseParams.toString();

  const recParams = useMemo(() => {
    const p = new URLSearchParams(baseQs);
    if (recReqFilter) p.set('requirementId', recReqFilter);
    return p.toString();
  }, [baseQs, recReqFilter]);

  const overviewQuery = useQuery({
    queryKey: ['report-overview', baseQs],
    queryFn: async () => (await axios.get(`/reports/overview?${baseQs}`)).data as OverviewResponse,
    enabled: hasAccess && activeTab === 'overview',
    staleTime: 60000,
  });
  const recruiterQuery = useQuery({
    queryKey: ['report-recruiters', recParams],
    queryFn: async () =>
      (await axios.get(`/reports/recruiters?${recParams}`)).data as RecruiterResponse,
    enabled: hasAccess && activeTab === 'recruiters',
    staleTime: 60000,
  });
  const requirementQuery = useQuery({
    queryKey: ['report-requirements', baseQs],
    queryFn: async () =>
      (await axios.get(`/reports/requirements?${baseQs}`)).data as RequirementReportResponse,
    enabled: hasAccess && activeTab === 'requirements',
    staleTime: 60000,
  });
  const candidateQuery = useQuery({
    queryKey: ['report-candidates', baseQs],
    queryFn: async () => (await axios.get(`/reports/candidates?${baseQs}`)).data,
    enabled: hasAccess && activeTab === 'candidates',
    staleTime: 60000,
  });

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

  // Helper: builds params with stageIds appended
  const withStageIds = useCallback((base: string, stageIds?: string[]) => {
    const p = new URLSearchParams(base);
    if (stageIds && stageIds.length > 0) p.set('stageIds', stageIds.join(','));
    return p.toString();
  }, []);

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
      download(
        `/reports/recruiters/export?${p}`,
        `recruiter-report-${slId ? 'line' : 'all'}-${dateStr}.xlsx`,
        'rec-all'
      );
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
      download(
        `/reports/requirements/export?${p}`,
        `requirements-${slId ? 'line' : 'all'}-${dateStr}.xlsx`,
        'req-all'
      );
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

  // Candidates tab exports — stageIds drive the Candidates sheet filter
  const handleCandidateExportAll = useCallback(() => {
    const qs = withStageIds(baseQs);
    download(`/reports/candidates/export?${qs}`, `candidates-all-${dateStr}.xlsx`, 'cand-all');
  }, [baseQs, withStageIds, download, dateStr]);

  const handleCandidateExportStages = useCallback(
    (stageIds: string[]) => {
      const qs = withStageIds(baseQs, stageIds);
      download(
        `/reports/candidates/export?${qs}`,
        `candidates-stages-${dateStr}.xlsx`,
        'cand-stages'
      );
    },
    [baseQs, withStageIds, download, dateStr]
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Reports</h1>
          </div>
          <p className="text-sm font-semibold text-slate-600">
            Live monitoring · Recruiter performance · Requirement analytics · Candidate pipeline
          </p>
        </div>
        {downloading && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Preparing download…
          </div>
        )}
      </div>

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
      />

      <Tabs
        value={activeTab}
        onValueChange={v => {
          const next = v as TabKey;
          if (next === 'overview') setFilters(f => ({ ...f, status: undefined }));
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
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewSection data={overviewQuery.data} loading={overviewQuery.isLoading} />
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
      </Tabs>
    </div>
  );
}
