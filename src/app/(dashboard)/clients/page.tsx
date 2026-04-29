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
import { Label } from '@/components/ui/label';
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { useAxios } from '@/hooks/useAxios';
import type {
  ClientFilters,
  ClientListItem,
  ClientListResponse,
  ClientStatus,
  ClientCategory,
} from './_components/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const CATEGORY_OPTIONS: { value: ClientCategory; label: string }[] = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'STAFFING', label: 'Staffing' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'NGO', label: 'NGO' },
  { value: 'OTHER', label: 'Other' },
];

const DEFAULT_FILTERS: ClientFilters = {
  search: '',
  status: '',
  category: '',
  industry: '',
  buId: '',
  handledByMe: false,
  page: 1,
  limit: 25,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statusVariant(s: ClientStatus): 'default' | 'secondary' | 'outline' {
  switch (s) {
    case 'ACTIVE':
      return 'default';
    case 'PENDING':
      return 'secondary';
    case 'INACTIVE':
      return 'outline';
  }
}

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function countFilters(f: ClientFilters) {
  return [f.status, f.category, f.industry, f.buId, f.handledByMe].filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs text-foreground">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-0.5">
        ✕
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter sheet
// ─────────────────────────────────────────────────────────────────────────────

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
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 py-0.5 leading-none font-medium">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Status
            </Label>
            <Select
              value={filters.status || '_'}
              onValueChange={v => setFilter('status', v === '_' ? '' : (v as ClientStatus))}
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

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Category
            </Label>
            <Select
              value={filters.category || '_'}
              onValueChange={v => setFilter('category', v === '_' ? '' : (v as ClientCategory))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All categories</SelectItem>
                {CATEGORY_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Industry
            </Label>
            <Input
              className="h-9"
              placeholder="e.g. Technology"
              value={filters.industry}
              onChange={e => setFilter('industry', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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

          <button
            onClick={() => setFilter('handledByMe', !filters.handledByMe)}
            className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors ${
              filters.handledByMe
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <span>Handled by me</span>
            {filters.handledByMe && <span className="text-xs font-medium">✓</span>}
          </button>
        </div>

        <SheetFooter className="px-5 py-4 border-t shrink-0">
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

export default function ClientsPage() {
  const axios = useAxios();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ClientFilters>(DEFAULT_FILTERS);
  const [debouncedSearch] = useDebounce(filters.search, 400);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function setFilter<K extends keyof ClientFilters>(key: K, value: ClientFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
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
    if (filters.category) p.category = filters.category;
    if (filters.industry) p.industry = filters.industry;
    if (filters.buId) p.buId = filters.buId;
    if (filters.handledByMe) p.handledByMe = 'true';
    return new URLSearchParams(p).toString();
  }, [filters, debouncedSearch]);

  const {
    data: listRes,
    isLoading,
    isFetching,
  } = useQuery<ClientListResponse>({
    queryKey: ['clients', qs()],
    queryFn: async () => (await axios.get(`/clients?${qs()}`)).data,
    placeholderData: prev => prev,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
  });

  const clients = listRes?.data ?? [];
  const meta = listRes?.meta;
  const permissions = listRes?.permissions;
  const businessUnits = busRes?.data ?? [];
  const activeFilterCount = countFilters(filters);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await axios.delete(`/clients/${id}`)).data,
    onSuccess: () => {
      toast.success('Client deleted');
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: () => toast.error('Failed to delete client'),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} total` : '—'}
          </p>
        </div>
        {permissions?.canAdd && (
          <Button size="sm" onClick={() => router.push('/clients/new')}>
            New client
          </Button>
        )}
      </div>

      <Separator />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search name, VMS, industry…"
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            className="h-9 pr-8"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <Select
          value={filters.status || '_'}
          onValueChange={v => setFilter('status', v === '_' ? '' : (v as ClientStatus))}
        >
          <SelectTrigger className="h-9 w-[130px]">
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
          value={`${filters.sortBy}:${filters.sortDir}`}
          onValueChange={v => {
            const [by, dir] = v.split(':') as [ClientFilters['sortBy'], 'asc' | 'desc'];
            setFilters(p => ({ ...p, sortBy: by, sortDir: dir, page: 1 }));
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
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
              label={`Status: ${humanize(filters.status)}`}
              onRemove={() => setFilter('status', '')}
            />
          )}
          {filters.category && (
            <FilterChip
              label={`Category: ${humanize(filters.category)}`}
              onRemove={() => setFilter('category', '')}
            />
          )}
          {filters.industry && (
            <FilterChip
              label={`Industry: ${filters.industry}`}
              onRemove={() => setFilter('industry', '')}
            />
          )}
          {filters.buId && (
            <FilterChip
              label={`BU: ${businessUnits.find(b => b.id === filters.buId)?.name ?? 'Selected'}`}
              onRemove={() => setFilter('buId', '')}
            />
          )}
          {filters.handledByMe && (
            <FilterChip label="Handled by me" onRemove={() => setFilter('handledByMe', false)} />
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead className="w-[140px]">Industry</TableHead>
              <TableHead className="w-[90px]">BU</TableHead>
              <TableHead className="w-[180px]">Handlers</TableHead>
              <TableHead className="w-[60px] text-center">Reqs</TableHead>
              <TableHead className="w-[60px] text-center">Contacts</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-sm text-muted-foreground">
                  No clients found
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
              clients.map(client => (
                <TableRow
                  key={client.id}
                  className={`cursor-pointer hover:bg-muted/40 transition-colors ${isFetching ? 'opacity-60' : ''}`}
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{client.name}</span>
                      {client.vmsName && (
                        <span className="text-xs text-muted-foreground">VMS: {client.vmsName}</span>
                      )}
                      {(client.city || client.country) && (
                        <span className="text-xs text-muted-foreground">
                          {[client.city, client.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={statusVariant(client.status)} className="text-xs">
                      {humanize(client.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {client.category ? humanize(client.category) : '—'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {client.industry ?? '—'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {client.businessUnit?.name ?? '—'}
                    </span>
                  </TableCell>

                  <TableCell>
                    {client.handlers.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {client.handlers.slice(0, 2).map(h => (
                          <span key={h.id} className="text-xs leading-snug">
                            <span className="text-muted-foreground">{humanize(h.role)}: </span>
                            {h.user.firstName} {h.user.lastName}
                          </span>
                        ))}
                        {client.handlers.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{client.handlers.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-sm tabular-nums">{client._count.requirements}</span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-sm tabular-nums">{client._count.contacts}</span>
                  </TableCell>

                  <TableCell onClick={e => e.stopPropagation()} className="p-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                        >
                          ···
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                          View detail
                        </DropdownMenuItem>
                        {permissions?.canEdit && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/clients/${client.id}/edit`)}
                          >
                            Edit
                          </DropdownMenuItem>
                        )}
                        {permissions?.canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(client.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This soft-deletes the client. Existing requirements and contacts are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
