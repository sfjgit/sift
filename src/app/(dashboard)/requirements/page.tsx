/* eslint-disable react-hooks/set-state-in-render */
/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/page.tsx

'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Briefcase,
  Building2,
  Phone,
  Clock,
  Star,
  MapPin,
  Users,
  Zap,
  PauseCircle,
  XCircle,
  CheckCircle2,
  FileText,
  AlertCircle,
  UserX,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
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
import { Checkbox } from '@/components/ui/checkbox';
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
  remoteType?: string;
  jobType: string;
  createdAt: string;
  serviceLineId?: string | null;
  isRespondByBreached?: boolean;
  isTurnaroundBreached?: boolean;
  client?: { id: string; name: string } | null;
  businessUnit?: { id: string; name: string } | null;
  serviceLine?: { id: string; name: string } | null;
  assignments?: Assignment[];
  pipelineStageCounts?: PipelineStageCount[];
  _count?: { pipelines: number };
}

interface BusinessUnit {
  id: string;
  name: string;
}
interface ServiceLine {
  id: string;
  name: string;
}
interface Client {
  id: string;
  name: string;
  status: string;
}

interface RequirementsResponse {
  success: boolean;
  data: Requirement[];
  meta: { total: number; page: number; limit: number; pages: number };
  permissions?: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
}

interface StatsResponse {
  success: boolean;
  data: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    breached: number;
    recentlyCreated: number;
  };
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

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500 text-white',
  DRAFT: 'bg-slate-400 text-white',
  PENDING_APPROVAL: 'bg-amber-500 text-white',
  ON_HOLD: 'bg-orange-500 text-white',
  CLOSED: 'bg-red-500 text-white',
  CANCELLED: 'bg-gray-500 text-white',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border border-amber-200',
  LOW: 'bg-green-100 text-green-700 border border-green-200',
};

const STAGE_NUMBER_COLOR: Record<string, string> = {
  '01': 'text-orange-500',
  '02': 'text-violet-600',
  '03': 'text-rose-500',
  '04': 'text-pink-500',
  '05': 'text-cyan-600',
  '06': 'text-teal-500',
  '07': 'text-blue-600',
  '07A': 'text-blue-500',
  '07B': 'text-blue-700',
  '08': 'text-indigo-600',
  '09': 'text-emerald-500',
  '10': 'text-green-600',
};

const STAGE_DRAWER_COLORS: Record<string, string> = {
  '01': 'bg-orange-100 text-orange-700 border-orange-200',
  '02': 'bg-violet-100 text-violet-700 border-violet-200',
  '03': 'bg-rose-100 text-rose-700 border-rose-200',
  '04': 'bg-pink-100 text-pink-700 border-pink-200',
  '05': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '06': 'bg-teal-100 text-teal-700 border-teal-200',
  '07': 'bg-blue-100 text-blue-700 border-blue-200',
  '07A': 'bg-blue-100 text-blue-600 border-blue-200',
  '07B': 'bg-blue-100 text-blue-800 border-blue-200',
  '08': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '09': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '10': 'bg-green-100 text-green-700 border-green-200',
};

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
];

const ALL_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

const SIDEBAR_STATUSES = [
  { key: 'ACTIVE', label: 'Active', icon: Zap, color: 'text-emerald-500' },
  { key: 'ON_HOLD', label: 'Hold', icon: PauseCircle, color: 'text-orange-500' },
  { key: 'CLOSED', label: 'Closed', icon: XCircle, color: 'text-red-400' },
  {
    key: 'PENDING_APPROVAL',
    label: 'Pending for Approval',
    icon: CheckCircle2,
    color: 'text-amber-500',
  },
  { key: 'DRAFT', label: 'Draft', icon: FileText, color: 'text-slate-400' },
  { key: 'CANCELLED', label: 'Cancelled', icon: AlertCircle, color: 'text-gray-400' },
  { key: 'CLOSED_BY_OTHERS', label: 'Closed by Others', icon: UserX, color: 'text-slate-400' },
];

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

function avatarColor(s: string) {
  return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];
}

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.response?.status === 403 || err?.response?.status === 401) return null;
    throw err;
  }
}

// ─── Mobile Filter Sheet ──────────────────────────────────────────────────────

function MobileFilterSheet({
  open,
  onClose,
  status,
  setStatus,
  selectedBuId,
  setSelectedBuId,
  serviceLineId,
  setServiceLineId,
  selectedClientId,
  setSelectedClientId,
  resetPage,
  byStatus,
  busData,
  slData,
  clientsData,
  busLoading,
  slLoading,
  clientsLoading,
  totalJobs,
}: {
  open: boolean;
  onClose: () => void;
  status: string;
  setStatus: (v: string) => void;
  selectedBuId: string;
  setSelectedBuId: (v: string) => void;
  serviceLineId: string;
  setServiceLineId: (v: string) => void;
  selectedClientId: string;
  setSelectedClientId: (v: string) => void;
  resetPage: () => void;
  byStatus: Record<string, number>;
  busData: BusinessUnit[] | null | undefined;
  slData: ServiceLine[] | null | undefined;
  clientsData: Client[] | null | undefined;
  busLoading: boolean;
  slLoading: boolean;
  clientsLoading: boolean;
  totalJobs: number;
}) {
  const activeFiltersCount = [status, selectedBuId, serviceLineId, selectedClientId].filter(
    Boolean
  ).length;

  return (
    <Sheet
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold">Filters</SheetTitle>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setStatus('');
                    setSelectedBuId('');
                    setServiceLineId('');
                    setSelectedClientId('');
                    resetPage();
                  }}
                  className="text-[11px] text-red-500 font-medium hover:underline"
                >
                  Clear all
                </button>
              )}
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalJobs}
              </span>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {/* Status */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1">
            Status
          </p>
          {SIDEBAR_STATUSES.map(s => {
            const count = byStatus[s.key] ?? 0;
            const isActive = status === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  setStatus(p => (p === s.key ? '' : s.key));
                  resetPage();
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span className="flex items-center gap-2">
                  <s.icon size={14} className={isActive ? 'text-primary' : s.color} />
                  {s.label}
                </span>
                {count > 0 && (
                  <span
                    className={`text-[12px] font-bold ${isActive ? 'text-primary' : 'text-slate-400'}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {busData && busData.length > 0 && (
            <>
              <div className="h-px bg-slate-100 my-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1 flex items-center gap-1.5">
                <Building2 size={10} /> Business Units
              </p>
              <button
                onClick={() => {
                  setSelectedBuId('');
                  resetPage();
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${!selectedBuId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
              >
                All BUs
              </button>
              {busLoading ? (
                <div className="space-y-1">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-7 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                (busData ?? []).map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedBuId(item.id === selectedBuId ? '' : item.id);
                      resetPage();
                      onClose();
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors truncate ${selectedBuId === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
                  >
                    {item.name}
                  </button>
                ))
              )}
            </>
          )}

          {slData && slData.length > 0 && (
            <>
              <div className="h-px bg-slate-100 my-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1 flex items-center gap-1.5">
                <Briefcase size={10} /> Service Lines
              </p>
              <button
                onClick={() => {
                  setServiceLineId('');
                  resetPage();
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${!serviceLineId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
              >
                All Service Lines
              </button>
              {slLoading ? (
                <div className="space-y-1">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-7 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                (slData ?? []).map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setServiceLineId(item.id === serviceLineId ? '' : item.id);
                      resetPage();
                      onClose();
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors truncate ${serviceLineId === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
                  >
                    {item.name}
                  </button>
                ))
              )}
            </>
          )}

          {clientsData && clientsData.length > 0 && (
            <>
              <div className="h-px bg-slate-100 my-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1 flex items-center gap-1.5">
                <Briefcase size={10} /> Clients
              </p>
              <button
                onClick={() => {
                  setSelectedClientId('');
                  resetPage();
                  onClose();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${!selectedClientId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
              >
                All Clients
              </button>
              {clientsLoading ? (
                <div className="space-y-1">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-7 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                (clientsData ?? []).map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedClientId(item.id === selectedClientId ? '' : item.id);
                      resetPage();
                      onClose();
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors truncate ${selectedClientId === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
                  >
                    {item.name}
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
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

  const { data: res, isLoading } = useQuery({
    queryKey: ['drawer-candidates', requirementId, qs],
    queryFn: async () =>
      (await axios.get(`/requirements/${requirementId}/candidates?${qs}`)).data as {
        success: boolean;
        data: CandidateInPipeline[];
        meta: { total: number };
      },
    enabled: open && !!requirementId,
  });

  const candidates = res?.data ?? [];
  const total = res?.meta?.total ?? 0;
  const activeStage = allStages.find(s => s.id === activeStageId);

  return (
    <Sheet
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:w-[500px] sm:max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-0 border-b border-border shrink-0">
          <SheetTitle className="text-sm font-semibold truncate">{requirementTitle}</SheetTitle>
          <p className="text-[12px] text-muted-foreground pb-2 mt-0.5">
            {activeStage ? activeStage.label : 'All Stages'} · {total} candidate
            {total !== 1 ? 's' : ''}
          </p>
          {/* Stage tabs — horizontal scroll on mobile */}
          <div className="flex gap-1 flex-nowrap overflow-x-auto pb-3 scrollbar-none -mx-1 px-1">
            <button
              onClick={() => setActiveStageId(null)}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors whitespace-nowrap shrink-0 ${!activeStageId ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              All
            </button>
            {allStages.map(stage => {
              const isActive = activeStageId === stage.id;
              const cls =
                STAGE_DRAWER_COLORS[stage.code] ?? 'bg-slate-100 text-slate-600 border-slate-200';
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(p => (p === stage.id ? null : stage.id))}
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors whitespace-nowrap shrink-0 ${isActive ? cls : 'border-border text-muted-foreground hover:bg-muted'}`}
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
              <p className="text-sm">No candidates in this stage</p>
            </div>
          ) : (
            candidates.map(c => {
              const snap = c.snapshot;
              const stageCls =
                STAGE_DRAWER_COLORS[c.currentStage.code] ??
                'bg-slate-100 text-slate-600 border-slate-200';
              const agingColor =
                c.aging.minutes > 43200
                  ? 'text-red-500'
                  : c.aging.minutes > 10080
                    ? 'text-amber-500'
                    : 'text-muted-foreground';
              return (
                <div
                  key={c.id}
                  className={`flex gap-3 px-5 py-4 border-b border-border/60 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer ${c.isRejected || c.isWithdrawn ? 'opacity-50' : ''}`}
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
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${stageCls}`}
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

// ─── Sidebar Section ──────────────────────────────────────────────────────────

function SidebarSection({
  label,
  icon: Icon,
  loading,
  items,
  selectedId,
  onSelect,
  allLabel,
  hidden,
}: {
  label: string;
  icon: React.ElementType;
  loading: boolean;
  items: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  allLabel: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 px-2 flex items-center gap-1.5">
        <Icon size={10} /> {label}
      </p>
      {loading ? (
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-7 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          <button
            onClick={() => onSelect('')}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${!selectedId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
          >
            {allLabel}
          </button>
          {items?.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id === selectedId ? '' : item.id)}
              title={item.name}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors truncate ${selectedId === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Requirement Card — Responsive ───────────────────────────────────────────

function RequirementCard({
  req,
  selected,
  onSelect,
  allStages,
  onStageClick,
}: {
  req: Requirement;
  selected: boolean;
  onSelect: (id: string) => void;
  allStages: PipelineStage[];
  onStageClick: (req: Requirement, stageId: string, stageLabel: string) => void;
}) {
  const router = useRouter();
  const [stagesExpanded, setStagesExpanded] = useState(false);
  const idOrSlug = req.slug ?? req.id;
  const age = daysSince(req.createdAt);
  const isBreached = req.isRespondByBreached || req.isTurnaroundBreached;

  const countMap = Object.fromEntries(
    (req.pipelineStageCounts ?? []).map(s => [s.stageId, s.count])
  );
  const reqServiceLineId = req.serviceLine?.id ?? req.serviceLineId ?? null;
  const relevantStages = allStages.filter(
    s => s.serviceLineId === null || s.serviceLineId === reqServiceLineId
  );

  const totalPipeline =
    req._count?.pipelines ?? (req.pipelineStageCounts ?? []).reduce((s, c) => s + c.count, 0);
  const openings = req.totalOpenings ?? 0;

  const assignees = (req.assignments ?? [])
    .filter((a, i, arr) => arr.findIndex(x => x.assignedTo?.id === a.assignedTo?.id) === i)
    .slice(0, 5);

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md hover:border-slate-300 ${selected ? 'border-primary/40 bg-primary/[0.02]' : 'border-slate-200'} ${isBreached ? 'border-l-4 border-l-red-500' : ''}`}
    >
      {/* ── Desktop layout: side-by-side ── */}
      <div className="hidden md:flex">
        {/* LEFT — job info */}
        <div
          className="flex-1 min-w-0 p-4 cursor-pointer"
          onClick={() => router.push(`/requirements/${idOrSlug}`)}
        >
          {/* Top row */}
          <div className="flex items-start gap-2 mb-2">
            <div
              onClick={e => {
                e.stopPropagation();
                onSelect(req.id);
              }}
              className="mt-0.5 shrink-0"
            >
              <Checkbox checked={selected} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-[11px] font-mono text-slate-400">ID {req.reqCode}</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[req.status] ?? 'bg-slate-400 text-white'}`}
                >
                  {STATUS_LABEL[req.status] ?? req.status}
                </span>
                {req.priority && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[req.priority] ?? ''}`}
                  >
                    {req.priority}
                  </span>
                )}
                {isBreached && (
                  <span className="text-[10px] font-semibold text-red-500 flex items-center gap-0.5">
                    ⚠ Breached
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 leading-tight mb-1 truncate">
                {req.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-500 mb-2">
                {req.businessUnit?.name && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-blue-400 inline-block shrink-0" />
                    {req.businessUnit.name}
                  </span>
                )}
                {req.serviceLine?.name && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-violet-400 inline-block shrink-0" />
                    {req.serviceLine.name}
                  </span>
                )}
                {req.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="shrink-0" />
                    {req.location}
                    {req.remoteType &&
                      ` (${req.remoteType.charAt(0) + req.remoteType.slice(1).toLowerCase()})`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} className="shrink-0" />
                  {openings} Position{openings !== 1 ? 's' : ''}
                </span>
                {totalPipeline > 0 && (
                  <span className="text-emerald-600 font-medium">{totalPipeline} applicants</span>
                )}
              </div>
              {req.assignments?.slice(0, 2).map(
                (a, i) =>
                  a.assignedTo && (
                    <div
                      key={a.id}
                      className={`flex items-center gap-1.5 text-[11px] mb-0.5 ${i === 0 ? 'text-amber-600' : 'text-slate-400'}`}
                    >
                      <span>{i === 0 ? '●' : '◎'}</span>
                      <span>
                        SFJ-{req.reqCode}|{a.assignedTo.firstName} {a.assignedTo.lastName}
                      </span>
                    </div>
                  )
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 ml-6">
            <div className="flex -space-x-1.5">
              {assignees.map(
                a =>
                  a.assignedTo && (
                    <div
                      key={a.id}
                      className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${avatarColor(a.assignedTo.id)}`}
                      title={`${a.assignedTo.firstName} ${a.assignedTo.lastName}`}
                    >
                      {initials(`${a.assignedTo.firstName} ${a.assignedTo.lastName}`)}
                    </div>
                  )
              )}
              {(req.assignments?.length ?? 0) > 5 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                  +{(req.assignments?.length ?? 0) - 5}
                </div>
              )}
            </div>
            <span
              className={`text-[11px] font-medium ${age > 30 ? 'text-red-500' : age > 14 ? 'text-amber-500' : 'text-slate-400'}`}
            >
              {age}d ago
            </span>
          </div>
        </div>

        {/* RIGHT — pipeline stage counts */}
        <div className="flex border-l border-slate-100 w-[55%] shrink-0">
          {relevantStages.length > 0 ? (
            relevantStages.map(stage => {
              const count = countMap[stage.id] ?? 0;
              const color = STAGE_NUMBER_COLOR[stage.code] ?? 'text-slate-400';
              return (
                <button
                  key={stage.id}
                  onClick={() => onStageClick(req, stage.id, stage.label)}
                  className="flex flex-col items-center justify-center flex-1 py-4 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 transition-colors min-w-0"
                >
                  <span className={`text-[28px] font-bold tabular-nums leading-none ${color}`}>
                    {count}
                  </span>
                  <span className="text-[9px] mt-1.5 font-bold tracking-wider text-slate-400 uppercase text-center leading-tight px-1 line-clamp-2">
                    {stage.label}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center px-8 py-4 text-slate-300 text-sm">
              Loading…
            </div>
          )}
          {/* Action icons */}
          <div className="flex flex-col items-center justify-center gap-1 px-2 border-l border-slate-100">
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Share"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
            <button
              onClick={() => router.push(`/requirements/${idOrSlug}`)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="More"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile layout: stacked ── */}
      <div className="md:hidden">
        {/* Mobile top: checkbox + badges + title */}
        <div className="p-3.5">
          <div className="flex items-start gap-2.5 mb-2">
            <div
              onClick={e => {
                e.stopPropagation();
                onSelect(req.id);
              }}
              className="mt-0.5 shrink-0"
            >
              <Checkbox checked={selected} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-[10px] font-mono text-slate-400">ID {req.reqCode}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[req.status] ?? 'bg-slate-400 text-white'}`}
                >
                  {STATUS_LABEL[req.status] ?? req.status}
                </span>
                {req.priority && (
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[req.priority] ?? ''}`}
                  >
                    {req.priority}
                  </span>
                )}
                {isBreached && (
                  <span className="text-[9px] font-semibold text-red-500">⚠ Breached</span>
                )}
              </div>
              <h3
                className="text-[14px] font-bold text-slate-900 leading-snug mb-1.5 cursor-pointer"
                onClick={() => router.push(`/requirements/${idOrSlug}`)}
              >
                {req.title}
              </h3>
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500">
                {req.businessUnit?.name && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-sm bg-blue-400 inline-block shrink-0" />
                    {req.businessUnit.name}
                  </span>
                )}
                {req.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={10} className="shrink-0" />
                    {req.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={10} className="shrink-0" />
                  {openings} pos
                </span>
                {totalPipeline > 0 && (
                  <span className="text-emerald-600 font-medium">{totalPipeline} applicants</span>
                )}
              </div>
            </div>
            {/* Age + actions */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-medium ${age > 30 ? 'text-red-500' : age > 14 ? 'text-amber-500' : 'text-slate-400'}`}
              >
                {age}d ago
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => router.push(`/requirements/${idOrSlug}`)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Assignee avatars */}
          {assignees.length > 0 && (
            <div className="flex -space-x-1 ml-6">
              {assignees.map(
                a =>
                  a.assignedTo && (
                    <div
                      key={a.id}
                      className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white ${avatarColor(a.assignedTo.id)}`}
                      title={`${a.assignedTo.firstName} ${a.assignedTo.lastName}`}
                    >
                      {initials(`${a.assignedTo.firstName} ${a.assignedTo.lastName}`)}
                    </div>
                  )
              )}
            </div>
          )}
        </div>

        {/* Mobile pipeline stages — horizontal scroll strip */}
        {relevantStages.length > 0 && (
          <div className="border-t border-slate-100">
            <button
              onClick={() => setStagesExpanded(p => !p)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                Pipeline Stages
                {totalPipeline > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {totalPipeline}
                  </span>
                )}
              </span>
              {stagesExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {stagesExpanded && (
              <div className="overflow-x-auto scrollbar-none border-t border-slate-100">
                <div className="flex min-w-max">
                  {relevantStages.map(stage => {
                    const count = countMap[stage.id] ?? 0;
                    const color = STAGE_NUMBER_COLOR[stage.code] ?? 'text-slate-400';
                    return (
                      <button
                        key={stage.id}
                        onClick={() => onStageClick(req, stage.id, stage.label)}
                        className="flex flex-col items-center justify-center py-3 px-4 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 active:bg-slate-100 transition-colors min-w-[72px]"
                      >
                        <span
                          className={`text-[22px] font-bold tabular-nums leading-none ${color}`}
                        >
                          {count}
                        </span>
                        <span className="text-[8px] mt-1 font-bold tracking-wider text-slate-400 uppercase text-center leading-tight w-16 line-clamp-2">
                          {stage.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex-1 p-4 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="h-3 w-48 max-w-full" />
        <Skeleton className="h-3 w-40 max-w-full" />
      </div>
      <div className="hidden md:flex border-l border-slate-100 w-[55%] shrink-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center flex-1 py-4 border-r border-slate-100 last:border-r-0 gap-1.5 min-w-0"
          >
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequirementsPage() {
  const axios = useAxios();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [serviceLineId, setServiceLineId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBuId, setSelectedBuId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [drawer, setDrawer] = useState<{
    open: boolean;
    requirementId: string;
    requirementTitle: string;
    stageId: string | null;
    stageLabel: string;
  }>({ open: false, requirementId: '', requirementTitle: '', stageId: null, stageLabel: '' });

  function resetPage() {
    setPage(1);
  }

  const activeFiltersCount = [status, selectedBuId, serviceLineId, selectedClientId].filter(
    Boolean
  ).length;

  // ── Pipeline stages
  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () =>
      (await axios.get('/pipeline-stages')).data?.data ?? ([] as PipelineStage[]),
    staleTime: 10 * 60 * 1000,
  });
  const allStages = ((stagesData as PipelineStage[]) ?? []).sort((a, b) => a.order - b.order);

  // ── Stats
  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ['requirement-stats'],
    queryFn: async () => (await axios.get('/requirements/stats')).data,
    staleTime: 30_000,
  });
  const byStatus = statsData?.data?.byStatus ?? {};
  const totalJobs = Object.values(byStatus).reduce((s, n) => s + n, 0);

  // ── Sidebar data
  const { data: busData, isLoading: busLoading } = useQuery({
    queryKey: ['business-units'],
    queryFn: () =>
      safeFetch(
        async () => (await axios.get('/business-units?limit=100')).data?.data as BusinessUnit[]
      ),
    staleTime: 5 * 60 * 1000,
  });
  const { data: slData, isLoading: slLoading } = useQuery({
    queryKey: ['service-lines'],
    queryFn: () =>
      safeFetch(async () => (await axios.get('/service-lines')).data?.data as ServiceLine[]),
    staleTime: 5 * 60 * 1000,
  });
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-sidebar'],
    queryFn: () =>
      safeFetch(
        async () => (await axios.get('/clients?status=ACTIVE&limit=100')).data?.data as Client[]
      ),
    staleTime: 5 * 60 * 1000,
  });

  // ── Requirements
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (priority) p.set('priority', priority);
    if (serviceLineId) p.set('serviceLineId', serviceLineId);
    if (selectedClientId) p.set('clientId', selectedClientId);
    if (selectedBuId) p.set('buId', selectedBuId);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [search, status, priority, serviceLineId, selectedClientId, selectedBuId, page, limit]);

  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['requirements', qs],
    queryFn: async () => (await axios.get(`/requirements?${qs}`)).data as RequirementsResponse,
    placeholderData: prev => prev,
  });

  const requirements = reqData?.data ?? [];
  const total = reqData?.meta?.total ?? 0;
  const totalPages = reqData?.meta?.pages ?? 0;
  const canAdd = reqData?.permissions?.canAdd ?? false;

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (selectedIds.size === requirements.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(requirements.map(r => r.id)));
  }
  function openDrawer(req: Requirement, stageId: string, stageLabel: string) {
    setDrawer({
      open: true,
      requirementId: req.id,
      requirementTitle: req.title,
      stageId: stageId || null,
      stageLabel,
    });
  }

  const hasSidebar = busData !== null || slData !== null || clientsData !== null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* ── Desktop Sidebar ───────────────────────────────────────────────── */}
      {hasSidebar && (
        <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white h-full overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Jobs</h2>
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalJobs}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {SIDEBAR_STATUSES.map(s => {
              const count = byStatus[s.key] ?? 0;
              const isActive = status === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    setStatus(p => (p === s.key ? '' : s.key));
                    resetPage();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <span className="flex items-center gap-2">
                    <s.icon size={14} className={isActive ? 'text-primary' : s.color} />
                    {s.label}
                  </span>
                  <span
                    className={`text-[12px] font-bold ${isActive ? 'text-primary' : 'text-slate-400'}`}
                  >
                    {count > 0 ? `${count}` : ''}
                  </span>
                </button>
              );
            })}

            <div className="h-px bg-slate-100 my-2" />

            <SidebarSection
              label="Business Units"
              icon={Building2}
              loading={busLoading}
              items={busData ?? []}
              selectedId={selectedBuId}
              allLabel="All BUs"
              onSelect={id => {
                setSelectedBuId(id);
                resetPage();
              }}
              hidden={busData === null}
            />

            {busData !== null && slData !== null && <div className="h-px bg-slate-100 my-2" />}

            <SidebarSection
              label="Service Lines"
              icon={Briefcase}
              loading={slLoading}
              items={slData ?? []}
              selectedId={serviceLineId}
              allLabel="All Service Lines"
              onSelect={id => {
                setServiceLineId(id);
                resetPage();
              }}
              hidden={slData === null}
            />

            {slData !== null && clientsData !== null && <div className="h-px bg-slate-100 my-2" />}

            <SidebarSection
              label="Clients"
              icon={Briefcase}
              loading={clientsLoading}
              items={clientsData ?? []}
              selectedId={selectedClientId}
              allLabel="All Clients"
              onSelect={id => {
                setSelectedClientId(id);
                resetPage();
              }}
              hidden={clientsData === null}
            />
          </div>
        </aside>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── Desktop Toolbar ── */}
        <div className="hidden md:flex items-center gap-2 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={requirements.length > 0 && selectedIds.size === requirements.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-[13px] text-slate-500 font-medium">
              {reqLoading ? '…' : `Total ${total} Found`}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search requirements…"
                className="pl-7 h-8 text-sm w-56"
              />
            </div>
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
                <SelectItem value="_all">All Team</SelectItem>
                {ALL_PRIORITIES.map(p => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={`${page}:recent`} onValueChange={() => {}}>
              <SelectTrigger className="h-8 text-sm w-44">
                <span className="text-slate-600">Sort By : Recent Activity</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:recent">Recent Activity</SelectItem>
                <SelectItem value="1:created">Date Created</SelectItem>
              </SelectContent>
            </Select>
            {canAdd && (
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/requirements/new')}
              >
                <Plus size={14} /> Add New Job
              </Button>
            )}
          </div>
        </div>

        {/* ── Mobile Toolbar ── */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2.5 bg-white border-b border-slate-200 shrink-0">
          {/* Filter button */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors shrink-0"
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Search */}
          {mobileSearchOpen ? (
            <div className="flex-1 relative flex items-center gap-1">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                autoFocus
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search requirements…"
                className="pl-7 h-8 text-sm flex-1"
              />
              <button
                onClick={() => {
                  setMobileSearchOpen(false);
                  setSearch('');
                  resetPage();
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <Search size={14} />
            </button>
          )}

          {/* Count */}
          {!mobileSearchOpen && (
            <span className="text-[12px] text-slate-500 font-medium ml-auto shrink-0">
              {reqLoading ? '…' : `${total} jobs`}
            </span>
          )}

          {/* Active status chip */}
          {status && !mobileSearchOpen && (
            <button
              onClick={() => {
                setStatus('');
                resetPage();
              }}
              className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-medium shrink-0"
            >
              {STATUS_LABEL[status] ?? status}
              <X size={10} />
            </button>
          )}

          {/* Add button */}
          {canAdd && !mobileSearchOpen && (
            <Button
              size="sm"
              className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 shrink-0"
              onClick={() => router.push('/requirements/new')}
            >
              <Plus size={14} />
            </Button>
          )}
        </div>

        {/* Cards — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 px-3 md:px-5 py-3 md:py-4 space-y-2.5 md:space-y-3">
          {reqLoading ? (
            Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
          ) : requirements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Briefcase size={40} className="mb-3 opacity-20" />
              <p className="text-sm">No requirements found</p>
            </div>
          ) : (
            requirements.map(req => (
              <RequirementCard
                key={req.id}
                req={req}
                selected={selectedIds.has(req.id)}
                onSelect={toggleSelect}
                allStages={allStages}
                onStageClick={openDrawer}
              />
            ))
          )}
        </div>

        {/* ── Pagination bar ── */}
        <div className="shrink-0 flex items-center justify-between px-3 md:px-5 py-2 md:py-2.5 bg-white border-t border-slate-200">
          {/* Items per page — hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-2 text-[13px] text-slate-500">
            <span>Items per page:</span>
            <Select
              value={String(limit)}
              onValueChange={v => {
                setLimit(Number(v));
                resetPage();
              }}
            >
              <SelectTrigger className="h-7 w-20 text-xs border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 text-[12px] md:text-[13px] text-slate-500 ml-auto">
            <span className="mr-1.5">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}
            </span>
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30 text-xs"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30 text-xs"
            >
              ‹
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30 text-xs"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30 text-xs"
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Sheet ── */}
      <MobileFilterSheet
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        status={status}
        setStatus={setStatus}
        selectedBuId={selectedBuId}
        setSelectedBuId={setSelectedBuId}
        serviceLineId={serviceLineId}
        setServiceLineId={setServiceLineId}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        resetPage={resetPage}
        byStatus={byStatus}
        busData={busData}
        slData={slData}
        clientsData={clientsData}
        busLoading={busLoading}
        slLoading={slLoading}
        clientsLoading={clientsLoading}
        totalJobs={totalJobs}
      />

      {/* ── Candidate Drawer ── */}
      <CandidateDrawer
        open={drawer.open}
        onClose={() => setDrawer(d => ({ ...d, open: false }))}
        requirementId={drawer.requirementId}
        requirementTitle={drawer.requirementTitle}
        stageId={drawer.stageId}
        // @ts-expect-error err
        stageLabel={drawer.stageLabel}
        allStages={allStages}
      />
    </div>
  );
}
