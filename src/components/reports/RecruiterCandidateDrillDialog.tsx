/* eslint-disable @typescript-eslint/no-explicit-any */
// File: RecruiterCandidateDrillDialog.tsx
// Path: src/components/reports/RecruiterCandidateDrillDialog.tsx

'use client';

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

export interface RecruiterDrillTarget {
  recruiterId: string;
  recruiterName: string;
  recruiterEmail?: string;
  stageId?: string;
  stageLabel?: string;
  overrideQs?: string;
  serviceLineId?: string;
}

interface DrillRow {
  pipelineId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  currentTitle?: string;
  currentCompany?: string;
  expYears?: number | null;
  topSkills?: string;
  resumeUrl?: string | null;
  stageLabel: string;
  stageOrder: number;
  isTerminal: boolean;
  isNearTerminal: boolean;
  isSourced: boolean;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  addedOn: string | null;
  pipelineDays: number;
  stageAging: string;
  submittedAt: string | null;
  offerStatus: string | null;
  currentCtc: number | null;
  expectedCtc: number | null;
  negotiatedCtc: number | null;
  offeredCtc: number | null;
  noticePeriod: string | null;
  lastWorkingDate: string | null;
  expectedJoiningDate: string | null;
  actualJoiningDate: string | null;
  monthOfJoining: string | null;
  daysToJoin: number | null;
  reqCode: string;
  reqTitle: string;
  clientName?: string;
  serviceLineName?: string;
  businessUnitName?: string;
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

function fmtCtc(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
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
// STAT PILL
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

// ─────────────────────────────────────────────────────────────────────────────
// SORT BUTTON
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
// CANDIDATE ROW
// ─────────────────────────────────────────────────────────────────────────────
// Column order (must match <thead> exactly):
// 1. Candidate
// 2. Requirement
// 3. Stage
// 4. Last Working Date
// 5. Date of Joining
// 6. Month of Joining
// 7. Offered CTC
// 8. Current CTC
// 9. Expected CTC
// 10. Added · Aging
// ─────────────────────────────────────────────────────────────────────────────

function CandidateRow({ row }: { row: DrillRow }) {
  const [expanded, setExpanded] = useState(false);
  const dimmed = row.isRejected || row.isWithdrawn;

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50
          ${dimmed ? 'opacity-50' : ''}
          ${row.isTerminal ? 'bg-emerald-50/30' : ''}
          ${row.isNearTerminal && !row.isTerminal ? 'bg-amber-50/20' : ''}`}
        onClick={() => setExpanded(p => !p)}
      >
        {/* 1. Candidate */}
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-tight text-slate-900">
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

        {/* 2. Requirement */}
        <td className="px-3 py-3">
          <p className="text-[11px] font-bold text-slate-700">{row.reqCode}</p>
          <p className="max-w-[170px] truncate text-[10px] text-slate-400">{row.reqTitle}</p>
        </td>

        {/* 3. Stage */}
        <td className="px-3 py-3">
          <StatusBadge row={row} />
        </td>

        {/* 4. Last Working Date */}
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

        {/* 5. Date of Joining */}
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

        {/* 6. Month of Joining — uses stored value or falls back to month+year from joining dates */}
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

        {/* 7. Offered CTC */}
        <td className="px-3 py-3 whitespace-nowrap">
          {row.offeredCtc != null ? (
            <p className="text-[12px] font-bold text-emerald-700">{fmtCtc(row.offeredCtc)}</p>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 8. Current CTC */}
        <td className="px-3 py-3 whitespace-nowrap">
          {row.currentCtc != null ? (
            <p className="text-[12px] font-semibold text-slate-700">{fmtCtc(row.currentCtc)}</p>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 9. Expected CTC */}
        <td className="px-3 py-3 whitespace-nowrap">
          {row.expectedCtc != null ? (
            <p className="text-[12px] font-semibold text-indigo-600">{fmtCtc(row.expectedCtc)}</p>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* 10. Added + Aging */}
        <td className="px-3 py-3 text-right whitespace-nowrap">
          <p className="text-[11px] font-semibold text-slate-700">{fmtDate(row.addedOn)}</p>
          <p className="text-[10px] text-slate-400">
            {row.pipelineDays}d · {row.stageAging} in stage
          </p>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-indigo-50/40">
          <td colSpan={10} className="px-6 py-3">
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
              {row.clientName && (
                <div>
                  <span className="text-slate-400">Client </span>
                  <span className="font-semibold">{row.clientName}</span>
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
              {row.negotiatedCtc != null && (
                <div>
                  <span className="text-slate-400">Negotiated CTC </span>
                  <span className="font-semibold">{fmtCtc(row.negotiatedCtc)}</span>
                </div>
              )}
              {row.offerStatus && (
                <div>
                  <span className="text-slate-400">Offer Status </span>
                  <span className="font-semibold">{row.offerStatus}</span>
                </div>
              )}
              {row.submittedAt && (
                <div>
                  <span className="text-slate-400">Submitted </span>
                  <span className="font-semibold">{fmtDate(row.submittedAt)}</span>
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
// SHEETJS EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportToExcel(rows: DrillRow[], recruiterName: string, stageLabel?: string) {
  const wb = XLSX.utils.book_new();
  const now = new Date();

  const data = rows.map((r, i) => ({
    '#': i + 1,
    Candidate: r.candidateName,
    Email: r.candidateEmail,
    Phone: r.candidatePhone ?? '',
    'Current Title': r.currentTitle ?? '',
    'Current Company': r.currentCompany ?? '',
    'Exp (yrs)': r.expYears ?? '',
    'Top Skills': r.topSkills ?? '',
    'Req Code': r.reqCode,
    Requirement: r.reqTitle,
    Client: r.clientName ?? '',
    'Service Line': r.serviceLineName ?? '',
    Stage: r.stageLabel,
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
    'Is Placed?': r.isTerminal ? 'Yes' : 'No',
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
    'Month of Joining': r.monthOfJoining ?? '',
    'Days to Join': r.daysToJoin ?? '',
    'Current CTC': r.currentCtc ?? '',
    'Expected CTC': r.expectedCtc ?? '',
    'Negotiated CTC': r.negotiatedCtc ?? '',
    'Offered CTC': r.offeredCtc ?? '',
    'Offer Status': r.offerStatus ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 4 },
    { wch: 26 },
    { wch: 28 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 8 },
    { wch: 34 },
    { wch: 14 },
    { wch: 34 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');

  // Summary sheet
  const placed = rows.filter(r => r.isTerminal).length;
  const nearTerm = rows.filter(r => r.isNearTerminal && !r.isTerminal).length;
  const active = rows.filter(
    r => !r.isTerminal && !r.isNearTerminal && !r.isRejected && !r.isWithdrawn && !r.isOnHold
  ).length;
  const summary = [
    { Metric: 'Recruiter', Value: recruiterName },
    ...(stageLabel ? [{ Metric: 'Stage filter', Value: stageLabel }] : []),
    { Metric: 'Total', Value: rows.length },
    { Metric: 'Placed', Value: placed },
    { Metric: 'Near Terminal', Value: nearTerm },
    { Metric: 'Active', Value: active },
    { Metric: 'Rejected/Withdrawn', Value: rows.filter(r => r.isRejected || r.isWithdrawn).length },
    { Metric: 'On Hold', Value: rows.filter(r => r.isOnHold).length },
    { Metric: '', Value: '' },
    {
      Metric: 'Placement Rate',
      Value: rows.length > 0 ? `${((placed / rows.length) * 100).toFixed(1)}%` : '0%',
    },
    { Metric: 'Exported At', Value: format(now, 'dd-MMM-yyyy HH:mm') },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summary);
  ws2['!cols'] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const safeName = recruiterName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  XLSX.writeFile(wb, `recruiter-drill_${safeName}_${format(now, 'yyyy-MM-dd')}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DIALOG
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  target: RecruiterDrillTarget | null;
  baseQs: string;
  onClose: () => void;
}

export function RecruiterCandidateDrillDialog({ target, baseQs, onClose }: Props) {
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('stageOrder');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [mojMonth, setMojMonth] = useState<string>('');

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const mojOptionsQuery = useQuery({
    queryKey: ['recruiter-drill-moj', baseQs],
    queryFn: async () => (await axios.get(`/reports/recruiters/drill/moj-options?${baseQs}`)).data,
    enabled: !!target,
    staleTime: 300_000,
  });
  const mojOptions: { label: string; value: string }[] = mojOptionsQuery.data?.data ?? [];

  const queryString = useMemo(() => {
    if (!target) return '';
    const overrideQs = (target as any).overrideQs;
    const p = new URLSearchParams(overrideQs !== undefined ? overrideQs : baseQs);
    if (target.recruiterId && target.recruiterId !== '__all__') {
      p.set('recruiterId', target.recruiterId);
    }
    if (target.stageId) {
      p.set('stageId', target.stageId);
      p.set('type', 'stage');
    } else if (!p.has('type')) {
      p.set('type', 'recruiter');
    }
    if (mojMonth) p.set('mojMonth', mojMonth);
    return p.toString();
  }, [target, baseQs, mojMonth]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter-drill-v2', queryString],
    queryFn: async () =>
      (await axios.get(`/reports/recruiters/drill?${queryString}`)).data as {
        success: boolean;
        data: any[];
        meta: { stats: any; capped: boolean };
      },
    enabled: !!target,
    staleTime: 60_000,
  });

  const rows: DrillRow[] = useMemo(() => {
    const raw = data?.data ?? [];
    return raw.map((r: any) => ({
      pipelineId: r.id ?? r.pipelineId,
      candidateName: r.candidateName ?? r.snapshot?.fullName ?? '—',
      candidateEmail: r.candidateEmail ?? r.snapshot?.email ?? '',
      candidatePhone: r.candidatePhone ?? r.snapshot?.phone ?? '',
      currentTitle: r.currentTitle ?? r.snapshot?.currentTitle ?? '',
      currentCompany: r.currentCompany ?? r.snapshot?.currentCompany ?? '',
      expYears: r.expYears ?? r.snapshot?.totalExpYears ?? null,
      topSkills: Array.isArray(r.topSkills ?? r.snapshot?.topSkills)
        ? (r.topSkills ?? r.snapshot?.topSkills).join(', ')
        : (r.topSkills ?? r.snapshot?.topSkills ?? ''),
      resumeUrl: r.resumeUrl ?? r.snapshot?.resumeUrl ?? null,
      stageLabel: r.stageLabel ?? r.currentStage?.label ?? '—',
      stageOrder: r.stageOrder ?? r.currentStage?.order ?? 0,
      isTerminal: r.isTerminal ?? r.currentStage?.isTerminal ?? false,
      isNearTerminal: r.isNearTerminal ?? r.currentStage?.isNearTerminal ?? false,
      isSourced: r.isSourced ?? r.currentStage?.isSourced ?? false,
      isRejected: r.isRejected ?? false,
      isWithdrawn: r.isWithdrawn ?? false,
      isOnHold: r.isOnHold ?? false,
      addedOn: r.addedOn ?? r.createdAt ?? null,
      pipelineDays: r.pipelineDays ?? 0,
      stageAging: r.stageAging ?? '—',
      submittedAt: r.submittedAt ?? null,
      offerStatus: r.offerStatus ?? null,
      currentCtc: r.currentCtc ?? null,
      expectedCtc: r.expectedCtc ?? null,
      negotiatedCtc: r.negotiatedCtc ?? null,
      offeredCtc: r.offeredCtc ?? null,
      noticePeriod: r.noticePeriod ?? null,
      lastWorkingDate: r.lastWorkingDate ?? null,
      expectedJoiningDate: r.expectedJoiningDate ?? null,
      actualJoiningDate: r.actualJoiningDate ?? null,
      monthOfJoining: r.monthOfJoining ?? null,
      daysToJoin: r.daysToJoin ?? r.remainingDaysToJoin ?? null,
      reqCode: r.reqCode ?? r.requirement?.reqCode ?? '—',
      reqTitle: r.reqTitle ?? r.requirement?.title ?? '—',
      clientName: r.clientName ?? r.requirement?.client?.name ?? '',
      serviceLineName: r.serviceLineName ?? r.requirement?.serviceLine?.name ?? '',
      businessUnitName: r.businessUnitName ?? r.requirement?.businessUnit?.name ?? '',
    }));
  }, [data]);

  const serverStats = data?.meta?.stats;
  const capped: boolean = data?.meta?.capped ?? false;
  const stats = useMemo(
    () =>
      serverStats ?? {
        total: rows.length,
        placed: rows.filter(r => r.isTerminal).length,
        nearTerminal: rows.filter(r => r.isNearTerminal && !r.isTerminal).length,
        active: rows.filter(
          r => !r.isTerminal && !r.isNearTerminal && !r.isRejected && !r.isWithdrawn && !r.isOnHold
        ).length,
        onHold: rows.filter(r => r.isOnHold).length,
        rejected: rows.filter(r => r.isRejected).length,
        withdrawn: rows.filter(r => r.isWithdrawn).length,
      },
    [rows, serverStats]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      r =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        (r.currentCompany ?? '').toLowerCase().includes(q) ||
        r.stageLabel.toLowerCase().includes(q) ||
        r.reqCode.toLowerCase().includes(q) ||
        r.reqTitle.toLowerCase().includes(q) ||
        (r.monthOfJoining ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  if (!target) return null;

  const dialogTitle = target.stageLabel
    ? `${target.recruiterName} — ${target.stageLabel}`
    : `${target.recruiterName} — All candidates`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[16px] font-black leading-tight text-slate-900">{dialogTitle}</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">
                {target.recruiterEmail ?? ''}
                {isLoading
                  ? ' · Loading…'
                  : ` · ${rows.length} candidate${rows.length !== 1 ? 's' : ''}`}
                {capped && (
                  <span className="ml-1 font-bold text-amber-600">
                    · capped at 1000, use Export for full set
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {rows.length > 0 && (
                <button
                  onClick={() => exportToExcel(filtered, target.recruiterName, target.stageLabel)}
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

        {/* Stats strip */}
        {!isLoading && rows.length > 0 && (
          <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
              <StatPill
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Placed"
                value={stats.placed}
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

        {/* MOJ filter + Search */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-3 space-y-2">
          {mojOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Month of joining
              </span>
              <div className="flex flex-wrap gap-1.5">
                {mojOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMojMonth(m => (m === opt.value ? '' : opt.value))}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      mojMonth === opt.value
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {mojMonth && (
                  <button
                    onClick={() => setMojMonth('')}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-bold text-red-500 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by candidate, company, stage, requirement, month of joining…"
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
            <p className="text-[11px] text-slate-400">
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
              <p className="text-[14px] font-semibold">Failed to load candidates.</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
              {search ? 'No matches for your search.' : 'No candidates found.'}
            </div>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              {/*
                ── THEAD — 10 columns, order must match CandidateRow <td> order exactly ──
                1. Candidate
                2. Requirement
                3. Stage
                4. Last Working Date
                5. Date of Joining
                6. Month of Joining
                7. Offered CTC
                8. Current CTC
                9. Expected CTC
                10. Added · Aging
              */}
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b-2 border-slate-200">
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="candidateName"
                    label="Candidate"
                    className="px-4 min-w-[200px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="reqCode"
                    label="Requirement"
                    className="min-w-[140px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="stageLabel"
                    label="Stage"
                    className="min-w-[120px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="lastWorkingDate"
                    label="Last Working Date"
                    className="min-w-[140px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="actualJoiningDate"
                    label="Date of Joining"
                    className="min-w-[130px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="monthOfJoining"
                    label="Month of Joining"
                    className="min-w-[130px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="offeredCtc"
                    label="Offered CTC"
                    className="min-w-[110px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="currentCtc"
                    label="Current CTC"
                    className="min-w-[110px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="expectedCtc"
                    label="Expected CTC"
                    className="min-w-[110px]"
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

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-2.5">
            <p className="text-[11px] text-slate-400">
              Click any row to expand full details ·{' '}
              <span className="font-semibold text-emerald-600">Green</span> = placed ·{' '}
              <span className="font-semibold text-amber-600">Amber</span> = near close · Faded =
              rejected / withdrawn
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
