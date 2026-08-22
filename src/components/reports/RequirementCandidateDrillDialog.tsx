'use client';

// File: RequirementCandidateDrillDialog.tsx
// Path: src/components/reports/RequirementCandidateDrillDialog.tsx

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
  CheckCircle2,
  Clock,
  TrendingUp,
  UserX,
  PauseCircle,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementDrillTarget {
  requirementId: string;
  reqCode: string;
  reqTitle: string;
  stageId?: string;
  stageLabel?: string;
  // The full stage label for dialog title
  dialogTitle?: string;
}

interface DrillRow {
  pipelineId: string;
  addedOn: string | null;
  pipelineDays: number;
  stageAging: string;
  stageAgeMins: number;
  stageLabel: string;
  stageCode: string;
  stageOrder: number;
  isTerminal: boolean;
  isNearTerminal: boolean;
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
  lastWorkingDate: string | null;
  expectedJoiningDate: string | null;
  actualJoiningDate: string | null;
  derivedJoiningDate: string | null;
  monthOfJoining: string | null;
  daysToJoin: number | null;
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
  salaryMin: number | null;
  salaryMax: number | null;
  computedSaleValue: number | null;
  saleValueBasis: string;
  bandCode: string | null;
  bandName: string | null;
  bandValue: number | null;
  clientPct: number | null;
  clientName: string;
  clientSpoc: string;
  serviceLineName: string;
  businessUnitName: string;
}

interface DrillMeta {
  total: number;
  stageLabel: string | null;
  requirementId: string;
  capped: boolean;
  stats: {
    total: number;
    terminal: number;
    nearTerminal: number;
    active: number;
    onHold: number;
    rejected: number;
    withdrawn: number;
  };
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
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtSaleValue(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ row }: { row: DrillRow }) {
  if (row.isTerminal)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Placed
      </span>
    );
  if (row.isNearTerminal)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        <TrendingUp className="h-3 w-3" /> {row.stageLabel}
      </span>
    );
  if (row.isRejected)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
        <UserX className="h-3 w-3" /> Rejected
      </span>
    );
  if (row.isWithdrawn)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        <UserX className="h-3 w-3" /> Withdrawn
      </span>
    );
  if (row.isOnHold)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
        <PauseCircle className="h-3 w-3" /> On Hold
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
      <Clock className="h-3 w-3" /> {row.stageLabel}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = keyof DrillRow;
type SortDir = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// ThBtn — module level
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
      className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 ${className}`}
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
// CandidateRow — expandable, module level
// ─────────────────────────────────────────────────────────────────────────────

function CandidateRow({ row }: { row: DrillRow }) {
  const [expanded, setExpanded] = useState(false);

  const dimmed = row.isRejected || row.isWithdrawn;

  return (
    <>
      <tr
        className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
          dimmed ? 'opacity-50' : ''
        } ${row.isTerminal ? 'bg-emerald-50/30' : ''} ${row.isNearTerminal && !row.isTerminal ? 'bg-amber-50/20' : ''}`}
        onClick={() => setExpanded(p => !p)}
      >
        {/* Candidate */}
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-slate-900 leading-tight">
                {row.candidateName}
              </p>
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
                className="shrink-0 text-slate-300 hover:text-indigo-500"
                title="Open resume"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </td>

        {/* Stage / Status */}
        <td className="px-3 py-3">
          <StatusBadge row={row} />
        </td>

        {/* Recruiter */}
        <td className="px-3 py-3">
          <p className="text-[12px] font-semibold text-slate-700">{row.recruiterName}</p>
        </td>

        {/* CTC strip */}
        <td className="px-3 py-3">
          <div className="flex flex-col gap-0.5 text-[11px]">
            {row.currentCtc != null && (
              <span className="text-slate-500">Curr: {fmtCtc(row.currentCtc)}</span>
            )}
            {row.expectedCtc != null && (
              <span className="text-slate-500">Exp: {fmtCtc(row.expectedCtc)}</span>
            )}
            {row.offeredCtc != null && (
              <span className="font-bold text-emerald-700">Offered: {fmtCtc(row.offeredCtc)}</span>
            )}
            {row.currentCtc == null && row.expectedCtc == null && row.offeredCtc == null && (
              <span className="text-slate-300">—</span>
            )}
          </div>
        </td>

        {/* Joining */}
        <td className="px-3 py-3">
          {row.monthOfJoining ? (
            <div>
              <p className="text-[12px] font-bold text-indigo-700">{row.monthOfJoining}</p>
              {row.daysToJoin != null && row.daysToJoin >= 0 && (
                <p className="text-[10px] text-slate-400">{row.daysToJoin}d to join</p>
              )}
            </div>
          ) : (
            <span className="text-slate-300 text-[11px]">—</span>
          )}
        </td>

        {/* Added + aging */}
        <td className="px-3 py-3 text-right">
          <p className="text-[11px] font-semibold text-slate-700">{fmtDate(row.addedOn)}</p>
          <p className="text-[10px] text-slate-400">
            {row.pipelineDays}d · {row.stageAging} in stage
          </p>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-indigo-50/40">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] sm:grid-cols-3 lg:grid-cols-4">
              {/* Contact */}
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

              {/* Notice & joining */}
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
              {row.derivedJoiningDate && !row.actualJoiningDate && (
                <div>
                  <span className="text-slate-400">Derived Joining </span>
                  <span className="font-semibold text-indigo-700">
                    {fmtDate(row.derivedJoiningDate)}
                  </span>
                </div>
              )}

              {/* Submission / offer */}
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

              {/* CTC detail */}
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

              {/* Sale value context */}
              {row.computedSaleValue != null && (
                <div>
                  <span className="text-slate-400">Req Sale Value </span>
                  <span className="font-bold text-indigo-700">
                    {fmtSaleValue(row.computedSaleValue)}
                  </span>
                  <span className="ml-1 rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-bold text-indigo-500">
                    {row.saleValueBasis}
                  </span>
                </div>
              )}
              {row.salaryMin != null && (
                <div>
                  <span className="text-slate-400">Salary Min </span>
                  <span className="font-semibold">{fmtCtc(row.salaryMin)}</span>
                </div>
              )}
              {row.salaryMax != null && (
                <div>
                  <span className="text-slate-400">Salary Max </span>
                  <span className="font-semibold">{fmtCtc(row.salaryMax)}</span>
                </div>
              )}
              {row.bandCode && (
                <div>
                  <span className="text-slate-400">Band </span>
                  <span className="font-semibold">
                    {row.bandCode} – {row.bandName}
                    {row.bandValue != null ? ` (₹${row.bandValue.toLocaleString('en-IN')})` : ''}
                  </span>
                </div>
              )}

              {/* Org */}
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
// CLIENT-SIDE SHEETJS EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportToExcel(rows: DrillRow[], title: string, reqCode: string) {
  const wb = XLSX.utils.book_new();
  const now = new Date();

  // ── Sheet 1: Candidates detail ─────────────────────────────────────────
  const candidateData = rows.map((r, i) => ({
    '#': i + 1,
    'Candidate Name': r.candidateName,
    Email: r.candidateEmail,
    Phone: r.candidatePhone,
    'Current Title': r.currentTitle,
    'Current Company': r.currentCompany,
    'Exp (yrs)': r.expYears ?? '',
    'Top Skills': r.topSkills,
    Stage: r.stageLabel,
    'Is Terminal?': r.isTerminal ? 'Yes' : 'No',
    'Is Near Terminal?': r.isNearTerminal ? 'Yes' : 'No',
    Status: r.isTerminal
      ? 'Placed'
      : r.isNearTerminal
        ? 'Near Terminal'
        : r.isRejected
          ? 'Rejected'
          : r.isWithdrawn
            ? 'Withdrawn'
            : r.isOnHold
              ? 'On Hold'
              : 'Active',
    Recruiter: r.recruiterName,
    'Recruiter Email': r.recruiterEmail,
    'Added On': r.addedOn ? format(new Date(r.addedOn), 'dd-MMM-yyyy') : '',
    'Days in Pipeline': r.pipelineDays,
    'Stage Aging': r.stageAging,
    'Notice Period': r.noticePeriod ?? '',
    'Last Working Day': r.lastWorkingDate ? format(new Date(r.lastWorkingDate), 'dd-MMM-yyyy') : '',
    'Expected Joining': r.expectedJoiningDate
      ? format(new Date(r.expectedJoiningDate), 'dd-MMM-yyyy')
      : '',
    'Actual Joining': r.actualJoiningDate
      ? format(new Date(r.actualJoiningDate), 'dd-MMM-yyyy')
      : '',
    'Derived Joining': r.derivedJoiningDate
      ? format(new Date(r.derivedJoiningDate), 'dd-MMM-yyyy')
      : '',
    'Month of Joining': r.monthOfJoining ?? '',
    'Days to Join': r.daysToJoin ?? '',
    'Current CTC': r.currentCtc ?? '',
    'Expected CTC': r.expectedCtc ?? '',
    'Negotiated CTC': r.negotiatedCtc ?? '',
    'Offered CTC': r.offeredCtc ?? '',
    'Submitted At': r.submittedAt ? format(new Date(r.submittedAt), 'dd-MMM-yyyy HH:mm') : '',
    'Offer Status': r.offerStatus ?? '',
    Client: r.clientName,
    'Client SPOC': r.clientSpoc,
    'Service Line': r.serviceLineName,
    'Business Unit': r.businessUnitName,
    'Req Code': r.reqCode,
    Requirement: r.reqTitle,
    'Total Openings': r.totalOpenings,
    'Salary Min': r.salaryMin ?? '',
    'Salary Max': r.salaryMax ?? '',
    'Band Code': r.bandCode ?? '',
    'Band Name': r.bandName ?? '',
    'Band Value': r.bandValue ?? '',
    'Client %': r.clientPct ?? '',
    'Computed Sale Value': r.computedSaleValue ?? '',
    'Sale Basis': r.computedSaleValue != null ? r.saleValueBasis : 'NOT_FOUND',
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
    { wch: 22 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Candidates');

  // ── Sheet 2: Summary ───────────────────────────────────────────────────
  const terminal = rows.filter(r => r.isTerminal);
  const nearTerminal = rows.filter(r => r.isNearTerminal && !r.isTerminal);
  const active = rows.filter(
    r => !r.isTerminal && !r.isNearTerminal && !r.isRejected && !r.isWithdrawn && !r.isOnHold
  );
  const onHold = rows.filter(r => r.isOnHold);
  const rejected = rows.filter(r => r.isRejected);
  const withdrawn = rows.filter(r => r.isWithdrawn);

  // Month-of-joining breakdown
  const monthMap: Record<string, number> = {};
  for (const r of rows) {
    if (r.monthOfJoining) {
      monthMap[r.monthOfJoining] = (monthMap[r.monthOfJoining] ?? 0) + 1;
    }
  }

  const summaryData = [
    { Metric: 'Total Candidates', Value: rows.length },
    { Metric: 'Placed (Terminal)', Value: terminal.length },
    { Metric: 'Near Terminal (Offered)', Value: nearTerminal.length },
    { Metric: 'Active Pipeline', Value: active.length },
    { Metric: 'On Hold', Value: onHold.length },
    { Metric: 'Rejected', Value: rejected.length },
    { Metric: 'Withdrawn', Value: withdrawn.length },
    { Metric: '', Value: '' },
    { Metric: 'Month of Joining Breakdown', Value: '' },
    ...Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ Metric: `  ${month}`, Value: count })),
    { Metric: '', Value: '' },
    { Metric: 'Export Generated At', Value: format(now, 'dd-MMM-yyyy HH:mm') },
    { Metric: 'Requirement', Value: `${reqCode} — ${title}` },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // ── Sheet 3: By Recruiter ──────────────────────────────────────────────
  const byRec: Record<
    string,
    {
      name: string;
      email: string;
      count: number;
      placed: number;
      nearTerm: number;
      rejected: number;
    }
  > = {};
  for (const r of rows) {
    if (!byRec[r.recruiterId]) {
      byRec[r.recruiterId] = {
        name: r.recruiterName,
        email: r.recruiterEmail,
        count: 0,
        placed: 0,
        nearTerm: 0,
        rejected: 0,
      };
    }
    byRec[r.recruiterId].count++;
    if (r.isTerminal) byRec[r.recruiterId].placed++;
    if (r.isNearTerminal && !r.isTerminal) byRec[r.recruiterId].nearTerm++;
    if (r.isRejected || r.isWithdrawn) byRec[r.recruiterId].rejected++;
  }
  const ws3 = XLSX.utils.json_to_sheet(
    Object.values(byRec)
      .sort((a, b) => b.count - a.count)
      .map((r, i) => ({
        '#': i + 1,
        Recruiter: r.name,
        Email: r.email,
        'Total Candidates': r.count,
        Placed: r.placed,
        'Near Terminal': r.nearTerm,
        'Rejected/Withdrawn': r.rejected,
        Active: r.count - r.placed - r.nearTerm - r.rejected,
        'Placement %': r.count > 0 ? `${((r.placed / r.count) * 100).toFixed(1)}%` : '0%',
      }))
  );
  ws3['!cols'] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 28 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'By Recruiter');

  const safeName = reqCode.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  XLSX.writeFile(wb, `drill_${safeName}_${format(now, 'yyyy-MM-dd')}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DIALOG COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  target: RequirementDrillTarget | null;
  onClose: () => void;
}

export function RequirementCandidateDrillDialog({ target, onClose }: Props) {
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('stageOrder');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const queryParams = useMemo(() => {
    if (!target) return '';
    const p = new URLSearchParams();
    if (target.stageId) p.set('stageId', target.stageId);
    if (target.stageLabel) p.set('stageLabel', target.stageLabel);
    return p.toString();
  }, [target]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['req-candidate-drill', target?.requirementId, target?.stageId],
    queryFn: async () =>
      (await axios.get(`/reports/requirements/${target!.requirementId}/candidates?${queryParams}`))
        .data as {
        success: boolean;
        data: DrillRow[];
        meta: DrillMeta;
      },
    enabled: !!target,
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const stats = meta?.stats;

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      r =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        r.currentCompany.toLowerCase().includes(q) ||
        r.recruiterName.toLowerCase().includes(q) ||
        r.stageLabel.toLowerCase().includes(q) ||
        (r.monthOfJoining ?? '').toLowerCase().includes(q)
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

  const dialogTitle =
    target.dialogTitle ??
    (target.stageLabel
      ? `${target.stageLabel} — ${target.reqCode}`
      : `All Candidates — ${target.reqCode}`);

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[16px] font-black text-slate-900 leading-tight">{dialogTitle}</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">
                {target.reqTitle}
                {meta?.capped && (
                  <span className="ml-2 font-semibold text-amber-600">· showing first 500</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {rows.length > 0 && (
                <button
                  onClick={() => exportToExcel(filtered, target.reqTitle, target.reqCode)}
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
        </div>

        {/* ── Stats strip ────────────────────────────────────────────── */}
        {stats && !isLoading && rows.length > 0 && (
          <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-4 text-[12px]">
              <StatPill
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Placed"
                value={stats.terminal}
                color="text-emerald-700"
                bg="bg-emerald-50"
              />
              <StatPill
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Near Close"
                value={stats.nearTerminal}
                color="text-amber-700"
                bg="bg-amber-50"
              />
              <StatPill
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Active"
                value={stats.active}
                color="text-blue-700"
                bg="bg-blue-50"
              />
              <StatPill
                icon={<PauseCircle className="h-3.5 w-3.5" />}
                label="On Hold"
                value={stats.onHold}
                color="text-orange-700"
                bg="bg-orange-50"
              />
              <StatPill
                icon={<UserX className="h-3.5 w-3.5" />}
                label="Rejected"
                value={stats.rejected}
                color="text-red-600"
                bg="bg-red-50"
              />
              <StatPill
                icon={<UserX className="h-3.5 w-3.5" />}
                label="Withdrawn"
                value={stats.withdrawn}
                color="text-slate-600"
                bg="bg-slate-100"
              />
              <span className="ml-auto font-black text-slate-700">{stats.total} total</span>
            </div>
          </div>
        )}

        {/* ── Search bar ─────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by candidate, company, recruiter, month of joining…"
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

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-[14px] font-semibold">Loading candidates…</span>
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-[14px] font-semibold">Failed to load candidates.</p>
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
                    className="px-4 min-w-[220px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="stageLabel"
                    label="Stage / Status"
                    className="min-w-[130px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="recruiterName"
                    label="Recruiter"
                    className="min-w-[130px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="offeredCtc"
                    label="CTC"
                    className="min-w-[130px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="monthOfJoining"
                    label="Joining"
                    className="min-w-[120px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="addedOn"
                    label="Added · Aging"
                    className="min-w-[120px] text-right"
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

        {/* ── Footer ─────────────────────────────────────────────────── */}
        {sorted.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-2.5">
            <p className="text-[11px] text-slate-400">
              Click any row to expand full details including CTC, joining dates, and sale value ·{' '}
              <span className="font-semibold text-emerald-600">Green rows</span> = placed ·{' '}
              <span className="font-semibold text-amber-600">Amber rows</span> = near close
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill — small inline stat badge
// ─────────────────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  if (value === 0) return null;
  return (
    <div className={`flex items-center gap-1.5 rounded-lg ${bg} px-2.5 py-1 ${color}`}>
      {icon}
      <span className="font-black">{value}</span>
      <span className="font-semibold opacity-80">{label}</span>
    </div>
  );
}
