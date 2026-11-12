// File: page.tsx
// Path: src/app/(app)/clients/[id]/page.tsx
//
// One client. A quiet header (name, status, Back, Run all steps, actions), then
// one plain white card per topic: a header row (icon, title, count, the ▶ run
// pills of the steps that fill it, chevron) and its content. "Client
// information" (a grid of labelled fields) is open; a click on any other row
// opens it, and what you opened is remembered.
// ?tab=<id> opens and scrolls to a section.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Cpu,
  FileText,
  GitBranch,
  IndianRupee,
  Mail,
  MapPin,
  MessageSquareText,
  Plus,
  Star,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { ErrorState } from '@/components/common/states';
import { DataTable, useTableState } from '@/components/data-table';
import { ActivityTimeline } from '@/features/activity/ActivityTimeline';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePermissions } from '@/features/auth/usePermissions';
import { RunStepLauncher, type RunTarget } from '@/features/pipeline/RunStepLauncher';
import { StepRunButtons } from '@/features/clients/detail/StepRunButtons';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { ClientHeader } from '@/features/clients/detail/ClientHeader';
import { ClientInfo } from '@/features/clients/detail/ClientInfo';
import { CsrTab } from '@/features/clients/detail/CsrTab';
import { DocumentsPanel } from '@/features/clients/detail/DocumentsPanel';
import { LocationsTab } from '@/features/clients/detail/LocationsTab';
import { NotesPanel } from '@/features/clients/detail/NotesPanel';
import { OutreachList } from '@/features/clients/detail/OutreachList';
import { PipelinePanel } from '@/features/pipeline/PipelinePanel';
import { TechnologyTab } from '@/features/clients/detail/TechnologyTab';
import { spocColumns, spocFilters } from '@/features/spocs/columns';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { clientDetailTour } from '@/features/tour/tours/catalog';
import { clientHooks, spocHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { useUi } from '@/stores/ui';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail } from '@/types/crm';

const SECTION_IDS = [
  'info',
  'branches',
  'csr',
  'reports',
  'spocs',
  'technology',
  'outreach',
  'pipeline',
  'notes',
] as const;
type SectionId = (typeof SECTION_IDS)[number];
// old links (tabs of earlier versions)
const ALIASES: Record<string, SectionId> = {
  overview: 'info',
  locations: 'branches',
  activity: 'notes',
};

const sectionFromUrl = (): SectionId | null => {
  const t = new URLSearchParams(window.location.search).get('tab');
  if (!t) return null;
  const id = ALIASES[t] ?? t;
  return (SECTION_IDS as readonly string[]).includes(id) ? (id as SectionId) : null;
};

const scrollToSection = (id: SectionId) =>
  document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const OPEN_KEY = 'crm:client-sections-v2';

/** open bars — "Client information" at first; remembered in this browser */
function useOpenSections() {
  const [open, setOpen] = useState<SectionId[]>(() => {
    let saved: SectionId[] = ['info'];
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      /* default */
    }
    const linked = sectionFromUrl();
    return linked && !saved.includes(linked) ? [...saved, linked] : saved;
  });
  const save = (next: SectionId[]) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* not remembered */
    }
  };
  return [open, save] as const;
}

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
          <Button
            size="sm"
            onClick={() => openSpocDialog({ clientId: client.id, clientName: client.name })}
          >
            <Plus /> Add SPOC
          </Button>
        )
      }
      empty={{
        title: 'No SPOCs on this client yet',
        description: 'Add the people you work with here.',
      }}
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
    <Panel description={q.data ? `${q.data.pages[0].meta.total} events` : undefined}>
      <ActivityTimeline items={items} loading={q.isLoading} />
      {q.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={() => q.fetchNextPage()}
          disabled={q.isFetchingNextPage}
        >
          {q.isFetchingNextPage ? 'Loading…' : 'Load older activity'}
        </Button>
      )}
    </Panel>
  );
}

interface SectionDef {
  id: SectionId;
  label: string;
  icon: typeof Users;
  count?: number;
  hidden?: boolean;
  /** the pipeline steps that fill this section — their ▶ pills sit on its bar */
  steps?: string[];
  hint?: string;
}

function Section({
  def,
  open,
  onToggle,
  clientId,
  onRun,
  children,
}: {
  def: SectionDef;
  open: boolean;
  onToggle: () => void;
  clientId: string;
  onRun: (stepKey: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`section-${def.id}`}
      className={cn(
        'scroll-mt-4 overflow-hidden rounded-xl border bg-card shadow-card transition-shadow',
        open && 'border-l-[3px] border-l-primary'
      )}
    >
      {/* header row: click anywhere on it to open / close; run pills don't toggle */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
        className={cn(
          'group flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 select-none hover:bg-muted/40',
          open && 'border-b'
        )}
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            open
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground group-hover:text-primary'
          )}
        >
          <def.icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="flex items-baseline gap-2 text-[15px] font-semibold">
            {def.label}
            {def.count !== undefined && (
              <span className="text-[13px] font-normal text-muted-foreground tabular">
                {def.count}
              </span>
            )}
          </h2>
          {def.hint && <p className="text-[12px] text-muted-foreground">{def.hint}</p>}
        </div>
        <span className="ml-auto flex items-center gap-3" onClick={e => e.stopPropagation()}>
          {def.steps && <StepRunButtons clientId={clientId} keys={def.steps} onRun={onRun} />}
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? 'Close section' : 'Open section'}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', !open && '-rotate-90')}
            />
          </button>
        </span>
      </div>
      {open && <div className="p-4">{children}</div>}
    </section>
  );
}

function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const { data: client, isLoading, error, refetch } = clientHooks.useDetail(id);
  const [editing, setEditing] = useState(
    () => !!new URLSearchParams(window.location.search).get('edit')
  );
  const [runTarget, setRunTarget] = useState<RunTarget | null>(null);
  const [openIds, setOpenIds] = useOpenSections();
  useTour(clientDetailTour, { ready: !!client });

  const sections: SectionDef[] = useMemo(
    () =>
      client
        ? [
            {
              id: 'info',
              label: 'Client information',
              icon: Star,
              hint: 'Firmographics, financials and ownership',
            },
            {
              id: 'branches',
              label: 'Branch offices',
              icon: MapPin,
              count: client.locations.length,
              steps: ['branches'],
            },
            {
              id: 'csr',
              label: 'CSR figures & programmes',
              icon: IndianRupee,
              count: client.csrPrograms?.length,
              steps: ['figures'],
            },
            {
              id: 'reports',
              label: 'Reports & attachments',
              icon: FileText,
              count: client.documents?.length,
              hidden: !can('client_documents.read'),
              steps: ['reports'],
            },
            {
              id: 'spocs',
              label: 'SPOC details',
              icon: Users,
              count: client._count.spocs,
              hidden: !can('spocs.read'),
              steps: ['report_spocs', 'enrich', 'apollo', 'validate'],
            },
            {
              id: 'technology',
              label: 'Technographics',
              icon: Cpu,
              count: client.technologies.length,
            },
            {
              id: 'outreach',
              label: 'Outreach',
              icon: Mail,
              hidden: !can('outreach.read'),
              steps: ['emails'],
            },
            {
              id: 'pipeline',
              label: 'Pipeline runs',
              icon: GitBranch,
              hidden: !can('step_runs.read'),
            },
            {
              id: 'notes',
              label: 'Notes & activity',
              icon: MessageSquareText,
              count: client.notes.length,
            },
          ]
        : [],
    [client, can]
  );

  const toggle = useCallback(
    (sid: SectionId) =>
      setOpenIds(openIds.includes(sid) ? openIds.filter(x => x !== sid) : [...openIds, sid]),
    [openIds, setOpenIds]
  );

  // deep link (?tab=pipeline&run=…, ?tab=locations): it was opened; scroll there
  const loaded = !!client;
  useEffect(() => {
    if (!loaded) return;
    const t = sectionFromUrl();
    if (t && t !== 'info') requestAnimationFrame(() => scrollToSection(t));
  }, [loaded]);

  const onRun = useCallback(
    (stepKey: string) =>
      client && setRunTarget({ clientId: client.id, clientName: client.name, stepKey }),
    [client]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-2/3 rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !client) {
    const notFound = (error as ApiError | null)?.status === 404;
    return (
      <ErrorState
        title={notFound ? 'Client not found' : 'Couldn’t load this client'}
        error={
          notFound
            ? new Error('It may have been deleted, or it’s outside your access scope.')
            : error
        }
        onRetry={notFound ? undefined : () => refetch()}
        className="min-h-[50vh]"
      />
    );
  }

  const body: Record<SectionId, React.ReactNode> = {
    info: <ClientInfo client={client} onEdit={() => setEditing(true)} />,
    branches: <LocationsTab client={client} />,
    csr: <CsrTab client={client} withDocuments={false} />,
    reports: <DocumentsPanel client={client} />,
    spocs: <ClientSpocs client={client} />,
    technology: <TechnologyTab client={client} />,
    outreach: <OutreachList clientId={client.id} />,
    pipeline: <PipelinePanel clientId={client.id} clientName={client.name} />,
    notes: (
      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <NotesPanel clientId={client.id} notes={client.notes} />
        <ActivityFull clientId={client.id} />
      </div>
    ),
  };

  return (
    <div className="space-y-4 pb-[20vh]">
      <Breadcrumbs crumbs={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} />
      <ClientHeader client={client} onEdit={() => setEditing(true)} onRun={onRun} />

      <div className="space-y-3" {...tourTarget('client-tabs')}>
        {sections
          .filter(d => !d.hidden)
          .map(d => (
            <Section
              key={d.id}
              def={d}
              open={openIds.includes(d.id)}
              onToggle={() => toggle(d.id)}
              clientId={client.id}
              onRun={onRun}
            >
              {body[d.id]}
            </Section>
          ))}
      </div>

      <RunStepLauncher target={runTarget} onClose={() => setRunTarget(null)} />
      <ClientFormDialog client={client} open={editing} onOpenChange={setEditing} />
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="clients.read">
      <OpenWebsiteFix />
      <ClientPage />
    </RequirePermission>
  );
}

// an admin's notification links here with ?fixWebsite=<run>: open the website dialog straight away
function OpenWebsiteFix() {
  const openWebsiteFix = useUi(u => u.openWebsiteFix);
  useEffect(() => {
    const run = new URLSearchParams(window.location.search).get('fixWebsite');
    if (run) openWebsiteFix(run);
  }, [openWebsiteFix]);
  return null;
}
