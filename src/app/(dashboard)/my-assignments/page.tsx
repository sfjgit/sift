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
  Star,
  AlertTriangle,
  CheckCircle2,
  Circle,
  TrendingUp,
  Users,
  Target,
  Filter,
  ArrowUpRight,
  Flame,
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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/25' },
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  PENDING_APPROVAL: {
    label: 'Pending',
    cls: 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25',
  },
  ON_HOLD: { label: 'On Hold', cls: 'bg-orange-500/12 text-orange-700 ring-1 ring-orange-500/25' },
  CLOSED: { label: 'Closed', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-500/12 text-red-700 ring-1 ring-red-500/25' },
};

const PRIORITY_META: Record<string, { cls: string; dot: string }> = {
  HIGH: { cls: 'text-red-600 bg-red-50 ring-1 ring-red-200', dot: 'bg-red-500' },
  MEDIUM: { cls: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  LOW: { cls: 'text-slate-500 bg-slate-50 ring-1 ring-slate-200', dot: 'bg-slate-400' },
};

const STAGE_PALETTE: Record<string, { num: string; bg: string; text: string; bar: string }> = {
  '01': {
    num: 'text-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    bar: 'bg-orange-400',
  },
  '02': {
    num: 'text-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    bar: 'bg-violet-500',
  },
  '03': { num: 'text-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-400' },
  '04': { num: 'text-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', bar: 'bg-pink-400' },
  '05': { num: 'text-cyan-600', bg: 'bg-cyan-50', text: 'text-cyan-700', bar: 'bg-cyan-500' },
  '06': { num: 'text-teal-600', bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500' },
  '07': { num: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  '07A': { num: 'text-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-400' },
  '07B': { num: 'text-blue-700', bg: 'bg-blue-50', text: 'text-blue-800', bar: 'bg-blue-600' },
  '08': {
    num: 'text-indigo-600',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    bar: 'bg-indigo-500',
  },
  '09': {
    num: 'text-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    bar: 'bg-emerald-500',
  },
  '10': { num: 'text-green-600', bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
};

const fallbackPalette = {
  num: 'text-slate-500',
  bg: 'bg-slate-50',
  text: 'text-slate-600',
  bar: 'bg-slate-400',
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
  'from-violet-500 to-violet-700',
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
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
    // eslint-disable-next-line react-hooks/set-state-in-render
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
      <SheetContent
        side="right"
        className="w-[520px] sm:max-w-[520px] p-0 flex flex-col bg-background"
      >
        {/* Drawer Header */}
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0 border-b border-border">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-[15px] font-bold text-foreground truncate leading-snug">
                {requirementTitle}
              </SheetTitle>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {activeStage ? activeStage.label : 'All Stages'} ·{' '}
                <span className="font-semibold text-primary">{total}</span> candidate
                {total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Stage tabs — pill style */}
          <div className="flex gap-1.5 flex-wrap pb-4">
            <button
              onClick={() => setActiveStageId(null)}
              className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all ${
                !activeStageId
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              All
            </button>
            {allStages.map(stage => {
              const pal = STAGE_PALETTE[stage.code] ?? fallbackPalette;
              const isActive = activeStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(prev => (prev === stage.id ? null : stage.id))}
                  className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all ${
                    isActive
                      ? `${pal.bg} ${pal.text} ring-1 ring-current/20`
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
        </SheetHeader>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-6 py-5">
                <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-60" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Circle size={28} className="opacity-30" />
              </div>
              <p className="text-sm font-medium text-foreground">No candidates here</p>
              <p className="text-xs text-muted-foreground mt-1">Try selecting a different stage</p>
            </div>
          ) : (
            candidates.map(c => {
              const snap = c.snapshot;
              const pal = STAGE_PALETTE[c.currentStage.code] ?? fallbackPalette;
              const agingColor =
                c.aging.minutes > 43200
                  ? 'text-red-500'
                  : c.aging.minutes > 10080
                    ? 'text-amber-500'
                    : 'text-muted-foreground';

              return (
                <div
                  key={c.id}
                  className={`flex gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group ${c.isRejected || c.isWithdrawn ? 'opacity-50' : ''}`}
                  onClick={() => {
                    onClose();
                    router.push(`/requirements/${requirementId}?pipelineId=${c.id}`);
                  }}
                >
                  {/* Avatar */}
                  <div
                    className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(snap.fullName)} flex items-center justify-center text-[12px] font-bold text-white shrink-0 shadow-sm`}
                  >
                    {initials(snap.fullName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {snap.fullName}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pal.bg} ${pal.text}`}
                        >
                          {c.currentStage.label}
                        </span>
                        {c.isRejected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">
                            Rejected
                          </span>
                        )}
                        {c.isWithdrawn && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                            Withdrawn
                          </span>
                        )}
                        {c.isOnHold && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">
                            On Hold
                          </span>
                        )}
                      </div>
                    </div>

                    {(snap.currentTitle || snap.currentCompany) && (
                      <p className="text-[12px] text-muted-foreground truncate mb-1.5">
                        {snap.currentTitle}
                        {snap.currentTitle && snap.currentCompany ? ' · ' : ''}
                        {snap.currentCompany}
                        {snap.totalExpYears != null && (
                          <span className="ml-2 font-medium text-foreground/70">
                            {snap.totalExpYears}y exp
                          </span>
                        )}
                      </p>
                    )}

                    {snap.phone && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
                        <Phone size={10} />
                        {snap.phone}
                      </div>
                    )}

                    {snap.topSkills?.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        {snap.topSkills.slice(0, 3).map(s => (
                          <span
                            key={s}
                            className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full font-medium"
                          >
                            {s}
                          </span>
                        ))}
                        {snap.topSkills.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{snap.topSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {c.recruiter.firstName} {c.recruiter.lastName}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-[11px] font-semibold ${agingColor}`}
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

        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30">
          <Button
            className="w-full h-10 text-sm font-semibold"
            onClick={() => {
              onClose();
              router.push(`/requirements/${requirementId}`);
            }}
          >
            Open Full Requirement <ArrowUpRight size={15} className="ml-1.5" />
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

  const myAssignment = req.assignments?.find(a => (a.depth ?? 99) === 0) ?? req.assignments?.[0];
  const allocated = myAssignment?.allocatedOpenings ?? null;
  const deadline = myAssignment?.deadline ?? null;
  const deadlineDays = deadline
    ? // eslint-disable-next-line react-hooks/purity
      Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    : null;

  const statusMeta = STATUS_META[req.status] ?? { label: req.status, cls: '' };
  const priorityMeta = PRIORITY_META[req.priority] ?? { cls: '', dot: 'bg-slate-400' };

  return (
    <div
      className={`flex flex-col rounded-2xl bg-background border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden group ${
        isBreached
          ? 'border-red-200 shadow-sm shadow-red-100'
          : 'border-border/70 hover:border-primary/30'
      }`}
    >
      {/* Breach indicator bar */}
      {isBreached && <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-400" />}

      {/* Card top — clickable to requirement */}
      <div
        className="px-5 pt-5 pb-4 cursor-pointer"
        onClick={() => router.push(`/requirements/${idOrSlug}`)}
      >
        <div className="flex items-start gap-4">
          {/* Service line icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-lg border border-primary/15 group-hover:bg-primary/15 transition-colors">
            {req.serviceLine?.name?.[0] ?? req.title[0]}
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {req.reqCode}
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusMeta.cls}`}
              >
                {statusMeta.label}
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${priorityMeta.cls}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
                {req.priority}
              </span>
              {isBreached && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full ring-1 ring-red-200">
                  <Flame size={10} /> Breached
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-[16px] font-bold text-foreground leading-snug truncate mb-1 group-hover:text-primary transition-colors">
              {req.title}
            </h3>

            {/* Meta line */}
            <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-muted-foreground">
              {req.client?.name && (
                <span className="font-medium text-foreground/70">{req.client.name}</span>
              )}
              {req.businessUnit?.name && (
                <>
                  <span className="opacity-30">·</span>
                  <span>{req.businessUnit.name}</span>
                </>
              )}
              {req.serviceLine?.name && (
                <>
                  <span className="opacity-30">·</span>
                  <span>{req.serviceLine.name}</span>
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

          <ChevronRight
            size={16}
            className="shrink-0 text-muted-foreground/40 mt-1 group-hover:text-primary transition-colors"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-5 pb-4 flex items-center gap-3 text-[12px] flex-wrap">
        {/* Fill progress */}
        <div className="flex items-center gap-2.5 bg-muted/60 rounded-xl px-3 py-2 min-w-[130px]">
          <div className="relative flex-1 h-2 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-emerald-500' : fillPct > 60 ? 'bg-primary' : 'bg-primary/60'}`}
              style={{ width: `${Math.min(fillPct, 100)}%` }}
            />
          </div>
          <span className="font-bold text-foreground whitespace-nowrap">
            {filled}/{openings}
          </span>
          <span className="text-muted-foreground text-[11px]">filled</span>
        </div>

        {/* Pipeline total */}
        <button
          className="flex items-center gap-1.5 bg-primary/8 hover:bg-primary/15 text-primary font-semibold px-3 py-2 rounded-xl transition-colors"
          onClick={() => onStageClick(req, null)}
        >
          <Users size={12} />
          <span>{totalCandidates} in pipeline</span>
        </button>

        {/* Age */}
        <div
          className={`flex items-center gap-1 px-3 py-2 rounded-xl font-semibold ${
            age > 30
              ? 'bg-red-50 text-red-600'
              : age > 14
                ? 'bg-amber-50 text-amber-600'
                : 'bg-muted/60 text-muted-foreground'
          }`}
        >
          <Clock size={11} />
          <span>{age}d old</span>
        </div>

        {/* Allocated */}
        {allocated != null && (
          <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-muted/60 text-muted-foreground font-medium">
            <Target size={11} />
            <span>{allocated} allocated</span>
          </div>
        )}

        {/* Deadline */}
        {deadlineDays != null && (
          <div
            className={`flex items-center gap-1 px-3 py-2 rounded-xl font-semibold ${
              deadlineDays < 0
                ? 'bg-red-50 text-red-600'
                : deadlineDays <= 3
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-muted/60 text-muted-foreground'
            }`}
          >
            <AlertTriangle size={11} />
            <span>
              {deadlineDays < 0 ? `${Math.abs(deadlineDays)}d overdue` : `${deadlineDays}d left`}
            </span>
          </div>
        )}
      </div>

      {/* Pipeline stage strip */}
      {relevantStages.length > 0 && (
        <div
          className="border-t border-border/60 grid"
          style={{ gridTemplateColumns: `repeat(${relevantStages.length}, 1fr)` }}
        >
          {relevantStages.map((stage, idx) => {
            const count = countMap[stage.id] ?? 0;
            const pal = STAGE_PALETTE[stage.code] ?? fallbackPalette;
            const isFirst = idx === 0;
            const isLast = idx === relevantStages.length - 1;

            return (
              <button
                key={stage.id}
                onClick={() => onStageClick(req, stage.id)}
                className={`flex flex-col items-center justify-center px-2 py-3.5 border-r border-border/60 last:border-r-0 hover:${pal.bg} transition-colors relative group/stage ${
                  isFirst ? 'rounded-bl-2xl' : ''
                } ${isLast ? 'rounded-br-2xl' : ''}`}
              >
                {/* count bubble */}
                {count > 0 && (
                  <div
                    className={`absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${pal.bar} flex items-center justify-center`}
                  >
                    <span className="text-[9px] font-bold text-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  </div>
                )}
                <span
                  className={`text-[26px] font-black tabular-nums leading-none ${count > 0 ? pal.num : 'text-border'}`}
                >
                  {count}
                </span>
                <span
                  className={`text-[8px] mt-1 font-bold tracking-widest uppercase whitespace-nowrap ${count > 0 ? pal.text : 'text-muted-foreground/40'}`}
                >
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
    <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
      <div className="border-t border-border/60 grid grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 py-4">
            <Skeleton className="h-7 w-8" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary Stat ─────────────────────────────────────────────────────────────

function StatChip({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  variant?: 'default' | 'primary' | 'warning';
}) {
  const cls = {
    default: 'bg-muted text-muted-foreground border-border',
    primary: 'bg-primary/8 text-primary border-primary/20',
    warning: 'bg-red-50 text-red-600 border-red-200',
  }[variant];

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${cls}`}>
      <Icon size={15} />
      <div className="flex items-baseline gap-1.5">
        <span className="text-[16px] font-black">{value}</span>
        <span className="text-[11px] font-medium opacity-80">{label}</span>
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

  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const res = await axios.get('/pipeline-stages');
      return (res.data?.data ?? res.data) as PipelineStage[];
    },
    staleTime: 10 * 60 * 1000,
  });
  const allStages = (stagesData ?? []).sort((a, b) => a.order - b.order);

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

  const totalCandidates = requirements.reduce(
    (s, r) =>
      s + (r._count?.pipelines ?? (r.pipelineStageCounts ?? []).reduce((a, c) => a + c.count, 0)),
    0
  );
  const breachedCount = requirements.filter(
    r => r.isRespondByBreached || r.isTurnaroundBreached
  ).length;
  const activeCount = requirements.filter(r => r.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-muted/20">
      {/* ── Header ── */}
      <div className="shrink-0 bg-background border-b border-border">
        {/* Top section */}
        <div className="px-7 pt-6 pb-4">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Briefcase size={16} className="text-primary" />
                </div>
                <h1 className="text-[22px] font-black text-foreground tracking-tight">
                  My Assignments
                </h1>
              </div>
              <p className="text-[13px] text-muted-foreground ml-10">
                {isLoading
                  ? 'Loading your assignments…'
                  : `${total} requirement${total !== 1 ? 's' : ''} assigned to you`}
              </p>
            </div>

            {!isLoading && requirements.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <StatChip
                  icon={CheckCircle2}
                  label="active"
                  value={activeCount}
                  variant="primary"
                />
                <StatChip
                  icon={TrendingUp}
                  label="candidates"
                  value={totalCandidates}
                  variant="default"
                />
                {breachedCount > 0 && (
                  <StatChip
                    icon={AlertTriangle}
                    label="breached"
                    value={breachedCount}
                    variant="warning"
                  />
                )}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search by title or code…"
                className="pl-9 h-9 text-[13px] rounded-xl border-border/60 focus:border-primary/50"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
              {['ACTIVE', 'ON_HOLD', 'CLOSED', ''].map(s => {
                const labels: Record<string, string> = {
                  ACTIVE: 'Active',
                  ON_HOLD: 'On Hold',
                  CLOSED: 'Closed',
                  '': 'All',
                };
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setStatus(s);
                      resetPage();
                    }}
                    className={`text-[12px] px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      status === s
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>

            <Select
              value={priority || '_all'}
              onValueChange={v => {
                setPriority(v === '_all' ? '' : v);
                resetPage();
              }}
            >
              <SelectTrigger className="h-9 text-[13px] w-36 rounded-xl border-border/60">
                <Filter size={12} className="mr-1.5 text-muted-foreground" />
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
      </div>

      {/* ── Card grid ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-7 py-5">
        {isLoading ? (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : requirements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-5 shadow-inner">
              <Briefcase size={36} className="text-muted-foreground/30" />
            </div>
            <p className="text-[15px] font-bold text-foreground mb-1">No assignments found</p>
            <p className="text-[13px] text-muted-foreground">
              {status === 'ACTIVE'
                ? 'No active requirements assigned to you'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
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
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-border">
            <span className="text-[13px] text-muted-foreground">
              Showing{' '}
              <span className="font-semibold text-foreground">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold text-foreground">{total}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-[12px] rounded-xl"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </Button>
              <span className="text-[13px] text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-[12px] rounded-xl"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
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
