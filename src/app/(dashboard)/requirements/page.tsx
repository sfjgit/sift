/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/page.tsx

'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  X,
  ChevronDown,
  ChevronUp,
  Download,
  LayoutList,
  Table2,
  UserCheck,
  UsersRound,
  Network,
  ChevronRight,
  UserPlus,
  Trash2,
  Pencil,
  RefreshCw,
  Calendar,
  TrendingUp,
  BadgeDollarSign,
  AlertTriangle,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAxios } from '@/hooks/useAxios';
import { canonicalDot, useCandidateMeta } from '@/hooks/useCandidateMeta';
import { isReasonRequired, RequirementStatus, STATUS_FLOW } from '@/components/requirements/types';

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
  canonicalStage: string | null;
  count: number;
}
interface Assignment {
  id: string;
  depth?: number;
  status?: string;
  allocatedOpenings?: number | null;
  assignedTo?: { id: string; firstName: string; lastName: string; role?: { name: string } };
  assignedBy?: { id: string; firstName: string; lastName: string };
}
interface Band {
  id: string;
  code: string;
  name?: string | null;
  rangeFrom?: number | null;
  rangeTo?: number | null;
  value?: number | null;
}
interface Requirement {
  id: string;
  slug?: string | null;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  jobOpenFor?: string;
  totalOpenings: number;
  city: string | null;
  state: string | null;
  country: string | null;
  remoteType?: string;
  jobType: string;
  createdAt: string;
  serviceLineId?: string | null;
  isRespondByBreached?: boolean;
  isTurnaroundBreached?: boolean;
  closureReason?: string | null;
  jdParseStatus?: string | null;
  // Sale value fields
  saleValue?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: string | null;
  salaryCurrency?: string | null;
  computedSaleValue?: number | null;
  saleValueBasis?: 'SALE_VALUE' | 'BAND_PERCENTAGE' | 'SALARY_AVG' | null;
  // Band
  bandId?: string | null;
  band?: Band | null;
  // Client
  client?: {
    id: string;
    name: string;
    agreementType?: string | null;
    percentageValue?: number | null;
  } | null;
  businessUnit?: { id: string; name: string } | null;
  serviceLine?: { id: string; name: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  assignments?: Assignment[];
  pipelineStageCounts?: PipelineStageCount[];
  canonicalStageCounts?: Record<string, number>;
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
interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface SaleValueSummary {
  totalSaleValue: number;
  omittedCount: number;
  includedCount: number;
}
interface RequirementsResponse {
  success: boolean;
  data: Requirement[];
  meta: { total: number; page: number; limit: number; pages: number };
  permissions?: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
  scope?: { createdByScope: string; canViewScope: string; isSuperAdmin?: boolean };
  saleValueSummary?: SaleValueSummary;
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
const ALL_STATUSES = [
  { key: 'ACTIVE', label: 'Active', icon: Zap, dot: 'bg-emerald-500' },
  { key: 'ON_HOLD', label: 'On Hold', icon: PauseCircle, dot: 'bg-orange-500' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', icon: CheckCircle2, dot: 'bg-amber-500' },
  { key: 'DRAFT', label: 'Draft', icon: FileText, dot: 'bg-slate-400' },
  { key: 'CLOSED', label: 'Closed', icon: XCircle, dot: 'bg-red-400' },
  { key: 'CANCELLED', label: 'Cancelled', icon: AlertCircle, dot: 'bg-gray-400' },
];
const SCOPE_OPTIONS = [
  { value: 'OWN', label: 'Mine', icon: UserCheck },
  { value: 'TEAM', label: 'My Team', icon: UsersRound },
  { value: 'REPORTING', label: 'Reporting Line', icon: Network },
] as const;
const DEPTH_LABEL: Record<number, { label: string; cls: string }> = {
  0: { label: 'DM', cls: 'bg-blue-100 text-blue-700' },
  1: { label: 'TL', cls: 'bg-violet-100 text-violet-700' },
  2: { label: 'Rec', cls: 'bg-emerald-100 text-emerald-700' },
};
const SALE_BASIS_LABEL: Record<string, { label: string; cls: string }> = {
  SALE_VALUE: { label: 'Direct', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BAND_PERCENTAGE: { label: 'Band %', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  SALARY_AVG: { label: 'Salary Avg', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

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
function fmtCurrency(n: number | null | undefined, currency = 'INR'): string {
  if (n == null) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function canonicalPillFromDot(dotCls: string): string {
  const map: Record<string, string> = {
    'bg-slate-500': 'bg-slate-100 text-slate-700',
    'bg-blue-600': 'bg-blue-50 text-blue-700',
    'bg-violet-600': 'bg-violet-50 text-violet-700',
    'bg-amber-600': 'bg-amber-50 text-amber-700',
    'bg-orange-600': 'bg-orange-50 text-orange-700',
    'bg-emerald-700': 'bg-emerald-50 text-emerald-700',
    'bg-green-700': 'bg-green-50 text-green-700',
    'bg-red-600': 'bg-red-50 text-red-600',
    'bg-pink-500': 'bg-pink-50 text-pink-700',
    'bg-cyan-500': 'bg-cyan-50 text-cyan-700',
    'bg-indigo-600': 'bg-indigo-50 text-indigo-700',
    'bg-teal-500': 'bg-teal-50 text-teal-700',
    'bg-rose-600': 'bg-rose-50 text-rose-600',
  };
  return map[dotCls] ?? 'bg-slate-100 text-slate-600';
}

// ─── SaleValueBadge ───────────────────────────────────────────────────────────

function SaleValueBadge({
  computedSaleValue,
  saleValueBasis,
  compact = false,
}: {
  computedSaleValue: number | null | undefined;
  saleValueBasis: string | null | undefined;
  compact?: boolean;
}) {
  if (computedSaleValue == null) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-slate-300 italic">
        {!compact && <AlertTriangle size={10} className="text-slate-300" />}
        N/A
      </span>
    );
  }
  const basis = saleValueBasis ? SALE_BASIS_LABEL[saleValueBasis] : null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] font-bold text-emerald-700 tabular-nums leading-none">
        {fmtCurrency(computedSaleValue)}
      </span>
      {basis && !compact && (
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border w-fit ${basis.cls}`}
        >
          {basis.label}
        </span>
      )}
    </div>
  );
}

// ─── SaleValueSummaryBar ──────────────────────────────────────────────────────

function SaleValueSummaryBar({ summary }: { summary: SaleValueSummary | undefined }) {
  if (!summary) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex-wrap">
      <div className="flex items-center gap-1.5">
        <TrendingUp size={13} className="text-emerald-600 shrink-0" />
        <span className="text-[12px] font-semibold text-emerald-700">Total Sale Value:</span>
        <span className="text-[13px] font-bold text-emerald-800 tabular-nums">
          {fmtCurrency(summary.totalSaleValue)}
        </span>
      </div>
      <span className="text-[11px] text-emerald-600">
        ({summary.includedCount} computed
        {summary.omittedCount > 0 && (
          <span className="text-amber-600 ml-1 font-semibold">
            · {summary.omittedCount} omitted
          </span>
        )}
        )
      </span>
      {summary.omittedCount > 0 && (
        <span className="text-[11px] text-amber-600 flex items-center gap-1">
          <AlertTriangle size={11} />
          {summary.omittedCount} requirement{summary.omittedCount > 1 ? 's' : ''} have no
          band/salary data
        </span>
      )}
    </div>
  );
}

// ─── AssigneesPopover ─────────────────────────────────────────────────────────

function AssigneesPopover({
  req,
  canAdd,
  onAssign,
}: {
  req: Requirement;
  canAdd: boolean;
  onAssign: (req: Requirement) => void;
}) {
  const [open, setOpen] = useState(false);
  const assignments = (req.assignments ?? []).filter(a => a.status !== 'REMOVED');
  const hasAssignees = assignments.length > 0;
  const topLevel = assignments.filter(a => (a.depth ?? 0) === 0).slice(0, 3);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 group/ap"
          title={hasAssignees ? 'View assignees' : 'Assign'}
        >
          {hasAssignees ? (
            <div className="flex -space-x-1.5">
              {topLevel.map(a =>
                a.assignedTo ? (
                  <div
                    key={a.id}
                    className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white ${avatarColor(a.assignedTo.id)}`}
                  >
                    {initials(`${a.assignedTo.firstName} ${a.assignedTo.lastName}`)}
                  </div>
                ) : null
              )}
              {assignments.filter(a => (a.depth ?? 0) === 0).length > 3 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                  +{assignments.filter(a => (a.depth ?? 0) === 0).length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-300 group-hover/ap:text-slate-400 transition-colors">
              Unassigned
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        onClick={e => e.stopPropagation()}
        className="w-64 p-0 shadow-xl border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Assignees
          </span>
          <span className="text-[11px] text-slate-400">{assignments.length} active</span>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {assignments.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-slate-400">
              No one assigned yet
            </div>
          ) : (
            assignments
              .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
              .map(a => {
                const user = a.assignedTo;
                if (!user) return null;
                const depth = a.depth ?? 0;
                const tag = DEPTH_LABEL[depth] ?? DEPTH_LABEL[0];
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors"
                    style={{ paddingLeft: `${12 + depth * 10}px` }}
                  >
                    {depth > 0 && <span className="w-px h-4 bg-slate-200 shrink-0 -ml-2" />}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${avatarColor(user.id)}`}
                    >
                      {initials(`${user.firstName} ${user.lastName}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-800 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.role?.name && (
                        <p className="text-[10px] text-slate-400 truncate">{user.role.name}</p>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${tag.cls}`}
                    >
                      {tag.label}
                    </span>
                  </div>
                );
              })
          )}
        </div>
        {canAdd && (
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => {
                setOpen(false);
                onAssign(req);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
            >
              <UserPlus size={12} /> Assign
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── DeleteRequirementButton ──────────────────────────────────────────────────

function DeleteRequirementButton({ req, canDelete }: { req: Requirement; canDelete: boolean }) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await axios.delete(`/requirements/${req.id}`)).data,
    onSuccess: () => {
      setOpen(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      queryClient.invalidateQueries({ queryKey: ['requirement-stats'] });
      queryClient.invalidateQueries({ queryKey: ['requirement', req.id] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to delete requirement.');
    },
  });
  if (!canDelete) return null;
  return (
    <Popover
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          title="Delete requirement"
          className="w-7 h-7 flex items-center justify-center rounded-md text-red-600 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={e => e.stopPropagation()}
        className="w-64 p-3 shadow-xl border border-slate-200 rounded-xl"
      >
        <p className="text-[13px] font-semibold text-slate-800 mb-0.5">Delete requirement?</p>
        <p className="text-[12px] text-slate-500 leading-snug mb-2">
          <span className="font-mono text-slate-400">{req.reqCode}</span> — {req.title}
        </p>
        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5 mb-2">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="px-2.5 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <span className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Delete
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── EditRequirementButton ────────────────────────────────────────────────────

function EditRequirementButton({ req, canEdit }: { req: Requirement; canEdit: boolean }) {
  const router = useRouter();
  if (!canEdit) return null;
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        router.push(`/requirements/${req.slug ?? req.id}/edit`);
      }}
      title="Edit requirement"
      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
    >
      <Pencil size={13} />
    </button>
  );
}

// ─── StatusChangeButton ───────────────────────────────────────────────────────

function StatusChangeButton({ req, canEdit }: { req: Requirement; canEdit: boolean }) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toStatus, setToStatus] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nextStatuses = STATUS_FLOW[req.status as keyof typeof STATUS_FLOW] ?? [];
  const needsReason = toStatus
    ? isReasonRequired(req.status as RequirementStatus, toStatus as RequirementStatus)
    : false;
  const reasonInvalid = needsReason && reason.trim().length < 5;
  const { mutate, isPending } = useMutation({
    mutationFn: async () =>
      (
        await axios.patch(`/requirements/${req.id}/status`, {
          status: toStatus,
          reason: reason || undefined,
        })
      ).data,
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      queryClient.invalidateQueries({ queryKey: ['requirement-stats'] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to change status.');
    },
  });
  function close() {
    setOpen(false);
    setToStatus(null);
    setReason('');
    setError(null);
  }
  if (!canEdit || nextStatuses.length === 0) return null;
  return (
    <Popover
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) {
          setToStatus(null);
          setReason('');
          setError(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          title="Change status"
          className="flex items-center gap-0.5 h-7 px-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw size={12} />
          <ChevronDown size={11} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={e => e.stopPropagation()}
        className="w-60 p-2 shadow-xl border border-slate-200 rounded-xl"
      >
        {!toStatus ? (
          <>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 pb-1.5">
              Change status
            </p>
            {nextStatuses.map(s => (
              <button
                key={s}
                onClick={() => setToStatus(s)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${ALL_STATUSES.find(x => x.key === s)?.dot ?? 'bg-slate-400'}`}
                />
                {STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 mb-2">
              Reason {needsReason ? <span className="text-red-500">*</span> : '(optional)'}
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={
                needsReason ? 'Why is this being reopened?' : 'Why is this status changing?'
              }
              rows={2}
              className={`w-full text-[12px] border rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary mb-2 ${reasonInvalid ? 'border-red-300' : 'border-slate-200'}`}
            />
            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5 mb-2">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setToStatus(null)}
                disabled={isPending}
                className="px-2.5 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={() => mutate()}
                disabled={isPending || reasonInvalid}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending && (
                  <span className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                )}
                Confirm
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── useFilters ───────────────────────────────────────────────────────────────

function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const serviceLineId = searchParams.get('serviceLineId') ?? '';
  const clientId = searchParams.get('clientId') ?? '';
  const buId = searchParams.get('buId') ?? '';
  const createdByScope = searchParams.get('createdByScope') ?? 'ALL';
  const viewMode = (searchParams.get('view') ?? 'table') as 'cards' | 'table';
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '25');
  const createdById = searchParams.get('createdById') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setSearch = (v: string) => setParams({ search: v, page: null });
  const setStatus = (v: string) => setParams({ status: v, page: null });
  const setPriority = (v: string) => setParams({ priority: v, page: null });
  const setServiceLineId = (v: string) => setParams({ serviceLineId: v, page: null });
  const setClientId = (v: string) => setParams({ clientId: v, page: null });
  const setBuId = (v: string) => setParams({ buId: v, page: null });
  const setCreatedByScope = (v: string) => setParams({ createdByScope: v, page: null });
  const setViewMode = (v: 'cards' | 'table') => setParams({ view: v });
  const setPage = (v: number) => setParams({ page: String(v) });
  const setLimit = (v: number) => setParams({ limit: String(v), page: null });
  const setCreatedById = (v: string) => setParams({ createdById: v, page: null });
  const setDateFrom = (v: string) => setParams({ dateFrom: v, page: null });
  const setDateTo = (v: string) => setParams({ dateTo: v, page: null });
  const clearAll = () =>
    setParams({
      search: null,
      status: null,
      priority: null,
      serviceLineId: null,
      clientId: null,
      buId: null,
      page: null,
      createdById: null,
      dateFrom: null,
      dateTo: null,
    });
  const activeFiltersCount = [
    status,
    priority,
    buId,
    serviceLineId,
    clientId,
    createdById,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  return {
    search,
    status,
    priority,
    serviceLineId,
    clientId,
    buId,
    createdByScope,
    viewMode,
    page,
    limit,
    createdById,
    dateFrom,
    dateTo,
    setSearch,
    setStatus,
    setPriority,
    setServiceLineId,
    setClientId,
    setBuId,
    setCreatedById,
    setCreatedByScope,
    setViewMode,
    setPage,
    setLimit,
    clearAll,
    setDateFrom,
    setDateTo,
    activeFiltersCount,
  };
}

// ─── ScopeSwitcher ────────────────────────────────────────────────────────────

function ScopeSwitcher({
  value,
  onChange,
  isSuperAdmin,
}: {
  value: string;
  onChange: (v: string) => void;
  isSuperAdmin?: boolean;
}) {
  const options = isSuperAdmin
    ? [...SCOPE_OPTIONS, { value: 'ALL', label: 'All', icon: Network } as const]
    : SCOPE_OPTIONS;
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
      {options.map(opt => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all whitespace-nowrap ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon size={12} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────

function ViewToggle({
  value,
  onChange,
}: {
  value: 'cards' | 'table';
  onChange: (v: 'cards' | 'table') => void;
}) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => onChange('cards')}
        title="Card view"
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${value === 'cards' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <LayoutList size={14} />
      </button>
      <button
        onClick={() => onChange('table')}
        title="Table view"
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${value === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <Table2 size={14} />
      </button>
    </div>
  );
}

// ─── ExportButton ─────────────────────────────────────────────────────────────

function ExportButton({
  filters,
}: {
  filters: {
    search: string;
    status: string;
    priority: string;
    serviceLineId: string;
    clientId: string;
    buId: string;
    createdByScope: string;
    createdById: string;
    dateFrom: string;
    dateTo: string;
  };
}) {
  const axios = useAxios();
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.serviceLineId) params.set('serviceLineId', filters.serviceLineId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      if (filters.buId) params.set('buId', filters.buId);
      if (filters.createdById) params.set('createdById', filters.createdById);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      params.set('createdByScope', filters.createdByScope);
      const response = await axios.get(`/requirements/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `requirements-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title="Export to Excel"
      className="flex items-center gap-1.5 px-2.5 h-8 border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 shrink-0"
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download size={13} />
      )}
      <span className="hidden sm:inline">{loading ? 'Exporting…' : 'Export'}</span>
    </button>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({
  status,
  setStatus,
  priority,
  setPriority,
  buId,
  setBuId,
  serviceLineId,
  setServiceLineId,
  clientId,
  setClientId,
  createdById,
  setCreatedById,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  byStatus,
  busData,
  busLoading,
  slData,
  slLoading,
  clientsData,
  createdByData,
  clientsLoading,
  createdByLoading,
  activeFiltersCount,
  clearAll,
}: {
  status: string;
  setStatus: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  buId: string;
  setBuId: (v: string) => void;
  serviceLineId: string;
  setServiceLineId: (v: string) => void;
  clientId: string;
  setClientId: (v: string) => void;
  createdById: string;
  setCreatedById: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  byStatus: Record<string, number>;
  busData: BusinessUnit[] | null | undefined;
  busLoading: boolean;
  slData: ServiceLine[] | null | undefined;
  slLoading: boolean;
  clientsData: Client[] | null | undefined;
  createdByData: { id: string; name: string }[] | null | undefined;
  clientsLoading: boolean;
  createdByLoading: boolean;
  activeFiltersCount: number;
  clearAll: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 shrink-0">
        <button
          onClick={() => setStatus('')}
          className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all whitespace-nowrap ${!status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          All{' '}
          <span
            className={`ml-1.5 text-[11px] font-bold ${!status ? 'text-slate-600' : 'text-slate-400'}`}
          >
            {Object.values(byStatus).reduce((s, n) => s + n, 0)}
          </span>
        </button>
        {ALL_STATUSES.map(s => {
          const count = byStatus[s.key] ?? 0;
          if (count === 0 && status !== s.key) return null;
          const isActive = status === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStatus(isActive ? '' : s.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all whitespace-nowrap ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
              {s.label}
              {count > 0 && (
                <span
                  className={`text-[11px] font-bold ${isActive ? 'text-slate-600' : 'text-slate-400'}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="h-5 w-px bg-slate-200 shrink-0" />
      {busData && busData.length > 0 && (
        <DropdownFilter
          label="Business Unit"
          icon={<Building2 size={12} />}
          value={buId}
          items={busData}
          onSelect={setBuId}
          loading={busLoading}
          allLabel="All BUs"
        />
      )}
      {slData && slData.length > 0 && (
        <DropdownFilter
          label="Service Line"
          icon={<Briefcase size={12} />}
          value={serviceLineId}
          items={slData}
          onSelect={setServiceLineId}
          loading={slLoading}
          allLabel="All Service Lines"
        />
      )}
      {clientsData && clientsData.length > 0 && (
        <DropdownFilter
          label="Client"
          icon={<Users size={12} />}
          value={clientId}
          items={clientsData}
          onSelect={setClientId}
          loading={clientsLoading}
          allLabel="All Clients"
        />
      )}
      <DropdownFilter
        label="Priority"
        icon={<Zap size={12} />}
        value={priority}
        items={ALL_PRIORITIES.map(p => ({ id: p, name: p }))}
        onSelect={setPriority}
        allLabel="All Priorities"
      />
      {createdByData && createdByData.length > 0 && (
        <DropdownFilter
          label="Created By"
          icon={<Users size={12} />}
          value={createdById}
          items={createdByData}
          onSelect={setCreatedById}
          loading={createdByLoading}
          allLabel="Created By"
        />
      )}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
      />
      {activeFiltersCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 px-2 py-1 text-[12px] text-red-500 hover:text-red-700 font-medium transition-colors shrink-0"
        >
          <X size={12} />
          Clear ({activeFiltersCount})
        </button>
      )}
    </div>
  );
}

// ─── DropdownFilter ───────────────────────────────────────────────────────────

function DropdownFilter({
  label,
  icon,
  value,
  items,
  onSelect,
  loading,
  allLabel,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  items: { id: string; name: string }[];
  onSelect: (id: string) => void;
  loading?: boolean;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.id === value);
  const isActive = !!value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 h-8 border rounded-lg text-[12px] font-medium transition-all shrink-0 ${isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
        >
          {icon}
          <span className="max-w-[100px] truncate">{selected ? selected.name : label}</span>
          <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-52 p-1 shadow-lg border border-slate-200 rounded-xl"
      >
        {loading ? (
          <div className="space-y-1 p-1">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-7 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                onSelect('');
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${!value ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {allLabel}
            </button>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id === value ? '' : item.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors truncate ${value === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
}: {
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = !!(dateFrom || dateTo);
  const label = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} → ${dateTo}`;
    if (dateFrom) return `From ${dateFrom}`;
    if (dateTo) return `Until ${dateTo}`;
    return 'Date Range';
  }, [dateFrom, dateTo]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 h-8 border rounded-lg text-[12px] font-medium transition-all shrink-0 ${isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
        >
          <Calendar size={12} />
          <span className="max-w-[160px] truncate">{label}</span>
          <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-3 shadow-lg border border-slate-200 rounded-xl space-y-3"
      >
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Created Date Range
        </p>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full text-[12px] border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              className="w-full text-[12px] border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        {isActive && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setOpen(false);
            }}
            className="w-full flex items-center justify-center gap-1 text-[12px] text-red-500 hover:text-red-700 font-medium pt-1 border-t border-slate-100"
          >
            <X size={11} /> Clear dates
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── ActiveFilterChips ────────────────────────────────────────────────────────

function ActiveFilterChips({
  status,
  setStatus,
  priority,
  setPriority,
  buId,
  setBuId,
  busData,
  serviceLineId,
  setServiceLineId,
  slData,
  clientId,
  setClientId,
  clientsData,
  createdById,
  setCreatedById,
  createdByData,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: {
  status: string;
  setStatus: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  buId: string;
  setBuId: (v: string) => void;
  busData: BusinessUnit[] | null | undefined;
  serviceLineId: string;
  setServiceLineId: (v: string) => void;
  slData: ServiceLine[] | null | undefined;
  clientId: string;
  setClientId: (v: string) => void;
  clientsData: Client[] | null | undefined;
  createdById: string;
  setCreatedById: (v: string) => void;
  createdByData: { id: string; name: string }[] | null | undefined;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
}) {
  const chips = [
    status && { label: STATUS_LABEL[status] ?? status, clear: () => setStatus('') },
    priority && { label: priority, clear: () => setPriority('') },
    buId &&
      busData && {
        label: busData.find(b => b.id === buId)?.name ?? buId,
        clear: () => setBuId(''),
      },
    serviceLineId &&
      slData && {
        label: slData.find(s => s.id === serviceLineId)?.name ?? serviceLineId,
        clear: () => setServiceLineId(''),
      },
    clientId &&
      clientsData && {
        label: clientsData.find(c => c.id === clientId)?.name ?? clientId,
        clear: () => setClientId(''),
      },
    createdById &&
      createdByData && {
        label: createdByData.find(u => u.id === createdById)?.name ?? createdById,
        clear: () => setCreatedById(''),
      },
    dateFrom && { label: `From ${dateFrom}`, clear: () => setDateFrom('') },
    dateTo && { label: `Until ${dateTo}`, clear: () => setDateTo('') },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  if (!chips.length) return null;
  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex-wrap">
      <span className="text-[11px] text-slate-400 font-medium shrink-0">Filtered by:</span>
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={chip.clear}
          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600 font-medium hover:border-red-300 hover:text-red-500 transition-colors"
        >
          {chip.label}
          <X size={9} />
        </button>
      ))}
    </div>
  );
}

// ─── RequirementsTable ────────────────────────────────────────────────────────
// Column order:
//   Action | Code | Job Title | Status | Priority | Created By |
//   Client | Agreement | Band | Sale Value | Open | Age |
//   Assigned To | [canonical stage cols] | →

function RequirementsTable({
  requirements,
  selectedIds,
  canonicalKeys,
  canonicalMeta,
  onStageClick,
  canAdd,
  canDelete,
  canEdit,
  onAssign,
}: {
  requirements: Requirement[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  allSelected: boolean;
  canonicalKeys: string[];
  canonicalMeta: { key: string; label: string; pillCls: string }[];
  onStageClick: (req: Requirement, stageId: string) => void;
  allStages: PipelineStage[];
  canAdd: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onAssign: (req: Requirement) => void;
}) {
  const router = useRouter();

  // fixed cols + client cols + sale cols + assignee col + canonical stage cols + arrow
  const totalCols = 9 + 4 + canonicalKeys.length + 1;

  return (
    <div className="overflow-x-auto h-full">
      <table
        className="w-full text-[12px] border-collapse"
        style={{ minWidth: `${920 + canonicalKeys.length * 80}px` }}
      >
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-50 border-b-2 border-slate-200">
            {/* ── Action ── */}
            <th className="text-center px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-24 bg-slate-50">
              Action
            </th>
            {/* ── Identity ── */}
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-24 bg-slate-50">
              Code
            </th>
            <th
              className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50"
              style={{ minWidth: 220 }}
            >
              Job Title
            </th>
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-24 bg-slate-50">
              Status
            </th>
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-20 bg-slate-50">
              Priority
            </th>
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-28 bg-slate-50">
              Created By
            </th>
            {/* ── Client info ── */}
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-32 bg-blue-50 border-l border-blue-100">
              Client
            </th>
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-24 bg-blue-50">
              Agreement
            </th>
            {/* ── Sale value ── */}
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-32 bg-emerald-50 border-l border-emerald-100">
              Band
            </th>
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-36 bg-emerald-50">
              Sale Value
            </th>
            {/* ── Numbers ── */}
            <th className="text-center px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-14 bg-slate-50">
              Open
            </th>
            <th className="text-center px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-16 bg-slate-50">
              Age
            </th>
            {/* ── Assignees ── */}
            <th className="text-left px-3 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-32 bg-slate-50">
              Assigned To
            </th>
            {/* ── Pipeline stages — always last ── */}
            {canonicalKeys.map(key => (
              <th
                key={key}
                className="text-center px-2 py-3 font-semibold text-[11px] uppercase tracking-wider text-slate-400 w-16 bg-violet-50 border-l first:border-l-violet-100"
                title={key}
              >
                {canonicalMeta.find(s => s.key === key)?.label ?? key.replace(/_/g, ' ')}
              </th>
            ))}
            <th className="w-8 px-2 py-3 bg-slate-50" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requirements.map(req => {
            const age = daysSince(req.createdAt);
            const isBreached = req.isRespondByBreached || req.isTurnaroundBreached;
            const isSelected = selectedIds.has(req.id);
            const idOrSlug = req.slug ?? req.id;
            const totalPipeline =
              req._count?.pipelines ??
              (req.pipelineStageCounts ?? []).reduce((s, c) => s + c.count, 0);

            return (
              <tr
                key={req.id}
                className={`group transition-colors cursor-pointer ${isSelected ? 'bg-primary/[0.04] hover:bg-primary/[0.06]' : 'bg-white hover:bg-slate-50/80'} ${isBreached ? 'border-l-[3px] border-l-red-500' : ''}`}
                onClick={() => router.push(`/requirements/${idOrSlug}`)}
              >
                {/* Action */}
                <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <EditRequirementButton req={req} canEdit={canEdit} />
                    <StatusChangeButton req={req} canEdit={canEdit} />
                    <DeleteRequirementButton req={req} canDelete={canDelete} />
                  </div>
                </td>

                {/* Code */}
                <td className="px-3 py-3">
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    {req.reqCode}
                  </span>
                </td>

                {/* Title */}
                <td className="px-3 py-3">
                  <p
                    className="font-semibold text-slate-900 text-[13px] leading-snug truncate"
                    style={{ maxWidth: 220 }}
                  >
                    {req.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {req.businessUnit?.name && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-sm bg-blue-300 inline-block" />
                        {req.businessUnit.name}
                      </span>
                    )}
                    {req.serviceLine?.name && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-sm bg-violet-300 inline-block" />
                        {req.serviceLine.name}
                      </span>
                    )}
                    {req.city && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin size={9} />
                        {req.city}
                      </span>
                    )}
                    {totalPipeline > 0 && (
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {totalPipeline} applicants
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[req.status] ?? 'bg-slate-400 text-white'}`}
                  >
                    {STATUS_LABEL[req.status] ?? req.status}
                  </span>
                  {isBreached && (
                    <p className="text-[10px] text-red-500 font-medium mt-0.5">⚠ Breached</p>
                  )}
                </td>

                {/* Priority */}
                <td className="px-3 py-3">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[req.priority] ?? ''}`}
                  >
                    {req.priority}
                  </span>
                </td>

                {/* Created by */}
                <td className="px-3 py-3">
                  {req.createdBy ? (
                    <span
                      className="text-[12px] text-slate-500 truncate block"
                      style={{ maxWidth: 100 }}
                    >
                      {req.createdBy.firstName} {req.createdBy.lastName}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* ── Client section (blue-tinted) ─────────────────────── */}
                {/* Client name */}
                <td className="px-3 py-3 bg-blue-50/30 border-l border-blue-100">
                  <span
                    className="text-slate-800 text-[12px] font-medium truncate block"
                    style={{ maxWidth: 120 }}
                  >
                    {req.client?.name ?? <span className="text-slate-300">—</span>}
                  </span>
                </td>

                {/* Agreement type */}
                <td className="px-3 py-3 bg-blue-50/30">
                  {req.client?.agreementType ? (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${req.client.agreementType === 'BAND' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                      {req.client.agreementType === 'BAND' ? 'Band' : 'Fixed'}
                      {req.client.agreementType === 'FIXED' &&
                        req.client.percentageValue != null &&
                        ` ${req.client.percentageValue}%`}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-[11px]">—</span>
                  )}
                </td>

                {/* ── Sale value section (emerald-tinted) ──────────────── */}
                {/* Band info */}
                <td className="px-3 py-3 bg-emerald-50/30 border-l border-emerald-100">
                  {req.band ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {req.band.code}
                        {req.band.name ? ` · ${req.band.name}` : ''}
                      </span>
                      {req.band.value != null && (
                        <span className="text-[10px] text-slate-500">
                          Val: {fmtCurrency(req.band.value)}
                        </span>
                      )}
                      {req.band.rangeFrom != null && req.band.rangeTo != null && (
                        <span className="text-[10px] text-slate-400">
                          {fmtCurrency(req.band.rangeFrom)} – {fmtCurrency(req.band.rangeTo)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300 text-[11px]">—</span>
                  )}
                </td>

                {/* Computed sale value */}
                <td className="px-3 py-3 bg-emerald-50/30">
                  <SaleValueBadge
                    computedSaleValue={req.computedSaleValue}
                    saleValueBasis={req.saleValueBasis}
                  />
                </td>

                {/* Openings */}
                <td className="px-3 py-3 text-center">
                  <span className="font-semibold text-slate-700">{req.totalOpenings}</span>
                </td>

                {/* Age */}
                <td className="px-3 py-3 text-center">
                  <span
                    className={`font-semibold text-[12px] tabular-nums ${age > 30 ? 'text-red-500' : age > 14 ? 'text-amber-500' : 'text-slate-400'}`}
                  >
                    {age}d
                  </span>
                </td>

                {/* Assigned to */}
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                  <AssigneesPopover req={req} canAdd={canAdd} onAssign={onAssign} />
                </td>

                {/* ── Canonical stage counts — always last ─────────────── */}
                {canonicalKeys.map(key => {
                  const count = req.canonicalStageCounts?.[key] ?? 0;
                  const stageId = req.pipelineStageCounts?.find(
                    s => s.canonicalStage === key
                  )?.stageId;
                  return (
                    <td
                      key={key}
                      className="px-2 py-3 text-center bg-violet-50/20"
                      onClick={e => {
                        if (count > 0 && stageId) {
                          e.stopPropagation();
                          onStageClick(req, stageId);
                        }
                      }}
                    >
                      {count > 0 ? (
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity ${canonicalMeta.find(s => s.key === key)?.pillCls ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="text-slate-200 text-[11px]">—</span>
                      )}
                    </td>
                  );
                })}

                {/* Arrow */}
                <td className="px-2 py-3">
                  <ChevronRight
                    size={14}
                    className="text-slate-200 group-hover:text-slate-400 transition-colors"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse" style={{ minWidth: 900 }}>
        <thead>
          <tr className="bg-slate-50 border-b-2 border-slate-200">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="bg-white">
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-3 py-3.5">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CandidateDrawer ──────────────────────────────────────────────────────────

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

// ─── RequirementCard (card view) ──────────────────────────────────────────────

function RequirementCard({
  req,
  selected,
  onSelect,
  allStages,
  onStageClick,
  canAdd,
  onAssign,
}: {
  req: Requirement;
  selected: boolean;
  onSelect: (id: string) => void;
  allStages: PipelineStage[];
  onStageClick: (req: Requirement, stageId: string, stageLabel: string) => void;
  canAdd: boolean;
  onAssign: (req: Requirement) => void;
}) {
  const router = useRouter();
  const [stagesExpanded, setStagesExpanded] = useState(false);
  const idOrSlug = req.slug ?? req.id;
  const age = daysSince(req.createdAt);
  const isBreached = req.isRespondByBreached || req.isTurnaroundBreached;
  const reqServiceLineId = req.serviceLine?.id ?? req.serviceLineId ?? null;

  const stagesToRender =
    (req.pipelineStageCounts ?? []).length > 0
      ? (req.pipelineStageCounts ?? []).map(s => ({
          id: s.stageId,
          code: s.code,
          label: s.label,
          order: s.order,
          count: s.count,
        }))
      : allStages
          .filter(s => s.serviceLineId === null || s.serviceLineId === reqServiceLineId)
          .map(s => ({ id: s.id, code: s.code, label: s.label, order: s.order, count: 0 }));

  const totalPipeline =
    req._count?.pipelines ?? (req.pipelineStageCounts ?? []).reduce((s, c) => s + c.count, 0);
  const openings = req.totalOpenings ?? 0;
  const activeAssignments = (req.assignments ?? []).filter(a => a.status !== 'REMOVED');

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md hover:border-slate-300 ${selected ? 'border-primary/40 bg-primary/[0.02]' : 'border-slate-200'} ${isBreached ? 'border-l-4 border-l-red-500' : ''}`}
    >
      {/* Desktop layout */}
      <div className="hidden md:flex">
        <div
          className="flex-1 min-w-0 p-4 cursor-pointer"
          onClick={() => router.push(`/requirements/${idOrSlug}`)}
        >
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
                  <span className="text-[10px] font-semibold text-red-500">⚠ Breached</span>
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
                {(req.city || req.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="shrink-0" />
                    {[req.city, req.state].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} className="shrink-0" />
                  {openings} Position{openings !== 1 ? 's' : ''}
                </span>
                {totalPipeline > 0 && (
                  <span className="text-emerald-600 font-medium">{totalPipeline} applicants</span>
                )}
                {/* Client + sale value inline summary */}
                {req.client?.name && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                    <Building2 size={10} className="shrink-0" />
                    {req.client.name}
                  </span>
                )}
              </div>
              {/* Sale value strip */}
              {(req.computedSaleValue != null || req.band) && (
                <div
                  className="flex items-center gap-3 flex-wrap"
                  onClick={e => e.stopPropagation()}
                >
                  {req.band && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <BadgeDollarSign size={11} className="text-blue-500 shrink-0" />
                      {req.band.code}
                      {req.band.value != null ? ` · ${fmtCurrency(req.band.value)}` : ''}
                    </span>
                  )}
                  <SaleValueBadge
                    computedSaleValue={req.computedSaleValue}
                    saleValueBasis={req.saleValueBasis}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
          {/* Bottom strip */}
          <div
            className="flex items-center justify-between ml-6"
            onClick={e => e.stopPropagation()}
          >
            <AssigneesPopover req={req} canAdd={canAdd} onAssign={onAssign} />
            <div className="flex items-center gap-2">
              {canAdd && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onAssign(req);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors"
                >
                  <UserPlus size={11} />
                  Assign
                </button>
              )}
              <span
                className={`text-[11px] font-medium ${age > 30 ? 'text-red-500' : age > 14 ? 'text-amber-500' : 'text-slate-400'}`}
              >
                {age}d ago
              </span>
            </div>
          </div>
        </div>

        {/* Stage counts panel */}
        <div className="flex border-l border-slate-100 w-[50%] shrink-0">
          {stagesToRender.map(stage => {
            const color = STAGE_NUMBER_COLOR[stage.code] ?? 'text-slate-400';
            return (
              <button
                key={stage.id}
                onClick={() => onStageClick(req, stage.id, stage.label)}
                className="flex flex-col items-center justify-center flex-1 py-4 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 transition-colors min-w-0"
              >
                <span className={`text-[28px] font-bold tabular-nums leading-none ${color}`}>
                  {stage.count}
                </span>
                <span className="text-[9px] mt-1.5 font-bold tracking-wider text-slate-400 uppercase text-center leading-tight px-1 line-clamp-2">
                  {stage.label}
                </span>
              </button>
            );
          })}
          <div className="flex flex-col items-center justify-center gap-1 px-2 border-l border-slate-100">
            <button
              onClick={() => router.push(`/requirements/${idOrSlug}`)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Open"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
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
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500">
                {req.businessUnit?.name && <span>{req.businessUnit.name}</span>}
                {req.client?.name && (
                  <span className="font-medium text-slate-600">{req.client.name}</span>
                )}
                {req.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {req.city}
                  </span>
                )}
                <span>{openings} pos</span>
                {totalPipeline > 0 && (
                  <span className="text-emerald-600 font-medium">{totalPipeline} applicants</span>
                )}
              </div>
              {req.computedSaleValue != null && (
                <div className="mt-1">
                  <SaleValueBadge
                    computedSaleValue={req.computedSaleValue}
                    saleValueBasis={req.saleValueBasis}
                    compact
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-medium ${age > 30 ? 'text-red-500' : age > 14 ? 'text-amber-500' : 'text-slate-400'}`}
              >
                {age}d ago
              </span>
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                {canAdd && (
                  <button
                    onClick={() => onAssign(req)}
                    className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                  >
                    <UserPlus size={10} />
                    Assign
                  </button>
                )}
                <button
                  onClick={() => router.push(`/requirements/${idOrSlug}`)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
          {activeAssignments.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 ml-7" onClick={e => e.stopPropagation()}>
              <AssigneesPopover req={req} canAdd={false} onAssign={onAssign} />
            </div>
          )}
        </div>
        {stagesToRender.length > 0 && (
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
                  {stagesToRender.map(stage => {
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
                          {stage.count}
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
      </div>
      <div className="hidden md:flex border-l border-slate-100 w-[50%] shrink-0">
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

// ─── Main Page ────────────────────────────────────────────────────────────────

function RequirementsPageInner() {
  const axios = useAxios();
  const router = useRouter();

  const {
    search,
    status,
    priority,
    serviceLineId,
    clientId,
    buId,
    createdByScope,
    viewMode,
    page,
    limit,
    createdById,
    dateFrom,
    dateTo,
    setSearch,
    setStatus,
    setPriority,
    setServiceLineId,
    setClientId,
    setBuId,
    setCreatedById,
    setCreatedByScope,
    setViewMode,
    setPage,
    setLimit,
    setDateFrom,
    setDateTo,
    clearAll,
    activeFiltersCount,
  } = useFilters();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{
    open: boolean;
    requirementId: string;
    requirementTitle: string;
    stageId: string | null;
    stageLabel: string;
  }>({ open: false, requirementId: '', requirementTitle: '', stageId: null, stageLabel: '' });

  const handleAssign = useCallback(
    (req: Requirement) => {
      router.push(`/requirements/${req.slug ?? req.id}?tab=assignments`);
    },
    [router]
  );

  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () =>
      (await axios.get('/pipeline-stages')).data?.data ?? ([] as PipelineStage[]),
    staleTime: 10 * 60 * 1000,
  });
  const allStages = ((stagesData as PipelineStage[]) ?? []).sort((a, b) => a.order - b.order);

  const { data: candidateMeta } = useCandidateMeta();
  const canonicalMeta: { key: string; label: string; pillCls: string }[] = useMemo(() => {
    if (!candidateMeta?.canonicalStages) return [];
    return candidateMeta.canonicalStages.map(s => ({
      key: s.key,
      label: s.key
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' '),
      pillCls: canonicalPillFromDot(canonicalDot(s.key)),
    }));
  }, [candidateMeta]);

  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ['requirement-stats'],
    queryFn: async () => (await axios.get('/requirements/stats')).data,
    staleTime: 30_000,
  });
  const byStatus = statsData?.data?.byStatus ?? {};

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
  const { data: createdByData, isLoading: createdByLoading } = useQuery({
    queryKey: ['requirement-creators'],
    queryFn: () =>
      safeFetch(async () => (await axios.get('/users?limit=200')).data?.data as User[]),
    staleTime: 5 * 60 * 1000,
  });

  const createdByOptions = useMemo(
    () =>
      (createdByData ?? []).map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() })),
    [createdByData]
  );

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (priority) p.set('priority', priority);
    if (serviceLineId) p.set('serviceLineId', serviceLineId);
    if (clientId) p.set('clientId', clientId);
    if (buId) p.set('buId', buId);
    if (createdById) p.set('createdById', createdById);
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    p.set('createdByScope', createdByScope);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [
    search,
    status,
    priority,
    serviceLineId,
    clientId,
    buId,
    createdById,
    createdByScope,
    dateFrom,
    dateTo,
    page,
    limit,
  ]);

  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['requirements', qs],
    queryFn: async () => (await axios.get(`/requirements?${qs}`)).data as RequirementsResponse,
    placeholderData: prev => prev,
  });

  const requirements = reqData?.data ?? [];
  const total = reqData?.meta?.total ?? 0;
  const totalPages = reqData?.meta?.pages ?? 0;
  const canAdd = reqData?.permissions?.canAdd ?? false;
  const canDelete = reqData?.permissions?.canDelete ?? false;
  const canEdit = reqData?.permissions?.canEdit ?? false;
  const isSuperAdmin = reqData?.scope?.isSuperAdmin ?? false;
  const saleValueSummary = reqData?.saleValueSummary;

  const canonicalKeys = useMemo(() => canonicalMeta.map(s => s.key), [canonicalMeta]);

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
  function openDrawer(req: Requirement, stageId: string, stageLabel = '') {
    setDrawer({
      open: true,
      requirementId: req.id,
      requirementTitle: req.title,
      stageId: stageId || null,
      stageLabel,
    });
  }

  const exportFilters = {
    search,
    status,
    priority,
    serviceLineId,
    clientId,
    buId,
    createdById,
    createdByScope,
    dateFrom,
    dateTo,
  };
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* ── Top navbar strip ── */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
          <ScopeSwitcher
            value={createdByScope}
            onChange={setCreatedByScope}
            isSuperAdmin={isSuperAdmin}
          />
          <div className="h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, code, skill…"
              className="pl-7 h-8 text-sm w-56 bg-slate-50 border-slate-200 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 shrink-0">
            <Checkbox
              checked={requirements.length > 0 && selectedIds.size === requirements.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-[13px] text-slate-500 font-medium whitespace-nowrap">
              {reqLoading ? '…' : `${total} found`}
            </span>
          </div>
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <ExportButton filters={exportFilters} />
          {canAdd && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 shrink-0"
              onClick={() => router.push('/requirements/new')}
            >
              <Plus size={14} /> Add New Job
            </Button>
          )}
          {canAdd && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 shrink-0"
              onClick={() => router.push('/requirements/bulk')}
            >
              <Plus size={14} /> Bulk Upload
            </Button>
          )}
        </div>

        <div className="px-4 pb-2.5 overflow-x-auto scrollbar-none">
          <FilterBar
            status={status}
            setStatus={setStatus}
            priority={priority}
            setPriority={setPriority}
            buId={buId}
            setBuId={setBuId}
            serviceLineId={serviceLineId}
            setServiceLineId={setServiceLineId}
            clientId={clientId}
            setClientId={setClientId}
            createdById={createdById}
            setCreatedById={setCreatedById}
            byStatus={byStatus}
            busData={busData}
            busLoading={busLoading}
            slData={slData}
            slLoading={slLoading}
            clientsData={clientsData}
            clientsLoading={clientsLoading}
            createdByData={createdByOptions}
            createdByLoading={createdByLoading}
            activeFiltersCount={activeFiltersCount}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            clearAll={clearAll}
          />
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasActiveFilters && (
        <ActiveFilterChips
          status={status}
          setStatus={setStatus}
          priority={priority}
          setPriority={setPriority}
          buId={buId}
          setBuId={setBuId}
          busData={busData}
          serviceLineId={serviceLineId}
          setServiceLineId={setServiceLineId}
          slData={slData}
          clientId={clientId}
          setClientId={setClientId}
          clientsData={clientsData}
          createdById={createdById}
          setCreatedById={setCreatedById}
          createdByData={createdByOptions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
      )}

      {/* ── Sale value summary bar (shows whenever data is loaded) ── */}
      {!reqLoading && saleValueSummary && <SaleValueSummaryBar summary={saleValueSummary} />}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {viewMode === 'table' ? (
          <div className="bg-white h-full">
            {reqLoading ? (
              <TableSkeleton cols={13 + canonicalKeys.length} />
            ) : requirements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Briefcase size={40} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No requirements found</p>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="mt-2 text-sm text-primary hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <RequirementsTable
                requirements={requirements}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
                onSelectAll={toggleAll}
                allSelected={selectedIds.size === requirements.length && requirements.length > 0}
                canonicalKeys={canonicalKeys}
                canonicalMeta={canonicalMeta}
                onStageClick={(req, stageId) => openDrawer(req, stageId)}
                allStages={allStages}
                canAdd={canAdd}
                canDelete={canDelete}
                canEdit={canEdit}
                onAssign={handleAssign}
              />
            )}
          </div>
        ) : (
          <div className="px-3 md:px-5 py-3 md:py-4 space-y-2.5 md:space-y-3">
            {reqLoading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : requirements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Briefcase size={40} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No requirements found</p>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="mt-2 text-sm text-primary hover:underline">
                    Clear filters
                  </button>
                )}
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
                  canAdd={canAdd}
                  onAssign={handleAssign}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-t border-slate-200">
        <div className="hidden sm:flex items-center gap-2 text-[13px] text-slate-500">
          <span>Per page:</span>
          <Select value={String(limit)} onValueChange={v => setLimit(Number(v))}>
            <SelectTrigger className="h-7 w-20 text-xs border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map(n => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 text-[12px] md:text-[13px] text-slate-500 ml-auto">
          <span className="mr-2 text-slate-400">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30 text-xs"
          >
            «
          </button>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30 text-xs"
          >
            ‹
          </button>
          <button
            onClick={() => setPage(page + 1)}
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

export default function RequirementsPage() {
  return (
    <Suspense fallback={null}>
      <RequirementsPageInner />
    </Suspense>
  );
}
