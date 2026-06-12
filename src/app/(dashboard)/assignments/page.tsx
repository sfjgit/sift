// File: page.tsx
// Path: src/app/(dashboard)/assignments/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  Flame,
  X,
  Layers,
  CalendarClock,
  GitBranch,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
interface ChildAssignment {
  id: string;
  depth: number;
  status: string;
  deadline: string | null;
  assignedAt: string;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
  };
  candidateStats: CandidateStats;
  childAssignments: ChildAssignment[];
}
interface Assignment {
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
    department?: { id: string; name: string };
  };
  assigneeBU: { id: string; name: string } | null;
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
  parentAssignment: {
    id: string;
    depth: number;
    assignedTo: {
      id: string;
      firstName: string;
      lastName: string;
      role: { id: string; name: string };
    };
  } | null;
  childAssignments: ChildAssignment[];
  candidateStats: CandidateStats;
}

// ─── Canonical stage config ────────────────────────────────────────────────────

const CANONICAL_STAGES = [
  { key: 'SOURCED', label: 'Sourced', dot: 'bg-slate-500' },
  { key: 'SCREENING', label: 'Screening', dot: 'bg-blue-600' },
  { key: 'INTERVIEW', label: 'Interview', dot: 'bg-violet-600' },
  { key: 'OFFER_IN_PROGRESS', label: 'Offer WIP', dot: 'bg-amber-600' },
  { key: 'OFFERED', label: 'Offered', dot: 'bg-orange-600' },
  { key: 'HIRED', label: 'Hired', dot: 'bg-emerald-700' },
  { key: 'JOINED', label: 'Joined', dot: 'bg-green-700' },
  { key: 'DROPPED', label: 'Dropped', dot: 'bg-red-600' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQ_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};
const DEPTH_LABEL: Record<number, string> = { 0: 'DM', 1: 'TL', 2: 'Recruiter' };

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
function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}
function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ─── Canonical bar ────────────────────────────────────────────────────────────
// Each column now navigates directly to the candidates page filtered by that
// canonical stage, instead of opening an inline drawer.

function CanonicalBar({
  byCanonical,
  assignmentId,
}: {
  byCanonical: Record<string, number>;
  assignmentId: string;
}) {
  const router = useRouter();
  const { data: meta } = useCandidateMeta();
  const stages = meta?.canonicalStages ?? [];

  if (!stages.length) return null;

  return (
    <div
      className="border-t-2 border-slate-100"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}
    >
      {stages.map(s => {
        const count = byCanonical[s.key] ?? 0;
        return (
          <button
            key={s.key}
            onClick={() =>
              router.push(`/assignments/${assignmentId}/candidates?canonical=${s.key}`)
            }
            disabled={count === 0}
            title={`${s.key} — ${count} candidate${count !== 1 ? 's' : ''}`}
            className="group flex flex-col items-center gap-1.5 px-1 py-4 border-r border-slate-100 last:border-r-0 transition-colors hover:bg-blue-50 disabled:pointer-events-none"
          >
            <span className={cn('w-2 h-2 rounded-full shrink-0', canonicalDot(s.key))} />
            <span
              className={cn(
                'text-[22px] font-black leading-none tabular-nums transition-colors',
                count > 0 ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-200'
              )}
            >
              {count}
            </span>
            <span
              className={cn(
                'text-[9px] font-bold tracking-wider uppercase leading-none text-center max-w-[56px] truncate',
                count > 0 ? 'text-slate-600 group-hover:text-blue-500' : 'text-slate-200'
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

function PipelineStageChips({ stages }: { stages: PipelineStageCount[] }) {
  const active = stages.filter(s => s.count > 0);
  if (!active.length) return null;
  return (
    <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
        Stages
      </span>
      {active.map(s => (
        <span
          key={s.id}
          className="inline-flex items-center gap-1.5 text-[11px] border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-medium"
        >
          <span className="text-[13px] font-black text-slate-900">{s.count}</span>
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ─── Sub-row ──────────────────────────────────────────────────────────────────

function SubRow({ child }: { child: ChildAssignment }) {
  const router = useRouter();
  const dl = child.deadline ? daysLeft(child.deadline) : null;
  return (
    <div
      className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 transition-colors group"
      onClick={() => router.push(`/assignments/${child.id}`)}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
          avatarColor(child.assignedTo.firstName)
        )}
      >
        {initials(`${child.assignedTo.firstName} ${child.assignedTo.lastName}`)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
          {child.assignedTo.firstName} {child.assignedTo.lastName}
        </p>
        <p className="text-xs text-slate-500">{child.assignedTo.role.name}</p>
      </div>
      <div className="text-sm text-slate-600 shrink-0 flex items-center gap-2">
        <span className="font-semibold text-slate-900">{child.candidateStats.total}</span>
        <span>in pipeline</span>
        {dl != null && (
          <span
            className={cn(
              'font-semibold',
              dl < 0 ? 'text-red-500' : dl <= 3 ? 'text-amber-600' : 'text-slate-400'
            )}
          >
            · {dl < 0 ? `${Math.abs(dl)}d over` : `${dl}d left`}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  );
}

// ─── Assignment card ──────────────────────────────────────────────────────────

function AssignmentCard({ a }: { a: Assignment }) {
  const router = useRouter();
  const [showSubs, setShowSubs] = useState(false);
  const req = a.requirement;
  const isBreached = !!a.breachedAt || req.isRespondByBreached || req.isTurnaroundBreached;
  const dl = a.deadline ? daysLeft(a.deadline) : null;
  const age = daysSince(a.assignedAt);
  const hasSubs = a.childAssignments.length > 0;
  const stats = a.candidateStats;

  // Header + stat buttons → assignment detail page (stage controls live there)
  const toDetail = () => router.push(`/assignments/${a.id}`);

  return (
    <div
      className={cn(
        'rounded-2xl bg-white overflow-hidden transition-shadow hover:shadow-md',
        isBreached ? 'border-2 border-amber-400' : 'border-2 border-slate-100'
      )}
    >
      {isBreached && <div className="h-1 w-full bg-amber-400" />}

      <div className="px-6 pt-5 pb-4">
        {/* Header — clicking title area goes to candidates page */}
        <div className="flex items-start gap-4 mb-5 cursor-pointer group" onClick={toDetail}>
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-base font-bold',
              avatarColor(a.assignedTo.firstName)
            )}
          >
            {initials(`${a.assignedTo.firstName} ${a.assignedTo.lastName}`)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {req.reqCode}
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {REQ_STATUS_LABEL[req.status] ?? req.status}
              </span>
              {req.priority === 'HIGH' && (
                <span className="text-xs font-semibold text-red-800 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                  High
                </span>
              )}
              {req.priority === 'MEDIUM' && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  Medium
                </span>
              )}
              <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {DEPTH_LABEL[a.depth] ?? `D${a.depth}`}
              </span>
              {isBreached && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Breached
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {req.title}
            </h3>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {a.assignedTo.firstName} {a.assignedTo.lastName}
              <span className="font-normal text-slate-500 ml-1.5">({a.assignedTo.role.name})</span>
            </p>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {[req.client?.name, req.businessUnit?.name, req.serviceLine?.name]
                .filter(Boolean)
                .join(' · ')}
              {` · ${req.totalOpenings} opening${req.totalOpenings !== 1 ? 's' : ''}`}
              {a.assignedBy && ` · from ${a.assignedBy.firstName}`}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mt-1.5 group-hover:text-slate-600 transition-colors" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          {/* "in pipeline" button → candidates page, all candidates */}
          <button
            onClick={toDetail}
            className="flex items-center gap-2.5 border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors group/s"
          >
            <Users className="w-4 h-4 text-slate-500 group-hover/s:text-blue-500" />
            <span className="text-2xl font-black text-slate-900 group-hover/s:text-blue-700">
              {stats.total}
            </span>
            <span className="text-sm font-medium text-slate-600 group-hover/s:text-blue-600">
              in pipeline
            </span>
          </button>

          {stats.placed > 0 && (
            <button
              onClick={() => router.push(`/assignments/${a.id}`)}
              className="flex items-center gap-2.5 border-2 border-emerald-300 rounded-xl px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span className="text-2xl font-black text-emerald-800">{stats.placed}</span>
              <span className="text-sm font-medium text-emerald-700">placed</span>
            </button>
          )}
          {stats.submitted > 0 && (
            <div className="flex items-center gap-2.5 border-2 border-slate-200 rounded-xl px-4 py-3 bg-white">
              <span className="text-2xl font-black text-slate-900">{stats.submitted}</span>
              <span className="text-sm font-medium text-slate-600">submitted</span>
            </div>
          )}
          {stats.offered > 0 && (
            <div className="flex items-center gap-2.5 border-2 border-slate-200 rounded-xl px-4 py-3 bg-white">
              <span className="text-2xl font-black text-slate-900">{stats.offered}</span>
              <span className="text-sm font-medium text-slate-600">offered</span>
            </div>
          )}
          {stats.dropped > 0 && (
            <button
              onClick={() => router.push(`/assignments/${a.id}`)}
              className="flex items-center gap-2.5 border-2 border-red-200 rounded-xl px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <span className="text-2xl font-black text-red-700">{stats.dropped}</span>
              <span className="text-sm font-medium text-red-600">dropped</span>
            </button>
          )}
          {stats.agingBuckets.critical > 0 && (
            <div className="flex items-center gap-2.5 border-2 border-amber-300 rounded-xl px-4 py-3 bg-amber-50">
              <Clock className="w-4 h-4 text-amber-700" />
              <span className="text-2xl font-black text-amber-800">
                {stats.agingBuckets.critical}
              </span>
              <span className="text-sm font-medium text-amber-700">stale &gt;14d</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {dl != null && (
              <span
                className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold',
                  dl < 0 ? 'text-red-600' : dl <= 3 ? 'text-amber-700' : 'text-slate-500'
                )}
              >
                <CalendarClock className="w-4 h-4" />
                {dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`}
              </span>
            )}
            <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {age}d old
            </span>
            {hasSubs && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowSubs(v => !v);
                }}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Layers className="w-4 h-4" />
                {a.childAssignments.length} sub{a.childAssignments.length !== 1 ? 's' : ''}
                <ChevronRight
                  className={cn('w-4 h-4 transition-transform', showSubs && 'rotate-90')}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {showSubs && hasSubs && (
        <div className="px-6 pb-5 border-t-2 border-slate-50 pt-4 bg-slate-50/50 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Sub-assignments
          </p>
          {a.childAssignments.map(c => (
            <SubRow key={c.id} child={c} />
          ))}
        </div>
      )}

      {/* Canonical bar — each column navigates to candidates page filtered by that canonical */}
      <CanonicalBar byCanonical={stats.byCanonicalStage} assignmentId={a.id} />
      <PipelineStageChips stages={stats.byPipelineStage} />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-slate-100 bg-white overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-14 w-40 rounded-xl" />
          <Skeleton className="h-14 w-32 rounded-xl" />
        </div>
      </div>
      <div className="border-t-2 border-slate-100 grid grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 py-4">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-6 w-7" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [depth, setDepth] = useState('');
  const [sortBy, setSortBy] = useState('assignedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (depth) p.set('depth', depth);
    p.set('sortBy', sortBy);
    p.set('sortDir', sortDir);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [status, depth, sortBy, sortDir, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', qs],
    queryFn: async () =>
      (await axios.get(`/assignments?${qs}`)).data as {
        success: boolean;
        data: Assignment[];
        meta: { total: number; page: number; limit: number; pages: number };
      },
    placeholderData: prev => prev,
  });

  const assignments = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.pages ?? 0;

  const filtered = useMemo(() => {
    if (!search) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(
      a =>
        a.requirement.title.toLowerCase().includes(q) ||
        a.requirement.reqCode.toLowerCase().includes(q) ||
        `${a.assignedTo.firstName} ${a.assignedTo.lastName}`.toLowerCase().includes(q)
    );
  }, [assignments, search]);

  const totalInPipeline = assignments.reduce((s, a) => s + a.candidateStats.total, 0);
  const totalPlaced = assignments.reduce((s, a) => s + a.candidateStats.placed, 0);
  const breachedCount = assignments.filter(
    a => !!a.breachedAt || a.requirement.isRespondByBreached
  ).length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#EEF2F7]">
      <div className="shrink-0 bg-white border-b-2 border-slate-100">
        <div className="px-8 pt-6 pb-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Assignments</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isLoading ? 'Loading…' : `${total} assignment${total !== 1 ? 's' : ''} in scope`}
                </p>
              </div>
            </div>

            {!isLoading && assignments.length > 0 && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-black text-slate-900">{total}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                    Assignments
                  </p>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div className="text-center">
                  <p className="text-3xl font-black text-blue-600">{totalInPipeline}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                    In pipeline
                  </p>
                </div>
                {totalPlaced > 0 && (
                  <>
                    <div className="w-px h-12 bg-slate-100" />
                    <div className="text-center">
                      <p className="text-3xl font-black text-emerald-700">{totalPlaced}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                        Placed
                      </p>
                    </div>
                  </>
                )}
                {breachedCount > 0 && (
                  <>
                    <div className="w-px h-12 bg-slate-100" />
                    <div className="text-center">
                      <p className="text-3xl font-black text-amber-600">{breachedCount}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                        Breached
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, title, code…"
                className="pl-10 h-10 text-sm border-slate-200 bg-slate-50 focus:bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
              {[
                { v: 'ACTIVE', l: 'Active' },
                { v: 'FILLED', l: 'Filled' },
                { v: 'REMOVED', l: 'Removed' },
                { v: '', l: 'All' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => {
                    setStatus(v);
                    setPage(1);
                  }}
                  className={cn(
                    'text-sm font-semibold px-4 py-2.5 transition-all',
                    status === v
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 bg-white hover:bg-slate-50'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <Select
              value={depth || '_all'}
              onValueChange={v => {
                setDepth(v === '_all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 text-sm w-36 border-2 border-slate-200 rounded-xl bg-white">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All levels</SelectItem>
                <SelectItem value="0">DM (depth 0)</SelectItem>
                <SelectItem value="1">TL (depth 1)</SelectItem>
                <SelectItem value="2">Recruiter (depth 2)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sortBy}_${sortDir}`}
              onValueChange={v => {
                const parts = v.split('_');
                const dir = parts.pop()!;
                setSortBy(parts.join('_'));
                setSortDir(dir);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 text-sm w-40 border-2 border-slate-200 rounded-xl bg-white">
                <SlidersHorizontal className="w-4 h-4 mr-1.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignedAt_desc">Newest first</SelectItem>
                <SelectItem value="assignedAt_asc">Oldest first</SelectItem>
                <SelectItem value="deadline_asc">Deadline soonest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto min-h-0 px-8 py-5">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center">
              <GitBranch className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-700">No assignments found</p>
            <p className="text-sm text-slate-500">
              {search ? 'No matches for your search' : 'Try adjusting filters'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(a => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </div>
        )}

        {totalPages > 1 && !search && (
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-200">
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
