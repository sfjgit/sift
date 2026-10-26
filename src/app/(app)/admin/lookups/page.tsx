// File: page.tsx
// Path: src/app/(app)/admin/lookups/page.tsx
//
// Pick-lists (lookups). Types are fixed by the backend; their values are
// admin-editable. One query loads every value (incl. inactive) so the type
// list can show counts and switching types is instant.

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, MoreHorizontal, Pencil, PauseCircle, PlayCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { ActiveBadge, Pill } from '@/components/common/badges';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { DataTable, useTableState, type DataColumn, type FilterDef } from '@/components/data-table';
import { useLocalQuery } from '@/components/data-table/useLocalQuery';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { LookupFormDialog } from '@/features/admin/LookupFormDialog';
import { lookupKeys, useLookups } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { lookupsApi } from '@/lib/api/endpoints';
import { titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Lookup, LookupType } from '@/types/org';

const FALLBACK_TYPES: LookupType[] = [
  'INDUSTRY',
  'CLIENT_CATEGORY',
  'LOCATION_TYPE',
  'TECH_CATEGORY',
  'DOCUMENT_TYPE',
  'SPOC_SOURCE',
  'EMAIL_SOURCE',
  'SALES_STATUS',
  'PROGRAM_SECTOR',
];

const TYPE_INFO: Partial<Record<LookupType, { label?: string; description: string }>> = {
  INDUSTRY: { description: 'A client’s industry — client profile, filters and reports.' },
  CLIENT_CATEGORY: { description: 'How you classify clients (PSU, private, MNC…) — client profile and filters.' },
  LOCATION_TYPE: { description: 'Kinds of client locations — head office, plant, branch.' },
  TECH_CATEGORY: { label: 'Technology category', description: 'Areas tracked in a client’s technology section.' },
  DOCUMENT_TYPE: { description: 'Labels for documents uploaded to a client.' },
  SPOC_SOURCE: { label: 'SPOC source', description: 'Where a SPOC came from — referral, LinkedIn, event.' },
  EMAIL_SOURCE: { description: 'How a SPOC’s email address was found.' },
  SALES_STATUS: { description: 'Where a SPOC is in the sales cycle — drives pipeline reports.' },
  PROGRAM_SECTOR: { label: 'Programme sector', description: 'Sectors of a client’s CSR programmes.' },
};

const lookupTypeLabel = (t: LookupType) => TYPE_INFO[t]?.label ?? titleCase(t);

const FILTERS: FilterDef[] = [
  { key: 'isActive', label: 'Status', type: 'boolean', trueLabel: 'Active', falseLabel: 'Inactive' },
  { key: 'isSystem', label: 'Kind', type: 'boolean', trueLabel: 'System', falseLabel: 'Custom' },
];

const searchText = (l: Lookup) => `${l.label} ${l.code}`;

function LookupsPage() {
  const confirm = useConfirm();
  const typesQ = useQuery({ queryKey: ['lookups', 'types'], queryFn: () => lookupsApi.types(), staleTime: Infinity });
  const types = typesQ.data?.length ? typesQ.data : FALLBACK_TYPES;
  const [type, setType] = useState<LookupType>('INDUSTRY');
  const [dialog, setDialog] = useState<{ row: Lookup | null } | null>(null);

  const all = useLookups(undefined, { includeInactive: true });
  const counts = useMemo(() => {
    const c: Partial<Record<LookupType, number>> = {};
    for (const l of all.data ?? []) c[l.type] = (c[l.type] ?? 0) + 1;
    return c;
  }, [all.data]);

  const ofType = useMemo(() => (all.data ? all.data.filter(l => l.type === type) : undefined), [all.data, type]);
  const table = useTableState('lookups', ['isActive', 'isSystem'], { sort: { id: 'order', desc: false } });
  const query = useLocalQuery({ ...all, data: ofType }, table.params, { searchText });

  const nextOrder = useMemo(
    () => (ofType ?? []).reduce((m, l) => Math.max(m, l.order ?? 0), 0) + 10,
    [ofType]
  );

  const toggle = useAction((l: Lookup) => lookupsApi.toggle(l.id), {
    success: (_r, l) => `${l.label} ${l.isActive ? 'deactivated' : 'activated'}`,
    invalidate: [lookupKeys.all],
  });
  const toggleMutate = toggle.mutate;

  const askToggle = useCallback(
    async (l: Lookup) => {
      if (l.isActive) {
        const ok = await confirm({
          title: `Deactivate “${l.label}”?`,
          description: 'It stops appearing in pickers. Records that already use it keep showing it.',
          destructive: true,
          confirmLabel: 'Deactivate',
        });
        if (!ok) return;
      }
      toggleMutate(l);
    },
    [confirm, toggleMutate]
  );

  const columns = useMemo<DataColumn<Lookup>[]>(
    () => [
      {
        id: 'label',
        accessorKey: 'label',
        header: 'Label',
        meta: { label: 'Label', sortKey: 'label', locked: true },
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{row.original.label}</span>
            {row.original.isSystem && (
              <Pill tone="neutral" dot={false}>
                <Lock className="size-2.5" /> System
              </Pill>
            )}
          </span>
        ),
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Code',
        meta: { label: 'Code', sortKey: 'code' },
        cell: ({ row }) => <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.original.code}</span>,
      },
      {
        id: 'order',
        accessorFn: l => l.order ?? '',
        header: 'Order',
        meta: { label: 'Order', sortKey: 'order', align: 'right' },
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.order ?? '—'}</span>,
      },
      {
        id: 'status',
        accessorFn: l => (l.isActive ? 'Active' : 'Inactive'),
        header: 'Status',
        meta: { label: 'Status', sortKey: 'isActive' },
        cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
      },
      {
        id: '__actions',
        header: '',
        enableHiding: false,
        meta: { locked: true, label: 'Actions', width: 44 },
        cell: ({ row }) => {
          const l = row.original;
          return (
            <div data-no-row-click>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${l.label}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => setDialog({ row: l })}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  {!l.isSystem && (
                    <>
                      <DropdownMenuSeparator />
                      {l.isActive ? (
                        <DropdownMenuItem variant="destructive" onSelect={() => void askToggle(l)}>
                          <PauseCircle /> Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => void askToggle(l)}>
                          <PlayCircle className="text-success" /> Activate
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [askToggle]
  );

  const pickType = (t: LookupType) => {
    setType(t);
    table.actions.setSearch('');
    table.actions.setPage(1);
  };

  const label = lookupTypeLabel(type);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pick-lists"
        description="The options people choose from across the CRM. Deactivate instead of deleting — old records keep their value."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* type list — sidebar on desktop, select on mobile */}
        <nav aria-label="Pick-list types" className="hidden rounded-xl border bg-card p-1.5 shadow-card lg:block">
          {typesQ.isLoading
            ? Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="m-1 h-7" />)
            : types.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickType(t)}
                  aria-current={t === type ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
                    t === type ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground/80 hover:bg-muted'
                  )}
                >
                  <span className="truncate">{lookupTypeLabel(t)}</span>
                  <span className="tabular text-xs text-muted-foreground">{counts[t] ?? ''}</span>
                </button>
              ))}
        </nav>
        <div className="lg:hidden">
          <Select value={type} onValueChange={v => pickType(v as LookupType)}>
            <SelectTrigger className="w-full" aria-label="Pick-list type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {types.map(t => (
                <SelectItem key={t} value={t}>
                  {lookupTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-base font-semibold">{label}</h2>
            <p className="text-[13px] text-muted-foreground">
              {TYPE_INFO[type]?.description ?? 'Values for this pick-list.'}
            </p>
          </div>
          <DataTable
            id="lookups"
            table={table}
            query={query}
            columns={columns}
            filters={FILTERS}
            savedViews={false}
            searchPlaceholder={`Search ${label.toLowerCase()}…`}
            onRowClick={l => setDialog({ row: l })}
            fetchAll={() => Promise.resolve(query.all)}
            exportName={`lookups-${type.toLowerCase()}`}
            toolbar={
              <Button size="sm" onClick={() => setDialog({ row: null })}>
                <Plus /> Add value
              </Button>
            }
            empty={{
              title: `No ${label.toLowerCase()} values yet`,
              description: 'Add the first option people can pick.',
              action: (
                <Button size="sm" onClick={() => setDialog({ row: null })}>
                  <Plus /> Add value
                </Button>
              ),
            }}
          />
        </div>
      </div>

      <LookupFormDialog
        type={type}
        typeLabel={label}
        row={dialog?.row ?? null}
        open={!!dialog}
        onOpenChange={o => !o && setDialog(null)}
        nextOrder={nextOrder}
      />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="lookups.manage">
      <LookupsPage />
    </RequirePermission>
  );
}
