// File: page.tsx
// Path: src/app/(dashboard)/my-assignments/page.tsx

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronRight,
  Briefcase,
  Clock,
  Phone,
  Mail,
  Star,
  AlertTriangle,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  code: string;
  label: string;
  order: number;
  serviceLineId: string | null;
}

interface PipelineStageCount {
  stageId: string;
  code: string;
  label: string;
  order: number;
  count: number;
}

interface Assignment {
  id: string;
  depth?: number;
  allocatedOpenings?: number | null;
  deadline?: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string };
}

interface Requirement {
  id: string;
  slug?: string | null;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  totalOpenings: number;
  filledOpenings: number;
  location: string | null;
  jobType: string;
  remoteType: string;
  respondBy: string | null;
  isRespondByBreached: boolean;
  isTurnaroundBreached: boolean;
  createdAt: string;
  client?: { id: string; name: string } | null;
  businessUnit?: { id: string; name: string } | null;
  serviceLine?: { id: string; name: string } | null;
  assignments?: Assignment[];
  pipelineStageCounts?: PipelineStageCount[];
  _count?: { pipelines: number };
}

interface RequirementsResponse {
  success: boolean;
  data: Requirement[];
  meta: { total: number; page: number; limit: number; pages: number };
}

interface CandidateInPipeline {
  id: string;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  stageUpdatedAt: string;
  aging: { minutes: number; label: string };
  currentStage: { id: string; code: string; label: string; order: number };
  snapshot: {
    fullName: string;
    email: string;
    phone: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    totalExpYears: number | null;
    topSkills: string[];
    resumeUrl: string | null;
  };
  recruiter: { id: string; firstName: string; lastName: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ON_HOLD: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  CLOSED: 'bg-muted text-muted-foreground border-border',
  CANCELLED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-500/10 text-red-600 border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  LOW: 'bg-muted text-muted-foreground border-border',
};

// Big colored numbers — same as requirements page
const STAGE_NUMBER_COLOR: Record<string, string> = {
  '01': 'text-orange-500',
  '02': 'text-violet-600',
  '03': 'text-rose-500',
  '04': 'text-pink-500',
  '05': 'text-cyan-600',
  '06': 'text-teal-600',
  '07': 'text-blue-600',
  '07A': 'text-blue-500',
  '07B': 'text-blue-700',
  '08': 'text-indigo-600',
  '09': 'text-emerald-600',
  '10': 'text-green-600',
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  '01': 'bg-orange-100 text-orange-700',
  '02': 'bg-violet-100 text-violet-700',
  '03': 'bg-rose-100 text-rose-700',
  '04': 'bg-pink-100 text-pink-700',
  '05': 'bg-cyan-100 text-cyan-700',
  '06': 'bg-teal-100 text-teal-700',
  '07': 'bg-blue-100 text-blue-700',
  '07A': 'bg-blue-100 text-blue-600',
  '07B': 'bg-blue-100 text-blue-800',
  '08': 'bg-indigo-100 text-indigo-700',
  '09': 'bg-emerald-100 text-emerald-700',
  '10': 'bg-green-100 text-green-700',
};

const ALL_STATUSES = ['ACTIVE', 'DRAFT', 'PENDING_APPROVAL', 'ON_HOLD', 'CLOSED', 'CANCELLED'];
const ALL_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];
function avatarColor(s: string) {
  return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Candidate Drawer ─────────────────────────────────────────────────────────

function CandidateDrawer({
  open,
  onClose,
  requirementId,
  requirementTitle,
  stageId,
  allStages,
}: {
  open: boolean;
  onClose: () => void;
  requirementId: string;
  requirementTitle: string;
  stageId: string | null;
  allStages: PipelineStage[];
}) {
  const axios = useAxios();
  const router = useRouter();
  const [activeStageId, setActiveStageId] = useState<string | null>(stageId);

  useMemo(() => {
    setActiveStageId(stageId);
  }, [stageId]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (activeStageId) p.set('stageId', activeStageId);
    p.set('limit', '50');
    return p.toString();
  }, [activeStageId]);

  const { data: candidatesRes, isLoading } = useQuery({
    queryKey: ['my-assignment-candidates', requirementId, qs],
    queryFn: async () => {
      const res = await axios.get(`/requirements/${requirementId}/candidates?${qs}`);
      return res.data as { success: boolean; data: CandidateInPipeline[]; meta: { total: number } };
    },
    enabled: open && !!requirementId,
  });

  const candidates = candidatesRes?.data ?? [];
  const total = candidatesRes?.meta?.total ?? 0;
  const activeStage = allStages.find(s => s.id === activeStageId);

  return (
    <Sheet
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-0 border-b border-border shrink-0">
          <SheetTitle className="text-sm font-semibold truncate">{requirementTitle}</SheetTitle>
          <p className="text-[12px] text-muted-foreground pb-3">
            {activeStage ? activeStage.label : 'All Stages'} · {total} candidate
            {total !== 1 ? 's' : ''}
          </p>

          {/* Stage tabs */}
          <div className="flex gap-1 flex-wrap pb-3 -mt-1">
            <button
              onClick={() => setActiveStageId(null)}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${!activeStageId ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              All
            </button>
            {allStages.map(stage => {
              const isActive = activeStageId === stage.id;
              const badgeCls = STAGE_BADGE_COLORS[stage.code] ?? 'bg-slate-100 text-slate-600';
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(prev => (prev === stage.id ? null : stage.id))}
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${isActive ? `${badgeCls} border-current` : 'border-border text-muted-foreground hover:bg-muted'}`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-5 py-4 border-b border-border/60">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Circle size={32} className="mb-3 opacity-20" />
              <p className="text-sm">No candidates in this stage</p>
            </div>
          ) : (
            candidates.map(c => {
              const snap = c.snapshot;
              const badgeCls =
                STAGE_BADGE_COLORS[c.currentStage.code] ?? 'bg-slate-100 text-slate-600';
              const agingColor =
                c.aging.minutes > 43200
                  ? 'text-red-500'
                  : c.aging.minutes > 10080
                    ? 'text-amber-500'
                    : 'text-muted-foreground';

              return (
                <div
                  key={c.id}
                  className={`flex gap-3 px-5 py-4 border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer ${c.isRejected || c.isWithdrawn ? 'opacity-50' : ''}`}
                  onClick={() => {
                    onClose();
                    router.push(`/requirements/${requirementId}?pipelineId=${c.id}`);
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${avatarColor(snap.fullName)}`}
                  >
                    {initials(snap.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold truncate">{snap.fullName}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badgeCls}`}
                        >
                          {c.currentStage.label}
                        </span>
                        {c.isRejected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                            Rejected
                          </span>
                        )}
                        {c.isWithdrawn && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Withdrawn
                          </span>
                        )}
                        {c.isOnHold && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                            On Hold
                          </span>
                        )}
                      </div>
                    </div>
                    {(snap.currentTitle || snap.currentCompany) && (
                      <p className="text-[11px] text-muted-foreground truncate mb-1">
                        {snap.currentTitle}
                        {snap.currentTitle && snap.currentCompany ? ' · ' : ''}
                        {snap.currentCompany}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {snap.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Phone size={10} />
                          {snap.phone}
                        </span>
                      )}
                      {snap.totalExpYears != null && (
                        <span className="text-[11px] text-muted-foreground">
                          {snap.totalExpYears}y exp
                        </span>
                      )}
                    </div>
                    {snap.topSkills?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Star size={10} className="text-muted-foreground/40 shrink-0" />
                        {snap.topSkills.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                        {snap.topSkills.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{snap.topSkills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {c.recruiter.firstName} {c.recruiter.lastName}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-medium ${agingColor}`}
                      >
                        <Clock size={10} />
                        {c.aging.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              onClose();
              router.push(`/requirements/${requirementId}`);
            }}
          >
            Open Full Requirement →
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({
  req,
  allStages,
  onStageClick,
}: {
  req: Requirement;
  allStages: PipelineStage[];
  onStageClick: (req: Requirement, stageId: string | null) => void;
}) {
  const router = useRouter();
  const idOrSlug = req.slug ?? req.id;

  const filled = req.filledOpenings ?? 0;
  const openings = req.totalOpenings ?? 0;
  const fillPct = openings > 0 ? Math.round((filled / openings) * 100) : 0;
  const age = daysSince(req.createdAt);
  const isBreached = req.isRespondByBreached || req.isTurnaroundBreached;

  const totalCandidates =
    req._count?.pipelines ?? (req.pipelineStageCounts ?? []).reduce((s, c) => s + c.count, 0);

  const countMap = Object.fromEntries(
    (req.pipelineStageCounts ?? []).map(s => [s.stageId, s.count])
  );

  const reqServiceLineId = req.serviceLine?.id ?? null;
  const relevantStages = allStages.filter(
    s => s.serviceLineId === null || s.serviceLineId === reqServiceLineId
  );

  // My allocation from depth-0 assignment
  const myAssignment = req.assignments?.find(a => (a.depth ?? 99) === 0) ?? req.assignments?.[0];
  const allocated = myAssignment?.allocatedOpenings ?? null;
  const deadline = myAssignment?.deadline ?? null;
  const deadlineDays = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      className={`flex flex-col border border-border/60 rounded-xl bg-background hover:border-border hover:shadow-sm transition-all ${isBreached ? 'border-l-2 border-l-red-500' : ''}`}
    >
      {/* Top — job info */}
      <div
        className="flex items-start gap-3 px-4 pt-4 pb-3 cursor-pointer"
        onClick={() => router.push(`/requirements/${idOrSlug}`)}
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm mt-0.5">
          {req.serviceLine?.name?.[0] ?? req.title[0]}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-[11px] font-mono text-muted-foreground">{req.reqCode}</span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_COLORS[req.status] ?? ''}`}
            >
              {req.status.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[req.priority] ?? ''}`}
            >
              {req.priority}
            </span>
            {isBreached && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                <AlertTriangle size={10} /> Breached
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-[14px] font-semibold text-foreground truncate">{req.title}</p>

          {/* Meta */}
          <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-muted-foreground mt-0.5">
            {req.client?.name && <span>{req.client.name}</span>}
            {req.businessUnit?.name && (
              <>
                <span className="opacity-30">·</span>
                <span>{req.businessUnit.name}</span>
              </>
            )}
            {req.location && (
              <>
                <span className="opacity-30">·</span>
                <span>{req.location}</span>
              </>
            )}
          </div>
        </div>

        <ChevronRight size={15} className="shrink-0 text-muted-foreground/30 mt-1" />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 px-4 pb-3 text-[12px]">
        {/* Filled progress */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/70 transition-all"
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="font-semibold text-foreground whitespace-nowrap">
            {filled}/{openings}
          </span>
          <span className="text-muted-foreground">filled</span>
        </div>

        <span className="text-border">·</span>

        {/* Pipeline total — clickable */}
        <button
          className="text-primary font-semibold hover:underline"
          onClick={() => onStageClick(req, null)}
        >
          {totalCandidates} in pipeline
        </button>

        <span className="text-border">·</span>

        {/* Age */}
        <span
          className={`font-medium ${age > 30 ? 'text-red-500' : age > 14 ? 'text-amber-500' : 'text-muted-foreground'}`}
        >
          {age}d old
        </span>

        {/* Allocated */}
        {allocated != null && (
          <>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">{allocated} allocated</span>
          </>
        )}

        {/* Deadline */}
        {deadlineDays != null && (
          <>
            <span className="text-border">·</span>
            <span
              className={`font-medium ${deadlineDays < 0 ? 'text-red-500' : deadlineDays <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}
            >
              {deadlineDays < 0 ? `${Math.abs(deadlineDays)}d overdue` : `${deadlineDays}d left`}
            </span>
          </>
        )}
      </div>

      {/* Pipeline stage numbers */}
      {relevantStages.length > 0 && (
        <div className="border-t border-border/60 flex items-center">
          {relevantStages.map((stage, idx) => {
            const count = countMap[stage.id] ?? 0;
            const numberColor = STAGE_NUMBER_COLOR[stage.code] ?? 'text-slate-500';
            return (
              <button
                key={stage.id}
                onClick={() => onStageClick(req, stage.id)}
                className={`flex flex-col items-center justify-center px-4 py-3 flex-1 border-r border-border/60 last:border-r-0 hover:bg-muted/40 transition-colors cursor-pointer ${idx === 0 ? 'rounded-bl-xl' : ''} ${idx === relevantStages.length - 1 ? 'rounded-br-xl' : ''}`}
              >
                <span className={`text-[22px] font-bold tabular-nums leading-none ${numberColor}`}>
                  {count}
                </span>
                <span className="text-[9px] mt-1 font-bold tracking-widest text-slate-400 uppercase whitespace-nowrap">
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl bg-background p-4 space-y-3">
      <div className="flex gap-3">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="flex border-t border-border/60 pt-3 gap-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <Skeleton className="h-6 w-8" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyAssignmentsPage() {
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [drawer, setDrawer] = useState<{
    open: boolean;
    requirementId: string;
    requirementTitle: string;
    stageId: string | null;
  }>({ open: false, requirementId: '', requirementTitle: '', stageId: null });

  function resetPage() {
    setPage(1);
  }

  // Pipeline stages — fetched once
  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const res = await axios.get('/pipeline-stages');
      return (res.data?.data ?? res.data) as PipelineStage[];
    },
    staleTime: 10 * 60 * 1000,
  });
  const allStages = (stagesData ?? []).sort((a, b) => a.order - b.order);

  // Requirements — backend scopes to current user's assignments automatically
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (priority) p.set('priority', priority);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [search, status, priority, page]);

  const { data: reqData, isLoading } = useQuery({
    queryKey: ['my-assignments', qs],
    queryFn: async () => {
      const res = await axios.get(`/requirements?${qs}`);
      return res.data as RequirementsResponse;
    },
    placeholderData: prev => prev,
  });

  const requirements = reqData?.data ?? [];
  const total = reqData?.meta?.total ?? 0;
  const totalPages = reqData?.meta?.pages ?? 0;

  function openDrawer(req: Requirement, stageId: string | null) {
    setDrawer({ open: true, requirementId: req.id, requirementTitle: req.title, stageId });
  }

  // Summary counts from current page
  const totalCandidates = requirements.reduce(
    (s, r) =>
      s + (r._count?.pipelines ?? (r.pipelineStageCounts ?? []).reduce((a, c) => a + c.count, 0)),
    0
  );
  const breachedCount = requirements.filter(
    r => r.isRespondByBreached || r.isTurnaroundBreached
  ).length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-muted/20">
      {/* Header */}
      <div className="shrink-0 bg-background border-b border-border px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">My Assignments</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {isLoading ? '…' : `${total} requirement${total !== 1 ? 's' : ''} assigned to you`}
            </p>
          </div>

          {/* Quick summary pills */}
          {!isLoading && requirements.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                <CheckCircle2 size={13} className="text-primary" />
                <span className="text-[12px] font-medium text-primary">
                  {totalCandidates} candidates
                </span>
              </div>
              {breachedCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle size={13} className="text-red-500" />
                  <span className="text-[12px] font-medium text-red-600">
                    {breachedCount} breached
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar — minimal, no BU/SL/client filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search by title, code…"
              className="pl-7 h-8 text-sm"
            />
          </div>

          <Select
            value={status || '_all'}
            onValueChange={v => {
              setStatus(v === '_all' ? '' : v);
              resetPage();
            }}
          >
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All statuses</SelectItem>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priority || '_all'}
            onValueChange={v => {
              setPriority(v === '_all' ? '' : v);
              resetPage();
            }}
          >
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All priorities</SelectItem>
              {ALL_PRIORITIES.map(p => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Card grid — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : requirements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Briefcase size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No assignments found</p>
            <p className="text-xs mt-1 opacity-60">
              {status === 'ACTIVE'
                ? 'No active requirements assigned to you'
                : 'Try changing the filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {requirements.map(req => (
              <AssignmentCard
                key={req.id}
                req={req}
                allStages={allStages}
                onStageClick={openDrawer}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <span className="text-[13px] text-muted-foreground">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ‹ Prev
              </Button>
              <span className="text-[13px] text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next ›
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Drawer */}
      <CandidateDrawer
        open={drawer.open}
        onClose={() => setDrawer(d => ({ ...d, open: false }))}
        requirementId={drawer.requirementId}
        requirementTitle={drawer.requirementTitle}
        stageId={drawer.stageId}
        allStages={allStages}
      />
    </div>
  );
}
