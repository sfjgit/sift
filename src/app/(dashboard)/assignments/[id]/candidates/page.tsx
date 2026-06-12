// File: page.tsx
// Path: src/app/(dashboard)/assignments/[assignmentId]/candidates/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Users,
  Flame,
  ArrowUpRight,
  GitBranch,
  Search,
  X,
  ChevronRight,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';
import { canonicalDot, useCandidateMeta } from '@/hooks/useCandidateMeta';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineStageCount {
  id: string;
  code: string;
  label: string;
  order: number;
  canonicalStage: string | null;
  count: number;
}

interface CandidateStats {
  total: number;
  active: number;
  placed: number;
  dropped: number;
  onHold: number;
  rejected: number;
  withdrawn: number;
  submitted: number;
  offered: number;
  joined: number;
  byCanonicalStage: Record<string, number>;
  byPipelineStage: PipelineStageCount[];
  agingBuckets: { fresh: number; normal: number; stale: number; critical: number };
  rates: { submission: number; offer: number; joining: number };
}

interface CandidateRow {
  id: string;
  disposition: string;
  dropReason: string | null;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  submittedAt: string | null;
  offeredAt: string | null;
  offerStatus: string | null;
  offeredCtc: number | null;
  actualJoiningDate: string | null;
  stageUpdatedAt: string;
  currentCanonicalStage: string | null;
  aging: { minutes: number; label: string };
  currentStage: {
    id: string;
    label: string;
    code: string;
    order: number;
    canonicalStage: string | null;
  };
  recruiter: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
  };
  snapshot: {
    id: string;
    candidateServiceId: string;
    fullName: string;
    email: string;
    phone: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    totalExpYears: number | null;
    topSkills: string[];
    resumeUrl: string | null;
  };
  assignment: {
    id: string;
    depth: number;
    assignedTo: { id: string; firstName: string; lastName: string };
  } | null;
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
  };
}

interface AssignmentDetail {
  id: string;
  depth: number;
  status: string;
  deadline: string | null;
  breachedAt: string | null;
  assignedAt: string;
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
  };
  assigneeBU: { id: string; name: string } | null;
  candidateStats: CandidateStats;
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    totalOpenings: number;
    isRespondByBreached: boolean;
    isTurnaroundBreached: boolean;
    client: { id: string; name: string } | null;
    serviceLine: { id: string; name: string } | null;
    businessUnit: { id: string; name: string } | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEPTH_LABEL: Record<number, string> = { 0: 'DM', 1: 'TL', 2: 'Recruiter' };

const DISPOSITION_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  PLACED: { label: 'Placed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DROPPED: { label: 'Dropped', cls: 'bg-red-50 text-red-700 border-red-200' },
  ON_HOLD: { label: 'On Hold', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  DUPLICATE: { label: 'Dupe', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function avatarColor(seed: string) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
  ];
  return colors[seed.charCodeAt(0) % colors.length];
}

function initials(n: string) {
  return n
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Canonical funnel bar ─────────────────────────────────────────────────────

function CanonicalFunnelBar({
  byCanonical,
  activeCanonical,
  onSelect,
}: {
  byCanonical: Record<string, number>;
  activeCanonical: string | null;
  onSelect: (key: string | null) => void;
}) {
  const { data: meta } = useCandidateMeta();
  const stages = meta?.canonicalStages ?? [];

  if (!stages.length) return null;

  return (
    <div
      className="grid bg-white border-b-2 border-slate-100"
      style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}
    >
      {stages.map(s => {
        const count = byCanonical[s.key] ?? 0;
        const isActive = activeCanonical === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onSelect(isActive ? null : s.key)}
            disabled={count === 0}
            title={`${s.key} — ${count} candidate${count !== 1 ? 's' : ''}`}
            className={cn(
              'group flex flex-col items-center gap-1.5 px-1 py-4 border-r border-slate-100 last:border-r-0 transition-all relative',
              isActive
                ? 'bg-slate-900'
                : count > 0
                  ? 'hover:bg-slate-50 cursor-pointer'
                  : 'opacity-30 cursor-default pointer-events-none'
            )}
          >
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
            <span className={cn('w-2 h-2 rounded-full shrink-0', canonicalDot(s.key))} />
            <span
              className={cn(
                'text-[22px] font-black leading-none tabular-nums transition-colors',
                isActive
                  ? 'text-white'
                  : count > 0
                    ? 'text-slate-900 group-hover:text-slate-700'
                    : 'text-slate-200'
              )}
            >
              {count}
            </span>
            <span
              className={cn(
                'text-[9px] font-bold tracking-wider uppercase leading-none text-center max-w-[56px] truncate',
                isActive
                  ? 'text-slate-300'
                  : count > 0
                    ? 'text-slate-500 group-hover:text-slate-600'
                    : 'text-slate-200'
              )}
            >
              {s.key.replace(/_/g, ' ')}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Funnel skeleton ──────────────────────────────────────────────────────────

function FunnelSkeleton() {
  return (
    <div
      className="grid border-b-2 border-slate-100 bg-white"
      style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1.5 py-4 border-r border-slate-100 last:border-r-0"
        >
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-6 w-7" />
          <Skeleton className="h-2 w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── Pipeline stage sub-filters ───────────────────────────────────────────────

function PipelineStageSubFilters({
  stages,
  activeStageId,
  onSelect,
}: {
  stages: PipelineStageCount[];
  activeStageId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (stages.length <= 1) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-100 bg-slate-50/60">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
        Pipeline stages
      </span>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'text-xs px-3 py-1.5 rounded-lg font-medium border transition-all',
          !activeStageId
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
        )}
      >
        All
      </button>
      {stages.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(activeStageId === s.id ? null : s.id)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-lg font-medium border transition-all',
            activeStageId === s.id
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          )}
        >
          {s.label} <span className="opacity-60">({s.count})</span>
        </button>
      ))}
    </div>
  );
}

// ─── Candidate row ────────────────────────────────────────────────────────────

function CandidateListRow({ c, onClick }: { c: CandidateRow; onClick: () => void }) {
  const ageCls =
    c.aging.minutes > 20160
      ? 'text-red-500'
      : c.aging.minutes > 7200
        ? 'text-amber-500'
        : 'text-slate-400';

  const disp = DISPOSITION_CONFIG[c.disposition] ?? {
    label: c.disposition,
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-blue-50/40 transition-colors group border-b border-slate-100 last:border-b-0',
        (c.isRejected || c.isWithdrawn) && 'opacity-40'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5',
          avatarColor(c.snapshot.fullName)
        )}
      >
        {initials(c.snapshot.fullName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {c.snapshot.fullName}
          </p>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', disp.cls)}>
            {disp.label}
          </span>
          {c.isOnHold && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
              On Hold
            </span>
          )}
        </div>

        {(c.snapshot.currentTitle || c.snapshot.currentCompany) && (
          <p className="text-xs text-slate-500 truncate mb-1.5">
            {c.snapshot.currentTitle}
            {c.snapshot.currentTitle && c.snapshot.currentCompany ? ' · ' : ''}
            {c.snapshot.currentCompany}
            {c.snapshot.totalExpYears != null && (
              <span className="ml-1 text-slate-400">{c.snapshot.totalExpYears}y exp</span>
            )}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {c.snapshot.topSkills.slice(0, 4).map(s => (
            <span
              key={s}
              className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium border border-blue-100"
            >
              {s}
            </span>
          ))}
        </div>

        <p className="text-[11px] text-slate-400 mt-1.5">
          Recruiter: {c.recruiter.firstName} {c.recruiter.lastName}
          <span className="mx-1 text-slate-300">·</span>
          {c.recruiter.role.name}
        </p>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
          {c.currentStage.label}
        </span>
        {c.offeredCtc && (
          <span className="text-xs font-semibold text-emerald-700">
            ₹{(c.offeredCtc / 100000).toFixed(1)}L
          </span>
        )}
        <span className={cn('flex items-center gap-1 text-xs font-medium', ageCls)}>
          <Clock className="w-3 h-3" />
          {c.aging.label}
        </span>
        {c.submittedAt && (
          <span className="text-[11px] text-slate-400">Submitted {fmtDate(c.submittedAt)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Row skeleton ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-slate-100">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-48" />
        <div className="flex gap-1.5">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentCandidatesPage() {
  const axios = useAxios();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const assignmentId = params.id as string;

  const urlCanonical = searchParams.get('canonical') as string | null;
  const urlDisposition = searchParams.get('disposition') ?? '';

  const [activeCanonical, setActiveCanonical] = useState<string | null>(urlCanonical);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [disposition, setDisposition] = useState<string>(urlDisposition);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data: meta } = useCandidateMeta();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [activeCanonical, activeStageId, disposition, search]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveStageId(null);
  }, [activeCanonical]);

  // ── Assignment detail ──────────────────────────────────────────────────────
  const { data: assignmentRes, isLoading: assignmentLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () =>
      (await axios.get(`/assignments/${assignmentId}`)).data as {
        success: boolean;
        data: AssignmentDetail;
      },
    enabled: !!assignmentId,
  });

  const assignment = assignmentRes?.data;
  const req = assignment?.requirement;
  const stats = assignment?.candidateStats;

  // ── Pipeline sub-filter stages for active canonical ────────────────────────
  const filteredPipelineStages = useMemo<PipelineStageCount[]>(() => {
    if (!activeCanonical || !stats) return [];
    return (stats.byPipelineStage ?? []).filter(
      s => s.canonicalStage === activeCanonical && s.count > 0
    );
  }, [activeCanonical, stats]);

  // ── Query string ───────────────────────────────────────────────────────────
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('assignmentId', assignmentId);
    if (activeStageId) {
      p.set('stageId', activeStageId);
    } else if (activeCanonical) {
      p.set('canonicalStage', activeCanonical);
    }
    if (disposition) p.set('disposition', disposition);
    if (search.trim()) p.set('search', search.trim());
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [assignmentId, activeCanonical, activeStageId, disposition, search, page]);

  // ── Candidates ─────────────────────────────────────────────────────────────
  const {
    data: candidatesRes,
    isLoading: candidatesLoading,
    isFetching,
  } = useQuery({
    queryKey: ['candidates', qs],
    queryFn: async () =>
      (await axios.get(`/candidates?${qs}`)).data as {
        success: boolean;
        data: CandidateRow[];
        meta: { total: number; page: number; limit: number; pages: number };
      },
    enabled: !!assignmentId,
    placeholderData: prev => prev,
  });

  const candidates = candidatesRes?.data ?? [];
  const total = candidatesRes?.meta?.total ?? 0;
  const totalPages = candidatesRes?.meta?.pages ?? 0;

  const isBreached =
    !!assignment?.breachedAt || !!req?.isRespondByBreached || !!req?.isTurnaroundBreached;
  const dl = assignment?.deadline ? daysLeft(assignment.deadline) : null;

  // active canonical label from meta
  const activeLabel = activeCanonical
    ? meta?.canonicalStages.find(s => s.key === activeCanonical)?.key.replace(/_/g, ' ')
    : null;

  const hasAnyFilter = !!(activeCanonical || disposition || search);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#EEF2F7]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b-2 border-slate-100">
        <div className="px-8 pt-5 pb-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="text-sm text-slate-400">Assignments</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="text-sm font-medium text-slate-700 truncate max-w-[260px]">
              {assignmentLoading ? (
                <Skeleton className="h-4 w-40 inline-block" />
              ) : (
                (req?.title ?? 'Candidates')
              )}
            </span>
          </div>

          {/* Assignment header */}
          {assignmentLoading ? (
            <div className="flex gap-4">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-5 w-72" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ) : assignment && req ? (
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-base font-bold',
                  avatarColor(assignment.assignedTo.firstName)
                )}
              >
                {initials(`${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {req.reqCode}
                  </span>
                  <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {DEPTH_LABEL[assignment.depth] ?? `D${assignment.depth}`}
                  </span>
                  {isBreached && (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Breached
                    </span>
                  )}
                  {dl != null && (
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1',
                        dl < 0
                          ? 'text-red-800 bg-red-50 border-red-200'
                          : dl <= 3
                            ? 'text-amber-800 bg-amber-50 border-amber-200'
                            : 'text-slate-600 bg-slate-100 border-slate-200'
                      )}
                    >
                      <CalendarClock className="w-3 h-3" />
                      {dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`}
                    </span>
                  )}
                </div>

                <h1 className="text-lg font-bold text-slate-900 truncate leading-tight">
                  {req.title}
                </h1>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                  {assignment.assignedTo.firstName} {assignment.assignedTo.lastName}
                  <span className="font-normal text-slate-500 ml-1.5">
                    ({assignment.assignedTo.role.name})
                  </span>
                </p>
                <p className="text-sm text-slate-500 mt-0.5 truncate">
                  {[req.client?.name, req.businessUnit?.name, req.serviceLine?.name]
                    .filter(Boolean)
                    .join(' · ')}
                  {` · ${req.totalOpenings} opening${req.totalOpenings !== 1 ? 's' : ''}`}
                </p>
              </div>

              {stats && (
                <div className="hidden md:flex items-center gap-5 shrink-0">
                  <div className="text-center">
                    <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                      Total
                    </p>
                  </div>
                  <div className="w-px h-10 bg-slate-100" />
                  <div className="text-center">
                    <p className="text-3xl font-black text-blue-600">{stats.active}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                      Active
                    </p>
                  </div>
                  {stats.placed > 0 && (
                    <>
                      <div className="w-px h-10 bg-slate-100" />
                      <div className="text-center">
                        <p className="text-3xl font-black text-emerald-700">{stats.placed}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                          Placed
                        </p>
                      </div>
                    </>
                  )}
                  {stats.submitted > 0 && (
                    <>
                      <div className="w-px h-10 bg-slate-100" />
                      <div className="text-center">
                        <p className="text-3xl font-black text-slate-900">{stats.submitted}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                          Submitted
                        </p>
                      </div>
                    </>
                  )}
                  {stats.agingBuckets.critical > 0 && (
                    <>
                      <div className="w-px h-10 bg-slate-100" />
                      <div className="text-center">
                        <p className="text-3xl font-black text-amber-600">
                          {stats.agingBuckets.critical}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                          Stale
                        </p>
                      </div>
                    </>
                  )}
                  <div className="w-px h-10 bg-slate-100" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-sm rounded-xl border-2 border-slate-200"
                    onClick={() => router.push(`/requirements/${req.id}`)}
                  >
                    Open req <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Funnel bar */}
        {assignmentLoading || !stats ? (
          <FunnelSkeleton />
        ) : (
          <CanonicalFunnelBar
            byCanonical={stats.byCanonicalStage}
            activeCanonical={activeCanonical}
            onSelect={setActiveCanonical}
          />
        )}

        {/* Pipeline sub-filters */}
        {activeCanonical && filteredPipelineStages.length > 1 && (
          <PipelineStageSubFilters
            stages={filteredPipelineStages}
            activeStageId={activeStageId}
            onSelect={setActiveStageId}
          />
        )}

        {/* Search + disposition + count */}
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap border-t border-slate-100">
          {activeCanonical && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 shrink-0">
              <span className={cn('w-2 h-2 rounded-full', canonicalDot(activeCanonical))} />
              {activeCanonical.replace(/_/g, ' ')}
              {activeStageId && (
                <span className="text-blue-500 font-normal text-xs ml-0.5">
                  · {filteredPipelineStages.find(s => s.id === activeStageId)?.label}
                </span>
              )}
              <button
                onClick={() => {
                  setActiveCanonical(null);
                  setActiveStageId(null);
                }}
                className="ml-1 text-blue-400 hover:text-blue-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, title, company…"
              className="pl-10 h-9 text-sm border-slate-200 bg-slate-50 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden shrink-0">
            {[
              { v: '', l: 'All' },
              { v: 'ACTIVE', l: 'Active' },
              { v: 'PLACED', l: 'Placed' },
              { v: 'DROPPED', l: 'Dropped' },
              { v: 'ON_HOLD', l: 'On Hold' },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setDisposition(v)}
                className={cn(
                  'text-xs font-semibold px-3 py-2 transition-all',
                  disposition === v
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 bg-white hover:bg-slate-50'
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <span className="text-sm text-slate-500 ml-auto">
            {isFetching && !candidatesLoading ? (
              <span className="text-slate-400 italic text-xs">Updating…</span>
            ) : (
              <>
                <span className="font-semibold text-slate-900">{total}</span> candidate
                {total !== 1 ? 's' : ''}
                {activeLabel ? ` in ${activeLabel}` : ''}
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── Candidate list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="bg-white rounded-2xl mx-6 my-4 border-2 border-slate-100 overflow-hidden">
          {candidatesLoading ? (
            Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                <Users className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-base font-bold text-slate-700">No candidates here</p>
              <p className="text-sm text-slate-500 text-center max-w-xs">
                {activeCanonical
                  ? `No candidates in ${activeCanonical.replace(/_/g, ' ')}`
                  : search
                    ? 'No matches for your search'
                    : 'No candidates added to this assignment yet'}
              </p>
              {hasAnyFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setActiveCanonical(null);
                    setActiveStageId(null);
                    setDisposition('');
                    setSearch('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            candidates.map(c => (
              <CandidateListRow
                key={c.id}
                c={c}
                onClick={() => router.push(`/candidates/${c.snapshot.candidateServiceId}`)}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mx-6 pb-5 pt-1">
            <span className="text-sm text-slate-500">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-sm rounded-xl"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </Button>
              <span className="text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-sm rounded-xl"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
