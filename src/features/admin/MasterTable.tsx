// File: MasterTable.tsx
// Path: src/features/admin/MasterTable.tsx
//
// One table for all four org masters (BUs, service lines, departments,
// designations). Data is a plain array, so search / sort / paging run locally
// through useLocalQuery. No hard delete — rows are deactivated, and the
// backend refuses while users are still assigned (its message is toasted).

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, PauseCircle, PlayCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActiveBadge } from '@/components/common/badges';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { DataTable, useTableState, type DataColumn, type FilterDef } from '@/components/data-table';
import { useLocalQuery } from '@/components/data-table/useLocalQuery';
import { FormDialog } from '@/components/forms/FormDialog';
import { TextField, applyServerErrors } from '@/components/forms/fields';
import { masterKeys, useMasters } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { mastersApi, type MasterKind } from '@/lib/api/endpoints';
import { fmtDate } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import type { MasterRow } from '@/types/org';

export const MASTER_META: Record<MasterKind, { singular: string; plural: string; description: string; codeMax: number }> = {
  'business-units': {
    singular: 'Business unit',
    plural: 'Business units',
    description: 'Top-level divisions. Users and SPOCs belong to one; BU-scoped access follows it.',
    codeMax: 20,
  },
  'service-lines': {
    singular: 'Service line',
    plural: 'Service lines',
    description: 'What you sell. Every SPOC is tracked against a business unit + service line.',
    codeMax: 50,
  },
  departments: {
    singular: 'Department',
    plural: 'Departments',
    description: 'Internal teams. Department-scoped permissions use this.',
    codeMax: 50,
  },
  designations: {
    singular: 'Designation',
    plural: 'Designations',
    description: 'Job titles shown on profiles and in user pickers.',
    codeMax: 50,
  },
};

const FILTERS: FilterDef[] = [
  { key: 'isActive', label: 'Status', type: 'boolean', trueLabel: 'Active', falseLabel: 'Inactive' },
];

const searchText = (r: MasterRow) => `${r.name} ${r.code ?? ''}`;
const sortValue = (r: MasterRow, key: string) =>
  key === 'users' ? r._count?.users ?? 0 : key === 'spocs' ? r._count?.clientSpocs ?? 0 : (r as unknown as Record<string, string>)[key];

// ── create / edit dialog ─────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  code: z.string().trim().max(50),
});
type Values = z.input<typeof schema>;

function MasterFormDialog({
  kind,
  row,
  open,
  onOpenChange,
}: {
  kind: MasterKind;
  row: MasterRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const meta = MASTER_META[kind];
  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(
      schema.extend({ code: z.string().trim().max(meta.codeMax, `Max ${meta.codeMax} characters`) })
    ),
    defaultValues: { name: '', code: '' },
  });

  useEffect(() => {
    if (open) form.reset({ name: row?.name ?? '', code: row?.code ?? '' });
  }, [open, row, form]);

  const submit = form.handleSubmit(async v => {
    const body = { name: v.name, code: v.code || null };
    try {
      if (row) await mastersApi(kind).update(row.id, body);
      else await mastersApi(kind).create(body);
      toast.success(`${meta.singular} ${row ? 'updated' : 'created'}`);
      qc.invalidateQueries({ queryKey: masterKeys(kind) });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={row ? `Edit ${meta.singular.toLowerCase()}` : `New ${meta.singular.toLowerCase()}`}
      onSubmit={submit}
      submitLabel={row ? 'Save' : 'Create'}
      busy={form.formState.isSubmitting}
    >
      <TextField form={form} name="name" label="Name" required autoFocus />
      <TextField
        form={form}
        name="code"
        label="Code"
        placeholder="Optional short code"
        hint="Shown next to the name in pickers and exports."
        className="[&_input]:font-mono"
      />
    </FormDialog>
  );
}

// ── table ────────────────────────────────────────────────────────────────────

export function MasterTable({ kind, canManage = true }: { kind: MasterKind; canManage?: boolean }) {
  const confirm = useConfirm();
  const meta = MASTER_META[kind];
  const table = useTableState(`org-${kind}`, ['isActive'], { sort: { id: 'name', desc: false } });
  const source = useMasters(kind);
  const query = useLocalQuery(source, table.params, { searchText, sortValue });
  const [dialog, setDialog] = useState<{ row: MasterRow | null } | null>(null);

  const toggle = useAction((row: MasterRow) => mastersApi(kind).toggle(row), {
    success: (_r, row) => `${row.name} ${row.isActive ? 'deactivated' : 'activated'}`,
    invalidate: [masterKeys(kind)],
  });
  const toggleMutate = toggle.mutate;

  const askToggle = useCallback(
    async (row: MasterRow) => {
      if (row.isActive) {
        const users = row._count?.users ?? 0;
        const spocs = row._count?.clientSpocs ?? 0;
        // BUs are deactivated via update (no in-use guard); the other masters refuse while users are assigned
        const inUse =
          kind === 'business-units'
            ? users || spocs
              ? `${[users && `${users} user(s)`, spocs && `${spocs} SPOC(s)`].filter(Boolean).join(' and ')} keep it, but it won’t be offered for new records.`
              : ''
            : users
              ? `${users} user(s) are still assigned, so this will be refused until they’re moved.`
              : '';
        const ok = await confirm({
          title: `Deactivate ${row.name}?`,
          description: `It disappears from pickers; existing records keep it. ${inUse}`,
          destructive: true,
          confirmLabel: 'Deactivate',
        });
        if (!ok) return;
      }
      toggleMutate(row);
    },
    [confirm, toggleMutate, kind]
  );

  const showSpocs = useMemo(() => (source.data ?? []).some(r => r._count?.clientSpocs !== undefined), [source.data]);

  const columns = useMemo<DataColumn<MasterRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        meta: { label: 'Name', sortKey: 'name', locked: true },
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: 'code',
        accessorFn: r => r.code ?? '',
        header: 'Code',
        meta: { label: 'Code', sortKey: 'code' },
        cell: ({ row }) =>
          row.original.code ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.original.code}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'users',
        accessorFn: r => r._count?.users ?? 0,
        header: 'Users',
        meta: { label: 'Users', sortKey: 'users', align: 'right' },
        cell: ({ row }) => {
          const n = row.original._count?.users ?? 0;
          return <span className={n ? 'font-medium' : 'text-muted-foreground'}>{n}</span>;
        },
      },
      ...(showSpocs
        ? [
            {
              id: 'spocs',
              accessorFn: r => r._count?.clientSpocs ?? 0,
              header: 'SPOCs',
              meta: { label: 'SPOCs', sortKey: 'spocs', align: 'right' },
              cell: ({ row }) => {
                const n = row.original._count?.clientSpocs ?? 0;
                return <span className={n ? 'font-medium' : 'text-muted-foreground'}>{n}</span>;
              },
            } satisfies DataColumn<MasterRow>,
          ]
        : []),
      {
        id: 'status',
        accessorFn: r => (r.isActive ? 'Active' : 'Inactive'),
        header: 'Status',
        meta: { label: 'Status', sortKey: 'isActive' },
        cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
      },
      {
        id: 'createdAt',
        accessorFn: r => fmtDate(r.createdAt),
        header: 'Added',
        meta: { label: 'Added', sortKey: 'createdAt', defaultHidden: true },
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.createdAt)}</span>,
      },
      ...(canManage
        ? [
            {
              id: '__actions',
              header: '',
              enableHiding: false,
              meta: { locked: true, label: 'Actions', width: 44 },
              cell: ({ row }) => (
                <div data-no-row-click>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.original.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => setDialog({ row: row.original })}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {row.original.isActive ? (
                        <DropdownMenuItem variant="destructive" onSelect={() => void askToggle(row.original)}>
                          <PauseCircle /> Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => void askToggle(row.original)}>
                          <PlayCircle className="text-success" /> Activate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            } satisfies DataColumn<MasterRow>,
          ]
        : []),
    ],
    [showSpocs, canManage, askToggle]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-[13px] text-muted-foreground">{meta.description}</p>
      </div>
      <DataTable
        id={`org-${kind}`}
        table={table}
        query={query}
        columns={columns}
        filters={FILTERS}
        savedViews={false}
        searchPlaceholder={`Search ${meta.plural.toLowerCase()}…`}
        onRowClick={canManage ? row => setDialog({ row }) : undefined}
        fetchAll={() => Promise.resolve(query.all)}
        exportName={kind}
        toolbar={
          canManage && (
            <Button size="sm" onClick={() => setDialog({ row: null })}>
              <Plus /> New {meta.singular.toLowerCase()}
            </Button>
          )
        }
        empty={{
          title: `No ${meta.plural.toLowerCase()} yet`,
          description: meta.description,
          action: canManage && (
            <Button size="sm" onClick={() => setDialog({ row: null })}>
              <Plus /> New {meta.singular.toLowerCase()}
            </Button>
          ),
        }}
      />
      <MasterFormDialog kind={kind} row={dialog?.row ?? null} open={!!dialog} onOpenChange={o => !o && setDialog(null)} />
    </div>
  );
}
