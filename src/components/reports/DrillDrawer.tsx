'use client';

// File: DrillDrawer.tsx
// Path: src/components/reports/DrillDrawer.tsx
//
// New flow:
//   status   — stage flags only: Placed / Pipeline / Dropped / On hold / stage label
//   joining  — LWD, else today + notice period days (computed on the server)
//   MOJ      — straight from the server (never derived from expected/actual dates)

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  X,
  Download,
  ExternalLink,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DrillType =
  | 'stage'
  | 'sourced'
  | 'active_pipeline'
  | 'placed'
  | 'near_terminal'
  | 'dropped'
  | 'on_hold'
  | 'rejected'
  | 'withdrawn'
  | 'recruiter'
  | 'service_line'
  | 'department'
  | 'business_unit';

export interface DrillTarget {
  type: DrillType;
  label: string;
  stageId?: string;
  stageLabel?: string;
  recruiterId?: string;
  recruiterName?: string;
  drillServiceLineId?: string;
  drillServiceLineName?: string;
  departmentId?: string;
  departmentName?: string;
  drillBusinessUnitId?: string;
}

interface DrillRow {
  pipelineId: string;
  addedOn: string;
  pipelineDays: number;
  stageAging: string;
  stageAgeMins: number;
  stageLabel: string;
  isTerminal: boolean;
  isNearTerminal: boolean;
  isSourced: boolean;
  isDropped: boolean;
  isOnHold: boolean;
  stageReachedAt: string | null;
  stageMovedBy: string | null;
  submittedAt: string | null;
  offerStatus: string | null;
  offeredCtc: number | null;
  currentCtc: number | null;
  expectedCtc: number | null;
  negotiatedCtc: number | null;
  // Joining — LWD, else today + notice period days
  lastWorkingDate: string | null;
  noticeDays: number | null;
  joiningDate: string | null;
  joiningSource: 'LWD' | 'NOTICE_PERIOD' | null;
  joiningSourceLabel: string | null;
  monthOfJoining: string | null;
  mojKey: string | null; // YYYY-MM — sorts chronologically
  daysToJoin: number | null;
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

/** Full rupees with Indian grouping — ₹1,00,000 (no K / L / Cr) */
function fmtCtc(n: number | null | undefined): string {
  if (n == null) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Stage-based status — the only source of truth */
function statusOf(r: DrillRow): string {
  if (r.isTerminal) return 'Placed';
  if (r.isDropped) return 'Dropped';
  if (r.isOnHold) return 'On Hold';
  if (r.isNearTerminal) return 'Pipeline';
  return 'Active';
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Placed: 'bg-emerald-50 text-emerald-700',
  Dropped: 'bg-red-50 text-red-600',
  'On Hold': 'bg-amber-50 text-amber-700',
  Pipeline: 'bg-indigo-50 text-indigo-700',
  Active: 'bg-blue-50 text-blue-700',
};

function StatusBadge({ row }: { row: DrillRow }) {
  const status = statusOf(row);
  return (
    <div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status] ?? ''}`}
      >
        {status === 'Active' ? row.stageLabel : status}
      </span>
      {status !== 'Active' && <p className="mt-0.5 text-[10px] text-slate-400">{row.stageLabel}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE ROW
// ─────────────────────────────────────────────────────────────────────────────

function CandidateRow({ row }: { row: DrillRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
          row.isDropped ? 'opacity-50' : ''
        }`}
        onClick={() => setExpanded(p => !p)}
      >
        {/* 1. Candidate */}
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

        {/* 2. Requirement */}
        <td className="px-3 py-3">
          <p className="text-[12px] font-semibold leading-snug text-slate-800">{row.reqTitle}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              {row.reqCode}
            </span>
            {row.clientName && <span className="text-[11px] text-slate-400">{row.clientName}</span>}
          </div>
        </td>

        {/* 3. Stage / Status + who moved it there */}
        <td className="px-3 py-3">
          <StatusBadge row={row} />
          {row.stageMovedBy && (
            <p className="mt-0.5 text-[10px] text-slate-400">
              {fmtDate(row.stageReachedAt)} by {row.stageMovedBy}
            </p>
          )}
        </td>

        {/* 4. CTC */}
        <td className="whitespace-nowrap px-3 py-3">
          {row.offeredCtc != null ? (
            <div>
              <p className="text-[11px] text-slate-400">Offered</p>
              <p className="text-[12px] font-bold text-emerald-700">{fmtCtc(row.offeredCtc)}</p>
            </div>
          ) : row.currentCtc != null || row.expectedCtc != null ? (
            <div className="space-y-0.5">
              {row.currentCtc != null && (
                <div className="flex items-center gap-1">
                  <span className="w-11 text-[10px] text-slate-400">Current</span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    {fmtCtc(row.currentCtc)}
                  </span>
                </div>
              )}
              {row.expectedCtc != null && (
                <div className="flex items-center gap-1">
                  <span className="w-11 text-[10px] text-slate-400">Expected</span>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    {fmtCtc(row.expectedCtc)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 5. Notice period OR last working day (never both) */}
        <td className="whitespace-nowrap px-3 py-3">
          {row.lastWorkingDate ? (
            <div>
              <p className="text-[12px] font-semibold text-slate-700">
                {fmtDate(row.lastWorkingDate)}
              </p>
              <p className="text-[10px] text-slate-400">Last working day</p>
            </div>
          ) : row.noticeDays != null ? (
            <div>
              <p className="text-[12px] font-semibold text-slate-700">
                {row.noticeDays === 0 ? 'Immediate' : `${row.noticeDays} days`}
              </p>
              <p className="text-[10px] text-slate-400">Notice period</p>
            </div>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 6. Joining date */}
        <td className="whitespace-nowrap px-3 py-3">
          {row.joiningDate ? (
            <div>
              <p className="text-[12px] font-semibold text-slate-700">{fmtDate(row.joiningDate)}</p>
              <p className="text-[10px] text-slate-400">
                {row.joiningSource === 'LWD' ? 'From LWD' : 'From notice'}
                {row.daysToJoin != null && row.daysToJoin >= 0 ? ` · in ${row.daysToJoin}d` : ''}
              </p>
            </div>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 7. Month of joining — from the server */}
        <td className="whitespace-nowrap px-3 py-3">
          {row.monthOfJoining ? (
            <p className="text-[12px] font-semibold text-slate-700">{row.monthOfJoining}</p>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 8. Recruiter */}
        <td className="px-3 py-3">
          <p className="text-[12px] font-semibold text-slate-700">{row.recruiterName}</p>
        </td>

        {/* 9. Added + Aging */}
        <td className="px-3 py-3 text-right">
          <p className="text-[11px] font-semibold text-slate-700">{fmtDate(row.addedOn)}</p>
          <p className="text-[10px] text-slate-400">
            {row.pipelineDays}d · {row.stageAging} in stage
          </p>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-indigo-50/40">
          <td colSpan={9} className="px-6 py-3">
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
              {row.submittedAt && (
                <div>
                  <span className="text-slate-400">Submitted </span>
                  <span className="font-semibold">{fmtDateTime(row.submittedAt)}</span>
                </div>
              )}
              {row.offerStatus && (
                <div>
                  <span className="text-slate-400">Offer Status </span>
                  <span className="font-semibold">{row.offerStatus}</span>
                </div>
              )}
              {row.negotiatedCtc != null && (
                <div>
                  <span className="text-slate-400">Negotiated CTC </span>
                  <span className="font-semibold">{fmtCtc(row.negotiatedCtc)}</span>
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
// SHEETJS CLIENT-SIDE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportToExcel(rows: DrillRow[], label: string) {
  const wb = XLSX.utils.book_new();
  const d = (v: string | null | undefined, f = 'dd-MMM-yyyy') => (v ? format(new Date(v), f) : '');

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
      Status: statusOf(r),
      'Moved On': d(r.stageReachedAt),
      'Moved By': r.stageMovedBy ?? '',
      'Added On': d(r.addedOn),
      'Days in Pipeline': r.pipelineDays,
      'Stage Aging': r.stageAging,
      'Submitted At': d(r.submittedAt, 'dd-MMM-yyyy HH:mm'),
      'Offer Status': r.offerStatus ?? '',
      'Current CTC': r.currentCtc ?? '',
      'Expected CTC': r.expectedCtc ?? '',
      'Negotiated CTC': r.negotiatedCtc ?? '',
      'Offered CTC': r.offeredCtc ?? '',
      'Notice (days)': r.noticeDays ?? '',
      'Last Working Day': d(r.lastWorkingDate),
      'Joining Date': d(r.joiningDate),
      'Joining From': r.joiningSourceLabel ?? '',
      'Month of Joining': r.monthOfJoining ?? '',
      'Days to Join': r.daysToJoin ?? '',
      Recruiter: r.recruiterName,
      'Recruiter Email': r.recruiterEmail,
      'Req Code': r.reqCode,
      Requirement: r.reqTitle,
      'Req Status': r.reqStatus,
      Openings: r.totalOpenings,
      Client: r.clientName,
      'Client SPOC': r.clientSpoc,
      'Service Line': r.serviceLineName,
      'Business Unit': r.businessUnitName,
    }))
  );
  XLSX.utils.book_append_sheet(wb, ws1, 'Candidates');

  // By requirement
  const byReq: Record<
    string,
    {
      reqCode: string;
      title: string;
      client: string;
      recruiters: Set<string>;
      count: number;
      placed: number;
      dropped: number;
    }
  > = {};
  for (const r of rows) {
    const rq = (byReq[r.requirementId] ??= {
      reqCode: r.reqCode,
      title: r.reqTitle,
      client: r.clientName,
      recruiters: new Set(),
      count: 0,
      placed: 0,
      dropped: 0,
    });
    rq.count++;
    rq.recruiters.add(r.recruiterId);
    if (r.isTerminal) rq.placed++;
    if (r.isDropped) rq.dropped++;
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      Object.values(byReq)
        .sort((a, b) => b.count - a.count)
        .map((r, i) => ({
          '#': i + 1,
          'Req Code': r.reqCode,
          Requirement: r.title,
          Client: r.client,
          Candidates: r.count,
          Placed: r.placed,
          Dropped: r.dropped,
          Recruiters: r.recruiters.size,
        }))
    ),
    'By Requirement'
  );

  // By recruiter
  const byRec: Record<
    string,
    { name: string; email: string; count: number; placed: number; dropped: number }
  > = {};
  for (const r of rows) {
    const rc = (byRec[r.recruiterId] ??= {
      name: r.recruiterName,
      email: r.recruiterEmail,
      count: 0,
      placed: 0,
      dropped: 0,
    });
    rc.count++;
    if (r.isTerminal) rc.placed++;
    if (r.isDropped) rc.dropped++;
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      Object.values(byRec)
        .sort((a, b) => b.count - a.count)
        .map((r, i) => ({
          '#': i + 1,
          Recruiter: r.name,
          Email: r.email,
          Candidates: r.count,
          Placed: r.placed,
          Dropped: r.dropped,
          'Placement %': r.count > 0 ? `${((r.placed / r.count) * 100).toFixed(1)}%` : '0%',
        }))
    ),
    'By Recruiter'
  );

  const safeName = label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `drill_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRILL DRAWER
// ─────────────────────────────────────────────────────────────────────────────

interface DrillDrawerProps {
  target: DrillTarget | null;
  baseQs: string;
  onClose: () => void;
}

export function DrillDrawer({ target, baseQs, onClose }: DrillDrawerProps) {
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('addedOn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const queryParams = useMemo(() => {
    if (!target) return '';
    const p = new URLSearchParams(baseQs);
    p.set('type', target.type);
    if (target.stageId) p.set('stageId', target.stageId);
    if (target.stageLabel) p.set('stageLabel', target.stageLabel);
    if (target.recruiterId) p.set('recruiterId', target.recruiterId);
    if (target.recruiterName) p.set('recruiterName', target.recruiterName);
    if (target.drillServiceLineId) p.set('drillServiceLineId', target.drillServiceLineId);
    if (target.drillServiceLineName) p.set('drillServiceLineName', target.drillServiceLineName);
    if (target.departmentId) p.set('departmentId', target.departmentId);
    if (target.departmentName) p.set('departmentName', target.departmentName);
    if (target.drillBusinessUnitId) p.set('drillBusinessUnitId', target.drillBusinessUnitId);
    return p.toString();
  }, [target, baseQs]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['drill', queryParams],
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

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      r =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        r.reqTitle.toLowerCase().includes(q) ||
        r.reqCode.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.recruiterName.toLowerCase().includes(q) ||
        r.currentCompany.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
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

      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl">
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

        {/* Search */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by candidate, requirement, client, recruiter…"
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
          {search && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              {filtered.length} of {rows.length} matching
            </p>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-[14px] font-semibold">Loading candidates…</span>
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-[14px] font-semibold">Failed to load drill data.</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
              {search ? 'No matches for your search.' : 'No candidates in this segment.'}
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
                    className="w-64 px-4"
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
                    label="Stage / Status"
                    className="w-40"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="offeredCtc"
                    label="CTC"
                    className="w-36"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="noticeDays"
                    label="Notice / LWD"
                    className="w-36"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="joiningDate"
                    label="Joining"
                    className="w-36"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="mojKey"
                    label="Month of Joining"
                    className="w-32"
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
