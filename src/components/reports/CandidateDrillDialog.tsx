// File: CandidateDrillDialog.tsx
// Path: src/components/reports/CandidateDrillDialog.tsx
//
// Opens when a stat card on the Candidates tab is clicked.
// Calls GET /reports/candidates/drill with the tab's current filters plus a
// bucket/stage narrowing, so the drill always agrees with the number clicked.

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  X,
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
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { CandidateExportMenu } from './CandidateExportMenu';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateDrillTarget {
  label: string; // dialog title
  bucket?: string; // placed | near_terminal | in_pipeline | sourced | off_pipeline
  stageId?: string;
  disposition?: string;
  duplicatesOnly?: boolean;
  hasJoined?: boolean;
  isSubmitted?: boolean;
  hasOffer?: boolean;
}

type SortKey = string;
type SortDir = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(d: any): string {
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

const BUCKET_STYLE: Record<string, string> = {
  Placed: 'bg-emerald-50 text-emerald-700',
  'Near close': 'bg-amber-50 text-amber-700',
  'In pipeline': 'bg-indigo-50 text-indigo-700',
  Sourced: 'bg-slate-100 text-slate-600',
  'Off pipeline': 'bg-red-50 text-red-600',
};

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
  if (!value) return null;
  return (
    <div className={`flex items-center gap-1.5 rounded-lg ${bg} px-2.5 py-1 ${color}`}>
      {icon}
      <span className="font-black">{value}</span>
      <span className="font-semibold opacity-80">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTABLE HEADER
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
  const active = k === sortKey;
  return (
    <th
      onClick={() => onToggle(k)}
      className={`cursor-pointer select-none whitespace-nowrap bg-slate-50 px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 ${className}`}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
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
// ROW
// ─────────────────────────────────────────────────────────────────────────────

function DrillRow({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  const dimmed = row.isRejected || row.isWithdrawn;

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50
          ${dimmed ? 'opacity-50' : ''}
          ${row.isTerminal ? 'bg-emerald-50/30' : ''}
          ${row.isNearTerminal && !row.isTerminal ? 'bg-amber-50/20' : ''}`}
      >
        {/* Candidate */}
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13px] font-bold text-slate-900">{row.candidateName}</p>
                {row.isCrossRequirement && (
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-black text-amber-700"
                    title={`Also in ${row.duplicateCount} other requirement${row.duplicateCount !== 1 ? 's' : ''}`}
                  >
                    <Copy className="h-2.5 w-2.5" />
                    {row.duplicateCount}
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-slate-400">{row.candidateEmail}</p>
              {(row.currentTitle || row.currentCompany) && (
                <p className="truncate text-[11px] text-slate-500">
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

        {/* Requirement */}
        <td className="px-3 py-3">
          <p className="font-mono text-[11px] font-bold text-slate-700">{row.reqCode}</p>
          <p className="max-w-[170px] truncate text-[10px] text-slate-400">{row.reqTitle}</p>
          {row.clientName && (
            <p className="max-w-[170px] truncate text-[10px] text-slate-400">{row.clientName}</p>
          )}
        </td>

        {/* Stage */}
        <td className="px-3 py-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${BUCKET_STYLE[row.bucket] ?? 'bg-slate-100 text-slate-600'}`}
          >
            {row.stageLabel}
          </span>
          <p className="mt-0.5 text-[10px] text-slate-400">{row.stageAging} in stage</p>
        </td>

        {/* Recruiter */}
        <td className="px-3 py-3">
          <p className="max-w-[130px] truncate text-[12px] font-semibold text-slate-700">
            {row.recruiterName}
          </p>
        </td>

        {/* CTC */}
        <td className="px-3 py-3">
          <div className="flex flex-col gap-0.5 text-[11px]">
            {row.currentCtc != null && (
              <span className="text-slate-500">Curr {fmtCtc(row.currentCtc)}</span>
            )}
            {row.offeredCtc != null && (
              <span className="font-bold text-emerald-700">Offer {fmtCtc(row.offeredCtc)}</span>
            )}
            {row.currentCtc == null && row.offeredCtc == null && (
              <span className="text-slate-300">—</span>
            )}
          </div>
        </td>

        {/* Joining */}
        <td className="px-3 py-3">
          {row.monthOfJoining ? (
            <div>
              <p className="text-[12px] font-bold text-indigo-700">{row.monthOfJoining}</p>
              <p className="text-[10px] text-slate-400">
                {row.joiningSource}
                {row.daysToJoin != null ? ` · ${row.daysToJoin}d` : ''}
              </p>
            </div>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        {/* Added */}
        <td className="px-3 py-3 text-right">
          <p className="text-[11px] font-semibold text-slate-700">{fmtDate(row.addedOn)}</p>
          <p className="text-[10px] text-slate-400">{row.pipelineDays}d in pipeline</p>
        </td>
      </tr>

      {open && (
        <tr className="bg-indigo-50/40">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] sm:grid-cols-3 lg:grid-cols-4">
              {row.candidatePhone && <D l="Phone" v={row.candidatePhone} />}
              {row.expYears != null && <D l="Experience" v={`${row.expYears} yrs`} />}
              {row.candidateCode && <D l="Candidate code" v={row.candidateCode} />}
              <D l="Source type" v={row.snapshotType} />
              {row.sourcedVia && <D l="Sourced via" v={row.sourcedVia} />}
              {row.topSkills && (
                <div className="col-span-2">
                  <span className="text-slate-400">Skills </span>
                  <span className="font-semibold">{row.topSkills}</span>
                </div>
              )}
              <D l="Disposition" v={row.disposition} />
              {row.dropReason && <D l="Drop reason" v={row.dropReason} />}
              {row.rejectionReason && <D l="Rejection" v={row.rejectionReason} />}
              {row.withdrawnReason && <D l="Withdrawn" v={row.withdrawnReason} />}
              {row.noticePeriod && <D l="Notice" v={row.noticePeriod} />}
              {row.lastWorkingDate && <D l="LWD" v={fmtDate(row.lastWorkingDate)} />}
              {row.expectedJoiningDate && (
                <D l="Expected joining" v={fmtDate(row.expectedJoiningDate)} />
              )}
              {row.actualJoiningDate && (
                <D l="Actual joining" v={fmtDate(row.actualJoiningDate)} tone="text-emerald-700" />
              )}
              {row.expectedCtc != null && <D l="Expected CTC" v={fmtCtc(row.expectedCtc)} />}
              {row.negotiatedCtc != null && <D l="Negotiated CTC" v={fmtCtc(row.negotiatedCtc)} />}
              {row.offerStatus && <D l="Offer status" v={row.offerStatus} />}
              {row.submittedAt && <D l="Submitted" v={fmtDate(row.submittedAt)} />}
              <D l="Service line" v={row.serviceLineName || '—'} />
              <D l="Business unit" v={row.businessUnitName || '—'} />
              {row.clientSpocName && <D l="SPOC" v={row.clientSpocName} />}
              <D l="Req status" v={row.reqStatus} />
              {row.reqCreatedBy && <D l="Req created by" v={row.reqCreatedBy} />}
            </div>

            {/* Cross-requirement presence */}
            {row.duplicateIn?.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700">
                  <Copy className="h-3 w-3" />
                  Also in {row.duplicateIn.length} other requirement
                  {row.duplicateIn.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-1.5">
                  {row.duplicateIn.map((d: any) => (
                    <div
                      key={d.requirementId}
                      className="flex flex-wrap items-center gap-2 text-[11px]"
                    >
                      <span className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-slate-600">
                        {d.reqCode}
                      </span>
                      <span className="max-w-[200px] truncate text-slate-600">{d.reqTitle}</span>
                      <span className="rounded bg-white px-1.5 py-0.5 font-semibold text-slate-500">
                        {d.stageLabel}
                      </span>
                      <span className="text-slate-400">{d.recruiterName}</span>
                      {d.sameClient && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-700">
                          same client
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function D({ l, v, tone }: { l: string; v: string; tone?: string }) {
  return (
    <div>
      <span className="text-slate-400">{l} </span>
      <span className={`font-semibold ${tone ?? ''}`}>{v}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DIALOG
// ─────────────────────────────────────────────────────────────────────────────

export function CandidateDrillDialog({
  target,
  baseQs,
  onClose,
}: {
  target: CandidateDrillTarget | null;
  baseQs: string;
  onClose: () => void;
}) {
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

  const queryString = useMemo(() => {
    if (!target) return '';
    const p = new URLSearchParams(baseQs);
    p.delete('page');
    p.delete('limit');
    if (target.bucket) p.set('bucket', target.bucket);
    if (target.stageId) p.set('stageId', target.stageId);
    if (target.disposition) p.set('disposition', target.disposition);
    if (target.duplicatesOnly) p.set('duplicatesOnly', 'true');
    if (target.hasJoined) p.set('hasJoined', 'true');
    if (target.isSubmitted) p.set('isSubmitted', 'true');
    if (target.hasOffer) p.set('hasOffer', 'true');
    return p.toString();
  }, [target, baseQs]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate-drill', queryString],
    queryFn: async () => (await axios.get(`/reports/candidates/drill?${queryString}`)).data,
    enabled: !!target,
    staleTime: 60_000,
  });

  const rows: any[] = data?.data ?? [];
  const stats = data?.meta?.stats;
  const capped: boolean = data?.meta?.capped ?? false;

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      r =>
        (r.candidateName ?? '').toLowerCase().includes(s) ||
        (r.candidateEmail ?? '').toLowerCase().includes(s) ||
        (r.currentCompany ?? '').toLowerCase().includes(s) ||
        (r.stageLabel ?? '').toLowerCase().includes(s) ||
        (r.reqCode ?? '').toLowerCase().includes(s) ||
        (r.reqTitle ?? '').toLowerCase().includes(s) ||
        (r.recruiterName ?? '').toLowerCase().includes(s) ||
        (r.monthOfJoining ?? '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[16px] font-black leading-tight text-slate-900">
                {target.label}
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-400">
                {isLoading
                  ? 'Loading…'
                  : `${rows.length.toLocaleString('en-IN')} candidate${rows.length !== 1 ? 's' : ''}`}
                {capped && (
                  <span className="ml-1 font-bold text-amber-600">
                    · capped at 1000, use Export for the full set
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {rows.length > 0 && (
                <CandidateExportMenu queryString={queryString} totalRows={rows.length} />
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
        {!isLoading && stats && rows.length > 0 && (
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
                label="Near close"
                value={stats.nearTerminal}
                color="text-amber-700"
                bg="bg-amber-50"
              />
              <StatPill
                icon={<UserX className="h-3.5 w-3.5" />}
                label="Off pipeline"
                value={stats.offPipeline}
                color="text-red-600"
                bg="bg-red-50"
              />
              <StatPill
                icon={<PauseCircle className="h-3.5 w-3.5" />}
                label="On hold"
                value={stats.onHold}
                color="text-orange-700"
                bg="bg-orange-50"
              />
              <StatPill
                icon={<Copy className="h-3.5 w-3.5" />}
                label="in other reqs"
                value={stats.duplicates}
                color="text-amber-800"
                bg="bg-amber-100"
              />
              <span className="ml-auto font-black text-slate-700">
                {stats.total.toLocaleString('en-IN')} total
              </span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter these results by candidate, company, stage, requirement, recruiter…"
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
              <p className="text-[14px] font-semibold">Failed to load candidates.</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
              {search ? 'No matches for your filter.' : 'No candidates in this segment.'}
            </div>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10">
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
                    k="reqCode"
                    label="Requirement"
                    className="min-w-[150px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="stageOrder"
                    label="Stage"
                    className="min-w-[130px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="recruiterName"
                    label="Recruiter"
                    className="min-w-[120px]"
                  />
                  <ThBtn
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    k="offeredCtc"
                    label="CTC"
                    className="min-w-[110px]"
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
                    label="Added"
                    className="min-w-[110px] text-right"
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <DrillRow key={r.pipelineId} row={r} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-2.5">
            <p className="text-[11px] text-slate-400">
              Click a row for full detail ·{' '}
              <span className="font-semibold text-emerald-600">Green</span> placed ·{' '}
              <span className="font-semibold text-amber-600">Amber</span> near close ·{' '}
              <span className="font-semibold text-amber-700">⧉ badge</span> means the same person
              sits in other requirements
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
