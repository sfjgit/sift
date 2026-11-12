// File: page.tsx
// Path: src/app/(app)/clients/page.tsx

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Pencil,
  PauseCircle,
  Play,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLookups } from '@/hooks/queries';
import { Kbd } from '@/components/ui/kbd';
import { HelpButton } from '@/features/help/HelpSheet';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { DataTable, useTableState } from '@/components/data-table';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { clientsTour } from '@/features/tour/tours/catalog';
import {
  clientColumns,
  clientFilterKeys,
  clientFilters,
  CLIENT_DEFAULT_COLUMNS,
  CLIENT_LAYOUT_VERSION,
  QUICK_RUN_COLUMNS,
  withDefaultColumns,
  type RunStepHandler,
} from '@/features/clients/columns';
import { clientExportSheets } from '@/features/clients/exportSheets';
import { BusinessViewSelect } from '@/features/clients/BusinessViewSelect';
import { useHiddenColumns } from '@/features/columnAccess/useHiddenColumns';
import { AssignClientsDialog } from '@/features/clients/AssignClientsDialog';
import { ClientDataSheet, type DataTab } from '@/features/clients/ClientDataSheet';
import { RunStepLauncher, type RunTarget } from '@/features/pipeline/RunStepLauncher';
import { clientHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { useHotkey } from '@/hooks/useHotkey';
import { clientsApi } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/resource';
import { useUi } from '@/stores/ui';
import type { ClientListItem, ClientStatus } from '@/types/crm';

function ClientsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const { openClientDialog, openSpocDialog } = useUi();
  const table = useTableState('clients', clientFilterKeys, {
    // last updated first: a run starting or ending counts, so the client just run is on top
    sort: { id: 'updatedAt', desc: true },
    layoutVersion: CLIENT_LAYOUT_VERSION,
  });
  const query = clientHooks.useList(table.params);
  const [assigning, setAssigning] = useState<{ rows: ClientListItem[]; clear?: () => void } | null>(
    null
  );
  const [runTarget, setRunTarget] = useState<RunTarget | null>(null);
  const [dataSheet, setDataSheet] = useState<{ client: ClientListItem; tab: DataTab } | null>(null);
  const techCategories = useLookups('TECH_CATEGORY').data;
  const documentTypes = useLookups('DOCUMENT_TYPE').data;
  useTour(clientsTour, { ready: !query.isLoading });
  useHotkey('n', () => openClientDialog(true), can('clients.create'));

  const remove = useAction((id: string) => clientsApi.remove(id), {
    success: 'Client deleted',
    invalidate: [clientHooks.keys.all],
  });
  const removeClient = remove.mutate;
  const bulkStatus = useAction(
    ({ ids, status }: { ids: string[]; status: ClientStatus }) =>
      clientsApi.bulkStatus(ids, status),
    {
      success: r =>
        `${r.updated} updated${r.skipped.length ? `, ${r.skipped.length} skipped` : ''}`,
      invalidate: [clientHooks.keys.all, ['reports']],
    }
  );

  const rowActions = useCallback(
    (c: ClientListItem) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => router.push(`/clients/${c.id}`)}>
            <Eye /> Open
          </DropdownMenuItem>
          {can('clients.update') && (
            <DropdownMenuItem onSelect={() => router.push(`/clients/${c.id}?edit=1`)}>
              <Pencil /> Edit
            </DropdownMenuItem>
          )}
          {can('spocs.create') && (
            <DropdownMenuItem
              onSelect={() => openSpocDialog({ clientId: c.id, clientName: c.name })}
            >
              <UserPlus /> Add SPOC
            </DropdownMenuItem>
          )}
          {can('clients.assign') && (
            <DropdownMenuItem onSelect={() => setAssigning({ rows: [c] })}>
              <Users /> Assign people
            </DropdownMenuItem>
          )}
          {can('clients.delete') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  if (
                    await confirm({
                      title: `Delete ${c.name}?`,
                      description:
                        'The client disappears from lists and reports. Its history is kept for audit.',
                      destructive: true,
                      confirmLabel: 'Delete client',
                    })
                  )
                    removeClient(c.id);
                }}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [can, confirm, openSpocDialog, removeClient, router]
  );

  // Run buttons in the step columns; emails also need outreach.generate
  const runHandler = useCallback(
    (stepKey: string): RunStepHandler | undefined =>
      can('step_runs.run') && (stepKey !== 'emails' || can('outreach.generate'))
        ? (c, key) => setRunTarget({ clientId: c.id, clientName: c.name, stepKey: key })
        : undefined,
    [can]
  );

  // every column (admins arrange access from these) → minus the ones my role may not see
  const allColumns = useMemo(
    () =>
      withDefaultColumns(
        clientColumns({
          actions: rowActions,
          onRunStep: runHandler,
          onOpenData: (client, tab) => setDataSheet({ client, tab }),
          techCategories,
          documentTypes,
        })
      ),
    [rowActions, runHandler, techCategories, documentTypes]
  );
  const { hidden: roleHidden } = useHiddenColumns('clients');
  const columns = useMemo(
    () => allColumns.filter(c => !roleHidden.includes(c.id ?? '')),
    [allColumns, roleHidden]
  );
  const canBulk = can('clients.approve') || can('clients.assign');

  return (
    <div className="space-y-3">
      {/* one row: title · status tabs · actions — the sheet gets the height */}
      <DataTable
        id="clients"
        title="Clients"
        titleAddon={<BusinessViewSelect />}
        titleHint="Every organisation you work with — its profile, CSR figures, offices, reports and who works it. Status (pending / active / inactive) is in Filters."
        actions={
          <>
            <HelpButton module="clients" />
            {can('clients.create') && (
              <Button
                size="sm"
                onClick={() => openClientDialog(true)}
                {...tourTarget('clients-new')}
              >
                <Plus /> New client
                <Kbd className="ml-1 border-white/20 bg-white/15 text-primary-foreground">N</Kbd>
              </Button>
            )}
          </>
        }
        filterPanel={{ title: 'Filter clients by' }}
        defaultColumnOrder={CLIENT_DEFAULT_COLUMNS}
        quickToggle={{
          ids: QUICK_RUN_COLUMNS,
          label: 'run buttons (Run all, Reports, Find offices)',
          icon: Play,
        }}
        columnAccess={{ table: 'clients', columns: allColumns }}
        table={table}
        query={query}
        columns={columns}
        filters={clientFilters}
        searchPlaceholder="Search name or CIN…"
        rowHref={c => `/clients/${c.id}`}
        fetchAll={p => fetchAllPages(clientsApi.list, p)}
        exportName="clients"
        exportSheets={clientExportSheets}
        empty={{
          title: 'No clients yet',
          description: 'Add your first client to start tracking SPOCs, locations and activity.',
          action: can('clients.create') && (
            <Button size="sm" onClick={() => openClientDialog(true)}>
              <Plus /> New client
            </Button>
          ),
        }}
        bulkActions={
          canBulk
            ? (rows, clear) => (
                <>
                  {can('clients.assign') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssigning({ rows, clear })}
                    >
                      <Users /> Assign
                    </Button>
                  )}
                  {can('clients.approve') && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          bulkStatus.mutate(
                            { ids: rows.map(r => r.id), status: 'ACTIVE' },
                            { onSuccess: clear }
                          )
                        }
                      >
                        <CheckCircle2 className="text-success" /> Activate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          bulkStatus.mutate(
                            { ids: rows.map(r => r.id), status: 'INACTIVE' },
                            { onSuccess: clear }
                          )
                        }
                      >
                        <PauseCircle /> Deactivate
                      </Button>
                    </>
                  )}
                </>
              )
            : undefined
        }
      />

      {assigning && (
        <AssignClientsDialog
          clients={assigning.rows}
          open
          onOpenChange={o => !o && setAssigning(null)}
          onDone={assigning.clear}
        />
      )}
      <RunStepLauncher target={runTarget} onClose={() => setRunTarget(null)} />
      <ClientDataSheet
        client={dataSheet?.client ?? null}
        tab={dataSheet?.tab ?? 'reports'}
        onTabChange={tab => setDataSheet(d => (d ? { ...d, tab } : d))}
        onOpenChange={o => !o && setDataSheet(null)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="clients.read">
      <ClientsPage />
    </RequirePermission>
  );
}
