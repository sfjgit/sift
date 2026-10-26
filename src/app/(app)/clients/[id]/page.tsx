// File: page.tsx
// Path: src/app/(app)/clients/[id]/page.tsx

'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Cpu, GitBranch, History, IndianRupee, LayoutGrid, Mail, MapPin, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { DetailList, Panel } from '@/components/common/Panel';
import { ErrorState, EmptyState } from '@/components/common/states';
import { DataTable, useTableState } from '@/components/data-table';
import { ActivityTimeline } from '@/features/activity/ActivityTimeline';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { ClientHeader } from '@/features/clients/detail/ClientHeader';
import { CsrTab } from '@/features/clients/detail/CsrTab';
import { LocationsTab } from '@/features/clients/detail/LocationsTab';
import { NotesPanel } from '@/features/clients/detail/NotesPanel';
import { OutreachList } from '@/features/clients/detail/OutreachList';
import { RunsList } from '@/features/clients/detail/RunsList';
import { TechnologyTab } from '@/features/clients/detail/TechnologyTab';
import { spocColumns, spocFilters } from '@/features/spocs/columns';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { clientDetailTour } from '@/features/tour/tours/catalog';
import { clientHooks, spocHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, fullName, hostOf, placeOf } from '@/lib/format';
import { useUi } from '@/stores/ui';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail } from '@/types/crm';

const TABS = ['overview', 'spocs', 'locations', 'technology', 'csr', 'outreach', 'pipeline', 'activity'] as const;
type Tab = (typeof TABS)[number];

function ClientSpocs({ client }: { client: ClientDetail }) {
  const openSpocDialog = useUi(s => s.openSpocDialog);
  const { can } = usePermissions();
  const filters = useMemo(() => spocFilters.filter(f => f.key !== 'clientId'), []);
  const table = useTableState('client-spocs', ['clientId', ...filters.map(f => f.key)], {
    syncUrl: false,
    filters: { clientId: client.id },
    sort: { id: 'createdAt', desc: true },
  });
  const query = spocHooks.useList(table.params);
  const columns = useMemo(() => spocColumns({ showClient: false }), []);
  return (
    <DataTable
      id="client-spocs"
      embedded
      table={table}
      query={query}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search this client’s SPOCs…"
      rowHref={s => `/spocs/${s.id}`}
      exportName={`${client.name}-spocs`}
      toolbar={
        can('spocs.create') && (
          <Button size="sm" onClick={() => openSpocDialog({ clientId: client.id, clientName: client.name })}>
            <Plus /> Add SPOC
          </Button>
        )
      }
      empty={{ title: 'No SPOCs on this client yet', description: 'Add the people you work with here.' }}
    />
  );
}

function ActivityFull({ clientId }: { clientId: string }) {
  const q = useInfiniteQuery({
    queryKey: ['client-activity', clientId],
    queryFn: ({ pageParam }) => clientsApi.activities(clientId, { page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: last => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
  const items = q.data?.pages.flatMap(p => p.data);
  return (
    <Panel title="Activity" description={q.data ? `${q.data.pages[0].meta.total} events` : undefined}>
      <ActivityTimeline items={items} loading={q.isLoading} />
      {q.hasNextPage && (
        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
          {q.isFetchingNextPage ? 'Loading…' : 'Load older activity'}
        </Button>
      )}
    </Panel>
  );
}

function Overview({ client, onTab }: { client: ClientDetail; onTab: (t: Tab) => void }) {
  const recent = useInfiniteQuery({
    queryKey: ['client-activity', client.id],
    queryFn: ({ pageParam }) => clientsApi.activities(client.id, { page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: last => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
  const primary = client.locations.find(l => l.isPrimary);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Panel title="About">
          <DetailList
            items={[
              { label: 'Legal name', value: client.name },
              { label: 'Short name', value: client.shortName },
              { label: 'Industry', value: client.industry?.label },
              { label: 'Category', value: client.category?.label },
              { label: 'CIN', value: client.cin && <span className="font-mono text-xs">{client.cin}</span> },
              {
                label: 'Website',
                value: client.website && (
                  <a href={client.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {hostOf(client.website)}
                  </a>
                ),
              },
              {
                label: 'Primary location',
                value: primary && [primary.addressLine, placeOf(primary), primary.pincode].filter(Boolean).join(', '),
                wide: true,
              },
              { label: 'Added by', value: `${fullName(client.createdBy)} · ${fmtDate(client.createdAt)}` },
              { label: 'Last updated', value: fmtDate(client.updatedAt) },
            ]}
          />
        </Panel>

        <Panel
          title="Technology landscape"
          actions={
            <Button variant="ghost" size="xs" onClick={() => onTab('technology')}>
              Manage
            </Button>
          }
        >
          {client.technologies.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {client.technologies.slice(0, 6).map(t => (
                <li key={t.id} className="rounded-lg bg-surface p-3">
                  <p className="text-xs font-medium text-muted-foreground">{t.category.label}</p>
                  <p className="mt-1 line-clamp-2 text-[13px]">{t.details}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={Cpu} title="Nothing captured yet" />
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <NotesPanel clientId={client.id} notes={client.notes} />
        <Panel
          title="Recent activity"
          {...tourTarget('client-activity')}
          actions={
            <Button variant="ghost" size="xs" onClick={() => onTab('activity')}>
              View all
            </Button>
          }
        >
          <ActivityTimeline items={recent.data?.pages[0].data.slice(0, 6)} loading={recent.isLoading} compact />
        </Panel>
      </div>
    </div>
  );
}

function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const { data: client, isLoading, error, refetch } = clientHooks.useDetail(id);
  // deep links: ?tab=locations, ?edit=1 (from the list row menu). Pages under
  // the app shell only render client-side, so reading the URL lazily is safe.
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    return t && TABS.includes(t) ? t : 'overview';
  });
  const [editing, setEditing] = useState(() => !!new URLSearchParams(window.location.search).get('edit'));
  useTour(clientDetailTour, { ready: !!client });

  const changeTab = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    if (t === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', t);
    window.history.replaceState(window.history.state, '', url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-9 w-full max-w-2xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !client) {
    const notFound = (error as ApiError | null)?.status === 404;
    return (
      <ErrorState
        title={notFound ? 'Client not found' : 'Couldn’t load this client'}
        error={notFound ? new Error('It may have been deleted, or it’s outside your access scope.') : error}
        onRetry={notFound ? undefined : () => refetch()}
        className="min-h-[50vh]"
      />
    );
  }

  const tabs: { value: Tab; label: string; icon: typeof Users; count?: number; hidden?: boolean }[] = [
    { value: 'overview', label: 'Overview', icon: LayoutGrid },
    { value: 'spocs', label: 'SPOCs', icon: Users, count: client._count.spocs, hidden: !can('spocs.read') },
    { value: 'locations', label: 'Locations', icon: MapPin, count: client.locations.length },
    { value: 'technology', label: 'Technology', icon: Cpu, count: client.technologies.length },
    { value: 'csr', label: 'CSR', icon: IndianRupee },
    { value: 'outreach', label: 'Outreach', icon: Mail, hidden: !can('outreach.read') },
    { value: 'pipeline', label: 'Pipeline', icon: GitBranch, hidden: !can('step_runs.read') },
    { value: 'activity', label: 'Activity', icon: History },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumbs crumbs={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} />
      <ClientHeader client={client} onEdit={() => setEditing(true)} />

      <Tabs value={tab} onValueChange={v => changeTab(v as Tab)}>
        <div className="overflow-x-auto border-b">
          <TabsList variant="line" className="h-auto gap-1 bg-transparent p-0" {...tourTarget('client-tabs')}>
            {tabs
              .filter(t => !t.hidden)
              .map(t => (
                <TabsTrigger key={t.value} value={t.value} className="h-9 flex-none px-3 text-[13px]">
                  <t.icon /> {t.label}
                  {t.count !== undefined && (
                    <span className="rounded-full bg-muted px-1.5 text-[10.5px] text-muted-foreground tabular">{t.count}</span>
                  )}
                </TabsTrigger>
              ))}
          </TabsList>
        </div>
        <div className="pt-5">
          <TabsContent value="overview">
            <Overview client={client} onTab={changeTab} />
          </TabsContent>
          <TabsContent value="spocs">{tab === 'spocs' && <ClientSpocs client={client} />}</TabsContent>
          <TabsContent value="locations">
            <LocationsTab client={client} />
          </TabsContent>
          <TabsContent value="technology">
            <TechnologyTab client={client} />
          </TabsContent>
          <TabsContent value="csr">
            <CsrTab client={client} />
          </TabsContent>
          <TabsContent value="outreach">{tab === 'outreach' && <OutreachList clientId={client.id} />}</TabsContent>
          <TabsContent value="pipeline">{tab === 'pipeline' && <RunsList clientId={client.id} />}</TabsContent>
          <TabsContent value="activity">{tab === 'activity' && <ActivityFull clientId={client.id} />}</TabsContent>
        </div>
      </Tabs>

      <ClientFormDialog client={client} open={editing} onOpenChange={setEditing} />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="clients.read">
      <ClientPage />
    </RequirePermission>
  );
}
