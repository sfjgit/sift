'use client';

// File: MyRequirementsSection.tsx
// Path: src/components/reports/MyRequirementsSection.tsx

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  IndianRupee,
  Filter,
  Search,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface StageCount {
  stageId: string;
  code: string;
  label: string;
  order: number;
  isTerminal: boolean;
  isSourced: boolean;
  count: number;
}

interface AssignmentRow {
  id: string;
  assignedToId: string;
  assigneeName: string;
  assigneeRole: string;
  depth: number;
  allocatedOpenings: number | null;
  filledOpenings: number;
  submissionsCount: number;
  assignedAt: string;
  candidateCount: number;
}

interface RequirementRow {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  totalOpenings: number;
  filledOpenings: number;
  fillRate: number;
  createdAt: string;
  closedAt: string | null;
  targetDate: string | null;
  saleValue: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceMin: number | null;
  experienceMax: number | null;
  location: string | null;
  client: { id: string; name: string } | null;
  clientSpoc: string | null;
  serviceLine: { id: string; name: string } | null;
  businessUnit: { id: string; name: string } | null;
  pipeline: {
    total: number;
    sourced: number;
    inProgress: number;
    placed: number;
    dropped: number;
    onHold: number;
  };
  stageBreakdown: StageCount[];
  assignmentBreakdown: AssignmentRow[];
}

interface Summary {
  total: number;
  totalOpenings: number;
  totalFilled: number;
  fillRate: number;
  totalSaleValue: number;
  totalCandidates: number;
  totalPlaced: number;
}

interface MyReqResponse {
  success: boolean;
  data: { requirements: RequirementRow[]; summary: Summary };
  meta: { userId: string; status: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  ON_HOLD: 'bg-orange-50 text-orange-700',
  CLOSED: 'bg-red-50 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const DATE_PRESETS = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT — client-side SheetJS
// ─────────────────────────────────────────────────────────────────────────────

function exportMyRequirements(rows: RequirementRow[], summary: Summary) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Requirements overview
  const reqSheet = rows.map((r, i) => ({
    '#': i + 1,
    'Req Code': r.reqCode,
    Title: r.title,
    Status: r.status,
    Client: r.client?.name ?? '',
    'Client SPOC': r.clientSpoc ?? '',
    'Service Line': r.serviceLine?.name ?? '',
    'Business Unit': r.businessUnit?.name ?? '',
    Location: r.location ?? '',
    Openings: r.totalOpenings,
    Filled: r.filledOpenings,
    'Fill %': `${r.fillRate}%`,
    'Sale Value': r.saleValue ?? '',
    'Exp Min': r.experienceMin ?? '',
    'Exp Max': r.experienceMax ?? '',
    'Salary Min': r.salaryMin ?? '',
    'Salary Max': r.salaryMax ?? '',
    'Total Candidates': r.pipeline.total,
    Sourced: r.pipeline.sourced,
    'In Progress': r.pipeline.inProgress,
    Placed: r.pipeline.placed,
    Dropped: r.pipeline.dropped,
    'On Hold': r.pipeline.onHold,
    'Target Date': fmtDate(r.targetDate),
    'Created On': fmtDate(r.createdAt),
    'Closed On': fmtDate(r.closedAt),
  }));

  const ws1 = XLSX.utils.json_to_sheet(reqSheet);
  ws1['!cols'] = [
    { wch: 4 },
    { wch: 14 },
    { wch: 34 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Requirements');

  // Sheet 2: Stage breakdown per requirement
  const stageRows: any[] = [];
  for (const r of rows) {
    for (const s of r.stageBreakdown) {
      stageRows.push({
        'Req Code': r.reqCode,
        Title: r.title,
        Client: r.client?.name ?? '',
        Stage: s.label,
        'Stage Code': s.code,
        'Is Terminal': s.isTerminal ? 'Yes' : 'No',
        Count: s.count,
      });
    }
  }
  if (stageRows.length) {
    const ws2 = XLSX.utils.json_to_sheet(stageRows);
    ws2['!cols'] = [
      { wch: 14 },
      { wch: 34 },
      { wch: 22 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Stage Breakdown');
  }

  // Sheet 3: Assignments
  const assignRows: any[] = [];
  for (const r of rows) {
    for (const a of r.assignmentBreakdown) {
      assignRows.push({
        'Req Code': r.reqCode,
        Title: r.title,
        Client: r.client?.name ?? '',
        'Assigned To': a.assigneeName,
        Role: a.assigneeRole.replace(/_/g, ' '),
        Level: a.depth === 0 ? 'Manager' : a.depth === 1 ? 'Team Lead' : 'Recruiter',
        'Allocated Openings': a.allocatedOpenings ?? 'All',
        Filled: a.filledOpenings,
        Submissions: a.submissionsCount,
        'Candidates in Pipeline': a.candidateCount,
        'Assigned On': fmtDate(a.assignedAt),
      });
    }
  }
  if (assignRows.length) {
    const ws3 = XLSX.utils.json_to_sheet(assignRows);
    ws3['!cols'] = [
      { wch: 14 },
      { wch: 34 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 12 },
      { wch: 16 },
      { wch: 8 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Assignments');
  }

  // Sheet 4: Summary
  const summarySheet = [
    { Metric: 'Total Requirements', Value: summary.total },
    { Metric: 'Total Openings', Value: summary.totalOpenings },
    { Metric: 'Total Filled', Value: summary.totalFilled },
    { Metric: 'Fill Rate', Value: `${summary.fillRate}%` },
    { Metric: 'Total Sale Value', Value: fmtCurrency(summary.totalSaleValue) },
    { Metric: 'Total Candidates', Value: summary.totalCandidates },
    { Metric: 'Total Placed', Value: summary.totalPlaced },
  ];
  const ws4 = XLSX.utils.json_to_sheet(summarySheet);
  ws4['!cols'] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Summary');

  XLSX.writeFile(wb, `my_requirements_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY KPIS
// ─────────────────────────────────────────────────────────────────────────────

function SummaryKpis({ s }: { s: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {[
        { label: 'My Requirements', value: s.total, color: '#4F46E5', Icon: FileText },
        { label: 'Total Openings', value: s.totalOpenings, color: '#0891B2', Icon: Target },
        { label: 'Filled', value: s.totalFilled, color: '#059669', Icon: CheckCircle2 },
        { label: 'Fill Rate', value: `${s.fillRate}%`, color: '#7C3AED', Icon: TrendingUp },
        {
          label: 'Sale Value',
          value: fmtCurrency(s.totalSaleValue),
          color: '#059669',
          Icon: IndianRupee,
        },
        { label: 'Candidates', value: s.totalCandidates, color: '#0891B2', Icon: Users },
        { label: 'Placed', value: s.totalPlaced, color: '#059669', Icon: CheckCircle2 },
      ].map(({ label, value, color, Icon }) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {label}
            </span>
            <div
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon className="h-3 w-3" style={{ color }} />
            </div>
          </div>
          <span className="text-[20px] font-black leading-none" style={{ color }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE BAR — mini inline bar for a requirement row
// ─────────────────────────────────────────────────────────────────────────────

function PipelineBar({ pipeline }: { pipeline: RequirementRow['pipeline'] }) {
  const total = pipeline.total;
  if (!total) return <span className="text-[11px] text-slate-400">No candidates</span>;

  const segments = [
    { key: 'placed', color: '#059669', label: 'Placed' },
    { key: 'inProgress', color: '#4F46E5', label: 'In Progress' },
    { key: 'sourced', color: '#94A3B8', label: 'Sourced' },
    { key: 'onHold', color: '#F59E0B', label: 'On Hold' },
    { key: 'dropped', color: '#EF4444', label: 'Dropped' },
  ] as const;

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-3 w-28 overflow-hidden rounded-full bg-slate-100">
        {segments.map(({ key, color }) => {
          const val = pipeline[key as keyof typeof pipeline] as number;
          if (!val) return null;
          return (
            <div
              key={key}
              style={{ width: `${(val / total) * 100}%`, backgroundColor: color }}
              title={`${key}: ${val}`}
            />
          );
        })}
      </div>
      <span className="text-[11px] font-semibold text-slate-500">{total}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT ROW — expandable
// ─────────────────────────────────────────────────────────────────────────────

function ReqRow({ row }: { row: RequirementRow }) {
  const [expanded, setExpanded] = useState(false);

  const FUNNEL_COLORS = [
    '#4F46E5',
    '#7C3AED',
    '#0891B2',
    '#059669',
    '#D97706',
    '#DC2626',
    '#6366F1',
    '#10B981',
  ];

  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Expand */}
        <td className="px-3 py-3 text-slate-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>

        {/* Req code + title */}
        <td className="px-3 py-3">
          <p className="text-[13px] font-bold text-slate-900">{row.title}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              {row.reqCode}
            </span>
            {row.client && <span className="text-[11px] text-slate-400">{row.client.name}</span>}
          </div>
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[row.status] ?? 'bg-slate-100 text-slate-600'}`}
          >
            {row.status.replace(/_/g, ' ')}
          </span>
        </td>

        {/* Openings */}
        <td className="px-3 py-3 text-center">
          <span className="text-[13px] font-black text-slate-800">{row.filledOpenings}</span>
          <span className="text-slate-400">/{row.totalOpenings}</span>
          {row.fillRate > 0 && (
            <p className="text-[10px] font-semibold text-emerald-600">{row.fillRate}%</p>
          )}
        </td>

        {/* Sale value */}
        <td className="px-3 py-3">
          <span className="text-[13px] font-black text-emerald-700">
            {fmtCurrency(row.saleValue)}
          </span>
        </td>

        {/* Pipeline */}
        <td className="px-3 py-3">
          <PipelineBar pipeline={row.pipeline} />
        </td>

        {/* Assignments */}
        <td className="px-3 py-3 text-center">
          <span className="text-[13px] font-bold text-slate-700">
            {row.assignmentBreakdown.length}
          </span>
        </td>

        {/* Created */}
        <td className="px-3 py-3 text-right">
          <p className="text-[11px] font-semibold text-slate-700">{fmtDate(row.createdAt)}</p>
          {row.targetDate && (
            <p className="text-[10px] text-slate-400">Target: {fmtDate(row.targetDate)}</p>
          )}
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-slate-50/60">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Stage breakdown */}
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Pipeline stages
                </p>
                {row.stageBreakdown.length ? (
                  <div className="space-y-1.5">
                    {row.stageBreakdown.map((s, i) => {
                      const max = Math.max(...row.stageBreakdown.map(x => x.count));
                      const pct = Math.max((s.count / max) * 100, 5);
                      const color = s.isTerminal
                        ? '#059669'
                        : FUNNEL_COLORS[i % FUNNEL_COLORS.length];
                      return (
                        <div key={s.stageId} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 truncate text-right text-[11px] font-semibold text-slate-600">
                            {s.label}
                          </span>
                          <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-200">
                            <div
                              className="flex h-full items-center rounded-md px-2"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            >
                              <span className="text-[11px] font-black text-white">{s.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-400">No candidates yet.</p>
                )}
              </div>

              {/* Assignment breakdown */}
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Assigned to
                </p>
                {row.assignmentBreakdown.length ? (
                  <div className="space-y-2">
                    {row.assignmentBreakdown.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                        style={{ marginLeft: `${a.depth * 16}px` }}
                      >
                        <div>
                          <p className="text-[12px] font-bold text-slate-800">{a.assigneeName}</p>
                          <p className="text-[10px] text-slate-400">
                            {a.assigneeRole.replace(/_/g, ' ')} · Assigned {fmtDate(a.assignedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-right text-[11px]">
                          <div>
                            <p className="font-black text-slate-800">{a.candidateCount}</p>
                            <p className="text-slate-400">candidates</p>
                          </div>
                          <div>
                            <p className="font-black text-emerald-700">{a.filledOpenings}</p>
                            <p className="text-slate-400">filled</p>
                          </div>
                          {a.allocatedOpenings != null && (
                            <div>
                              <p className="font-black text-indigo-700">{a.allocatedOpenings}</p>
                              <p className="text-slate-400">allocated</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-400">Not assigned to anyone yet.</p>
                )}
              </div>

              {/* Extra meta */}
              <div className="flex flex-wrap gap-4 text-[12px] lg:col-span-2">
                {row.serviceLine && (
                  <span>
                    <span className="text-slate-400">Service Line </span>
                    <span className="font-semibold">{row.serviceLine.name}</span>
                  </span>
                )}
                {row.businessUnit && (
                  <span>
                    <span className="text-slate-400">BU </span>
                    <span className="font-semibold">{row.businessUnit.name}</span>
                  </span>
                )}
                {row.location && (
                  <span>
                    <span className="text-slate-400">Location </span>
                    <span className="font-semibold">{row.location}</span>
                  </span>
                )}
                {row.clientSpoc && (
                  <span>
                    <span className="text-slate-400">SPOC </span>
                    <span className="font-semibold">{row.clientSpoc}</span>
                  </span>
                )}
                {(row.experienceMin != null || row.experienceMax != null) && (
                  <span>
                    <span className="text-slate-400">Exp </span>
                    <span className="font-semibold">
                      {row.experienceMin ?? '?'}–{row.experienceMax ?? '?'} yrs
                    </span>
                  </span>
                )}
                {(row.salaryMin != null || row.salaryMax != null) && (
                  <span>
                    <span className="text-slate-400">Salary </span>
                    <span className="font-semibold">
                      {fmtCurrency(row.salaryMin)} – {fmtCurrency(row.salaryMax)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface MyRequirementsSectionProps {
  // Pass existing date window params from the reports page
  baseQs: string;
}

export function MyRequirementsSection({ baseQs }: MyRequirementsSectionProps) {
  const axios = useAxios();

  // Local filters — independent of the global reports filters
  const [status, setStatus] = useState('ACTIVE');
  const [datePreset, setDatePreset] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [customRange, setCustomRange] = useState(false);

  // Build query string — uses local filters, not global baseQs
  // (this section is always about the logged-in user's own requirements)
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (status && status !== 'ALL') p.set('status', status);
    if (customRange) {
      if (fromDate) p.set('fromDate', fromDate);
      if (toDate) p.set('toDate', toDate);
    } else if (datePreset) {
      p.set('range', datePreset);
    }
    return p.toString();
  }, [status, datePreset, fromDate, toDate, customRange]);

  const { data, isLoading, isError } = useQuery<MyReqResponse>({
    queryKey: ['my-requirements', queryString],
    queryFn: async () => (await axios.get(`/reports/overview/my-requirements?${queryString}`)).data,
    staleTime: 60_000,
  });

  const rows = data?.data?.requirements ?? [];
  const summary = data?.data?.summary;

  // Client-side search
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      r =>
        r.title.toLowerCase().includes(q) ||
        r.reqCode.toLowerCase().includes(q) ||
        r.client?.name.toLowerCase().includes(q) ||
        r.serviceLine?.name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (isLoading)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  if (isError)
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-[13px] text-red-600">
        Failed to load your requirements.
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-black text-slate-900">My Requirements</h3>
          <p className="text-[12px] text-slate-500">
            Requirements you created — pipeline health, assignments, sale value
          </p>
        </div>
        {rows.length > 0 && summary && (
          <button
            onClick={() => exportMyRequirements(filtered, summary)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Download className="h-4 w-4" />
            Export {filtered.length < rows.length ? `${filtered.length} filtered` : 'all'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Filter className="h-4 w-4 shrink-0 text-slate-400" />

        {/* Status */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-medium">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value ?? undefined} value={o.value ?? undefined}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date preset */}
        {!customRange && (
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="h-8 w-36 border-slate-200 text-xs font-medium">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(o => (
                <SelectItem key={o.value ?? undefined} value={o.value ?? undefined}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Custom range toggle */}
        <button
          onClick={() => {
            setCustomRange(p => !p);
            setDatePreset('');
          }}
          className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
            customRange
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Custom range
        </button>

        {customRange && (
          <>
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">FROM</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
              <span className="text-[10px] font-bold text-slate-400">TO</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-28 bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
          </>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search requirements…"
            className="h-8 w-52 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      {summary && <SummaryKpis s={summary} />}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <FileText className="h-10 w-10 opacity-20" />
          <p className="text-[14px] font-semibold">
            {rows.length === 0
              ? `No ${status === 'ALL' ? '' : status.toLowerCase()} requirements found.`
              : 'No matches for your search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-slate-50">
              <tr className="border-b-2 border-slate-200">
                <th className="w-8 px-3 py-2.5" />
                <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Requirement
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Filled/Open
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Sale Value
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Pipeline
                </th>
                <th className="px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Assigned
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <ReqRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>

          {/* Table footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <p className="text-[11px] text-slate-400">
              {filtered.length} requirement{filtered.length !== 1 ? 's' : ''}
              {filtered.length < rows.length && ` (filtered from ${rows.length})`}· Click any row to
              expand
            </p>
            {summary && (
              <p className="text-[11px] font-semibold text-slate-600">
                Total pipeline:{' '}
                <span className="font-black text-slate-900">{summary.totalCandidates}</span>{' '}
                candidates ·
                <span className="ml-1 text-emerald-700">{summary.totalPlaced} placed</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
