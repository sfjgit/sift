// File: page.tsx
// Path: src/app/(app)/spocs/page.tsx

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightLeft,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  ArchiveX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Segmented } from '@/components/ui/segmented';
import { HelpButton } from '@/features/help/HelpSheet';
import { PageHeader } from '@/components/common/PageHeader';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { DataTable, useTableState } from '@/components/data-table';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { spocsTour } from '@/features/tour/tours/catalog';
import { AssignDialog } from '@/features/spocs/AssignDialog';
import { spocColumns, spocFilterKeys, spocFilters } from '@/features/spocs/columns';
import { spocHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { useHotkey } from '@/hooks/useHotkey';
import { spocsApi } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/resource';
import { useUi } from '@/stores/ui';
import type { Spoc } from '@/types/crm';

type Quick = 'all' | 'mine' | 'ready' | 'inactive';

function SpocsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { can } = usePermissions();
  const openSpocDialog = useUi(s => s.openSpocDialog);
  const table = useTableState('spocs', spocFilterKeys, { sort: { id: 'createdAt', desc: true } });
  const query = spocHooks.useList(table.params);
  const [assigning, setAssigning] = useState<{ rows: Spoc[]; clear?: () => void } | null>(null);
  useTour(spocsTour, { ready: !query.isLoading });
  useHotkey('n', () => openSpocDialog({}), can('spocs.create'));

  const f = table.state.filters;
  const quick: Quick =
    f.isActive === 'false'
      ? 'inactive'
      : f.handlerId && f.handlerId === user?.id
        ? 'mine'
        : f.validationBand === 'READY'
          ? 'ready'
          : 'all';

  const setQuick = (q: Quick) => {
    const { setFilter } = table.actions;
    setFilter('isActive', q === 'inactive' ? 'false' : null);
    setFilter('handlerId', q === 'mine' && user ? user.id : null, q === 'mine' ? 'Me' : undefined);
    setFilter('validationBand', q === 'ready' ? 'READY' : null);
  };

  const deactivate = useAction((id: string) => spocsApi.remove(id), {
    success: 'SPOC deactivated',
    invalidate: [spocHooks.keys.all],
  });
  const deactivateSpoc = deactivate.mutate;

  const rowActions = useCallback(
    (s: Spoc) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => router.push(`/spocs/${s.id}`)}>
            <Eye /> Open
          </DropdownMenuItem>
          {can('spocs.update') && (
            <DropdownMenuItem onSelect={() => router.push(`/spocs/${s.id}?edit=1`)}>
              <Pencil /> Edit
            </DropdownMenuItem>
          )}
          {can('spocs.assign') && s.isActive && (
            <DropdownMenuItem onSelect={() => setAssigning({ rows: [s] })}>
              <ArrowRightLeft /> Reassign
            </DropdownMenuItem>
          )}
          {can('spocs.delete') && s.isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  if (
                    await confirm({
                      title: 'Deactivate this SPOC?',
                      description:
                        'They leave active lists and reports; history and assignments are kept.',
                      destructive: true,
                      confirmLabel: 'Deactivate',
                    })
                  )
                    deactivateSpoc(s.id);
                }}
              >
                <Trash2 /> Deactivate
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [can, confirm, deactivateSpoc, router]
  );

  const columns = useMemo(() => spocColumns({ actions: rowActions }), [rowActions]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="SPOCs"
        description="Your contacts across every client — who owns them, how reachable they are, and where they stand."
        actions={
          <>
            <HelpButton module="spocs" />
            {can('spocs.create') && (
              <Button onClick={() => openSpocDialog({})} {...tourTarget('spocs-new')}>
                <Plus /> New SPOC
                <Kbd className="ml-1 border-white/20 bg-white/15 text-primary-foreground">N</Kbd>
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div {...tourTarget('spocs-quick')}>
          <Segmented<Quick>
            value={quick}
            onChange={setQuick}
            options={[
              { value: 'all', label: 'All SPOCs', icon: Users },
              { value: 'mine', label: 'My SPOCs', icon: UserRound },
              { value: 'ready', label: 'Ready to contact', icon: Sparkles },
              { value: 'inactive', label: 'Inactive', icon: ArchiveX },
            ]}
          />
        </div>
        {can('spocs.assign') && (
          <p className="text-xs text-muted-foreground" {...tourTarget('spocs-select-hint')}>
            Tip: tick rows to reassign many SPOCs at once.
          </p>
        )}
      </div>

      <DataTable
        id="spocs"
        table={table}
        query={query}
        columns={columns}
        filters={spocFilters}
        searchPlaceholder="Search name, email or designation…"
        rowHref={s => `/spocs/${s.id}`}
        fetchAll={p => fetchAllPages(spocsApi.list, p)}
        exportName="spocs"
        empty={{
          title: 'No SPOCs yet',
          description: 'Add contacts to your clients to start building the pipeline.',
          action: can('spocs.create') && (
            <Button size="sm" onClick={() => openSpocDialog({})}>
              <Plus /> New SPOC
            </Button>
          ),
        }}
        bulkActions={
          can('spocs.assign')
            ? (rows, clear) => (
                <Button size="sm" onClick={() => setAssigning({ rows, clear })}>
                  <ArrowRightLeft /> Reassign
                </Button>
              )
            : undefined
        }
      />

      <AssignDialog
        spocs={assigning?.rows ?? []}
        open={!!assigning}
        onOpenChange={o => !o && setAssigning(null)}
        onDone={() => assigning?.clear?.()}
      />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="spocs.read">
      <SpocsPage />
    </RequirePermission>
  );
}
