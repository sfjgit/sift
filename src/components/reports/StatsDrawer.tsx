'use client';

// File: StatsDrawer.tsx
// Path: src/components/reports/StatsDrawer.tsx

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  X,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import * as XLSX from 'xlsx';
import type { DrillTarget } from './DrillDrawer';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface DrillRow {
  pipelineId: string;
  addedOn: string;
  pipelineDays: number;
  stageAging: string;
  stageAgeMins: number;
  stageLabel: string;
  isTerminal: boolean;
  isSourced: boolean;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  submittedAt: string | null;
  offerStatus: string | null;
  offeredCtc: number | null;
  currentCtc: number | null;
  expectedCtc: number | null;
  negotiatedCtc: number | null;
  expectedJoiningDate: string | null;
  actualJoiningDate: string | null;
  lastWorkingDate: string | null;
  noticePeriod: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  currentTitle: string;
  currentCompany: string;
  expYears: number | null;
  topSkills: string;
  resumeUrl: string | null;
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;
  requirementId: string;
  reqCode: string;
  reqTitle: string;
  reqStatus: string;
  totalOpenings: number;
  clientName: string;
  clientSpoc: string;
  serviceLineName: string;
  businessUnitName: string;
}

export interface StatsDrawerTarget {
  drillTarget: DrillTarget;
  label: string;
  // breakdown lines shown in the card — passed through for the summary panel
  breakdown: { serviceLineName: string | null; stageName: string; count: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy HH:mm');
  } catch {
    return '—';
  }
}

function fmtCtc(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ row }: { row: DrillRow }) {
  if (row.isTerminal)
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        Placed
      </span>
    );
  if (row.isRejected)
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
        Rejected
      </span>
    );
  if (row.isWithdrawn)
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        Withdrawn
      </span>
    );
  if (row.isOnHold)
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        On Hold
      </span>
    );
  return (
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
      {row.stageLabel}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE ROW
// ─────────────────────────────────────────────────────────────────────────────

function CandidateRow({ row }: { row: DrillRow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${row.isRejected || row.isWithdrawn ? 'opacity-50' : ''}`}
        onClick={() => setExpanded(p => !p)}
      >
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900">{row.candidateName}</p>
              <p className="text-[11px] text-slate-400">{row.candidateEmail}</p>
              {(row.currentTitle || row.currentCompany) && (
                <p className="text-[11px] text-slate-500">
                  {row.currentTitle}
                  {row.currentTitle && row.currentCompany ? ' · ' : ''}
                  {row.currentCompany}
                </p>
              )}
            </div>
            {row.resumeUrl && (
              <a
                href={row.resumeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="ml-auto shrink-0 text-slate-300 hover:text-indigo-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <p className="text-[12px] font-semibold text-slate-800 leading-snug">{row.reqTitle}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              {row.reqCode}
            </span>
            {row.clientName && <span className="text-[11px] text-slate-400">{row.clientName}</span>}
          </div>
        </td>
        <td className="px-3 py-3">
          <StatusBadge row={row} />
          {row.serviceLineName && (
            <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{row.serviceLineName}</p>
          )}
        </td>
        <td className="px-3 py-3">
          <p className="text-[12px] font-semibold text-slate-700">{row.recruiterName}</p>
        </td>
        <td className="px-3 py-3 text-right">
          <p className="text-[11px] font-semibold text-slate-700">{fmtDate(row.addedOn)}</p>
          <p className="text-[10px] text-slate-400">
            {row.pipelineDays}d · {row.stageAging} in stage
          </p>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-indigo-50/40">
          <td colSpan={5} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[12px] sm:grid-cols-3 lg:grid-cols-4">
              {row.candidatePhone && (
                <div>
                  <span className="text-slate-400">Phone </span>
                  <span className="font-semibold">{row.candidatePhone}</span>
                </div>
              )}
              {row.expYears != null && (
                <div>
                  <span className="text-slate-400">Exp </span>
                  <span className="font-semibold">{row.expYears} yrs</span>
                </div>
              )}
              {row.topSkills && (
                <div className="col-span-2">
                  <span className="text-slate-400">Skills </span>
                  <span className="font-semibold">{row.topSkills}</span>
                </div>
              )}
              {row.noticePeriod && (
                <div>
                  <span className="text-slate-400">Notice </span>
                  <span className="font-semibold">{row.noticePeriod}</span>
                </div>
              )}
              {row.lastWorkingDate && (
                <div>
                  <span className="text-slate-400">LWD </span>
                  <span className="font-semibold">{fmtDate(row.lastWorkingDate)}</span>
                </div>
              )}
              {row.expectedJoiningDate && (
                <div>
                  <span className="text-slate-400">Exp Joining </span>
                  <span className="font-semibold">{fmtDate(row.expectedJoiningDate)}</span>
                </div>
              )}
              {row.actualJoiningDate && (
                <div>
                  <span className="text-slate-400">Actual Joining </span>
                  <span className="font-semibold text-emerald-700">
                    {fmtDate(row.actualJoiningDate)}
                  </span>
                </div>
              )}
              {row.submittedAt && (
                <div>
                  <span className="text-slate-400">Submitted </span>
                  <span className="font-semibold">{fmtDateTime(row.submittedAt)}</span>
                </div>
              )}
              {row.offerStatus && (
                <div>
                  <span className="text-slate-400">Offer </span>
                  <span className="font-semibold">{row.offerStatus}</span>
                </div>
              )}
              {row.currentCtc != null && (
                <div>
                  <span className="text-slate-400">Current CTC </span>
                  <span className="font-semibold">{fmtCtc(row.currentCtc)}</span>
                </div>
              )}
              {row.expectedCtc != null && (
                <div>
                  <span className="text-slate-400">Expected CTC </span>
                  <span className="font-semibold">{fmtCtc(row.expectedCtc)}</span>
                </div>
              )}
              {row.negotiatedCtc != null && (
                <div>
                  <span className="text-slate-400">Negotiated CTC </span>
                  <span className="font-semibold">{fmtCtc(row.negotiatedCtc)}</span>
                </div>
              )}
              {row.offeredCtc != null && (
                <div>
                  <span className="text-slate-400">Offered CTC </span>
                  <span className="font-semibold text-emerald-700">{fmtCtc(row.offeredCtc)}</span>
                </div>
              )}
              {row.serviceLineName && (
                <div>
                  <span className="text-slate-400">Service Line </span>
                  <span className="font-semibold">{row.serviceLineName}</span>
                </div>
              )}
              {row.businessUnitName && (
                <div>
                  <span className="text-slate-400">BU </span>
                  <span className="font-semibold">{row.businessUnitName}</span>
                </div>
              )}
              {row.clientSpoc && (
                <div>
                  <span className="text-slate-400">SPOC </span>
                  <span className="font-semibold">{row.clientSpoc}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportToExcel(rows: DrillRow[], label: string) {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(
    rows.map((r, i) => ({
      '#': i + 1,
      Candidate: r.candidateName,
      Email: r.candidateEmail,
      Phone: r.candidatePhone,
      'Current Title': r.currentTitle,
      'Current Company': r.currentCompany,
      'Exp (yrs)': r.expYears ?? '',
      'Top Skills': r.topSkills,
      Stage: r.stageLabel,
      'Service Line': r.serviceLineName,
      Status: r.isTerminal
        ? 'Placed'
        : r.isRejected
          ? 'Rejected'
          : r.isWithdrawn
            ? 'Withdrawn'
            : r.isOnHold
              ? 'On Hold'
              : 'Active',
      'Added On': r.addedOn ? format(new Date(r.addedOn), 'dd-MMM-yyyy') : '',
      'Days in Pipeline': r.pipelineDays,
      'Stage Aging': r.stageAging,
      'Notice Period': r.noticePeriod ?? '',
      'Last Working Day': r.lastWorkingDate
        ? format(new Date(r.lastWorkingDate), 'dd-MMM-yyyy')
        : '',
      'Expected Joining': r.expectedJoiningDate
        ? format(new Date(r.expectedJoiningDate), 'dd-MMM-yyyy')
        : '',
      'Actual Joining': r.actualJoiningDate
        ? format(new Date(r.actualJoiningDate), 'dd-MMM-yyyy')
        : '',
      'Current CTC': r.currentCtc ?? '',
      'Expected CTC': r.expectedCtc ?? '',
      'Negotiated CTC': r.negotiatedCtc ?? '',
      'Offered CTC': r.offeredCtc ?? '',
      Recruiter: r.recruiterName,
      'Req Code': r.reqCode,
      Requirement: r.reqTitle,
      Client: r.clientName,
      'Client SPOC': r.clientSpoc,
      'Business Unit': r.businessUnitName,
    }))
  );
  XLSX.utils.book_append_sheet(wb, ws1, 'Candidates');
  XLSX.writeFile(
    wb,
    `stats_${label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY PANEL — derived from fetched rows
// ─────────────────────────────────────────────────────────────────────────────

function SummaryPanel({ rows }: { rows: DrillRow[] }) {
  // By service line
  const bySlMap = new Map<string, { name: string; count: number; stages: Map<string, number> }>();
  for (const r of rows) {
    const key = r.serviceLineName || 'Unassigned';
    if (!bySlMap.has(key)) bySlMap.set(key, { name: key, count: 0, stages: new Map() });
    const sl = bySlMap.get(key)!;
    sl.count++;
    sl.stages.set(r.stageLabel, (sl.stages.get(r.stageLabel) ?? 0) + 1);
  }
  const bySl = [...bySlMap.values()].sort((a, b) => b.count - a.count);

  // By recruiter top 5
  const byRecMap = new Map<string, number>();
  for (const r of rows) byRecMap.set(r.recruiterName, (byRecMap.get(r.recruiterName) ?? 0) + 1);
  const byRec = [...byRecMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const maxSl = Math.max(1, ...bySl.map(s => s.count));
  const maxRec = Math.max(1, ...byRec.map(r => r[1]));

  return (
    <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* By service line */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            By service line
          </p>
          <div className="space-y-2">
            {bySl.map(sl => (
              <div key={sl.name}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-700">{sl.name}</span>
                  <span className="text-[12px] font-black text-slate-900">{sl.count}</span>
                </div>
                <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(sl.count / maxSl) * 100}%` }}
                  />
                </div>
                {/* Stage breakdown within this SL */}
                <div className="flex flex-wrap gap-1">
                  {[...sl.stages.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([stage, cnt]) => (
                      <span
                        key={stage}
                        className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
                      >
                        {stage}: {cnt}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top recruiters */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Top recruiters
          </p>
          <div className="space-y-2">
            {byRec.map(([name, cnt]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-[12px] font-semibold text-slate-700">
                  {name}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-slate-200">
                  <div
                    className="flex h-full items-center rounded-md px-2"
                    style={{ width: `${(cnt / maxRec) * 100}%`, backgroundColor: '#4F46E5' }}
                  >
                    <span className="text-[10px] font-black text-white">{cnt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS DRAWER
// ─────────────────────────────────────────────────────────────────────────────

interface StatsDrawerProps {
  target: StatsDrawerTarget | null;
  baseQs: string;
  onClose: () => void;
}

type SortKey = keyof DrillRow;
type SortDir = 'asc' | 'desc';

function ThBtn({
  sortKey,
  sortDir,
  onToggle,
  k,
  label,
  className = '',
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (k: SortKey) => void;
  k: SortKey;
  label: string;
  className?: string;
}) {
  const isActive = k === sortKey;
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 ${className}`}
      onClick={() => onToggle(k)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDir === 'asc' ? (
            <ChevronUp className="h-3 w-3 text-indigo-600" />
          ) : (
            <ChevronDown className="h-3 w-3 text-indigo-600" />
          )
        ) : (
          <ChevronUp className="h-3 w-3 opacity-20" />
        )}
      </div>
    </th>
  );
}

export function StatsDrawer({ target, baseQs, onClose }: StatsDrawerProps) {
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [recruiterFilter, setRecruiterFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('addedOn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const queryParams = useMemo(() => {
    if (!target) return '';
    const p = new URLSearchParams(baseQs);
    const dt = target.drillTarget;
    p.set('type', dt.type);
    if (dt.stageId) p.set('stageId', dt.stageId);
    if (dt.stageLabel) p.set('stageLabel', dt.stageLabel);
    if (dt.recruiterId) p.set('recruiterId', dt.recruiterId);
    if (dt.recruiterName) p.set('recruiterName', dt.recruiterName);
    if (dt.drillServiceLineId) p.set('drillServiceLineId', dt.drillServiceLineId);
    if (dt.drillServiceLineName) p.set('drillServiceLineName', dt.drillServiceLineName);
    if (dt.departmentId) p.set('departmentId', dt.departmentId);
    if (dt.departmentName) p.set('departmentName', dt.departmentName);
    if (dt.drillBusinessUnitId) p.set('drillBusinessUnitId', dt.drillBusinessUnitId);
    return p.toString();
  }, [target, baseQs]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stats-drawer', queryParams],
    queryFn: async () =>
      (await axios.get(`/reports/overview/drill?${queryParams}`)).data as {
        success: boolean;
        data: DrillRow[];
        meta: { total: number; label: string; capped: boolean };
      },
    enabled: !!target,
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const uniqueStages = useMemo(() => [...new Set(rows.map(r => r.stageLabel))].sort(), [rows]);
  const uniqueRecruiters = useMemo(
    () => [...new Set(rows.map(r => r.recruiterName))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        r =>
          r.candidateName.toLowerCase().includes(q) ||
          r.candidateEmail.toLowerCase().includes(q) ||
          r.reqTitle.toLowerCase().includes(q) ||
          r.reqCode.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.recruiterName.toLowerCase().includes(q) ||
          r.serviceLineName.toLowerCase().includes(q)
      );
    }
    if (stageFilter) result = result.filter(r => r.stageLabel === stageFilter);
    if (recruiterFilter) result = result.filter(r => r.recruiterName === recruiterFilter);
    if (agingFilter) {
      result = result.filter(r => {
        const d = r.pipelineDays;
        if (agingFilter === 'fresh') return d < 7;
        if (agingFilter === 'stale') return d >= 7 && d < 30;
        if (agingFilter === 'old') return d >= 30;
        return true;
      });
    }
    return result;
  }, [rows, search, stageFilter, recruiterFilter, agingFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey],
        bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  if (!target) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-[16px] font-black text-slate-900">{target.label}</h2>
            {meta && (
              <p className="text-[12px] text-slate-400">
                {meta.total} candidate{meta.total !== 1 ? 's' : ''}
                {meta.capped && (
                  <span className="ml-1 font-semibold text-amber-600">· showing first 500</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <button
                onClick={() => exportToExcel(filtered, target.label)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Download className="h-4 w-4" />
                Export{' '}
                {filtered.length < rows.length
                  ? `${filtered.length} filtered`
                  : `all ${rows.length}`}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary panel — only when data is loaded */}
        {!isLoading && rows.length > 0 && <SummaryPanel rows={rows} />}

        {/* Search + filters */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by candidate, requirement, client, recruiter, service line…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              <option value="">All stages</option>
              {uniqueStages.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={recruiterFilter}
              onChange={e => setRecruiterFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              <option value="">All recruiters</option>
              {uniqueRecruiters.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  { label: 'All', value: '' },
                  { label: 'Fresh <7d', value: 'fresh' },
                  { label: 'Stale 7-30d', value: 'stale' },
                  { label: 'Old 30d+', value: 'old' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAgingFilter(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${agingFilter === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(stageFilter || recruiterFilter || agingFilter) && (
              <button
                onClick={() => {
                  setStageFilter('');
                  setRecruiterFilter('');
                  setAgingFilter('');
                }}
                className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-50"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
            <span className="ml-auto text-[11px] text-slate-400">
              {sorted.length} of {rows.length}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-[14px] font-semibold">Loading…</span>
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-[14px] font-semibold">Failed to load data.</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
              {search || stageFilter || recruiterFilter || agingFilter
                ? 'No matches for your filters.'
                : 'No candidates in this segment.'}
            </div>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b-2 border-slate-200">
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="candidateName"
                    label="Candidate"
                    className="px-4 w-64"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="reqTitle"
                    label="Requirement"
                    className="w-56"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="stageLabel"
                    label="Stage / SL"
                    className="w-36"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="recruiterName"
                    label="Recruiter"
                    className="w-36"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="addedOn"
                    label="Added · Aging"
                    className="w-32 text-right"
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <CandidateRow key={row.pipelineId} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-2.5">
            <p className="text-[11px] text-slate-400">
              Click any row to expand full details · Sorted by{' '}
              <span className="font-semibold text-slate-600">
                {String(sortKey)
                  .replace(/([A-Z])/g, ' $1')
                  .trim()}
              </span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
