'use client';

// File: DrillDrawer.tsx
// Path: src/components/reports/DrillDrawer.tsx

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
  monthOfJoining: string | null;
  actualJoiningDate: string | null;
  daysToJoin: number | null;
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

// If monthOfJoining is stored, use it directly.
// Otherwise fall back to extracting month+year from actualJoiningDate or expectedJoiningDate.
function fmtMonthOfJoining(
  monthOfJoining: string | null | undefined,
  expectedJoiningDate: string | null | undefined,
  actualJoiningDate: string | null | undefined
): string | null {
  if (monthOfJoining) return monthOfJoining;
  const d = actualJoiningDate ?? expectedJoiningDate;
  if (!d) return null;
  try {
    return format(new Date(d), 'MMMM yyyy'); // e.g. "September 2026"
  } catch {
    return null;
  }
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
// SORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = keyof DrillRow;
type SortDir = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// TH BUTTON
// ─────────────────────────────────────────────────────────────────────────────

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
          row.isRejected || row.isWithdrawn ? 'opacity-50' : ''
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
          <p className="text-[12px] font-semibold text-slate-800 leading-snug">{row.reqTitle}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              {row.reqCode}
            </span>
            {row.clientName && <span className="text-[11px] text-slate-400">{row.clientName}</span>}
          </div>
        </td>

        {/* 3. Stage / Status */}
        <td className="px-3 py-3">
          <StatusBadge row={row} />
        </td>

        {/* 4. CTC */}
        <td className="px-3 py-3 whitespace-nowrap">
          {row.offeredCtc != null ? (
            <div>
              <p className="text-[11px] text-slate-400">Offered</p>
              <p className="text-[12px] font-bold text-emerald-700">{fmtCtc(row.offeredCtc)}</p>
            </div>
          ) : row.currentCtc != null || row.expectedCtc != null ? (
            <div className="space-y-0.5">
              {row.currentCtc != null && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 w-11">Current</span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    {fmtCtc(row.currentCtc)}
                  </span>
                </div>
              )}
              {row.expectedCtc != null && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 w-11">Expected</span>
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

        {/* 5. Last Working Date */}
        <td className="px-3 py-3 whitespace-nowrap">
          {row.lastWorkingDate ? (
            <div>
              <p className="text-[12px] font-semibold text-slate-700">
                {fmtDate(row.lastWorkingDate)}
              </p>
              {row.noticePeriod && (
                <p className="text-[10px] text-slate-400">{row.noticePeriod} notice</p>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 6. Date of Joining */}
        <td className="px-3 py-3 whitespace-nowrap">
          {row.actualJoiningDate ? (
            <div>
              <p className="text-[12px] font-bold text-emerald-700">
                {fmtDate(row.actualJoiningDate)}
              </p>
              <p className="text-[10px] text-slate-400">Actual</p>
            </div>
          ) : row.expectedJoiningDate ? (
            <div>
              <p className="text-[12px] font-semibold text-slate-700">
                {fmtDate(row.expectedJoiningDate)}
              </p>
              <p className="text-[10px] text-slate-400">
                Expected
                {row.daysToJoin != null && row.daysToJoin >= 0 ? ` · ${row.daysToJoin}d` : ''}
              </p>
            </div>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 7. Month of Joining — uses stored value or falls back to month+year from joining dates */}
        <td className="px-3 py-3 whitespace-nowrap">
          {(() => {
            const moj = fmtMonthOfJoining(
              row.monthOfJoining,
              row.expectedJoiningDate,
              row.actualJoiningDate
            );
            return moj ? (
              <p className="text-[12px] font-semibold text-slate-700">{moj}</p>
            ) : (
              <span className="text-[11px] text-slate-300">—</span>
            );
          })()}
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

      {/* Expanded detail row */}
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

  // Sheet 1: Candidates detail
  const candidateData = rows.map((r, i) => ({
    '#': i + 1,
    Candidate: r.candidateName,
    Email: r.candidateEmail,
    Phone: r.candidatePhone,
    'Current Title': r.currentTitle,
    'Current Company': r.currentCompany,
    'Exp (yrs)': r.expYears ?? '',
    'Top Skills': r.topSkills,
    Stage: r.stageLabel,
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
    'Submitted At': r.submittedAt ? format(new Date(r.submittedAt), 'dd-MMM-yyyy HH:mm') : '',
    'Offer Status': r.offerStatus ?? '',
    'Current CTC': r.currentCtc ?? '',
    'Expected CTC': r.expectedCtc ?? '',
    'Negotiated CTC': r.negotiatedCtc ?? '',
    'Offered CTC': r.offeredCtc ?? '',
    'Notice Period': r.noticePeriod ?? '',
    'Last Working Day': r.lastWorkingDate ? format(new Date(r.lastWorkingDate), 'dd-MMM-yyyy') : '',
    'Expected Joining': r.expectedJoiningDate
      ? format(new Date(r.expectedJoiningDate), 'dd-MMM-yyyy')
      : '',
    'Actual Joining': r.actualJoiningDate
      ? format(new Date(r.actualJoiningDate), 'dd-MMM-yyyy')
      : '',
    'Month of Joining': r.monthOfJoining ?? '',
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
  }));

  const ws1 = XLSX.utils.json_to_sheet(candidateData);
  ws1['!cols'] = [
    { wch: 4 },
    { wch: 26 },
    { wch: 28 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 8 },
    { wch: 34 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
    { wch: 32 },
    { wch: 14 },
    { wch: 8 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Candidates');

  // Sheet 2: By requirement
  const byReq: Record<
    string,
    {
      reqCode: string;
      title: string;
      client: string;
      recruiterSet: Set<string>;
      count: number;
      placed: number;
      rejected: number;
    }
  > = {};
  for (const r of rows) {
    if (!byReq[r.requirementId]) {
      byReq[r.requirementId] = {
        reqCode: r.reqCode,
        title: r.reqTitle,
        client: r.clientName,
        recruiterSet: new Set(),
        count: 0,
        placed: 0,
        rejected: 0,
      };
    }
    const rq = byReq[r.requirementId];
    rq.count++;
    rq.recruiterSet.add(r.recruiterId);
    if (r.isTerminal) rq.placed++;
    if (r.isRejected || r.isWithdrawn) rq.rejected++;
  }
  const ws2 = XLSX.utils.json_to_sheet(
    Object.values(byReq)
      .sort((a, b) => b.count - a.count)
      .map((r, i) => ({
        '#': i + 1,
        'Req Code': r.reqCode,
        Requirement: r.title,
        Client: r.client,
        Candidates: r.count,
        Placed: r.placed,
        Dropped: r.rejected,
        Recruiters: r.recruiterSet.size,
        'Fill %': r.count > 0 ? `${((r.placed / r.count) * 100).toFixed(1)}%` : '0%',
      }))
  );
  ws2['!cols'] = [
    { wch: 4 },
    { wch: 14 },
    { wch: 34 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'By Requirement');

  // Sheet 3: By recruiter
  const byRec: Record<
    string,
    { name: string; email: string; count: number; placed: number; rejected: number }
  > = {};
  for (const r of rows) {
    if (!byRec[r.recruiterId]) {
      byRec[r.recruiterId] = {
        name: r.recruiterName,
        email: r.recruiterEmail,
        count: 0,
        placed: 0,
        rejected: 0,
      };
    }
    byRec[r.recruiterId].count++;
    if (r.isTerminal) byRec[r.recruiterId].placed++;
    if (r.isRejected || r.isWithdrawn) byRec[r.recruiterId].rejected++;
  }
  const ws3 = XLSX.utils.json_to_sheet(
    Object.values(byRec)
      .sort((a, b) => b.count - a.count)
      .map((r, i) => ({
        '#': i + 1,
        Recruiter: r.name,
        Email: r.email,
        Candidates: r.count,
        Placed: r.placed,
        Dropped: r.rejected,
        'Placement %': r.count > 0 ? `${((r.placed / r.count) * 100).toFixed(1)}%` : '0%',
      }))
  );
  ws3['!cols'] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 28 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'By Recruiter');

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
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
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
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
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
              {/* ── SINGLE thead — 9 columns matching the 9 <td>s in CandidateRow ── */}
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
                    label="Stage / Status"
                    className="w-32"
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
                    k="lastWorkingDate"
                    label="Last Working Date"
                    className="w-36"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="expectedJoiningDate"
                    label="Date of Joining"
                    className="w-36"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="monthOfJoining"
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
