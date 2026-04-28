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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

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
  assignedToMe: false,
  breached: false,
  page: 1,
  limit: 25,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusVariant(
  status: RequirementStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
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

function priorityVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (priority) {
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
      <span
        className={`text-2xl font-bold tabular-nums ${
          alert ? 'text-destructive' : 'text-foreground'
        }`}
      >
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
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <span className="sr-only">Actions</span>
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

  // Build query string
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
    if (filters.assignedToMe) p.assignedToMe = 'true';
    if (filters.breached) p.breached = 'true';
    return new URLSearchParams(p).toString();
  }, [filters, debouncedSearch]);

  // Stats
  const { data: statsRes } = useQuery<RequirementStatsResponse>({
    queryKey: ['requirement-stats'],
    queryFn: async () => (await axios.get('/requirements/stats')).data,
    staleTime: 30_000,
  });

  // List
  const {
    data: listRes,
    isLoading,
    isFetching,
  } = useQuery<RequirementListResponse>({
    queryKey: ['requirements', qs()],
    queryFn: async () => (await axios.get(`/requirements?${qs()}`)).data,
    placeholderData: prev => prev,
  });

  const requirements = listRes?.data ?? [];
  const meta = listRes?.meta;
  const permissions = listRes?.permissions;
  const stats = statsRes?.data;

  // Status mutation
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update status';
      toast.error(msg);
    },
  });

  // Filter helpers
  function setFilter<K extends keyof RequirementFilters>(key: K, value: RequirementFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }

  const hasActiveFilters = !!(
    filters.status ||
    filters.priority ||
    filters.jobType ||
    filters.remoteType ||
    filters.assignedToMe ||
    filters.breached
  );

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

      {/* Stats strip */}
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
          <StatCard label="Created this week" value={stats.recentlyCreated} />
        </div>
      )}

      <Separator />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search title, code, client…"
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            className="h-9"
          />
        </div>

        <Select
          value={filters.status || '_'}
          onValueChange={v => setFilter('status', v === '_' ? '' : (v as RequirementStatus))}
        >
          <SelectTrigger className="h-9 w-[160px]">
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

        <Select
          value={filters.jobType || '_'}
          onValueChange={v =>
            setFilter('jobType', v === '_' ? '' : (v as RequirementFilters['jobType']))
          }
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Job type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">All job types</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
            <SelectItem value="PERMANENT">Permanent</SelectItem>
            <SelectItem value="CONTRACT_TO_HIRE">Contract to hire</SelectItem>
            <SelectItem value="FREELANCE">Freelance</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.remoteType || '_'}
          onValueChange={v =>
            setFilter('remoteType', v === '_' ? '' : (v as RequirementFilters['remoteType']))
          }
        >
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder="Remote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">All</SelectItem>
            <SelectItem value="ONSITE">Onsite</SelectItem>
            <SelectItem value="REMOTE">Remote</SelectItem>
            <SelectItem value="HYBRID">Hybrid</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Button
            variant={filters.assignedToMe ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter('assignedToMe', !filters.assignedToMe)}
            className="h-9"
          >
            Assigned to me
          </Button>
          <Button
            variant={filters.breached ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilter('breached', !filters.breached)}
            className="h-9"
          >
            Breached
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="h-9 text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[110px]">Code</TableHead>
              <TableHead>Title / Skills</TableHead>
              <TableHead className="w-[130px]">Client</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[80px]">Priority</TableHead>
              <TableHead className="w-[130px]">Type</TableHead>
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
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground text-sm">
                  No requirements found
                </TableCell>
              </TableRow>
            ) : (
              requirements.map(req => (
                <TableRow
                  key={req.id}
                  className={`cursor-pointer hover:bg-muted/40 transition-colors ${
                    isFetching ? 'opacity-60' : ''
                  }`}
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
                      {humanize(req.jobType)}
                      {' · '}
                      {humanize(req.remoteType)}
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
                        className={`text-xs tabular-nums ${
                          req.isRespondByBreached
                            ? 'text-destructive font-medium'
                            : 'text-muted-foreground'
                        }`}
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
      <AlertDialog open={!!statusDialog} onOpenChange={open => !open && setStatusDialog(null)}>
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
              onClick={() => {
                if (!statusDialog) return;
                statusMutation.mutate({
                  id: statusDialog.req.id,
                  toStatus: statusDialog.to,
                });
              }}
            >
              {statusMutation.isPending ? 'Updating…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
