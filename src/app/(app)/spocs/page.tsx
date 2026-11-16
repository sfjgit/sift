// File: page.tsx
// Path: src/app/(app)/spocs/page.tsx

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightLeft,
  Eye,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  ArchiveX,
  BarChart3,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Segmented } from '@/components/ui/segmented';
import { HelpButton } from '@/features/help/HelpSheet';
import { useConfirm } from '@/components/common/ConfirmProvider';
import {
  DataTable,
  RowActionsButton,
  menuItems,
  useTableState,
  type RowMenu,
} from '@/components/data-table';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { spocsTour } from '@/features/tour/tours/catalog';
import { AssignDialog } from '@/features/spocs/AssignDialog';
import { BulkSetDialog } from '@/features/spocs/BulkSetDialog';
import { SpocStats } from '@/features/spocs/SpocStats';
import { useProjectLabels } from '@/features/marks/SalesMarks';
import { spocColumns, spocFilterKeys, spocFilters } from '@/features/spocs/columns';
import { spocHooks } from '@/hooks/queries';
import { useAction } from '@/hooks/useResource';
import { useHotkey } from '@/hooks/useHotkey';
import { usePageStats } from '@/hooks/usePageStats';
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
  const [setting, setSetting] = useState<{ rows: Spoc[]; clear?: () => void } | null>(null);
  const projectLabels = useProjectLabels();
  const [statsOpen, toggleStats] = usePageStats('spocs');
  const statsParams = useMemo(
    () => ({ search: table.state.search || undefined, ...table.state.filters }),
    [table.state.search, table.state.filters]
  );
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

  // one list for the "⋯" button and the right-click menu
  const rowMenu = useCallback<RowMenu<Spoc>>(
    s => [
      { label: 'Open', icon: Eye, onSelect: () => router.push(`/spocs/${s.id}`) },
      can('spocs.update') && {
        label: 'Edit',
        icon: Pencil,
        onSelect: () => router.push(`/spocs/${s.id}?edit=1`),
      },
      can('spocs.assign') &&
        s.isActive && {
          label: 'Reassign',
          icon: ArrowRightLeft,
          onSelect: () => setAssigning({ rows: [s] }),
        },
      can('spocs.delete') &&
        s.isActive && {
          label: 'Deactivate',
          icon: Trash2,
          destructive: true,
          separatorBefore: true,
          onSelect: async () => {
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
          },
        },
    ],
    [can, confirm, deactivateSpoc, router]
  );
  const rowActions = useCallback(
    (s: Spoc) => (
      <RowActionsButton
        items={menuItems(rowMenu, s)}
        label={[s.firstName, s.lastName].filter(Boolean).join(' ')}
      />
    ),
    [rowMenu]
  );

  const canEdit = can('spocs.update');
  const columns = useMemo(
    () => spocColumns({ actions: rowActions, canEdit, projectLabels }),
    [rowActions, canEdit, projectLabels]
  );

  return (
    <div className="space-y-3">
      <DataTable
        rowMenu={rowMenu}
        rowLabel={s => [s.firstName, s.lastName].filter(Boolean).join(' ')}
        banner={
          statsOpen && (
            <SpocStats
              params={statsParams}
              filters={table.state.filters as Record<string, string>}
              setFilter={table.actions.setFilter}
            />
          )
        }
        title="SPOCs"
        titleHint="Your contacts across every client — who owns them, how reachable they are, and where they stand."
        actions={
          <>
            <HelpButton module="spocs" />
            <Button
              size="sm"
              variant={statsOpen ? 'secondary' : 'outline'}
              onClick={toggleStats}
              title="Counts for the SPOCs below — they follow your filters"
            >
              <BarChart3 /> Stats
            </Button>
            {can('spocs.create') && (
              <Button size="sm" onClick={() => openSpocDialog({})} {...tourTarget('spocs-new')}>
                <Plus /> New SPOC
                <Kbd className="ml-1 border-white/20 bg-white/15 text-primary-foreground">N</Kbd>
              </Button>
            )}
          </>
        }
        toolbar={
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
        }
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
          can('spocs.assign') || canEdit
            ? (rows, clear) => (
                <>
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => setSetting({ rows, clear })}>
                      <ListChecks /> Update field
                    </Button>
                  )}
                  {can('spocs.assign') && (
                    <Button size="sm" onClick={() => setAssigning({ rows, clear })}>
                      <ArrowRightLeft /> Reassign
                    </Button>
                  )}
                </>
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

      <BulkSetDialog
        spocIds={setting?.rows.map(r => r.id) ?? []}
        open={!!setting}
        onOpenChange={o => !o && setSetting(null)}
        onDone={() => setting?.clear?.()}
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
