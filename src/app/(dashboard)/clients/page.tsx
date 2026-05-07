// app/clients/page.tsx
'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import {
  Search,
  Plus,
  SlidersHorizontal,
  X,
  Building2,
  MoreHorizontal,
  Briefcase,
  MapPin,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Eye,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';

import { useAxios } from '@/hooks/useAxios';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

interface ClientFilters {
  search: string;
  status: string;
  industry: string;
  buId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

interface ClientSpoc {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  isPrimary: boolean;
  handler: { id: string; firstName: string; lastName: string };
  serviceLine: { id: string; name: string };
}

interface ClientListItem {
  id: string;
  name: string;
  vmsName?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  status: ClientStatus;
  businessUnit?: { id: string; name: string } | null;
  spocs?: ClientSpoc[];
  _count: { requirements: number };
  createdAt: string;
}

interface ClientListResponse {
  data: ClientListItem[];
  meta: { total: number; page: number; limit: number; pages: number };
  permissions?: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
}

interface BUListResponse {
  data: { id: string; name: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: ClientFilters = {
  search: '',
  status: '',
  industry: '',
  buId: '',
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

const STATUS_CONFIG: Record<ClientStatus, { label: string; cls: string }> = {
  ACTIVE: {
    label: 'Active',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  PENDING: {
    label: 'Pending',
    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
  },
  INACTIVE: {
    label: 'Inactive',
    cls: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

const BG_COLORS = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function clientColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

function countFilters(f: ClientFilters) {
  return [f.status, f.industry, f.buId].filter(Boolean).length;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ClientsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24 hidden sm:block" />
          <Skeleton className="h-5 w-16 hidden md:block" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: string;
  current: string;
  dir: 'asc' | 'desc';
  onSort: (field: string) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Filter sheet ─────────────────────────────────────────────────────────────

function FilterSheet({
  filters,
  setFilter,
  onClear,
  activeCount,
  businessUnits,
}: {
  filters: ClientFilters;
  setFilter: <K extends keyof ClientFilters>(k: K, v: ClientFilters[K]) => void;
  onClear: () => void;
  activeCount: number;
  businessUnits: { id: string; name: string }[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 py-0.5 leading-none font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base">Filter clients</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status
            </Label>
            <div className="flex flex-wrap gap-2">
              {(['', 'ACTIVE', 'PENDING', 'INACTIVE'] as const).map(s => {
                const isAll = s === '';
                const active = filters.status === s;
                const cfg = s ? STATUS_CONFIG[s as ClientStatus] : null;
                return (
                  <button
                    key={s || 'all'}
                    onClick={() => setFilter('status', s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      active
                        ? cfg
                          ? cn(cfg.cls, 'border-current')
                          : 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    )}
                  >
                    {isAll ? 'All' : cfg?.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Industry
            </Label>
            <Input
              className="h-9 text-sm"
              placeholder="e.g. IT Services"
              value={filters.industry}
              onChange={e => setFilter('industry', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Business Unit
            </Label>
            <Select
              value={filters.buId || '_'}
              onValueChange={v => setFilter('buId', v === '_' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All BUs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All business units</SelectItem>
                {businessUnits.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="px-5 py-4 border-t shrink-0 flex-col gap-2">
          {activeCount > 0 && (
            <Button variant="outline" className="w-full" onClick={onClear}>
              <X className="h-3.5 w-3.5 mr-2" />
              Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({
  client,
  canEdit,
  canDelete,
  onDelete,
  isValidating,
}: {
  client: ClientListItem;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  isValidating: boolean;
}) {
  const router = useRouter();
  const cfg = STATUS_CONFIG[client.status];
  const color = clientColor(client.name);

  // primary spoc = client-side contact person
  const primarySpoc = client.spocs?.find(s => s.isPrimary) ?? client.spocs?.[0];

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group',
        isValidating && 'opacity-60'
      )}
      onClick={() => router.push(`/clients/${client.id}`)}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
          color
        )}
      >
        {clientInitials(client.name)}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {client.name}
          </span>
          {client.vmsName && (
            <span className="text-[10px] text-muted-foreground font-mono hidden lg:inline shrink-0">
              {client.vmsName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {client.industry && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3 shrink-0" />
              {client.industry}
            </span>
          )}
          {(client.city || client.country) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {[client.city, client.country].filter(Boolean).join(', ')}
            </span>
          )}
          {client.businessUnit && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              {client.businessUnit.name}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <Badge
        variant="outline"
        className={cn('text-[10px] px-2 py-0.5 shrink-0 hidden sm:flex', cfg.cls)}
      >
        {cfg.label}
      </Badge>

      {/* SPOC — now shows client-side contact person + who handles them */}
      <div className="hidden md:flex items-center gap-1.5 min-w-[160px]">
        {primarySpoc ? (
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate">
              {primarySpoc.firstName} {primarySpoc.lastName}
              {primarySpoc.designation ? (
                <span className="text-muted-foreground font-normal">
                  {' '}
                  · {primarySpoc.designation}
                </span>
              ) : null}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Handled by {primarySpoc.handler.firstName} {primarySpoc.handler.lastName}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No SPOC</span>
        )}
      </div>

      {/* Req count */}
      <div className="hidden lg:flex items-center gap-1 shrink-0">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs tabular-nums font-medium text-muted-foreground">
          {client._count.requirements}
        </span>
      </div>

      {/* Actions */}
      <div className="shrink-0" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
              <Eye className="h-3.5 w-3.5 mr-2" /> View detail
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}/edit`)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(client.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <Building2 className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">No clients found</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasFilters ? 'Try adjusting your filters' : 'Add your first client to get started'}
        </p>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear}>
          <X className="h-3.5 w-3.5 mr-2" /> Clear filters
        </Button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const axios = useAxios();
  const router = useRouter();

  const [filters, setFilters] = useState<ClientFilters>(DEFAULT_FILTERS);
  const [debouncedSearch] = useDebounce(filters.search, 350);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function setFilter<K extends keyof ClientFilters>(key: K, value: ClientFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : (value as number) }));
  }

  const qs = useCallback(() => {
    const p: Record<string, string> = {
      page: String(filters.page),
      limit: String(filters.limit),
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (filters.status) p.status = filters.status;
    if (filters.industry) p.industry = filters.industry;
    if (filters.buId) p.buId = filters.buId;
    return new URLSearchParams(p).toString();
  }, [filters, debouncedSearch]);

  const fetcher = useCallback((url: string) => axios.get(url).then(r => r.data), [axios]);

  const {
    data: listRes,
    isLoading,
    isValidating,
    mutate: mutateList,
  } = useSWR<ClientListResponse>(`/clients?${qs()}`, fetcher, { keepPreviousData: true });

  const { data: busRes } = useSWR<BUListResponse>('/business-units', fetcher, {
    revalidateOnFocus: false,
  });

  const clients = listRes?.data ?? [];
  const meta = listRes?.meta;
  const permissions = listRes?.permissions;
  const businessUnits = busRes?.data ?? [];
  const activeFilterCount = countFilters(filters);

  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortDir: prev.sortBy === field && prev.sortDir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await axios.delete(`/clients/${id}`)).data,
    onSuccess: () => {
      toast.success('Client deleted');
      setDeleteId(null);
      mutateList();
    },
    onError: () => toast.error('Failed to delete client'),
  });

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b bg-card shrink-0">
        <div>
          <h1 className="text-base font-bold">Clients</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {meta ? `${meta.total.toLocaleString()} total` : 'Loading...'}
          </p>
        </div>
        {permissions?.canAdd && (
          <Button size="sm" className="h-8 gap-1.5" onClick={() => router.push('/clients/new')}>
            <Plus className="h-3.5 w-3.5" /> New client
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3.5 border-b bg-card shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search clients..."
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            className="pl-8 h-8 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={`${filters.sortBy}:${filters.sortDir}`}
          onValueChange={v => {
            const [by, dir] = v.split(':') as [string, 'asc' | 'desc'];
            setFilters(p => ({ ...p, sortBy: by, sortDir: dir, page: 1 }));
          }}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest first</SelectItem>
            <SelectItem value="createdAt:asc">Oldest first</SelectItem>
            <SelectItem value="name:asc">Name A–Z</SelectItem>
            <SelectItem value="name:desc">Name Z–A</SelectItem>
            <SelectItem value="updatedAt:desc">Recently updated</SelectItem>
          </SelectContent>
        </Select>

        <FilterSheet
          filters={filters}
          setFilter={setFilter}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          activeCount={activeFilterCount}
          businessUnits={businessUnits}
        />

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.status && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium',
                  STATUS_CONFIG[filters.status as ClientStatus].cls
                )}
              >
                {STATUS_CONFIG[filters.status as ClientStatus].label}
                <button onClick={() => setFilter('status', '')} className="hover:opacity-70">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {filters.industry && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-muted text-[11px] font-medium text-foreground">
                {filters.industry}
                <button onClick={() => setFilter('industry', '')} className="hover:opacity-70">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {filters.buId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-muted text-[11px] font-medium text-foreground">
                {businessUnits.find(b => b.id === filters.buId)?.name ?? 'BU'}
                <button onClick={() => setFilter('buId', '')} className="hover:opacity-70">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        )}

        {isValidating && !isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse ml-auto">Refreshing...</span>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b bg-muted/30 shrink-0">
        <div className="w-9 shrink-0" />
        <div className="flex-1">
          <SortHeader
            label="Client"
            field="name"
            current={filters.sortBy}
            dir={filters.sortDir}
            onSort={handleSort}
          />
        </div>
        <div className="w-20 hidden sm:block">
          <SortHeader
            label="Status"
            field="status"
            current={filters.sortBy}
            dir={filters.sortDir}
            onSort={handleSort}
          />
        </div>
        <div className="w-[160px] hidden md:block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            SPOC
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-12 text-center">
            Reqs
          </span>
        </div>
        <div className="w-7 shrink-0" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {isLoading ? (
            <ClientsSkeleton />
          ) : clients.length === 0 ? (
            <EmptyState
              hasFilters={activeFilterCount > 0 || !!filters.search}
              onClear={() => setFilters(DEFAULT_FILTERS)}
            />
          ) : (
            clients.map(client => (
              <ClientRow
                key={client.id}
                client={client}
                canEdit={permissions?.canEdit ?? false}
                canDelete={permissions?.canDelete ?? false}
                onDelete={setDeleteId}
                isValidating={isValidating}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t bg-card shrink-0">
          <span className="text-xs text-muted-foreground">
            {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{' '}
            {meta.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={filters.page <= 1}
              onClick={() => setFilter('page', filters.page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground px-2">
              {meta.page} / {meta.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={filters.page >= meta.pages}
              onClick={() => setFilter('page', filters.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This soft-deletes the client. Existing requirements and SPOCs are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
