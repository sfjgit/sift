/* eslint-disable @typescript-eslint/no-explicit-any */
// File: page.tsx
// Path: src/app/(dashboard)/requirements/page.tsx

'use client';

import { useState, useMemo, useCallback, useRef, Suspense } from 'react';
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
  ExternalLink,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Columns3,
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
  saleValue?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: string | null;
  salaryCurrency?: string | null;
  computedSaleValue?: number | null;
  saleValueBasis?: 'SALE_VALUE' | 'BAND' | 'FIXED_PCT' | 'SALARY_MIN' | null;
  bandId?: string | null;
  band?: Band | null;
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
interface FiltersResponse {
  success: boolean;
  data: {
    businessUnits: BusinessUnit[];
    serviceLines: ServiceLine[];
    clients: Client[];
    clientSpocs: { id: string; name: string; clientId: string; clientName: string }[];
    createdBy: { id: string; name: string }[];
    statusCounts: Record<string, number>;
    priorities: string[];
  };
}
interface SaleValueStats {
  totalSaleValue: number;
  omittedCount: number;
  includedCount: number;
  hiddenCount: number;
  byBasis: Record<string, { count: number; total: number }>;
}
interface RequirementsResponse {
  success: boolean;
  data: Requirement[];
  meta: { total: number; page: number; limit: number; pages: number };
  permissions?: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
  scope?: { canViewScope: string; isSuperAdmin?: boolean };
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

// ─── Column definitions ───────────────────────────────────────────────────────

type ColKey =
  | 'code'
  | 'title'
  | 'status'
  | 'priority'
  | 'createdBy'
  | 'client'
  | 'agreement'
  | 'band'
  | 'salaryMin'
  | 'salaryMax'
  | 'reqSaleValue'
  | 'computedSaleValue'
  | 'openings'
  | 'age'
  | 'assignedTo';

interface ColDef {
  key: ColKey;
  label: string;
  group?: 'identity' | 'client' | 'sale' | 'meta';
  width: number;
  defaultVisible: boolean;
}

const ALL_COLS: ColDef[] = [
  { key: 'code', label: 'Code', group: 'identity', width: 100, defaultVisible: true },
  { key: 'title', label: 'Job Title', group: 'identity', width: 260, defaultVisible: true },
  { key: 'status', label: 'Status', group: 'identity', width: 110, defaultVisible: true },
  { key: 'priority', label: 'Priority', group: 'identity', width: 90, defaultVisible: true },
  { key: 'createdBy', label: 'Created By', group: 'identity', width: 130, defaultVisible: true },
  { key: 'client', label: 'Client', group: 'client', width: 150, defaultVisible: true },
  { key: 'agreement', label: 'Agreement', group: 'client', width: 110, defaultVisible: true },
  { key: 'band', label: 'Band', group: 'sale', width: 160, defaultVisible: true },
  { key: 'salaryMin', label: 'Salary Min', group: 'sale', width: 120, defaultVisible: true },
  { key: 'salaryMax', label: 'Salary Max', group: 'sale', width: 120, defaultVisible: true },
  {
    key: 'reqSaleValue',
    label: 'Req. Sale Value',
    group: 'sale',
    width: 130,
    defaultVisible: true,
  },
  {
    key: 'computedSaleValue',
    label: 'Computed Value',
    group: 'sale',
    width: 220,
    defaultVisible: true,
  },
  { key: 'openings', label: 'Open', group: 'meta', width: 70, defaultVisible: true },
  { key: 'age', label: 'Age', group: 'meta', width: 70, defaultVisible: true },
  { key: 'assignedTo', label: 'Assigned To', group: 'meta', width: 140, defaultVisible: true },
];

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
const ALL_STATUSES = [
  { key: 'ACTIVE', label: 'Active', dot: 'bg-emerald-500' },
  { key: 'ON_HOLD', label: 'On Hold', dot: 'bg-orange-500' },
  { key: 'PENDING_APPROVAL', label: 'Pending', dot: 'bg-amber-500' },
  { key: 'DRAFT', label: 'Draft', dot: 'bg-slate-400' },
  { key: 'CLOSED', label: 'Closed', dot: 'bg-red-400' },
  { key: 'CANCELLED', label: 'Cancelled', dot: 'bg-gray-400' },
];
const SALE_BASIS_LABEL: Record<string, { label: string; cls: string }> = {
  SALE_VALUE: { label: 'Direct', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BAND: { label: 'Band', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  FIXED_PCT: { label: 'Fixed %', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  SALARY_MIN: { label: 'Salary Min', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};
const DEPTH_LABEL: Record<number, { label: string; cls: string }> = {
  0: { label: 'DM', cls: 'bg-blue-100 text-blue-700' },
  1: { label: 'TL', cls: 'bg-violet-100 text-violet-700' },
  2: { label: 'Rec', cls: 'bg-emerald-100 text-emerald-700' },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const initials = (n: string) =>
  n
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
const avatarColor = (s: string) => AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formulaLine(req: Requirement): string | null {
  const { saleValueBasis, totalOpenings: open } = req;
  const ol = `× ${open} opening${open !== 1 ? 's' : ''}`;
  if (saleValueBasis === 'SALE_VALUE' && req.saleValue != null)
    return `${fmtCurrency(req.saleValue)} (direct) ${ol}`;
  if (saleValueBasis === 'BAND' && req.band?.value != null)
    return `${fmtCurrency(req.band.value)} (band ${req.band.code}) ${ol}`;
  if (saleValueBasis === 'FIXED_PCT' && req.salaryMin != null)
    return `${fmtCurrency(req.salaryMin)} × ${req.client?.percentageValue}% (client %) ${ol}`;
  if (saleValueBasis === 'SALARY_MIN' && req.salaryMin != null)
    return `${fmtCurrency(req.salaryMin)} (salary min) ${ol}`;
  return null;
}

// ─── useFilters ───────────────────────────────────────────────────────────────

function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = (k: string, d = '') => searchParams.get(k) ?? d;
  const search = get('search');
  const status = get('status');
  const priority = get('priority');
  const serviceLineId = get('serviceLineId');
  const clientId = get('clientId');
  const clientSpocId = get('clientSpocId');
  const buId = get('buId');
  const createdById = get('createdById');
  const dateFrom = get('dateFrom');
  const dateTo = get('dateTo');
  const viewMode = get('view', 'table') as 'cards' | 'table';
  const page = Number(get('page', '1'));
  const limit = Number(get('limit', '25'));

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

  const set = (k: string) => (v: string) => setParams({ [k]: v, page: null });
  const clearAll = () =>
    setParams({
      search: null,
      status: null,
      priority: null,
      serviceLineId: null,
      clientId: null,
      clientSpocId: null,
      buId: null,
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
    clientSpocId,
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
    clientSpocId,
    buId,
    createdById,
    dateFrom,
    dateTo,
    viewMode,
    page,
    limit,
    setSearch: set('search'),
    setStatus: set('status'),
    setPriority: set('priority'),
    setServiceLineId: set('serviceLineId'),
    setClientId: set('clientId'),
    setClientSpocId: set('clientSpocId'),
    setBuId: set('buId'),
    setCreatedById: set('createdById'),
    setDateFrom: set('dateFrom'),
    setDateTo: set('dateTo'),
    setViewMode: (v: 'cards' | 'table') => setParams({ view: v }),
    setPage: (v: number) => setParams({ page: String(v) }),
    setLimit: (v: number) => setParams({ limit: String(v), page: null }),
    clearAll,
    activeFiltersCount,
  };
}

// ─── ColumnVisibilityPanel ────────────────────────────────────────────────────

function ColumnVisibilityPanel({
  visible,
  onChange,
}: {
  visible: Set<ColKey>;
  onChange: (k: ColKey) => void;
}) {
  const groups = [
    { label: 'Identity', keys: ALL_COLS.filter(c => c.group === 'identity') },
    { label: 'Client', keys: ALL_COLS.filter(c => c.group === 'client') },
    { label: 'Sale Value', keys: ALL_COLS.filter(c => c.group === 'sale') },
    { label: 'Meta', keys: ALL_COLS.filter(c => c.group === 'meta') },
  ];
  return (
    <div className="w-64 p-3">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Toggle Columns
      </p>
      {groups.map(g => (
        <div key={g.label} className="mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {g.label}
          </p>
          {g.keys.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer"
            >
              <Checkbox checked={visible.has(col.key)} onCheckedChange={() => onChange(col.key)} />
              <span className="text-[12px] text-slate-700">{col.label}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── SaleValueCell ────────────────────────────────────────────────────────────

function SaleValueCell({ req }: { req: Requirement }) {
  if (req.computedSaleValue == null) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-400 italic">
        <AlertTriangle size={10} />
        No data
      </span>
    );
  }
  const basis = req.saleValueBasis ? SALE_BASIS_LABEL[req.saleValueBasis] : null;
  const formula = formulaLine(req);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] font-bold text-emerald-700 tabular-nums leading-none">
        {fmtCurrency(req.computedSaleValue)}
      </span>
      {basis && (
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border w-fit ${basis.cls}`}
        >
          {basis.label}
        </span>
      )}
      {formula && <span className="text-[10px] text-slate-400 leading-tight">{formula}</span>}
    </div>
  );
}

// ─── AssigneesCell ────────────────────────────────────────────────────────────

function AssigneesCell({
  req,
  canAdd,
  onAssign,
}: {
  req: Requirement;
  canAdd: boolean;
  onAssign: (r: Requirement) => void;
}) {
  const [open, setOpen] = useState(false);
  const assignments = (req.assignments ?? []).filter(a => a.status !== 'REMOVED');
  const top3 = assignments.filter(a => (a.depth ?? 0) === 0).slice(0, 3);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={e => e.stopPropagation()} className="flex items-center gap-1">
          {assignments.length > 0 ? (
            <div className="flex -space-x-1.5">
              {top3.map(a =>
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
            <span className="text-[11px] text-slate-300 hover:text-slate-400">Unassigned</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={e => e.stopPropagation()}
        className="w-60 p-0 shadow-xl border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Assignees
          </span>
          <span className="text-[11px] text-slate-400">{assignments.length} active</span>
        </div>
        <div className="max-h-52 overflow-y-auto">
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
                    className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50"
                    style={{ paddingLeft: `${12 + depth * 8}px` }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${avatarColor(user.id)}`}
                    >
                      {initials(`${user.firstName} ${user.lastName}`)}
                    </div>
                    <span className="text-[12px] text-slate-700 flex-1 truncate">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tag.cls}`}>
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

// ─── RowActions ───────────────────────────────────────────────────────────────

function RowActions({
  req,
  canEdit,
  canDelete,
  onOpenNew,
}: {
  req: Requirement;
  canEdit: boolean;
  canDelete: boolean;
  onOpenNew: () => void;
}) {
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [toStatus, setToStatus] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [statusErr, setStatusErr] = useState<string | null>(null);

  const nextStatuses = STATUS_FLOW[req.status as keyof typeof STATUS_FLOW] ?? [];

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: async () => (await axios.delete(`/requirements/${req.id}`)).data,
    onSuccess: () => {
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
    onError: (err: any) => setDeleteErr(err?.response?.data?.message ?? 'Failed'),
  });
  const { mutate: doStatus, isPending: changingStatus } = useMutation({
    mutationFn: async () =>
      (
        await axios.patch(`/requirements/${req.id}/status`, {
          status: toStatus,
          reason: reason || undefined,
        })
      ).data,
    onSuccess: () => {
      setStatusOpen(false);
      setToStatus(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
    onError: (err: any) => setStatusErr(err?.response?.data?.message ?? 'Failed'),
  });

  const idOrSlug = req.slug ?? req.id;
  const needsReason = toStatus
    ? isReasonRequired(req.status as RequirementStatus, toStatus as RequirementStatus)
    : false;

  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      {/* Open same tab */}
      {canEdit && (
        <button
          onClick={() => window.open(`/requirements/${idOrSlug}/edit`, '_blank')}
          title="Edit (new tab)"
          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Pencil size={12} />
        </button>
      )}

      {/* Open new tab */}
      <button
        onClick={onOpenNew}
        title="Open in new tab"
        className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        <ExternalLink size={12} />
      </button>

      {/* Status change — all statuses shown, any→any */}
      {canEdit && (
        <Popover
          open={statusOpen}
          onOpenChange={o => {
            setStatusOpen(o);
            if (!o) {
              setToStatus(null);
              setReason('');
              setStatusErr(null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              title="Change status"
              className="flex items-center h-7 px-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw size={11} />
              <ChevronDown size={10} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            className="w-56 p-2 shadow-xl border border-slate-200 rounded-xl"
          >
            {!toStatus ? (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                  Change Status
                </p>
                {ALL_STATUSES.filter(s => s.key !== req.status).map(s => (
                  <button
                    key={s.key}
                    onClick={() => setToStatus(s.key)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                    {req.status === s.key && (
                      <span className="ml-auto text-[10px] text-slate-400">current</span>
                    )}
                  </button>
                ))}
              </>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Reason {needsReason ? <span className="text-red-500">*</span> : '(optional)'}
                </p>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  className={`w-full text-[12px] border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary mb-2 ${needsReason && reason.trim().length < 5 ? 'border-red-300' : 'border-slate-200'}`}
                />
                {statusErr && <p className="text-[11px] text-red-600 mb-2">{statusErr}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setToStatus(null)}
                    className="px-2 py-1 text-[12px] text-slate-500"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => doStatus()}
                    disabled={changingStatus || (needsReason && reason.trim().length < 5)}
                    className="px-3 py-1 bg-blue-600 text-white text-[12px] rounded-lg disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* Delete */}
      {canDelete && (
        <Popover
          open={deleteOpen}
          onOpenChange={o => {
            setDeleteOpen(o);
            if (!o) setDeleteErr(null);
          }}
        >
          <PopoverTrigger asChild>
            <button
              title="Delete"
              className="w-7 h-7 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            className="w-60 p-3 shadow-xl border border-slate-200 rounded-xl"
          >
            <p className="text-[13px] font-semibold text-slate-800 mb-0.5">Delete requirement?</p>
            <p className="text-[12px] text-slate-500 mb-2">
              <span className="font-mono text-slate-400">{req.reqCode}</span> — {req.title}
            </p>
            {deleteErr && (
              <p className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1.5 mb-2">
                {deleteErr}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-2.5 py-1.5 text-[12px] text-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete()}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] rounded-lg disabled:opacity-50"
              >
                {deleting ? (
                  <span className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}{' '}
                Delete
              </button>
            </div>
          </PopoverContent>
        </Popover>
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
  onSelect: (v: string) => void;
  loading?: boolean;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 h-8 border rounded-lg text-[12px] font-medium transition-all shrink-0 ${value ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          {icon}
          <span className="max-w-[100px] truncate">{selected ? selected.name : label}</span>
          <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 p-1 shadow-lg border border-slate-200 rounded-xl"
      >
        {loading ? (
          <div className="p-2 space-y-1">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                onSelect('');
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded text-[13px] ${!value ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
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
                className={`w-full text-left px-3 py-2 rounded text-[13px] truncate ${value === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
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

// ─── FilterPanel (hover-reveal strip) ────────────────────────────────────────
// Default hidden. Appears when cursor enters the trigger zone at top of table
// or user clicks the Filters button. Pushes content down with smooth transition.

function FilterPanel({
  show,
  filters,
  filterData,
}: {
  show: boolean;
  filters: ReturnType<typeof useFilters>;
  filterData: FiltersResponse['data'] | undefined;
}) {
  const {
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
    clientSpocId,
    setClientSpocId,
    createdById,
    setCreatedById,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    activeFiltersCount,
    clearAll,
  } = filters;

  const byStatus = filterData?.statusCounts ?? {};
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);

  return (
    <div className={`overflow-hidden transition-all duration-200 ${show ? 'max-h-48' : 'max-h-0'}`}>
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 space-y-2">
        {/* Status pills row */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setStatus('')}
            className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${!status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All <span className="ml-1 text-[11px] font-bold opacity-70">{total}</span>
          </button>
          {ALL_STATUSES.map(s => {
            const count = byStatus[s.key] ?? 0;
            if (count === 0 && status !== s.key) return null;
            const isActive = status === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatus(isActive ? '' : s.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
                {count > 0 && <span className="text-[11px] opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Dropdowns row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterData?.businessUnits?.length ? (
            <DropdownFilter
              label="BU"
              icon={<Building2 size={11} />}
              value={buId}
              items={filterData.businessUnits}
              onSelect={setBuId}
              allLabel="All BUs"
            />
          ) : null}
          {filterData?.serviceLines?.length ? (
            <DropdownFilter
              label="Service Line"
              icon={<Briefcase size={11} />}
              value={serviceLineId}
              items={filterData.serviceLines}
              onSelect={setServiceLineId}
              allLabel="All Lines"
            />
          ) : null}
          {filterData?.clients?.length ? (
            <DropdownFilter
              label="Client"
              icon={<Users size={11} />}
              value={clientId}
              items={filterData.clients}
              onSelect={setClientId}
              allLabel="All Clients"
            />
          ) : null}
          {filterData?.clientSpocs?.length ? (
            <DropdownFilter
              label="SPOC"
              icon={<UserCheck size={11} />}
              value={clientSpocId}
              items={filterData.clientSpocs}
              onSelect={setClientSpocId}
              allLabel="All SPOCs"
            />
          ) : null}
          <DropdownFilter
            label="Priority"
            icon={<Zap size={11} />}
            value={priority}
            items={(filterData?.priorities ?? ['HIGH', 'MEDIUM', 'LOW']).map(p => ({
              id: p,
              name: p,
            }))}
            onSelect={setPriority}
            allLabel="All Priorities"
          />
          {filterData?.createdBy?.length ? (
            <DropdownFilter
              label="Created By"
              icon={<Users size={11} />}
              value={createdById}
              items={filterData.createdBy}
              onSelect={setCreatedById}
              allLabel="Anyone"
            />
          ) : null}

          {/* Date range */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 px-2 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-slate-400 text-[12px]">→</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 px-2 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-2 py-1 text-[12px] text-red-500 hover:text-red-700 font-medium"
            >
              <X size={11} />
              Clear ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SaleValueSummaryBar ──────────────────────────────────────────────────────

function SaleValueSummaryBar({ stats }: { stats: SaleValueStats | undefined }) {
  if (!stats) return null;
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-emerald-50 border-b border-emerald-100 flex-wrap shrink-0">
      <div className="flex items-center gap-1.5">
        <TrendingUp size={13} className="text-emerald-600" />
        <span className="text-[12px] font-semibold text-emerald-700">Total Sale Value:</span>
        <span className="text-[13px] font-bold text-emerald-800 tabular-nums">
          {fmtCurrency(stats.totalSaleValue)}
        </span>
      </div>
      <span className="text-[11px] text-emerald-600">
        {stats.includedCount} computed
        {stats.omittedCount > 0 && (
          <span className="text-amber-600 ml-1 font-semibold">· {stats.omittedCount} no data</span>
        )}
        {stats.hiddenCount > 0 && (
          <span className="text-slate-400 ml-1">· {stats.hiddenCount} hidden (RBAC)</span>
        )}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {Object.entries(stats.byBasis)
          .filter(([, v]) => v.count > 0)
          .map(([k, v]) => {
            const b = SALE_BASIS_LABEL[k];
            return b ? (
              <span
                key={k}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${b.cls}`}
              >
                {b.label}: {fmtCurrency(v.total)} ({v.count})
              </span>
            ) : null;
          })}
      </div>
    </div>
  );
}

// ─── ExportButton ─────────────────────────────────────────────────────────────

function ExportButton({
  filters,
  visibleCols,
}: {
  filters: ReturnType<typeof useFilters>;
  visibleCols: Set<ColKey>;
}) {
  const axios = useAxios();
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.search) p.set('search', filters.search);
      if (filters.status) p.set('status', filters.status);
      if (filters.priority) p.set('priority', filters.priority);
      if (filters.serviceLineId) p.set('serviceLineId', filters.serviceLineId);
      if (filters.clientId) p.set('clientId', filters.clientId);
      if (filters.clientSpocId) p.set('clientSpocId', filters.clientSpocId);
      if (filters.buId) p.set('buId', filters.buId);
      if (filters.createdById) p.set('createdById', filters.createdById);
      if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) p.set('dateTo', filters.dateTo);
      // Pass visible columns so backend can optionally filter sheet
      p.set('cols', [...visibleCols].join(','));
      const res = await axios.get(`/requirements/export?${p}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `requirements-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-2.5 h-8 border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 shrink-0"
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
  useMemo(() => {
    setActiveStageId(stageId);
  }, [stageId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <p className="text-[12px] text-muted-foreground pb-2">
            {activeStage ? activeStage.label : 'All Stages'} · {total} candidate
            {total !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-1 flex-nowrap overflow-x-auto pb-3 scrollbar-none">
            <button
              onClick={() => setActiveStageId(null)}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium whitespace-nowrap shrink-0 ${!activeStageId ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
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
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-medium whitespace-nowrap shrink-0 ${isActive ? cls : 'border-border text-muted-foreground hover:bg-muted'}`}
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
                  className={`flex gap-3 px-5 py-4 border-b border-border/60 hover:bg-muted/30 cursor-pointer ${c.isRejected || c.isWithdrawn ? 'opacity-50' : ''}`}
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
                      </div>
                    </div>
                    {(snap.currentTitle || snap.currentCompany) && (
                      <p className="text-[11px] text-muted-foreground truncate mb-1">
                        {snap.currentTitle}
                        {snap.currentTitle && snap.currentCompany ? ' · ' : ''}
                        {snap.currentCompany}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
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
                    <div className="flex items-center justify-between mt-1">
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

// ─── ServiceLineTabs ──────────────────────────────────────────────────────────
// Tabs are derived purely from data — no hardcoding of TAAS/KAAS names.
// Each service line that exists in the filter data gets a tab.
// Selecting a tab auto-applies serviceLineId filter.
// Column set adapts: if the tab's reqs mostly use BAND → show band/agreement cols.
// If mostly SALE_VALUE → show reqSaleValue. Always show computedSaleValue.

function ServiceLineTabs({
  serviceLines,
  activeId,
  onSelect,
  statusCounts,
}: {
  serviceLines: ServiceLine[];
  activeId: string;
  onSelect: (id: string) => void;
  statusCounts: Record<string, number>;
}) {
  if (!serviceLines.length) return null;
  const total = Object.values(statusCounts).reduce((s, n) => s + n, 0);
  return (
    <div className="flex items-center gap-0 border-b border-slate-200 bg-white shrink-0 overflow-x-auto scrollbar-none px-4">
      {/* ALL tab */}
      <button
        onClick={() => onSelect('')}
        className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 ${!activeId ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
      >
        All
        <span
          className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${!activeId ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
        >
          {total}
        </span>
      </button>
      {serviceLines.map(sl => (
        <button
          key={sl.id}
          onClick={() => onSelect(activeId === sl.id ? '' : sl.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 ${activeId === sl.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {sl.name}
        </button>
      ))}
    </div>
  );
}

// ─── RequirementsTable — Excel-like frozen viewport ───────────────────────────
// • thead is sticky inside the scroll container — never leaves view
// • Action column is position: sticky left:0 — always visible while scrolling right
// • tbody rows never cause page scroll — all scroll happens inside this container

function RequirementsTable({
  requirements,
  visibleCols,
  allStages,
  canAdd,
  canDelete,
  canEdit,
  onAssign,
  onStageClick,
}: {
  requirements: Requirement[];
  visibleCols: Set<ColKey>;
  allStages: PipelineStage[];
  canAdd: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onAssign: (r: Requirement) => void;
  onStageClick: (r: Requirement, stageId: string) => void;
}) {
  const router = useRouter();
  const visibleColDefs = ALL_COLS.filter(c => visibleCols.has(c.key));
  const totalFixedWidth = visibleColDefs.reduce((s, c) => s + c.width, 0) + 120 + 8; // action col + stage col placeholder

  const openReq = (req: Requirement, newTab: boolean) => {
    const path = `/requirements/${req.slug ?? req.id}`;
    if (newTab) window.open(path, '_blank');
    else router.push(path);
  };

  const grpCls = (g?: string) => {
    if (g === 'client') return 'bg-blue-50/40';
    if (g === 'sale') return 'bg-emerald-50/40';
    return '';
  };
  const grpHeadCls = (g?: string) => {
    if (g === 'client') return 'bg-blue-50';
    if (g === 'sale') return 'bg-emerald-50';
    return 'bg-slate-50';
  };

  return (
    // This div is the scroll container — fixed height, scrolls both axes
    <div className="absolute inset-0 overflow-auto">
      <table
        className="border-collapse text-[12px]"
        style={{ minWidth: totalFixedWidth, width: '100%' }}
      >
        <thead className="sticky top-0 z-20">
          <tr className="border-b-2 border-slate-200">
            {/* Sticky action column header — narrow */}
            <th className="sticky left-0 z-30 bg-slate-50 text-center px-1 py-3 font-semibold text-[10px] uppercase tracking-wider text-slate-400 w-10 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
              •••
            </th>
            {/* Regular column headers */}
            {visibleColDefs.map((col, i) => {
              const prevGroup = i > 0 ? visibleColDefs[i - 1].group : undefined;
              const borderLeft = col.group !== prevGroup && col.group !== 'identity';
              return (
                <th
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  className={`px-3 py-3 font-semibold text-[10px] uppercase tracking-wider text-slate-400 text-left ${grpHeadCls(col.group)} ${borderLeft ? 'border-l border-slate-200' : ''}`}
                >
                  {col.label}
                  {col.key === 'reqSaleValue' && (
                    <div className="text-[8px] text-slate-400 font-normal normal-case tracking-normal">
                      manually entered
                    </div>
                  )}
                  {col.key === 'computedSaleValue' && (
                    <div className="text-[8px] text-slate-400 font-normal normal-case tracking-normal">
                      auto-calculated
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requirements.map(req => {
            const age = daysSince(req.createdAt);
            const isBreached = req.isRespondByBreached || req.isTurnaroundBreached;
            const totalPipeline =
              req._count?.pipelines ??
              (req.pipelineStageCounts ?? []).reduce((s, c) => s + c.count, 0);
            const stageCounts = req.pipelineStageCounts ?? [];

            return (
              <tr
                key={req.id}
                className={`group cursor-pointer bg-white hover:bg-slate-50/80 transition-colors ${isBreached ? 'border-l-[3px] border-l-red-500' : ''}`}
                onClick={() => openReq(req, false)}
              >
                {/* Sticky action cell — collapsed dot, expand on row hover */}
                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 border-r border-slate-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] w-10 p-0">
                  <div className="relative flex items-center justify-center h-full min-h-[44px]">
                    {/* Collapsed state — just a dot */}
                    <span className="group-hover:opacity-0 text-slate-300 text-[16px] leading-none select-none absolute transition-opacity duration-100">
                      ⋯
                    </span>
                    {/* Expanded on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-100 absolute flex items-center gap-0.5 px-1">
                      <RowActions
                        req={req}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onOpenNew={() => openReq(req, true)}
                      />
                    </div>
                  </div>
                </td>

                {/* Data cells */}
                {visibleColDefs.map((col, i) => {
                  const prevGroup = i > 0 ? visibleColDefs[i - 1].group : undefined;
                  const borderLeft = col.group !== prevGroup && col.group !== 'identity';
                  const bg = grpCls(col.group);

                  let cell: React.ReactNode = null;
                  switch (col.key) {
                    case 'code':
                      cell = (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(req.reqCode);
                          }}
                          title="Click to copy"
                          className="font-mono text-[10px] text-slate-400 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 px-1 py-0.5 rounded transition-colors"
                        >
                          {req.reqCode}
                        </button>
                      );
                      break;
                    case 'title':
                      cell = (
                        <div>
                          <p
                            className="font-semibold text-slate-900 text-[13px] leading-snug truncate"
                            style={{ maxWidth: 240 }}
                          >
                            {req.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {req.businessUnit?.name && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-sm bg-blue-300 inline-block" />
                                {req.businessUnit.name}
                              </span>
                            )}
                            {req.serviceLine?.name && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-sm bg-violet-300 inline-block" />
                                {req.serviceLine.name}
                              </span>
                            )}
                            {req.city && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <MapPin size={8} />
                                {req.city}
                              </span>
                            )}
                            {totalPipeline > 0 && (
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                {totalPipeline} in pipeline
                              </span>
                            )}
                          </div>
                        </div>
                      );
                      break;
                    case 'status':
                      cell = (
                        <div>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[req.status] ?? 'bg-slate-400 text-white'}`}
                          >
                            {STATUS_LABEL[req.status] ?? req.status}
                          </span>
                          {isBreached && (
                            <p className="text-[10px] text-red-500 font-medium mt-0.5">
                              ⚠ Breached
                            </p>
                          )}
                        </div>
                      );
                      break;
                    case 'priority':
                      cell = (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[req.priority] ?? ''}`}
                        >
                          {req.priority}
                        </span>
                      );
                      break;
                    case 'createdBy':
                      cell = req.createdBy ? (
                        <span
                          className="text-[12px] text-slate-500 truncate block"
                          style={{ maxWidth: 110 }}
                        >
                          {req.createdBy.firstName} {req.createdBy.lastName}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      );
                      break;
                    case 'client':
                      cell = (
                        <span
                          className="text-slate-800 text-[12px] font-medium truncate block"
                          style={{ maxWidth: 130 }}
                        >
                          {req.client?.name ?? <span className="text-slate-300">—</span>}
                        </span>
                      );
                      break;
                    case 'agreement':
                      cell = req.client?.agreementType ? (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${req.client.agreementType === 'BAND' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                        >
                          {req.client.agreementType === 'BAND' ? 'Band' : 'Fixed'}
                          {req.client.agreementType === 'FIXED' &&
                            req.client.percentageValue != null &&
                            ` ${req.client.percentageValue}%`}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      );
                      break;
                    case 'band':
                      cell = req.band ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {req.band.code}
                            {req.band.name ? ` · ${req.band.name}` : ''}
                          </span>
                          {req.band.value != null && (
                            <span className="text-[10px] text-slate-600 font-medium">
                              {fmtCurrency(req.band.value)}
                            </span>
                          )}
                          {req.band.rangeFrom != null && req.band.rangeTo != null && (
                            <span className="text-[10px] text-slate-400">
                              {fmtCurrency(req.band.rangeFrom)} – {fmtCurrency(req.band.rangeTo)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      );
                      break;
                    case 'salaryMin':
                      cell =
                        req.salaryMin != null ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] text-slate-700 font-semibold tabular-nums">
                              {fmtCurrency(req.salaryMin)}
                            </span>
                            {req.salaryType && (
                              <span className="text-[10px] text-slate-400">
                                /{req.salaryType.toLowerCase()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        );
                      break;
                    case 'salaryMax':
                      cell =
                        req.salaryMax != null ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] text-slate-700 font-semibold tabular-nums">
                              {fmtCurrency(req.salaryMax)}
                            </span>
                            {req.salaryType && (
                              <span className="text-[10px] text-slate-400">
                                /{req.salaryType.toLowerCase()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        );
                      break;
                    case 'reqSaleValue':
                      cell =
                        req.saleValue != null ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] font-bold text-slate-700 tabular-nums">
                              {fmtCurrency(req.saleValue)}
                            </span>
                            <span className="text-[9px] text-slate-400">per opening</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        );
                      break;
                    case 'computedSaleValue':
                      cell = <SaleValueCell req={req} />;
                      break;
                    case 'openings':
                      cell = (
                        <span className="font-bold text-slate-700 tabular-nums">
                          {req.totalOpenings}
                        </span>
                      );
                      break;
                    case 'age':
                      cell = (
                        <span
                          className={`font-semibold tabular-nums ${age > 30 ? 'text-red-500' : age > 14 ? 'text-amber-500' : 'text-slate-400'}`}
                        >
                          {age}d
                        </span>
                      );
                      break;
                    case 'assignedTo':
                      cell = <AssigneesCell req={req} canAdd={canAdd} onAssign={onAssign} />;
                      break;
                  }

                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 align-top ${bg} ${borderLeft ? 'border-l border-slate-100' : ''}`}
                      onClick={col.key === 'assignedTo' ? e => e.stopPropagation() : undefined}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="absolute inset-0 overflow-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-50 border-b-2 border-slate-200">
            {Array.from({ length: 12 }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: 15 }).map((_, i) => (
            <tr key={i} className="bg-white">
              {Array.from({ length: 12 }).map((_, j) => (
                <td key={j} className="px-3 py-3">
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

// ─── Main Page ────────────────────────────────────────────────────────────────

function RequirementsPageInner() {
  const axios = useAxios();
  const router = useRouter();
  const filters = useFilters();
  const {
    search,
    setSearch,
    viewMode,
    setViewMode,
    page,
    setPage,
    limit,
    setLimit,
    activeFiltersCount,
  } = filters;

  // Column visibility state
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(ALL_COLS.filter(c => c.defaultVisible).map(c => c.key))
  );
  const toggleCol = (k: ColKey) =>
    setVisibleCols(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  // Filter panel — hidden by default, shown on hover or button click
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);
  const showFilters = filterPinned || filterHovered;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{
    open: boolean;
    requirementId: string;
    requirementTitle: string;
    stageId: string | null;
  }>({
    open: false,
    requirementId: '',
    requirementTitle: '',
    stageId: null,
  });

  const handleAssign = useCallback(
    (req: Requirement) => {
      router.push(`/requirements/${req.slug ?? req.id}?tab=assignments`);
    },
    [router]
  );

  // Single filters API call
  const { data: filtersData } = useQuery({
    queryKey: ['requirements-filters'],
    queryFn: async () => (await axios.get('/requirements/filters')).data as FiltersResponse,
    staleTime: 5 * 60 * 1000,
  });

  // Pipeline stages
  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () =>
      (await axios.get('/pipeline-stages')).data?.data ?? ([] as PipelineStage[]),
    staleTime: 10 * 60 * 1000,
  });
  const allStages = ((stagesData as PipelineStage[]) ?? []).sort((a, b) => a.order - b.order);

  // Sale value stats — full dataset, no page/limit
  const saleStatsQs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.search) p.set('search', filters.search);
    if (filters.status) p.set('status', filters.status);
    if (filters.priority) p.set('priority', filters.priority);
    if (filters.serviceLineId) p.set('serviceLineId', filters.serviceLineId);
    if (filters.clientId) p.set('clientId', filters.clientId);
    if (filters.clientSpocId) p.set('clientSpocId', filters.clientSpocId);
    if (filters.buId) p.set('buId', filters.buId);
    if (filters.createdById) p.set('createdById', filters.createdById);
    if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) p.set('dateTo', filters.dateTo);
    return p.toString();
  }, [
    filters.search,
    filters.status,
    filters.priority,
    filters.serviceLineId,
    filters.clientId,
    filters.clientSpocId,
    filters.buId,
    filters.createdById,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const { data: saleStatsData } = useQuery({
    queryKey: ['sale-value-stats', saleStatsQs],
    queryFn: async () =>
      (await axios.get(`/requirements/sale-value-stats?${saleStatsQs}`)).data
        ?.data as SaleValueStats,
    staleTime: 30_000,
  });

  // Requirements list
  const qs = useMemo(() => {
    const p = new URLSearchParams(saleStatsQs);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p.toString();
  }, [saleStatsQs, page, limit]);

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

  // Smart column presets — derive from actual data in current tab, not hardcoded names.
  // If any requirement in view has a band → show band cols.
  // If any has percentageValue on client → show agreement col.
  // If none have salaryMax → hide salaryMax col to reduce noise.
  // This runs once when data loads; user can still override via the Columns panel.
  const prevServiceLineId = useMemo(() => filters.serviceLineId, []); // eslint-disable-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (!requirements.length) return;
    const hasBand = requirements.some(r => r.band != null);
    const hasPct = requirements.some(r => r.client?.percentageValue != null);
    const hasSalMax = requirements.some(r => r.salaryMax != null);
    const hasSalMin = requirements.some(r => r.salaryMin != null);
    const hasReqSale = requirements.some(r => r.saleValue != null);

    setVisibleCols(prev => {
      const n = new Set(prev);
      // Band cols — show only if data has bands
      if (!hasBand) {
        n.delete('band');
        n.delete('agreement');
      } else {
        n.add('band');
        n.add('agreement');
      }
      // Salary cols — show only if data has them
      if (!hasSalMin) n.delete('salaryMin');
      else n.add('salaryMin');
      if (!hasSalMax) n.delete('salaryMax');
      else n.add('salaryMax');
      // Req sale value — show only if directly entered sale values exist
      if (!hasReqSale) n.delete('reqSaleValue');
      else n.add('reqSaleValue');
      // computedSaleValue always visible
      n.add('computedSaleValue');
      return n;
    });
  }, [filters.serviceLineId, requirements.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    // Outer container — full viewport, nothing overflows
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          {/* Filter toggle button */}
          <button
            onClick={() => setFilterPinned(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 h-8 border rounded-lg text-[12px] font-medium transition-all shrink-0 ${filterPinned || activeFiltersCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 text-[11px] font-bold bg-primary text-white rounded-full px-1.5">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Search */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, code, skill…"
              className="pl-7 h-8 text-sm w-52 bg-slate-50 border-slate-200 focus:bg-white"
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

          {/* Count */}
          <span className="text-[13px] text-slate-500 font-medium whitespace-nowrap">
            {reqLoading ? '…' : `${total.toLocaleString()} found`}
          </span>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('table')}
              title="Table view"
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Table2 size={14} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Card view"
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutList size={14} />
            </button>
          </div>

          {/* Column visibility */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                title="Show/hide columns"
                className="flex items-center gap-1.5 px-2.5 h-8 border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <Columns3 size={13} /> Columns
                {visibleCols.size < ALL_COLS.length && (
                  <span className="text-[10px] text-amber-600 font-bold ml-0.5">
                    {ALL_COLS.length - visibleCols.size} hidden
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="p-0 shadow-xl border border-slate-200 rounded-xl overflow-hidden"
            >
              <ColumnVisibilityPanel visible={visibleCols} onChange={toggleCol} />
            </PopoverContent>
          </Popover>

          {/* Export */}
          <ExportButton filters={filters} visibleCols={visibleCols} />

          {/* Add buttons */}
          {canAdd && (
            <>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 shrink-0"
                onClick={() => router.push('/requirements/new')}
              >
                <Plus size={14} />
                Add Job
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 shrink-0"
                onClick={() => router.push('/requirements/bulk')}
              >
                <Plus size={14} />
                Bulk Upload
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Filter panel — hover-reveal zone ── */}
      {/* Hovering over a thin trigger zone at top shows filters without clicking */}
      <div onMouseEnter={() => setFilterHovered(true)} onMouseLeave={() => setFilterHovered(false)}>
        <FilterPanel show={showFilters} filters={filters} filterData={filtersData?.data} />
      </div>

      {/* ── Sale value stats bar ── */}
      <SaleValueSummaryBar stats={saleStatsData} />

      {/* ── Active filter chips (compact) ── */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex-wrap shrink-0">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Filters:</span>
          {filters.status && (
            <FilterChip
              label={STATUS_LABEL[filters.status] ?? filters.status}
              onRemove={() => filters.setStatus('')}
            />
          )}
          {filters.priority && (
            <FilterChip label={filters.priority} onRemove={() => filters.setPriority('')} />
          )}
          {filters.buId && filtersData?.data?.businessUnits && (
            <FilterChip
              label={
                filtersData.data.businessUnits.find(b => b.id === filters.buId)?.name ??
                filters.buId
              }
              onRemove={() => filters.setBuId('')}
            />
          )}
          {filters.serviceLineId && filtersData?.data?.serviceLines && (
            <FilterChip
              label={
                filtersData.data.serviceLines.find(s => s.id === filters.serviceLineId)?.name ??
                filters.serviceLineId
              }
              onRemove={() => filters.setServiceLineId('')}
            />
          )}
          {filters.clientId && filtersData?.data?.clients && (
            <FilterChip
              label={
                filtersData.data.clients.find(c => c.id === filters.clientId)?.name ??
                filters.clientId
              }
              onRemove={() => filters.setClientId('')}
            />
          )}
          {filters.clientSpocId && filtersData?.data?.clientSpocs && (
            <FilterChip
              label={
                filtersData.data.clientSpocs.find(s => s.id === filters.clientSpocId)?.name ??
                filters.clientSpocId
              }
              onRemove={() => filters.setClientSpocId('')}
            />
          )}
          {filters.createdById && filtersData?.data?.createdBy && (
            <FilterChip
              label={
                filtersData.data.createdBy.find(u => u.id === filters.createdById)?.name ??
                filters.createdById
              }
              onRemove={() => filters.setCreatedById('')}
            />
          )}
          {filters.dateFrom && (
            <FilterChip
              label={`From ${filters.dateFrom}`}
              onRemove={() => filters.setDateFrom('')}
            />
          )}
          {filters.dateTo && (
            <FilterChip label={`Until ${filters.dateTo}`} onRemove={() => filters.setDateTo('')} />
          )}
          <button
            onClick={filters.clearAll}
            className="text-[11px] text-red-500 hover:text-red-700 font-medium flex items-center gap-0.5 ml-1"
          >
            <X size={10} />
            Clear all
          </button>
        </div>
      )}

      {/* ── Service line tabs ── */}
      <ServiceLineTabs
        serviceLines={filtersData?.data?.serviceLines ?? []}
        activeId={filters.serviceLineId}
        onSelect={filters.setServiceLineId}
        statusCounts={filtersData?.data?.statusCounts ?? {}}
      />

      {/* ── Main content — this is the bounded, scrollable zone ── */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {reqLoading ? (
          <TableSkeleton />
        ) : requirements.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <Briefcase size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No requirements found</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={filters.clearAll}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <RequirementsTable
            requirements={requirements}
            visibleCols={visibleCols}
            allStages={allStages}
            canAdd={canAdd}
            canDelete={canDelete}
            canEdit={canEdit}
            onAssign={handleAssign}
            onStageClick={(req, stageId) =>
              setDrawer({ open: true, requirementId: req.id, requirementTitle: req.title, stageId })
            }
          />
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
        <div className="flex items-center gap-1 text-[12px] text-slate-500 ml-auto">
          <span className="mr-2 text-slate-400">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
          </span>
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30"
          >
            «
          </button>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30"
          >
            ‹
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50 disabled:opacity-30"
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600 font-medium hover:border-red-300 hover:text-red-500 transition-colors"
    >
      {label}
      <X size={9} />
    </button>
  );
}

export default function RequirementsPage() {
  return (
    <Suspense fallback={null}>
      <RequirementsPageInner />
    </Suspense>
  );
}
