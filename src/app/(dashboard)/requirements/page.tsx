'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';

// import useAxios from '@/hooks/useAxios';
import type {
  RequirementFilters,
  RequirementListItem,
  RequirementListResponse,
  RequirementStatsResponse,
  RequirementStatus,
} from '@/types/requirements.types';
import { useAxios } from '@/hooks/useAxios';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: RequirementStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const VALID_TRANSITIONS: Record<RequirementStatus, RequirementStatus[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['ON_HOLD', 'CLOSED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

const DEFAULT_FILTERS: RequirementFilters = {
  search: '',
  status: '',
  priority: '',
  jobType: '',
  remoteType: '',
  clientId: '',
  buId: '',
  createdById: '',
  assignedTeamId: '',
  assignedToMe: false,
  breached: false,
  respondByFrom: '',
  respondByTo: '',
  startDateFrom: '',
  startDateTo: '',
  createdFrom: '',
  createdTo: '',
  page: 1,
  limit: 25,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusVariant(s: RequirementStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'ACTIVE':
      return 'default';
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 'secondary';
    case 'CLOSED':
    case 'CANCELLED':
      return 'destructive';
    case 'ON_HOLD':
      return 'outline';
  }
}

function priorityVariant(p: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (p) {
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'secondary';
    default:
      return 'outline';
  }
}

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function countActiveFilters(f: RequirementFilters): number {
  let n = 0;
  if (f.status) n++;
  if (f.priority) n++;
  if (f.jobType) n++;
  if (f.remoteType) n++;
  if (f.clientId) n++;
  if (f.buId) n++;
  if (f.createdById) n++;
  if (f.assignedTeamId) n++;
  if (f.assignedToMe) n++;
  if (f.breached) n++;
  if (f.respondByFrom || f.respondByTo) n++;
  if (f.startDateFrom || f.startDateTo) n++;
  if (f.createdFrom || f.createdTo) n++;
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number | string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${alert ? 'text-destructive' : ''}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 9 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function RowActions({
  req,
  canEdit,
  onStatusChange,
  onView,
  onEdit,
}: {
  req: RequirementListItem;
  canEdit: boolean;
  onStatusChange: (req: RequirementListItem, to: RequirementStatus) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const transitions = VALID_TRANSITIONS[req.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
          ···
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(req.id)}>View detail</DropdownMenuItem>
        {canEdit && <DropdownMenuItem onClick={() => onEdit(req.id)}>Edit</DropdownMenuItem>}
        {canEdit && transitions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {transitions.map(to => (
              <DropdownMenuItem key={to} onClick={() => onStatusChange(req, to)}>
                Move to {STATUS_OPTIONS.find(s => s.value === to)?.label ?? to}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter sheet — all advanced filters
// ─────────────────────────────────────────────────────────────────────────────

function FilterSheet({
  filters,
  setFilter,
  onClear,
  activeCount,
  clients,
  businessUnits,
}: {
  filters: RequirementFilters;
  setFilter: <K extends keyof RequirementFilters>(k: K, v: RequirementFilters[K]) => void;
  onClear: () => void;
  activeCount: number;
  clients: { id: string; name: string }[];
  businessUnits: { id: string; name: string }[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Status */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
            <Select
              value={filters.status || '_'}
              onValueChange={v => setFilter('status', v === '_' ? '' : (v as RequirementStatus))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All statuses</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Priority
            </Label>
            <Select
              value={filters.priority || '_'}
              onValueChange={v =>
                setFilter('priority', v === '_' ? '' : (v as 'LOW' | 'MEDIUM' | 'HIGH'))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All priorities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job type */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Job type
            </Label>
            <Select
              value={filters.jobType || '_'}
              onValueChange={v =>
                setFilter('jobType', v === '_' ? '' : (v as RequirementFilters['jobType']))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All types</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="PERMANENT">Permanent</SelectItem>
                <SelectItem value="CONTRACT_TO_HIRE">Contract to hire</SelectItem>
                <SelectItem value="FREELANCE">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Remote */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Remote type
            </Label>
            <Select
              value={filters.remoteType || '_'}
              onValueChange={v =>
                setFilter('remoteType', v === '_' ? '' : (v as RequirementFilters['remoteType']))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All</SelectItem>
                <SelectItem value="ONSITE">Onsite</SelectItem>
                <SelectItem value="REMOTE">Remote</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Client</Label>
            <Select
              value={filters.clientId || '_'}
              onValueChange={v => setFilter('clientId', v === '_' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All clients</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* BU */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Business unit
            </Label>
            <Select
              value={filters.buId || '_'}
              onValueChange={v => setFilter('buId', v === '_' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All BUs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All BUs</SelectItem>
                {businessUnits.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Respond by range */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Respond by
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">From</span>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.respondByFrom}
                  onChange={e => setFilter('respondByFrom', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">To</span>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.respondByTo}
                  onChange={e => setFilter('respondByTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Start date range */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Start date
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">From</span>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.startDateFrom}
                  onChange={e => setFilter('startDateFrom', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">To</span>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.startDateTo}
                  onChange={e => setFilter('startDateTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Created at range */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Created</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">From</span>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.createdFrom}
                  onChange={e => setFilter('createdFrom', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">To</span>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.createdTo}
                  onChange={e => setFilter('createdTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Quick filters
            </Label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setFilter('assignedToMe', !filters.assignedToMe)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                  filters.assignedToMe
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-foreground hover:bg-muted/50'
                }`}
              >
                Assigned to me
                {filters.assignedToMe && <span className="text-xs">✓</span>}
              </button>
              <button
                onClick={() => setFilter('breached', !filters.breached)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                  filters.breached
                    ? 'border-destructive bg-destructive/5 text-destructive'
                    : 'border-border text-foreground hover:bg-muted/50'
                }`}
              >
                Breached only
                {filters.breached && <span className="text-xs">✓</span>}
              </button>
            </div>
          </div>
        </div>

        <SheetFooter className="px-5 py-4 border-t">
          {activeCount > 0 && (
            <Button variant="outline" className="w-full" onClick={onClear}>
              Clear all filters
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RequirementsPage() {
  const axios = useAxios();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<RequirementFilters>(DEFAULT_FILTERS);
  const [debouncedSearch] = useDebounce(filters.search, 400);
  const [statusDialog, setStatusDialog] = useState<{
    req: RequirementListItem;
    to: RequirementStatus;
  } | null>(null);

  function setFilter<K extends keyof RequirementFilters>(key: K, value: RequirementFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }

  // ── Query string ───────────────────────────────────────────────────────────

  const qs = useCallback(() => {
    const p: Record<string, string> = {
      page: String(filters.page),
      limit: String(filters.limit),
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (filters.status) p.status = filters.status;
    if (filters.priority) p.priority = filters.priority;
    if (filters.jobType) p.jobType = filters.jobType;
    if (filters.remoteType) p.remoteType = filters.remoteType;
    if (filters.clientId) p.clientId = filters.clientId;
    if (filters.buId) p.buId = filters.buId;
    if (filters.createdById) p.createdById = filters.createdById;
    if (filters.assignedTeamId) p.assignedTeamId = filters.assignedTeamId;
    if (filters.assignedToMe) p.assignedToMe = 'true';
    if (filters.breached) p.breached = 'true';
    if (filters.respondByFrom) p.respondByFrom = new Date(filters.respondByFrom).toISOString();
    if (filters.respondByTo) p.respondByTo = new Date(filters.respondByTo).toISOString();
    if (filters.startDateFrom) p.startDateFrom = new Date(filters.startDateFrom).toISOString();
    if (filters.startDateTo) p.startDateTo = new Date(filters.startDateTo).toISOString();
    if (filters.createdFrom) p.createdFrom = new Date(filters.createdFrom).toISOString();
    if (filters.createdTo) p.createdTo = new Date(filters.createdTo).toISOString();
    return new URLSearchParams(p).toString();
  }, [filters, debouncedSearch]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: statsRes } = useQuery<RequirementStatsResponse>({
    queryKey: ['requirement-stats'],
    queryFn: async () => (await axios.get('/requirements/stats')).data,
    staleTime: 30_000,
  });

  const {
    data: listRes,
    isLoading,
    isFetching,
  } = useQuery<RequirementListResponse>({
    queryKey: ['requirements', qs()],
    queryFn: async () => (await axios.get(`/requirements?${qs()}`)).data,
    placeholderData: prev => prev,
  });

  // clients and BUs for filter dropdowns
  const { data: clientsRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['clients-dropdown'],
    queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data,
    staleTime: 60_000,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
  });

  const requirements = listRes?.data ?? [];
  const meta = listRes?.meta;
  const permissions = listRes?.permissions;
  const stats = statsRes?.data;
  const clients = clientsRes?.data ?? [];
  const businessUnits = busRes?.data ?? [];
  const activeFilterCount = countActiveFilters(filters);

  // ── Status mutation ────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: async ({ id, toStatus }: { id: string; toStatus: RequirementStatus }) =>
      (await axios.patch(`/requirements/${id}/status`, { toStatus })).data,
    onSuccess: (_, { toStatus }) => {
      toast.success(
        `Moved to ${STATUS_OPTIONS.find(s => s.value === toStatus)?.label ?? toStatus}`
      );
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      queryClient.invalidateQueries({ queryKey: ['requirement-stats'] });
      setStatusDialog(null);
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update status'
      );
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Requirements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} total` : '—'}
          </p>
        </div>
        {permissions?.canAdd && (
          <Button size="sm" onClick={() => router.push('/requirements/new')}>
            New requirement
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Active"
            value={stats.byStatus.ACTIVE ?? 0}
            sub={`${stats.byPriority.HIGH ?? 0} high priority`}
          />
          <StatCard label="Pending approval" value={stats.byStatus.PENDING_APPROVAL ?? 0} />
          <StatCard
            label="Breached"
            value={stats.breached}
            alert={stats.breached > 0}
            sub="respondBy overdue"
          />
          <StatCard label="This week" value={stats.recentlyCreated} sub="created" />
        </div>
      )}

      <Separator />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search title, code, client…"
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            className="h-9 pr-8"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path
                  d="M11.782 4.032a.575.575 0 1 0-.813-.813L7.5 6.687 4.032 3.22a.575.575 0 0 0-.813.813L6.687 7.5l-3.468 3.468a.575.575 0 0 0 .813.813L7.5 8.313l3.469 3.468a.575.575 0 0 0 .813-.813L8.313 7.5l3.469-3.468Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Inline quick filters — status and priority most used */}
        <Select
          value={filters.status || '_'}
          onValueChange={v => setFilter('status', v === '_' ? '' : (v as RequirementStatus))}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">All statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || '_'}
          onValueChange={v =>
            setFilter('priority', v === '_' ? '' : (v as 'LOW' | 'MEDIUM' | 'HIGH'))
          }
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">All priorities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={`${filters.sortBy}:${filters.sortDir}`}
          onValueChange={v => {
            const [by, dir] = v.split(':') as [RequirementFilters['sortBy'], 'asc' | 'desc'];
            setFilters(p => ({ ...p, sortBy: by, sortDir: dir, page: 1 }));
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest first</SelectItem>
            <SelectItem value="createdAt:asc">Oldest first</SelectItem>
            <SelectItem value="respondBy:asc">Respond by ↑</SelectItem>
            <SelectItem value="respondBy:desc">Respond by ↓</SelectItem>
            <SelectItem value="priority:desc">Priority high–low</SelectItem>
            <SelectItem value="startDate:asc">Start date ↑</SelectItem>
            <SelectItem value="updatedAt:desc">Recently updated</SelectItem>
          </SelectContent>
        </Select>

        {/* All filters sheet */}
        <FilterSheet
          filters={filters}
          setFilter={setFilter}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          activeCount={activeFilterCount}
          clients={clients}
          businessUnits={businessUnits}
        />

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          {filters.status && (
            <FilterChip
              label={`Status: ${STATUS_OPTIONS.find(s => s.value === filters.status)?.label}`}
              onRemove={() => setFilter('status', '')}
            />
          )}
          {filters.priority && (
            <FilterChip
              label={`Priority: ${humanize(filters.priority)}`}
              onRemove={() => setFilter('priority', '')}
            />
          )}
          {filters.jobType && (
            <FilterChip
              label={`Type: ${humanize(filters.jobType)}`}
              onRemove={() => setFilter('jobType', '')}
            />
          )}
          {filters.remoteType && (
            <FilterChip
              label={`Remote: ${humanize(filters.remoteType)}`}
              onRemove={() => setFilter('remoteType', '')}
            />
          )}
          {filters.clientId && (
            <FilterChip
              label={`Client: ${clients.find(c => c.id === filters.clientId)?.name ?? 'Selected'}`}
              onRemove={() => setFilter('clientId', '')}
            />
          )}
          {filters.buId && (
            <FilterChip
              label={`BU: ${businessUnits.find(b => b.id === filters.buId)?.name ?? 'Selected'}`}
              onRemove={() => setFilter('buId', '')}
            />
          )}
          {filters.assignedToMe && (
            <FilterChip label="Assigned to me" onRemove={() => setFilter('assignedToMe', false)} />
          )}
          {filters.breached && (
            <FilterChip label="Breached" onRemove={() => setFilter('breached', false)} />
          )}
          {(filters.respondByFrom || filters.respondByTo) && (
            <FilterChip
              label={`Respond by: ${filters.respondByFrom || '…'} → ${filters.respondByTo || '…'}`}
              onRemove={() => {
                setFilter('respondByFrom', '');
                setFilter('respondByTo', '');
              }}
            />
          )}
          {(filters.startDateFrom || filters.startDateTo) && (
            <FilterChip
              label={`Start date: ${filters.startDateFrom || '…'} → ${filters.startDateTo || '…'}`}
              onRemove={() => {
                setFilter('startDateFrom', '');
                setFilter('startDateTo', '');
              }}
            />
          )}
          {(filters.createdFrom || filters.createdTo) && (
            <FilterChip
              label={`Created: ${filters.createdFrom || '…'} → ${filters.createdTo || '…'}`}
              onRemove={() => {
                setFilter('createdFrom', '');
                setFilter('createdTo', '');
              }}
            />
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[110px]">Code</TableHead>
              <TableHead>Title / Skills</TableHead>
              <TableHead className="w-[130px]">Client</TableHead>
              <TableHead className="w-[80px]">BU</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[80px]">Priority</TableHead>
              <TableHead className="w-[110px]">Type</TableHead>
              <TableHead className="w-[90px]">Openings</TableHead>
              <TableHead className="w-[110px]">Respond by</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-muted-foreground text-sm">
                  No requirements found
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="ml-1 text-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              requirements.map(req => (
                <TableRow
                  key={req.id}
                  className={`cursor-pointer hover:bg-muted/40 transition-colors ${isFetching ? 'opacity-60' : ''}`}
                  onClick={() => router.push(`/requirements/${req.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {req.reqCode}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm line-clamp-1">{req.title}</span>
                      {req.skills.length > 0 && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {req.skills
                            .slice(0, 4)
                            .map(s => s.skill.canonicalName)
                            .join(', ')}
                          {req.skills.length > 4 && ` +${req.skills.length - 4}`}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm line-clamp-1">{req.client.name}</span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {req.businessUnit?.name ?? '—'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={statusVariant(req.status)}
                        className="text-xs whitespace-nowrap"
                      >
                        {STATUS_OPTIONS.find(s => s.value === req.status)?.label ?? req.status}
                      </Badge>
                      {(req.isRespondByBreached || req.isTurnaroundBreached) && (
                        <span className="text-destructive text-xs" title="Deadline breached">
                          ⚠
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={priorityVariant(req.priority)} className="text-xs">
                      {humanize(req.priority)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {humanize(req.jobType)} · {humanize(req.remoteType)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm tabular-nums">
                      {req.filledOpenings}/{req.totalOpenings}
                    </span>
                  </TableCell>

                  <TableCell>
                    {req.respondBy ? (
                      <span
                        className={`text-xs tabular-nums ${req.isRespondByBreached ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                      >
                        {format(new Date(req.respondBy), 'dd MMM yy')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell onClick={e => e.stopPropagation()} className="p-1">
                    <RowActions
                      req={req}
                      canEdit={permissions?.canEdit ?? false}
                      onStatusChange={(r, to) => setStatusDialog({ req: r, to })}
                      onView={id => router.push(`/requirements/${id}`)}
                      onEdit={id => router.push(`/requirements/${id}/edit`)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{' '}
            {meta.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setFilter('page', filters.page - 1)}
              className="h-8"
            >
              Previous
            </Button>
            <span className="px-3 tabular-nums">
              {meta.page} / {meta.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= meta.pages}
              onClick={() => setFilter('page', filters.page + 1)}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Status change dialog */}
      <AlertDialog open={!!statusDialog} onOpenChange={o => !o && setStatusDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm status change</AlertDialogTitle>
            <AlertDialogDescription>
              Move <span className="font-medium text-foreground">{statusDialog?.req.reqCode}</span>{' '}
              to{' '}
              <span className="font-medium text-foreground">
                {STATUS_OPTIONS.find(s => s.value === statusDialog?.to)?.label}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusMutation.isPending}
              onClick={() =>
                statusDialog &&
                statusMutation.mutate({ id: statusDialog.req.id, toStatus: statusDialog.to })
              }
            >
              {statusMutation.isPending ? 'Updating…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter chip
// ─────────────────────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label?: string; onRemove: () => void }) {
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs text-foreground">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-0.5">
        <svg width="10" height="10" viewBox="0 0 15 15" fill="none">
          <path
            d="M11.782 4.032a.575.575 0 1 0-.813-.813L7.5 6.687 4.032 3.22a.575.575 0 0 0-.813.813L6.687 7.5l-3.468 3.468a.575.575 0 0 0 .813.813L7.5 8.313l3.469 3.468a.575.575 0 0 0 .813-.813L8.313 7.5l3.469-3.468Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </span>
  );
}
