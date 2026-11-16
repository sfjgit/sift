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
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CalendarClock,
  ChevronDown,
  Briefcase,
  FileText,
  GitBranch,
  GraduationCap,
  IndianRupee,
  Mail,
  MapPin,
  Megaphone,
  ListTodo,
  MessageCircle,
  MessageSquareText,
  Phone,
  Plus,
  Star,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/states';
import { DataTable, useTableState } from '@/components/data-table';
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
import { MeetingsList } from '@/features/clients/detail/MeetingsList';
import { SectionComments } from '@/features/clients/detail/SectionComments';
import { OutreachList } from '@/features/clients/detail/OutreachList';
import { PipelinePanel } from '@/features/pipeline/PipelinePanel';
import { CsrSkilling } from '@/features/clients/detail/CsrSkilling';
import { MarketingAssets, SalesAssets } from '@/features/clients/detail/AssetsSections';
import { spocColumns, spocFilters } from '@/features/spocs/columns';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { clientDetailTour } from '@/features/tour/tours/catalog';
import { clientHooks, spocHooks } from '@/hooks/queries';
import { WorkPanel, useWorkTasks, type ComposeMode } from '@/features/work/WorkPanel';
import { spocsApi } from '@/lib/api/endpoints';
import { fullName } from '@/lib/format';
import { useUi } from '@/stores/ui';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail } from '@/types/crm';

// order: information first, then the sales activity, then the rest. Engine
// activity (pipeline runs) is hidden until asked for.
const SECTION_IDS = [
  'info',
  'activity',
  'branches',
  'skilling',
  'csr',
  'reports',
  'spocs',
  'meetings',
  'sales_assets',
  'marketing_assets',
  'outreach',
  'pipeline',
] as const;
type SectionId = (typeof SECTION_IDS)[number];
// old links (tabs of earlier versions)
const ALIASES: Record<string, SectionId> = {
  overview: 'info',
  locations: 'branches',
  notes: 'activity',
};

const sectionFromUrl = (): SectionId | null => {
  const t = new URLSearchParams(window.location.search).get('tab');
  if (!t) return null;
  const id = ALIASES[t] ?? t;
  return (SECTION_IDS as readonly string[]).includes(id) ? (id as SectionId) : null;
};

const scrollToSection = (id: SectionId) =>
  document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const OPEN_KEY = 'crm:client-sections-v3';

/** open bars — "Activity & tasks" and "Client information" at first; remembered in this browser */
function useOpenSections() {
  const [open, setOpen] = useState<SectionId[]>(() => {
    let saved: SectionId[] = ['activity', 'info'];
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

interface SectionDef {
  id: SectionId;
  label: string;
  icon: typeof Users;
  count?: number | string;
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
  const workTasks = useWorkTasks(client?.id).data ?? [];
  // engine activity stays hidden unless asked for (or linked to with ?tab=pipeline)
  const [showEngine, setShowEngine] = useState(() => sectionFromUrl() === 'pipeline');
  const openTasks = workTasks.filter(t => t.status !== 'DONE').length;
  const meetingCount = workTasks.filter(t => t.kind === 'MEETING').length;
  const [compose, setCompose] = useState<ComposeMode>('comment');
  // the client's SPOCs, so a comment / call / task can be tagged to one of them
  const canSeeSpocs = can('spocs.read');
  const { data: spocPage } = useQuery({
    queryKey: [...spocHooks.keys.all, 'of-client', id],
    queryFn: () => spocsApi.list({ clientId: id, limit: 100 }),
    enabled: !!client && canSeeSpocs,
  });
  const spocOptions = useMemo(
    () => (spocPage?.data ?? []).map(s => ({ id: s.id, name: fullName(s) })),
    [spocPage]
  );

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
              id: 'activity',
              label: 'Activity & tasks',
              icon: Activity,
              count: openTasks ? `${openTasks} open` : undefined,
              hint: 'Comments, calls, emails, WhatsApp, meetings and tasks',
            },
            {
              id: 'branches',
              label: 'Branch offices',
              icon: MapPin,
              count: client.locations.length,
              steps: ['branches'],
            },
            {
              id: 'skilling',
              label: 'CSR skilling programmes',
              icon: GraduationCap,
              count: client.csrPrograms?.length,
              hint: 'Attachments by year, programmes, add & import',
              steps: ['figures'],
            },
            {
              id: 'csr',
              label: 'CSR figures & financials',
              icon: IndianRupee,
              count: client.csrFinancials?.length,
              hint: 'CSR spend per year and company financials',
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
              id: 'meetings',
              label: 'Meetings',
              icon: CalendarClock,
              count: meetingCount || undefined,
              hint: 'Every meeting, its SPOC and minutes',
            },
            {
              id: 'sales_assets',
              label: 'Sales assets',
              icon: Briefcase,
              hint: 'Pitch deck and sales brief',
            },
            {
              id: 'marketing_assets',
              label: 'Marketing assets',
              icon: Megaphone,
              hint: 'Email, LinkedIn and WhatsApp templates per SPOC',
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
              label: 'Engine activity',
              icon: GitBranch,
              hint: 'Pipeline runs on this client',
              hidden: !can('step_runs.read') || !showEngine,
            },
          ]
        : [],
    [client, can, openTasks, meetingCount, showEngine]
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

  const visible = sections.filter(d => !d.hidden);
  /** open the section if needed, then scroll to it */
  const jumpTo = (sid: SectionId) => {
    if (!openIds.includes(sid)) setOpenIds([...openIds, sid]);
    requestAnimationFrame(() => scrollToSection(sid));
  };

  const body: Record<SectionId, React.ReactNode> = {
    activity: (
      <WorkPanel
        clientId={client.id}
        notes={client.notes}
        spocs={spocOptions}
        mode={compose}
        onModeChange={setCompose}
      />
    ),
    info: (
      <>
        <ClientInfo client={client} />
        <SectionComments client={client} section="info" />
      </>
    ),
    branches: (
      <>
        <LocationsTab client={client} />
        <SectionComments client={client} section="branches" />
      </>
    ),
    skilling: (
      <>
        <CsrSkilling client={client} />
        <SectionComments client={client} section="skilling" />
      </>
    ),
    csr: (
      <>
        <CsrTab client={client} withDocuments={false} withPrograms={false} />
        <SectionComments client={client} section="csr" />
      </>
    ),
    reports: (
      <>
        <DocumentsPanel client={client} />
        <SectionComments client={client} section="reports" />
      </>
    ),
    spocs: (
      <>
        <ClientSpocs client={client} />
        <SectionComments client={client} section="spocs" />
      </>
    ),
    meetings: (
      <>
        <MeetingsList
          clientId={client.id}
          clientName={client.name}
          onBook={
            can('client_notes.create')
              ? () => {
                  setCompose('meeting');
                  jumpTo('activity');
                }
              : undefined
          }
        />
        <SectionComments client={client} section="meetings" />
      </>
    ),
    sales_assets: (
      <>
        <SalesAssets />
        <SectionComments client={client} section="sales_assets" />
      </>
    ),
    marketing_assets: (
      <>
        <MarketingAssets clientId={client.id} spocs={spocOptions} />
        <SectionComments client={client} section="marketing_assets" />
      </>
    ),
    outreach: (
      <>
        <OutreachList clientId={client.id} />
        <SectionComments client={client} section="outreach" />
      </>
    ),
    pipeline: <PipelinePanel clientId={client.id} clientName={client.name} />,
  };

  return (
    <div className="space-y-4 pb-[20vh]">
      <Breadcrumbs crumbs={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} />
      <ClientHeader client={client} onEdit={() => setEditing(true)} onRun={onRun} />

      {/* quick log: opens the composer on that tab */}
      {can('client_notes.create') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Log / add</span>
          <div className="flex overflow-hidden rounded-lg border bg-card">
            {(
              [
                ['call', 'Call', Phone],
                ['email', 'Email', Mail],
                ['whatsapp', 'WhatsApp', MessageCircle],
                ['comment', 'Comment', MessageSquareText],
                ['meeting', 'Meeting', CalendarClock],
                ['task', 'Task', ListTodo],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setCompose(m);
                  jumpTo('activity');
                }}
                className="inline-flex items-center gap-1.5 border-r px-3 py-1.5 text-[13px] font-medium text-muted-foreground last:border-r-0 hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        {/* left rail: jump to a section (opens it if closed) */}
        <nav className="hidden self-start lg:sticky lg:top-4 lg:block">
          <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            On this page
          </p>
          <ul>
            {visible.map(d => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(d.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md border-l-2 px-3 py-1.5 text-left text-[13.5px] transition-colors',
                    openIds.includes(d.id)
                      ? 'border-primary font-medium text-foreground hover:bg-muted'
                      : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="truncate">{d.label}</span>
                  {d.count ? (
                    <span className="shrink-0 text-xs tabular text-muted-foreground">
                      {typeof d.count === 'number' ? d.count : d.count.replace(' open', '')}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-3" {...tourTarget('client-tabs')}>
          {visible.map(d => (
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
          {can('step_runs.read') && (
            <div className="flex justify-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  const next = !showEngine;
                  setShowEngine(next);
                  if (next) jumpTo('pipeline');
                }}
              >
                <GitBranch /> {showEngine ? 'Hide engine activity' : 'Show engine activity'}
              </Button>
            </div>
          )}
        </div>
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
