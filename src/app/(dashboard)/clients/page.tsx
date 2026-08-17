// File: page.tsx
// Path: app/clients/page.tsx
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
  LayoutGrid,
  Rows3,
  Percent,
  Layers,
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
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';

import { useAxios } from '@/hooks/useAxios';
import { cn } from '@/lib/utils';
import {
  ClientForm,
  detailToFormValues,
  type CreateClientInput,
  type UpdateClientInput,
} from './_components/ClientForm';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
type AgreementType = 'BAND' | 'FIXED';
type ViewMode = 'card' | 'table';

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

interface ClientBand {
  id: string;
  name?: string | null;
  code: string;
  rangeFrom?: string | number | null;
  rangeTo?: string | number | null;
  value?: string | number | null;
  experience?: string | number | null;
}

// Wide payload now returned by the updated getClients controller.
interface ClientListItem {
  id: string;
  name: string;
  vmsName?: string | null;
  industry?: string | null;
  website?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  status: ClientStatus;
  agreementType?: AgreementType | null;
  percentageValue?: string | number | null;
  businessUnit?: { id: string; name: string } | null;
  parentClient?: { id: string; name: string } | null;
  bands?: ClientBand[];
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

type SheetState = { mode: 'create' } | { mode: 'edit'; client: ClientListItem } | null;

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

/** Human-readable pricing summary from the wide payload. */
function pricingLabel(c: ClientListItem): string | null {
  if (c.agreementType === 'FIXED') {
    return c.percentageValue != null ? `Fixed · ${Number(c.percentageValue)}%` : 'Fixed';
  }
  if (c.agreementType === 'BAND') {
    const n = c.bands?.length ?? 0;
    return `Band · ${n} band${n === 1 ? '' : 's'}`;
  }
  return null;
}

function PricingChip({ client }: { client: ClientListItem }) {
  const label = pricingLabel(client);
  if (!label) return null;
  const Icon = client.agreementType === 'BAND' ? Layers : Percent;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

// convert form output -> API payload (percentage -> percentageValue)
function toClientPayload(data: CreateClientInput | UpdateClientInput) {
  const { percentage, ...rest } = data as CreateClientInput;
  return { ...rest, percentageValue: percentage ?? null };
}

// ─── Row actions (shared by card + table) ───────────────────────────────────────

function RowActions({
  client,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: {
  client: ClientListItem;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-3.5 w-3.5 mr-2" /> View detail
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────────

function ClientCard({
  client,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
  isValidating,
}: {
  client: ClientListItem;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isValidating: boolean;
}) {
  const cfg = STATUS_CONFIG[client.status];
  const color = clientColor(client.name);
  const primarySpoc = client.spocs?.find(s => s.isPrimary) ?? client.spocs?.[0];

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm cursor-pointer',
        isValidating && 'opacity-60'
      )}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
            color
          )}
        >
          {clientInitials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {client.name}
          </p>
          {client.vmsName && (
            <p className="text-[10px] text-muted-foreground font-mono truncate">{client.vmsName}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', cfg.cls)}>
            {cfg.label}
          </Badge>
          <div onClick={e => e.stopPropagation()}>
            <RowActions
              client={client}
              canEdit={canEdit}
              canDelete={canDelete}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
        {client.industry && (
          <span className="flex items-center gap-1.5 truncate">
            <Briefcase className="h-3 w-3 shrink-0" /> {client.industry}
          </span>
        )}
        {(client.city || client.country) && (
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {[client.city, client.country].filter(Boolean).join(', ')}
          </span>
        )}
        {client.businessUnit && (
          <span className="flex items-center gap-1.5 truncate">
            <Building2 className="h-3 w-3 shrink-0" /> {client.businessUnit.name}
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="mt-3">
        <PricingChip client={client} />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
        <div className="min-w-0">
          {primarySpoc ? (
            <p className="text-[11px] truncate">
              <span className="font-medium">
                {primarySpoc.firstName} {primarySpoc.lastName}
              </span>
              <span className="text-muted-foreground">
                {' · '}by {primarySpoc.handler.firstName}
              </span>
            </p>
          ) : (
            <span className="text-[11px] text-muted-foreground">No SPOC</span>
          )}
        </div>
        <span className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span className="tabular-nums font-medium">{client._count.requirements}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Data table ───────────────────────────────────────────────────────────────

/** Sortable <th> for the data table. */
function Th({
  label,
  field,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  field?: string;
  current?: string;
  dir?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  className?: string;
}) {
  const sortable = !!field && !!onSort;
  const active = sortable && current === field;
  return (
    <th
      className={cn(
        'sticky top-0 z-10 bg-muted/60 backdrop-blur px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b whitespace-nowrap',
        className
      )}
    >
      {sortable ? (
        <button
          onClick={() => onSort!(field!)}
          className={cn(
            'inline-flex items-center gap-1 transition-colors',
            active ? 'text-foreground' : 'hover:text-foreground'
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
      ) : (
        label
      )}
    </th>
  );
}

function ClientsTable({
  clients,
  canEdit,
  canDelete,
  sortBy,
  sortDir,
  onSort,
  onView,
  onEdit,
  onDelete,
  isValidating,
}: {
  clients: ClientListItem[];
  canEdit: boolean;
  canDelete: boolean;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  onView: (id: string) => void;
  onEdit: (c: ClientListItem) => void;
  onDelete: (id: string) => void;
  isValidating: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full min-w-[1100px] text-sm', isValidating && 'opacity-60')}>
        <thead>
          <tr>
            <Th label="Client" field="name" current={sortBy} dir={sortDir} onSort={onSort} />
            <Th label="VMS" />
            <Th label="Status" field="status" current={sortBy} dir={sortDir} onSort={onSort} />
            <Th label="Industry" />
            <Th label="Location" />
            <Th label="Business Unit" />
            <Th label="Pricing" />
            <Th label="SPOC" />
            <Th label="Handled by" />
            <Th label="Reqs" className="text-center" />
            <Th label="Created" field="createdAt" current={sortBy} dir={sortDir} onSort={onSort} />
            <Th label="" className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map(client => {
            const cfg = STATUS_CONFIG[client.status];
            const color = clientColor(client.name);
            const spoc = client.spocs?.find(s => s.isPrimary) ?? client.spocs?.[0];
            const location = [client.city, client.state, client.country].filter(Boolean).join(', ');
            return (
              <tr
                key={client.id}
                onClick={() => onView(client.id)}
                className="group hover:bg-muted/40 transition-colors cursor-pointer"
              >
                {/* Client */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0',
                        color
                      )}
                    >
                      {clientInitials(client.name)}
                    </div>
                    <span className="font-semibold truncate max-w-[220px] group-hover:text-primary transition-colors">
                      {client.name}
                    </span>
                  </div>
                </td>

                {/* VMS */}
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {client.vmsName || '—'}
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', cfg.cls)}>
                    {cfg.label}
                  </Badge>
                </td>

                {/* Industry */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {client.industry || '—'}
                </td>

                {/* Location */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                  {location || '—'}
                </td>

                {/* Business Unit */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {client.businessUnit?.name || '—'}
                </td>

                {/* Pricing */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {pricingLabel(client) ? (
                    <PricingChip client={client} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>

                {/* SPOC */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {spoc ? (
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[180px]">
                        {spoc.firstName} {spoc.lastName}
                      </p>
                      {spoc.designation && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                          {spoc.designation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">No SPOC</span>
                  )}
                </td>

                {/* Handler */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {spoc ? `${spoc.handler.firstName} ${spoc.handler.lastName}` : '—'}
                </td>

                {/* Reqs */}
                <td className="px-3 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {client._count.requirements}
                  </span>
                </td>

                {/* Created */}
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(client.createdAt).toLocaleDateString()}
                </td>

                {/* Actions */}
                <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <RowActions
                      client={client}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onView={() => onView(client.id)}
                      onEdit={() => onEdit(client)}
                      onDelete={() => onDelete(client.id)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Skeletons ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-28 hidden lg:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-4 w-20 hidden xl:block" />
          <Skeleton className="h-4 w-24 hidden xl:block ml-auto" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-full mt-2" />
        </div>
      ))}
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

// ─── View toggle ──────────────────────────────────────────────────────────────

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border p-0.5">
      {(
        [
          { v: 'card', icon: LayoutGrid, label: 'Card view' },
          { v: 'table', icon: Rows3, label: 'Table view' },
        ] as const
      ).map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          aria-label={label}
          onClick={() => onChange(v)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            value === v
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
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
  const [view, setView] = useState<ViewMode>('card'); // default: card
  const [sheet, setSheet] = useState<SheetState>(null);

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

  const saveMutation = useMutation({
    mutationFn: async (vars: {
      mode: 'create' | 'edit';
      id?: string;
      payload: ReturnType<typeof toClientPayload>;
    }) => {
      if (vars.mode === 'create') return (await axios.post('/clients', vars.payload)).data;
      return (await axios.patch(`/clients/${vars.id}`, vars.payload)).data;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.mode === 'create' ? 'Client created' : 'Client updated');
      setSheet(null);
      mutateList();
    },
    onError: () => toast.error('Failed to save client'),
  });

  const handleFormSubmit = (data: CreateClientInput | UpdateClientInput) => {
    if (!sheet) return;
    const payload = toClientPayload(data);
    if (sheet.mode === 'create') saveMutation.mutate({ mode: 'create', payload });
    else saveMutation.mutate({ mode: 'edit', id: sheet.client.id, payload });
  };

  const openView = (id: string) => router.push(`/clients/${id}`);

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
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setSheet({ mode: 'create' })}>
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

        {/* Filters sheet (inline, controlled trigger) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 py-0.5 leading-none font-bold">
                  {activeFilterCount}
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
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  <X className="h-3.5 w-3.5 mr-2" />
                  Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <ViewToggle value={view} onChange={setView} />

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

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          view === 'card' ? (
            <CardSkeleton />
          ) : (
            <TableSkeleton />
          )
        ) : clients.length === 0 ? (
          <EmptyState
            hasFilters={activeFilterCount > 0 || !!filters.search}
            onClear={() => setFilters(DEFAULT_FILTERS)}
          />
        ) : view === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
            {clients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                canEdit={permissions?.canEdit ?? false}
                canDelete={permissions?.canDelete ?? false}
                onView={() => openView(client.id)}
                onEdit={() => setSheet({ mode: 'edit', client })}
                onDelete={() => setDeleteId(client.id)}
                isValidating={isValidating}
              />
            ))}
          </div>
        ) : (
          <ClientsTable
            clients={clients}
            canEdit={permissions?.canEdit ?? false}
            canDelete={permissions?.canDelete ?? false}
            sortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSort={handleSort}
            onView={openView}
            onEdit={client => setSheet({ mode: 'edit', client })}
            onDelete={setDeleteId}
            isValidating={isValidating}
          />
        )}
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

      {/* Create / Edit sheet */}
      <Sheet open={!!sheet} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent
          side="right"
          className="w-screen!  sm:w-[85vw] sm:max-w-4xl! flex flex-col p-0 gap-0"
        >
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>{sheet?.mode === 'edit' ? 'Edit client aa' : 'New client'}</SheetTitle>
            <SheetDescription>
              {sheet?.mode === 'edit'
                ? 'Update client details, pricing and bands.'
                : 'Create a new client with pricing and bands.'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {sheet && (
              <ClientForm
                mode={sheet.mode}
                defaultValues={sheet.mode === 'edit' ? detailToFormValues(sheet.client) : undefined}
                onSubmit={handleFormSubmit}
                isPending={saveMutation.isPending}
                onCancel={() => setSheet(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

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
