/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// =============================================================================
// /naukri-capture-logs  —  Naukri capture monitor
//
// Same purpose and visual pattern as /ingest-logs, but for the 3 Naukri APIs
// (profile view / phone reveal / resume download) instead of the single
// legacy/manual/bulk resume-ingest flow. One row per recruiter:
//   name · total attempts · by capture type (profile/phone/resume) ·
//   success · failed · complete (all 3 steps, same candidate) · success rate.
// Click a recruiter → drawer with their individual attempts + failure detail.
//
// Defaults to TODAY, since this data is meant to be checked live during the
// day (unlike the reconciliation numbers, which depend on an admin-uploaded
// report and are only meaningful for finished/past days).
//
// Data:
//   Aggregates → GET /candidate/api/naukri/capture-logs?include=stats,byRecruiter
//   Drill-down → GET /candidate/api/naukri/capture-logs?include=list&recruiterId=…
//
// CHANGES (frontend-only, no functionality removed/altered elsewhere):
//   1. Drawer summary chips (Total/Success/Failed/Complete) are now clickable
//      and filter the attempts list below them, instead of just being a
//      static readout you had to scroll past to find failures.
//   2. The top search box's value is now also passed into the drawer's
//      attempts query — previously it only affected the recruiter breakdown
//      table's aggregate numbers, never the drawer's own attempts list, so
//      searching while a drawer was open appeared to "do nothing".
// =============================================================================

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  X,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  UserCircle,
  Phone,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

type CaptureType = 'PROFILE' | 'PHONE_REVEAL' | 'RESUME';
type CaptureStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';

// Per-recruiter aggregate row (from getByRecruiter, grouped by recruiter+captureType+status)
interface RecruiterAgg {
  recruiterId: string;
  total: number;
  status: Record<string, number>; // { SUCCESS, FAILED, PARTIAL }
  captureType: Record<string, number>; // { PROFILE, PHONE_REVEAL, RESUME }
  complete: number; // candidates with all 3 steps SUCCESS, same filters
}

interface LogStats {
  total: number;
  successRate: number;
  byStatus: Record<string, number>;
  byCaptureType: Record<string, number>;
  failuresByReason: Record<string, number>;
  avgDurationMs: number;
}

interface AggResponse {
  success: boolean;
  stats?: LogStats;
  byRecruiter?: RecruiterAgg[];
}

interface AttemptRow {
  id: string;
  captureType: CaptureType;
  status: CaptureStatus;
  resId: string | null;
  candidateId: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  requirementId: string | null;
  reqCode: string | null;
  failureReason: string | null;
  failureDetail: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface AttemptResponse {
  success: boolean;
  rows: AttemptRow[];
  pagination: { total: number };
}

interface RecruiterLite {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  CaptureStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  SUCCESS: {
    label: 'Success',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    icon: AlertTriangle,
  },
  PARTIAL: {
    label: 'Partial',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-500',
    icon: Info,
  },
};

const CAPTURE_TYPE_META: Record<
  CaptureType,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  PROFILE: {
    label: 'Profile',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    icon: UserCircle,
  },
  PHONE_REVEAL: {
    label: 'Phone',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    icon: Phone,
  },
  RESUME: {
    label: 'Resume',
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    icon: FileText,
  },
};

const STATUS_OPTIONS: CaptureStatus[] = ['SUCCESS', 'FAILED', 'PARTIAL'];
const CAPTURE_TYPE_OPTIONS: CaptureType[] = ['PROFILE', 'PHONE_REVEAL', 'RESUME'];

function todayRange(): DateRange {
  const t = new Date();
  return { from: t, to: t };
}

const PRESETS = [
  { label: 'Today', from: () => new Date(), to: () => new Date() },
  { label: 'Yesterday', from: () => subDays(new Date(), 1), to: () => subDays(new Date(), 1) },
  { label: 'Last 7 days', from: () => subDays(new Date(), 6), to: () => new Date() },
  { label: 'Last 30 days', from: () => subDays(new Date(), 29), to: () => new Date() },
  { label: 'This month', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  { label: 'This year', from: () => startOfYear(new Date()), to: () => new Date() },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function nameInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function fmtApi(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

// ─── Small badges ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CaptureStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.FAILED;
  const Icon = m.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
        m.bg,
        m.text
      )}
    >
      <Icon size={10} />
      {m.label}
    </span>
  );
}

function CaptureTypeBadge({ captureType }: { captureType: CaptureType }) {
  const m = CAPTURE_TYPE_META[captureType];
  if (!m) return null;
  const Icon = m.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium',
        m.bg,
        m.text
      )}
    >
      <Icon size={10} />
      {m.label}
    </span>
  );
}

// ─── Date Range Picker ─────────────────────────────────────────────────────────

function DateRangePicker({
  range,
  onChange,
}: {
  range: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    range?.from && range?.to
      ? range.from.getTime() === range.to.getTime()
        ? format(range.from, 'dd MMM yyyy')
        : `${format(range.from, 'dd MMM yy')} – ${format(range.to, 'dd MMM yy')}`
      : range?.from
        ? `From ${format(range.from, 'dd MMM yy')}`
        : 'All time';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-medium',
            range?.from && 'border-primary/40 bg-primary/5 text-primary'
          )}
        >
          <CalendarIcon size={13} />
          {label}
          {range?.from && (
            <span
              role="button"
              aria-label="Clear date range"
              onClick={e => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={11} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-0.5 border-r border-border p-3 w-32">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1 px-1">
              Quick select
            </p>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  onChange({ from: p.from(), to: p.to() });
                  setOpen(false);
                }}
                className="text-left px-2 py-1.5 rounded-md text-[12px] text-foreground hover:bg-muted transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={onChange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              initialFocus
            />
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => onChange(undefined)}
              >
                Clear
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Recruiter drill-down drawer (individual attempts + failure detail) ───────

interface RecruiterRow extends RecruiterAgg {
  name: string;
}

// Which summary chip is currently active, filtering the attempts list below.
type DrawerFilter = 'ALL' | 'SUCCESS' | 'FAILED' | 'COMPLETE';

function RecruiterDrawer({
  recruiter,
  dateFrom,
  dateTo,
  search,
  onClose,
}: {
  recruiter: RecruiterRow | null;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  onClose: () => void;
}) {
  const axios = useAxios();

  // CHANGE 2: which chip is active. Resetting this back to "ALL" whenever a
  // different recruiter's drawer opens is handled by giving this component a
  // `key={recruiter.recruiterId}` where it's rendered (see below in
  // NaukriCaptureLogsContent) — React remounts the component on key change,
  // which gives us a fresh 'ALL' state for free. (Not done via useEffect +
  // setState here — that pattern triggers an avoidable extra render and an
  // eslint react-hooks/set-state-in-effect warning.)
  const [drawerFilter, setDrawerFilter] = useState<DrawerFilter>('ALL');

  const attemptsQs = useMemo(() => {
    if (!recruiter) return '';
    const p = new URLSearchParams();
    p.set('include', 'list');
    p.set('recruiterId', recruiter.recruiterId);
    p.set('pageSize', '100');
    p.set('sortBy', 'createdAt');
    p.set('sortDir', 'desc');
    if (dateFrom) p.set('from', dateFrom);
    if (dateTo) p.set('to', dateTo);
    // CHANGE 1: the top search box's value now reaches the drawer's own
    // attempts query too — previously this param was never sent here, so
    // typing a candidate name/email while a drawer was open had no effect.
    if (search) p.set('search', search);
    return p.toString();
  }, [recruiter, dateFrom, dateTo, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['naukri-recruiter-attempts', attemptsQs],
    enabled: !!recruiter,
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/naukri/capture-logs?${attemptsQs}`, {
          baseURL: '/api/proxy',
          withCredentials: true,
          headers: { 'Content-Type': undefined },
          transformRequest: (d: any) => d,
        })
      ).data,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const attempts: AttemptRow[] = data?.list?.rows ?? [];

  // CHANGE 2: resIds that have all 3 capture types SUCCEEDED, computed from
  // whatever attempts are currently loaded — used to power the "Complete"
  // chip filter below.
  const completeResIds = useMemo(() => {
    const byResId = new Map<string, Set<CaptureType>>();
    for (const a of attempts) {
      if (!a.resId || a.status !== 'SUCCESS') continue;
      const set = byResId.get(a.resId) ?? new Set<CaptureType>();
      set.add(a.captureType);
      byResId.set(a.resId, set);
    }
    const complete = new Set<string>();
    for (const [resId, types] of byResId) {
      if (types.has('PROFILE') && types.has('PHONE_REVEAL') && types.has('RESUME')) {
        complete.add(resId);
      }
    }
    return complete;
  }, [attempts]);

  // CHANGE 2: apply the active chip filter to the attempts actually rendered.
  const filteredAttempts = useMemo(() => {
    switch (drawerFilter) {
      case 'SUCCESS':
        return attempts.filter(a => a.status === 'SUCCESS');
      case 'FAILED':
        return attempts.filter(a => a.status === 'FAILED');
      case 'COMPLETE':
        return attempts.filter(a => a.resId && completeResIds.has(a.resId));
      default:
        return attempts;
    }
  }, [attempts, drawerFilter, completeResIds]);

  if (!recruiter) return null;

  const success = recruiter.status.SUCCESS ?? 0;
  const rate = pct(success, recruiter.total);

  // CHANGE 2: each summary chip now maps to a DrawerFilter value so it can
  // be clicked to filter the list below.
  const summary: {
    key: string;
    label: string;
    count: number;
    color: string;
    filter: DrawerFilter;
  }[] = [
    {
      key: 'total',
      label: 'Total',
      count: recruiter.total,
      color: 'hsl(var(--foreground))',
      filter: 'ALL',
    },
    { key: 'success', label: 'Success', count: success, color: '#10B981', filter: 'SUCCESS' },
    {
      key: 'failed',
      label: 'Failed',
      count: recruiter.status.FAILED ?? 0,
      color: '#E24B4A',
      filter: 'FAILED',
    },
    {
      key: 'complete',
      label: 'Complete',
      count: recruiter.complete,
      color: '#10B981',
      filter: 'COMPLETE',
    },
  ];

  const filterLabel =
    drawerFilter === 'SUCCESS'
      ? 'success'
      : drawerFilter === 'FAILED'
        ? 'failed'
        : drawerFilter === 'COMPLETE'
          ? 'complete'
          : '';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 animate-in fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[460px] max-w-[92vw] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right">
        {/* header */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold shrink-0">
                {nameInitials(recruiter.name)}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">
                  {recruiter.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {recruiter.total} attempts · {rate}% success · {recruiter.complete} complete
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted shrink-0"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* summary chips — CHANGE 2: now clickable, filter the list below */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {summary.map(s => {
              const active = drawerFilter === s.filter;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setDrawerFilter(active ? 'ALL' : s.filter)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-muted/60 transition-all',
                    'hover:bg-muted cursor-pointer',
                    active && 'ring-1 ring-offset-0'
                  )}
                  style={{
                    color: s.color,
                    boxShadow: active ? `inset 0 0 0 1px ${s.color}` : undefined,
                  }}
                  aria-pressed={active}
                >
                  {s.label}
                  <span className="opacity-50">·</span>
                  {s.count}
                </button>
              );
            })}
          </div>

          {/* capture type split */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {CAPTURE_TYPE_OPTIONS.filter(c => (recruiter.captureType[c] ?? 0) > 0).map(c => (
              <span
                key={c}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                  CAPTURE_TYPE_META[c].bg,
                  CAPTURE_TYPE_META[c].text
                )}
              >
                {CAPTURE_TYPE_META[c].label}
                <span className="opacity-50">·</span>
                {recruiter.captureType[c]}
              </span>
            ))}
          </div>
        </div>

        {/* attempts list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Attempts (newest first)
              </p>
              {drawerFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setDrawerFilter('ALL')}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                >
                  <X size={10} />
                  Clear filter
                </button>
              )}
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredAttempts.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-8 text-center">
                {attempts.length === 0
                  ? 'No attempts in this period'
                  : `No ${filterLabel} attempts in this period`}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredAttempts.map(a => {
                  const isBad = a.status === 'FAILED';
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded-lg border p-3',
                        isBad ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-border bg-muted/30'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <StatusBadge status={a.status} />
                          <CaptureTypeBadge captureType={a.captureType} />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(a.createdAt), 'dd MMM HH:mm')}
                        </span>
                      </div>

                      <p className="text-[12px] text-foreground truncate">
                        {a.candidateName ??
                          (a.resId ? `Candidate resId: ${a.resId}` : 'No candidate identity')}
                        {a.reqCode && (
                          <span className="text-muted-foreground text-[11px] ml-1.5">
                            · {a.reqCode}
                          </span>
                        )}
                      </p>
                      {a.candidateEmail && (
                        <p className="text-[11px] text-muted-foreground -mt-0.5">
                          {a.candidateEmail}
                        </p>
                      )}

                      {a.failureReason && (
                        <p
                          className={cn(
                            'text-[11px] mt-1',
                            isBad ? 'text-red-500' : 'text-muted-foreground'
                          )}
                        >
                          {a.failureReason}
                        </p>
                      )}
                      {a.failureDetail && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                          {a.failureDetail}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{fmtDuration(a.durationMs)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Filters model ─────────────────────────────────────────────────────────────

interface Filters {
  dateRange: DateRange | undefined;
  recruiterId: string;
  requirementId: string;
  reqCode: string;
  captureType: string;
  status: string;
  search: string;
}

function defaultFilters(): Filters {
  return {
    dateRange: todayRange(), // ← default: today (live monitoring, unlike ingest-logs' "yesterday")
    recruiterId: '',
    requirementId: '',
    reqCode: '',
    captureType: '',
    status: '',
    search: '',
  };
}

type SortKey = 'total' | 'success' | 'failed' | 'complete';

// ─── Main ─────────────────────────────────────────────────────────────────────

function NaukriCaptureLogsContent() {
  const axios = useAxios();

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<RecruiterRow | null>(null);
  const debouncedSearch = useDebounced(filters.search);

  const dateFrom = filters.dateRange?.from ? fmtApi(filters.dateRange.from) : undefined;
  const dateTo = filters.dateRange?.to ? fmtApi(filters.dateRange.to) : undefined;

  const aggQs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('include', 'stats,byRecruiter');
    if (dateFrom) p.set('from', dateFrom);
    if (dateTo) p.set('to', dateTo);
    if (filters.recruiterId) p.set('recruiterId', filters.recruiterId);
    if (filters.requirementId) p.set('requirementId', filters.requirementId);
    if (filters.reqCode) p.set('reqCode', filters.reqCode);
    if (filters.captureType) p.set('captureType', filters.captureType);
    if (filters.status) p.set('status', filters.status);
    if (debouncedSearch) p.set('search', debouncedSearch);
    return p.toString();
  }, [dateFrom, dateTo, filters, debouncedSearch]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['naukri-capture-logs-agg', aggQs],
    queryFn: async () =>
      (
        await axios.get(`/candidate/api/naukri/capture-logs?${aggQs}`, {
          baseURL: '/api/proxy',
        })
      ).data as AggResponse,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  // recruiter names — client-side lookup, same convention as ingest-logs.
  // /core/api/users/lite is paginated server-side (meta.total / meta.pages),
  // so we walk every page here to build the full, always-current roster —
  // nothing hardcoded, this just makes sure new hires show up automatically.
  const { data: recruiters } = useQuery({
    queryKey: ['recruiters-lite'],
    queryFn: async () => {
      let page = 1;
      let all: any[] = [];
      while (true) {
        // FIX: this call was 400ing (Bad Request) on every page — the shared
        // axios instance was attaching a form-data content-type to this GET
        // request. Same fix already applied a few dozen lines up in this
        // file for the RecruiterDrawer's attempts fetch; this call just
        // hadn't been given the same override yet.
        const res = await axios.get('/core/api/users', {
          baseURL: '/api/proxy',
          params: { page, limit: 100 },
          headers: { 'Content-Type': undefined },
          transformRequest: (d: any) => d,
        });
        const body = res.data;
        all = all.concat(body.data ?? []);
        const totalPages = body.meta?.pages ?? body.pagination?.totalPages ?? 1;
        if (page >= totalPages || !body.data?.length) break;
        page++;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });
  const nameFor = (id: string) => {
    const r = recruiters?.find((r: any) => r.id === id);
    if (!r) return id.slice(0, 8);
    return (
      (r.displayName || `${r.firstName ?? ''} ${r.lastName ?? ''}`).trim() ||
      r.email ||
      id.slice(0, 8)
    );
  };

  const stats = data?.stats;
  const rows: RecruiterRow[] = (data?.byRecruiter ?? []).map(r => ({
    ...r,
    name: nameFor(r.recruiterId),
  }));

  const sortedRows = useMemo(() => {
    const withMetric = rows.map(r => ({
      ...r,
      success: r.status.SUCCESS ?? 0,
      failed: r.status.FAILED ?? 0,
    }));
    return withMetric.sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      return (a[sortBy] - b[sortBy]) * mult;
    });
  }, [rows, sortBy, sortDir]);

  const hasFilters =
    !!filters.recruiterId ||
    !!filters.requirementId ||
    !!filters.reqCode ||
    !!filters.captureType ||
    !!filters.status ||
    !!filters.search;

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* ── header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-foreground">Naukri capture monitor</h1>
            <p className="text-[12px] text-muted-foreground">
              Per-recruiter profile view / phone reveal / resume download activity
              {dateFrom && dateTo && dateFrom === dateTo
                ? ` for ${format(new Date(dateFrom), 'dd MMM yyyy')}`
                : ''}
              . Click a recruiter for their attempts and errors.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* ── filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <DateRangePicker
          range={filters.dateRange}
          onChange={r => setFilters(f => ({ ...f, dateRange: r }))}
        />

        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Candidate name / email / resId"
            className="pl-8 h-8 w-64 text-xs"
          />
        </div>

        <Select
          value={filters.captureType || '__all__'}
          onValueChange={v => setFilters(f => ({ ...f, captureType: v === '__all__' ? '' : v }))}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              All types
            </SelectItem>
            {CAPTURE_TYPE_OPTIONS.map(c => (
              <SelectItem key={c} value={c} className="text-xs">
                {CAPTURE_TYPE_META[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || '__all__'}
          onValueChange={v => setFilters(f => ({ ...f, status: v === '__all__' ? '' : v }))}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              All status
            </SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s} className="text-xs">
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={filters.reqCode}
          onChange={e => setFilters(f => ({ ...f, reqCode: e.target.value }))}
          placeholder="Req code"
          className="h-8 w-28 text-xs"
        />

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground gap-1"
            onClick={() => setFilters(defaultFilters())}
          >
            <X size={12} />
            Clear
          </Button>
        )}
      </div>

      {/* ── stat cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total attempts
              </p>
              <p className="text-2xl font-black mt-1">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {sortedRows.length} recruiters active
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Success rate
              </p>
              <p className="text-2xl font-black mt-1 text-emerald-600">{stats.successRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stats.byStatus.SUCCESS ?? 0} succeeded
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Profile views
              </p>
              <p className="text-2xl font-black mt-1 text-blue-600">
                {stats.byCaptureType.PROFILE ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Phone reveals
              </p>
              <p className="text-2xl font-black mt-1 text-violet-600">
                {stats.byCaptureType.PHONE_REVEAL ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Resume downloads
              </p>
              <p className="text-2xl font-black mt-1 text-sky-600">
                {stats.byCaptureType.RESUME ?? 0}
              </p>
            </div>
          </div>
        )
      )}

      {/* ── recruiter breakdown table ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-foreground">Recruiter breakdown</p>
          <p className="text-[11px] text-muted-foreground">
            click a recruiter for attempts & errors
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="py-14 text-center text-[12px] text-muted-foreground">
            No capture activity for this period.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left font-semibold px-4 py-2">Recruiter</th>
                {(['total', 'success', 'failed', 'complete'] as SortKey[]).map(key => (
                  <th
                    key={key}
                    className="text-right font-semibold px-3 py-2 cursor-pointer select-none"
                    onClick={() => toggleSort(key)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {key === 'total'
                        ? 'Total'
                        : key === 'success'
                          ? 'Success'
                          : key === 'failed'
                            ? 'Failed'
                            : 'Complete'}
                      {sortBy === key &&
                        (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </span>
                  </th>
                ))}
                <th className="text-left font-semibold px-4 py-2">Types</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(r => {
                const success = r.status.SUCCESS ?? 0;
                const failed = r.status.FAILED ?? 0;
                return (
                  <tr
                    key={r.recruiterId}
                    className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                          {nameInitials(r.name)}
                        </span>
                        <span className="font-medium text-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{r.total}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                      {success}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-red-600">
                      {failed || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-emerald-600">
                      {r.complete}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {CAPTURE_TYPE_OPTIONS.filter(c => (r.captureType[c] ?? 0) > 0).map(c => (
                          <CaptureTypeBadge key={c} captureType={c} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <RecruiterDrawer
        key={selected?.recruiterId ?? 'none'}
        recruiter={selected}
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={debouncedSearch}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export default function NaukriCaptureLogsPage() {
  const { user } = useAuth();

  // Gate — same pattern as ScrollingGreetingBar.tsx's useAuth() usage, and the
  // same isSuperAdmin field already used server-side in
  // naukriAccountability.helpers.ts's resolveViewerScope. This page shows raw
  // per-recruiter capture attempts/failures — super admin only, not for
  // general recruiter or delivery-lead access.
  if (!user?.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Restricted</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          This page is only available to super admins.
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      }
    >
      <NaukriCaptureLogsContent />
    </Suspense>
  );
}
