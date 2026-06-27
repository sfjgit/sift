/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client';

// File: page.tsx
// Path: src/app/(dashboard)/reports/page.tsx

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2,
  Users,
  FileText,
  Briefcase,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
  FileDown,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface StageMeta {
  id: string;
  code: string;
  label: string;
  order: number;
  canonicalStage: string | null;
}

interface StageBreakdown {
  stageId: string;
  code: string;
  label: string;
  order: number;
  canonicalStage: string | null;
  count: number;
}

interface RequirementBreakdown {
  requirementId: string;
  reqCode: string;
  title: string;
  status: string;
  totalOpenings: number;
  client: { id: string; name: string } | null;
  sourced: number;
  submitted: number;
  shortlisted: number;
  offered: number;
  joined: number;
  dropped: number;
  active: number;
  canonicalStageCounts: Record<string, number>;
}

interface RecruiterStat {
  id: string;
  name: string;
  email: string;
  sourced: number;
  submitted: number;
  shortlisted: number;
  offered: number;
  joined: number;
  dropped: number;
  active: number;
  submissionRate: number;
  offerRate: number;
  joinRate: number;
  avgTimeToSubmitDays: number | null;
  canonicalStageCounts: Record<string, number>;
  stageBreakdown: StageBreakdown[];
  requirementBreakdown: RequirementBreakdown[];
}

interface RecruiterResponse {
  success: boolean;
  data: RecruiterStat[];
  total: number;
  meta: { stages: StageMeta[]; canonicalKeys: string[]; scope: string };
}

interface RequirementRow {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  totalCandidates: number;
  city: string | null;
  country: string | null;
  jobType: string;
  remoteType: string;
  respondBy: string | null;
  isRespondByBreached: boolean;
  createdAt: string;
  client: { id: string; name: string } | null;
  businessUnit: { id: string; name: string } | null;
  serviceLine: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  canonicalStageCounts: Record<string, number>;
}

interface RequirementReportResponse {
  success: boolean;
  data: RequirementRow[];
  meta: { total: number; page: number; limit: number; pages: number };
  canonicalKeys: string[];
}

interface AssignmentRow {
  id: string;
  depth: number;
  status: string;
  allocatedOpenings: number | null;
  totalCandidates: number;
  assignedAt: string;
  deadline: string | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
    role: { name: string };
  };
  assignedBy: { id: string; firstName: string; lastName: string };
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    totalOpenings: number;
    client: { id: string; name: string } | null;
  };
  canonicalStageCounts: Record<string, number>;
}

interface AssignmentReportResponse {
  success: boolean;
  data: AssignmentRow[];
  meta: { total: number; page: number; limit: number; pages: number };
  canonicalKeys: string[];
}

type StageView = 'summary' | 'funnel' | 'pipeline';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const FUNNEL_COLORS = [
  '#4F46E5',
  '#7C3AED',
  '#2563EB',
  '#0891B2',
  '#059669',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#0284C7',
  '#16A34A',
  '#CA8A04',
  '#9333EA',
];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-500',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  ON_HOLD: 'bg-orange-50 text-orange-700',
  CLOSED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-50 text-red-600',
  FILLED: 'bg-blue-50 text-blue-700',
  REMOVED: 'bg-slate-100 text-slate-500',
};

function humanKey(k: string) {
  return k
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function fmtCtc(v: number | null | undefined) {
  if (v == null) return '—';
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
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
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function KPI({
  label,
  value,
  sub,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
        {color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      </div>
      <span className="text-3xl font-black text-slate-900 leading-none mt-1">{value}</span>
      {sub && (
        <span
          className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}
        >
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {sub}
        </span>
      )}
    </div>
  );
}

function HBar({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[12px] font-semibold text-slate-600 w-36 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden relative">
        <div
          className="h-full rounded transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {count > 0 && (
          <span
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white"
            style={{ mixBlendMode: 'multiply', color: '#1e293b' }}
          >
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

function Skel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-lg" />
      ))}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
      <AlertCircle className="w-10 h-10 opacity-30" />
      <p className="text-sm font-medium">{msg}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS BAR
// ─────────────────────────────────────────────────────────────────────────────

interface Filters {
  clientId?: string;
  serviceLineId?: string;
  fromDate?: string;
  toDate?: string;
}

function FiltersBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
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

  const clients: any[] = clientsRes ?? [];
  const sls: any[] = slRes ?? [];
  const set = (k: keyof Filters, v: string) =>
    onChange({ ...filters, [k]: v === 'ALL' ? undefined : v || undefined });
  const hasActive = filters.clientId || filters.serviceLineId || filters.fromDate || filters.toDate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-2 items-center">
      <Filter className="w-4 h-4 text-slate-400 shrink-0" />

      <Select value={filters.clientId ?? 'ALL'} onValueChange={v => set('clientId', v)}>
        <SelectTrigger className="h-8 w-40 text-xs font-medium border-slate-200">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Clients</SelectItem>
          {clients.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.serviceLineId ?? 'ALL'} onValueChange={v => set('serviceLineId', v)}>
        <SelectTrigger className="h-8 w-40 text-xs font-medium border-slate-200">
          <SelectValue placeholder="All Service Lines" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Service Lines</SelectItem>
          {sls.map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-lg px-2 h-8">
        <Calendar className="w-3 h-3 text-slate-400" />
        <input
          type="date"
          value={filters.fromDate ?? ''}
          onChange={e => set('fromDate', e.target.value)}
          className="text-xs text-slate-700 bg-transparent outline-none w-28"
        />
      </div>
      <div className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-lg px-2 h-8">
        <span className="text-[10px] font-bold text-slate-400">TO</span>
        <input
          type="date"
          value={filters.toDate ?? ''}
          onChange={e => set('toDate', e.target.value)}
          className="text-xs text-slate-700 bg-transparent outline-none w-28"
        />
      </div>

      {hasActive && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER TABLE
// ─────────────────────────────────────────────────────────────────────────────

function RecruiterSection({
  data,
  loading,
  stages,
  canonicalKeys,
  qs,
  onExport,
}: {
  data: RecruiterStat[];
  loading: boolean;
  stages: StageMeta[];
  canonicalKeys: string[];
  qs: string;
  onExport: (view: StageView) => void;
}) {
  const [view, setView] = useState<StageView>('summary');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reqExp, setReqExp] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleReq = (k: string) =>
    setReqExp(p => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  // Pipeline columns: only stages with data across ANY recruiter
  const activeStageIds = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of data)
      for (const s of r.stageBreakdown) totals[s.stageId] = (totals[s.stageId] ?? 0) + s.count;
    return new Set(stages.filter(s => (totals[s.id] ?? 0) > 0).map(s => s.id));
  }, [data, stages]);
  const activeStages = stages.filter(s => activeStageIds.has(s.id));

  const totals = useMemo(
    () => ({
      sourced: data.reduce((s, r) => s + r.sourced, 0),
      submitted: data.reduce((s, r) => s + r.submitted, 0),
      joined: data.reduce((s, r) => s + r.joined, 0),
      active: data.reduce((s, r) => s + r.active, 0),
      dropped: data.reduce((s, r) => s + r.dropped, 0),
    }),
    [data]
  );

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
  if (!data.length) return <Empty msg="No recruiter data for these filters." />;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label="Recruiters" value={data.length} color="#4F46E5" />
        <KPI label="Sourced" value={totals.sourced} color="#0891B2" />
        <KPI label="Active" value={totals.active} color="#059669" />
        <KPI
          label="Joined"
          value={totals.joined}
          color="#7C3AED"
          trend="up"
          sub={
            totals.sourced > 0
              ? `${((totals.joined / totals.sourced) * 100).toFixed(1)}% of sourced`
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

      {/* View switcher + download */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(
            [
              { k: 'summary', l: 'Summary' },
              { k: 'funnel', l: 'Stage Funnel' },
              { k: 'pipeline', l: 'All Stages' },
            ] as { k: StageView; l: string }[]
          ).map(v => (
            <button
              key={v.k}
              onClick={() => setView(v.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === v.k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {v.l}
            </button>
          ))}
        </div>
        <button
          onClick={() => onExport(view)}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
        >
          <Download className="w-3.5 h-3.5" /> Download{' '}
          {view === 'pipeline' ? 'All Stages' : view === 'funnel' ? 'Stage Funnel' : 'Summary'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Recruiter
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Jobs
              </th>

              {view === 'summary' && (
                <>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Sourced
                  </th>
                  {/* All canonical stages from API */}
                  {canonicalKeys.map((k, i) => (
                    <th
                      key={k}
                      className="px-2 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                        />
                        {humanKey(k)}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Active
                  </th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Avg Days
                  </th>
                </>
              )}

              {view === 'funnel' &&
                canonicalKeys.map((k, i) => (
                  <th
                    key={k}
                    className="px-2 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                      />
                      {humanKey(k)}
                    </div>
                  </th>
                ))}

              {view === 'pipeline' &&
                activeStages.map(s => (
                  <th
                    key={s.id}
                    className="px-2 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap max-w-[80px]"
                    title={s.label}
                  >
                    <span className="block truncate">{s.label}</span>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map(r => {
              const isExp = expanded.has(r.id);
              return (
                <>
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/60 transition-colors ${isExp ? 'bg-indigo-50/20' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggle(r.id)}
                        className="text-slate-300 hover:text-indigo-500 transition-colors"
                      >
                        {isExp ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-[13px]">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.email}</div>
                    </td>
                    <td className="px-3 py-3 text-center text-[12px] font-semibold text-slate-600">
                      {r.requirementBreakdown?.length ?? 0}
                    </td>

                    {view === 'summary' && (
                      <>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[15px] font-black text-slate-900">{r.sourced}</span>
                        </td>
                        {canonicalKeys.map((k, i) => {
                          const count = r.canonicalStageCounts[k] ?? 0;
                          const pct = r.sourced > 0 ? Math.round((count / r.sourced) * 100) : 0;
                          return (
                            <td key={k} className="px-2 py-3 text-center">
                              {count > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className="text-[14px] font-black"
                                    style={{ color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                                  >
                                    {count}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {pct}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-200 text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                            {r.active}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-[12px] font-medium text-slate-500">
                          {r.avgTimeToSubmitDays != null ? `${r.avgTimeToSubmitDays}d` : '—'}
                        </td>
                      </>
                    )}

                    {view === 'funnel' &&
                      canonicalKeys.map((k, i) => {
                        const count = r.canonicalStageCounts[k] ?? 0;
                        const pct = r.sourced > 0 ? Math.round((count / r.sourced) * 100) : 0;
                        return (
                          <td key={k} className="px-2 py-3 text-center">
                            {count > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className="text-[14px] font-black"
                                  style={{ color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                                >
                                  {count}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {pct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-200 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}

                    {view === 'pipeline' &&
                      activeStages.map(s => {
                        const item = r.stageBreakdown.find(b => b.stageId === s.id);
                        const count = item?.count ?? 0;
                        const pct = r.sourced > 0 ? Math.round((count / r.sourced) * 100) : 0;
                        return (
                          <td key={s.id} className="px-2 py-3 text-center">
                            {count > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[14px] font-black text-slate-800">
                                  {count}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {pct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-200 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>

                  {/* Expanded: requirement breakdown */}
                  {isExp && (
                    <tr key={`${r.id}-exp`} className="bg-slate-50/40">
                      <td />
                      <td colSpan={100} className="px-5 py-4">
                        {r.requirementBreakdown?.length > 0 ? (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                              Per Requirement
                            </p>
                            {r.requirementBreakdown.map(rq => {
                              const rqKey = `${r.id}-${rq.requirementId}`;
                              const rqExp = reqExp.has(rqKey);
                              return (
                                <div
                                  key={rq.requirementId}
                                  className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                                >
                                  <button
                                    onClick={() => toggleReq(rqKey)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                                  >
                                    {rqExp ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    )}
                                    <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {rq.reqCode}
                                    </span>
                                    <span className="text-[12px] font-semibold text-slate-800 truncate flex-1">
                                      {rq.title}
                                    </span>
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[rq.status] ?? 'bg-slate-100 text-slate-500'}`}
                                    >
                                      {rq.status.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex items-center gap-3 shrink-0 ml-2">
                                      <span className="text-[11px] font-bold text-slate-800">
                                        {rq.sourced} sourced
                                      </span>
                                      <span
                                        className={`text-[11px] font-bold ${rq.active > 0 ? 'text-indigo-600' : 'text-slate-400'}`}
                                      >
                                        {rq.active} active
                                      </span>
                                      {rq.joined > 0 && (
                                        <span className="text-[11px] font-bold text-emerald-600">
                                          {rq.joined} joined
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                  {rqExp && (
                                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                                      <div className="flex flex-wrap gap-4">
                                        {[
                                          { l: 'Sourced', v: rq.sourced, c: 'text-slate-800' },
                                          { l: 'Submitted', v: rq.submitted, c: 'text-blue-700' },
                                          {
                                            l: 'Shortlisted',
                                            v: rq.shortlisted,
                                            c: 'text-violet-700',
                                          },
                                          { l: 'Offered', v: rq.offered, c: 'text-amber-700' },
                                          { l: 'Joined', v: rq.joined, c: 'text-emerald-700' },
                                          { l: 'Dropped', v: rq.dropped, c: 'text-red-500' },
                                          { l: 'Active', v: rq.active, c: 'text-indigo-700' },
                                        ].map(item => (
                                          <div key={item.l} className="flex flex-col items-center">
                                            <span className={`text-xl font-black ${item.c}`}>
                                              {item.v}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                              {item.l}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      {Object.entries(rq.canonicalStageCounts).filter(
                                        ([, v]) => v > 0
                                      ).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                                          {Object.entries(rq.canonicalStageCounts)
                                            .filter(([, v]) => v > 0)
                                            .map(([k, v]) => (
                                              <span
                                                key={k}
                                                className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full"
                                              >
                                                {humanKey(k)}: {v}
                                              </span>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No requirement data.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT TABLE
// Each row has inline Download Excel button
// ─────────────────────────────────────────────────────────────────────────────

function RequirementSection({
  data,
  loading,
  canonicalKeys,
  onDownloadRow,
  onDownloadAll,
}: {
  data: RequirementRow[];
  loading: boolean;
  canonicalKeys: string[];
  onDownloadRow: (id: string, reqCode: string) => void;
  onDownloadAll: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (loading) return <Skel rows={6} />;
  if (!data.length) return <Empty msg="No requirements found." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{data.length} requirements</span>
        <button
          onClick={onDownloadAll}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
        >
          <Download className="w-3.5 h-3.5" /> Download All
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Requirement
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Status
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Openings
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Total
              </th>
              {/* All canonical stages from API */}
              {canonicalKeys.map((k, i) => (
                <th
                  key={k}
                  className="px-2 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                    />
                    {humanKey(k)}
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Created
              </th>
              <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map(r => {
              const isExp = expanded.has(r.id);
              return (
                <>
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/60 transition-colors ${r.isRespondByBreached ? 'border-l-2 border-l-red-400' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggle(r.id)}
                        className="text-slate-300 hover:text-indigo-500 transition-colors"
                      >
                        {isExp ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 min-w-[240px]">
                      <div className="font-bold text-slate-900 text-[13px] leading-tight">
                        {r.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {r.reqCode}
                        </span>
                        {r.client && (
                          <span className="text-[11px] text-slate-400">{r.client.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-500'}`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-[13px] font-bold text-slate-700">
                      {r.totalOpenings}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[14px] font-black text-slate-900">
                        {r.totalCandidates}
                      </span>
                    </td>
                    {canonicalKeys.map((k, i) => {
                      const count = r.canonicalStageCounts[k] ?? 0;
                      const pct =
                        r.totalCandidates > 0 ? Math.round((count / r.totalCandidates) * 100) : 0;
                      return (
                        <td key={k} className="px-2 py-3 text-center">
                          {count > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className="text-[13px] font-black"
                                style={{ color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                              >
                                {count}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {pct}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-200 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center text-[11px] text-slate-400 font-medium whitespace-nowrap">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => onDownloadRow(r.id, r.reqCode)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <FileDown className="w-3 h-3" /> Excel
                      </button>
                    </td>
                  </tr>

                  {/* Expanded: details */}
                  {isExp && (
                    <tr key={`${r.id}-exp`} className="bg-slate-50/40">
                      <td />
                      <td colSpan={100} className="px-5 py-3">
                        <div className="flex flex-wrap gap-6 text-[12px]">
                          {r.city && (
                            <div>
                              <span className="text-slate-400">City: </span>
                              <span className="font-semibold text-slate-700">{r.city}</span>
                            </div>
                          )}
                          {r.country && (
                            <div>
                              <span className="text-slate-400">Country: </span>
                              <span className="font-semibold text-slate-700">{r.country}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Job Type: </span>
                            <span className="font-semibold text-slate-700">{r.jobType}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Remote: </span>
                            <span className="font-semibold text-slate-700">{r.remoteType}</span>
                          </div>
                          {r.respondBy && (
                            <div>
                              <span className="text-slate-400">Respond By: </span>
                              <span
                                className={`font-semibold ${r.isRespondByBreached ? 'text-red-500' : 'text-slate-700'}`}
                              >
                                {fmtDate(r.respondBy)}
                                {r.isRespondByBreached ? ' ⚠ Breached' : ''}
                              </span>
                            </div>
                          )}
                          {r.businessUnit && (
                            <div>
                              <span className="text-slate-400">BU: </span>
                              <span className="font-semibold text-slate-700">
                                {r.businessUnit.name}
                              </span>
                            </div>
                          )}
                          {r.serviceLine && (
                            <div>
                              <span className="text-slate-400">Service Line: </span>
                              <span className="font-semibold text-slate-700">
                                {r.serviceLine.name}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Priority: </span>
                            <span className="font-semibold text-slate-700">{r.priority}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Created By: </span>
                            <span className="font-semibold text-slate-700">
                              {r.createdBy.firstName} {r.createdBy.lastName}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT TABLE
// Same pattern — per-row Excel download
// ─────────────────────────────────────────────────────────────────────────────

function AssignmentSection({
  data,
  loading,
  canonicalKeys,
  onDownloadRow,
  onDownloadAll,
}: {
  data: AssignmentRow[];
  loading: boolean;
  canonicalKeys: string[];
  onDownloadRow: (id: string) => void;
  onDownloadAll: () => void;
}) {
  if (loading) return <Skel rows={6} />;
  if (!data.length) return <Empty msg="No assignments found." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{data.length} assignments</span>
        <button
          onClick={onDownloadAll}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
        >
          <Download className="w-3.5 h-3.5" /> Download All
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Assignment
              </th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Recruiter
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Status
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Allocated
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Candidates
              </th>
              {canonicalKeys.map((k, i) => (
                <th
                  key={k}
                  className="px-2 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                    />
                    {humanKey(k)}
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Deadline
              </th>
              <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 min-w-[220px]">
                  <div className="font-bold text-slate-900 text-[13px] leading-tight">
                    {a.requirement?.title ?? '—'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {a.requirement?.reqCode}
                    </span>
                    {a.requirement?.client && (
                      <span className="text-[11px] text-slate-400">
                        {a.requirement.client.name}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">Depth {a.depth}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold text-slate-800 text-[12px]">
                    {a.assignedTo.firstName} {a.assignedTo.lastName}
                  </div>
                  <div className="text-[11px] text-slate-400">{a.assignedTo.role?.name}</div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status] ?? 'bg-slate-100 text-slate-500'}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-[13px] font-bold text-slate-700">
                  {a.allocatedOpenings ?? '—'}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-[14px] font-black text-slate-900">{a.totalCandidates}</span>
                </td>
                {canonicalKeys.map((k, i) => {
                  const count = a.canonicalStageCounts[k] ?? 0;
                  const pct =
                    a.totalCandidates > 0 ? Math.round((count / a.totalCandidates) * 100) : 0;
                  return (
                    <td key={k} className="px-2 py-3 text-center">
                      {count > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className="text-[13px] font-black"
                            style={{ color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                          >
                            {count}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-200 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center text-[11px] font-medium whitespace-nowrap">
                  {a.deadline ? (
                    <span
                      className={`${new Date(a.deadline) < new Date() ? 'text-red-500' : 'text-slate-500'}`}
                    >
                      {fmtDate(a.deadline)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => onDownloadRow(a.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <FileDown className="w-3 h-3" /> Excel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

  const [activeTab, setActiveTab] = useState<'recruiters' | 'requirements' | 'assignments'>(
    'recruiters'
  );
  const [filters, setFilters] = useState<Filters>({});
  const [downloading, setDownloading] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.clientId) p.set('clientId', filters.clientId);
    if (filters.serviceLineId) p.set('serviceLineId', filters.serviceLineId);
    if (filters.fromDate) p.set('fromDate', filters.fromDate);
    if (filters.toDate) p.set('toDate', filters.toDate);
    return p.toString();
  }, [filters]);

  const qStr = qs ? `?${qs}` : '';

  const recruiterQuery = useQuery({
    queryKey: ['report-recruiters', qs],
    queryFn: async () => (await axios.get(`/reports/recruiters${qStr}`)).data as RecruiterResponse,
    enabled: hasAccess && activeTab === 'recruiters',
    staleTime: 120000,
  });

  const requirementQuery = useQuery({
    queryKey: ['report-requirements', qs],
    queryFn: async () =>
      (await axios.get(`/reports/requirements${qStr}`)).data as RequirementReportResponse,
    enabled: hasAccess && activeTab === 'requirements',
    staleTime: 120000,
  });

  const assignmentQuery = useQuery({
    queryKey: ['report-assignments', qs],
    queryFn: async () =>
      (await axios.get(`/reports/assignments${qStr}`)).data as AssignmentReportResponse,
    enabled: hasAccess && activeTab === 'assignments',
    staleTime: 120000,
  });

  // ── Download handlers
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

  const handleRecruiterExport = useCallback(
    (view: StageView) => {
      const p = new URLSearchParams(qs);
      p.set('view', view);
      const dateStr = new Date().toISOString().split('T')[0];
      download(
        `/reports/recruiters/export?${p.toString()}`,
        `recruiter-report-${view}-${dateStr}.xlsx`,
        'rec-export'
      );
    },
    [qs, download]
  );

  const handleRequirementAll = useCallback(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    download(`/reports/requirements/export${qStr}`, `requirements-all-${dateStr}.xlsx`, 'req-all');
  }, [qStr, download]);

  const handleRequirementRow = useCallback(
    (id: string, reqCode: string) => {
      const dateStr = new Date().toISOString().split('T')[0];
      download(
        `/reports/requirements/${id}/export`,
        `requirement-${reqCode}-${dateStr}.xlsx`,
        `req-${id}`
      );
    },
    [download]
  );

  const handleAssignmentAll = useCallback(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    download(`/reports/assignments/export${qStr}`, `assignments-all-${dateStr}.xlsx`, 'asgn-all');
  }, [qStr, download]);

  const handleAssignmentRow = useCallback(
    (id: string) => {
      const dateStr = new Date().toISOString().split('T')[0];
      download(
        `/reports/assignments/${id}/export`,
        `assignment-${id}-${dateStr}.xlsx`,
        `asgn-${id}`
      );
    },
    [download]
  );

  if (!hasAccess)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <AlertCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">You don't have access to reports.</p>
      </div>
    );

  const recData = recruiterQuery.data?.data ?? [];
  const recStages = recruiterQuery.data?.meta?.stages ?? [];
  const recCanonical = recruiterQuery.data?.meta?.canonicalKeys ?? [];
  const reqData = requirementQuery.data?.data ?? [];
  const reqCanonical = requirementQuery.data?.canonicalKeys ?? [];
  const asgData = assignmentQuery.data?.data ?? [];
  const asgCanonical = assignmentQuery.data?.canonicalKeys ?? [];

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reports</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Recruiter performance · Requirement analytics · Assignment tracking
          </p>
        </div>
        {downloading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Preparing download…
          </div>
        )}
      </div>

      {/* Filters */}
      <FiltersBar filters={filters} onChange={setFilters} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList className="h-10 bg-white border border-slate-200 rounded-xl shadow-sm p-1 gap-0.5">
          <TabsTrigger
            value="recruiters"
            className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <Users className="w-3.5 h-3.5" /> Recruiters
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <FileText className="w-3.5 h-3.5" /> Requirements
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <Briefcase className="w-3.5 h-3.5" /> Assignments
          </TabsTrigger>
        </TabsList>

        {/* ── RECRUITERS */}
        <TabsContent value="recruiters" className="mt-5">
          <RecruiterSection
            data={recData}
            loading={recruiterQuery.isLoading}
            stages={recStages}
            canonicalKeys={recCanonical}
            qs={qStr}
            onExport={handleRecruiterExport}
          />
        </TabsContent>

        {/* ── REQUIREMENTS */}
        <TabsContent value="requirements" className="mt-5">
          <RequirementSection
            data={reqData}
            loading={requirementQuery.isLoading}
            canonicalKeys={reqCanonical}
            onDownloadRow={handleRequirementRow}
            onDownloadAll={handleRequirementAll}
          />
        </TabsContent>

        {/* ── ASSIGNMENTS */}
        <TabsContent value="assignments" className="mt-5">
          <AssignmentSection
            data={asgData}
            loading={assignmentQuery.isLoading}
            canonicalKeys={asgCanonical}
            onDownloadRow={handleAssignmentRow}
            onDownloadAll={handleAssignmentAll}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
