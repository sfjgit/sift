'use client';

import { useParams, useRouter } from 'next/navigation';

import ClientDetailSkeleton from '@/components/clients/Clientdetailskeleton';
import ClientHeader from '@/components/clients/Clientheader';
import ContactsPanel from '@/components/clients/Contactspanel';
import { HandlersPanel, TeamsPanel } from '@/components/clients/Handlersteamspanel';
import OverviewPanel from '@/components/clients/Overviewpanel';
import RequirementsPanel from '@/components/clients/Requirementspanel';
import StatsBar from '@/components/clients/Statsbar';
import { MODULES } from '@/constants/modules';
import { usePermissions } from '@/hooks/usePermission';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useClients } from '@/lib/clients.api';
import { useMutation, useQuery } from '@tanstack/react-query';
import AddContactDialog from '@/components/clients/AddContactDialog';
import { AddHandlerDialog } from '@/components/clients/Addhandlerdialog';
import { useCallback, useState } from 'react';

// Feature

// ── Small count badge on tab trigger ─────────────────────
function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 transition-colors group-data-[state=active]:bg-[#0066CC]/15 group-data-[state=active]:text-[#0066CC]">
      {n}
    </span>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const openDialog = useCallback(() => setDialogOpen(true), []);

  const { canView, canEdit, canAdd } = usePermissions(MODULES.CLIENTS);

  const clientApi = useClients();

  //   const { client, isLoading, isError, error, approveMutation } = clientApi.getOne(id);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientApi.getOne(id),
    select: res => res.data?.data[0], // 🔥 IMPORTANT FIX
  });

  const client = data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignedUserIds = client?.handlers?.map((h: any) => h.userId) ?? [];
  const primaryContactId = client?.contacts?.[0]?.id ?? '';

  const approveMutation = useMutation({
    mutationFn: () => clientApi.approve(id),
  });

  // ── Auth loading ───────────────────────────────────────
  if (canView === undefined) return <ClientDetailSkeleton />;

  if (!canView) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-4 ring-red-100">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-700">Access Denied</p>
        <p className="text-xs text-slate-400">
          You don&apos;t have permission to view this client.
        </p>
      </div>
    );
  }

  // ── Data loading ───────────────────────────────────────
  if (isLoading) return <ClientDetailSkeleton />;

  // ── Error ──────────────────────────────────────────────
  if (isError || !client) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-4 ring-red-100">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-700">
          {(error as Error)?.message ?? 'Client not found'}
        </p>
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="mt-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          ← Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div
        className="flex h-screen flex-col space-y-2 overflow-hidden bg-slate-50"
        style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
      >
        {/* ── Sticky header ────────────────────────────────── */}
        <ClientHeader
          client={client}
          canEdit={!!canEdit}
          canApprove={!!canEdit && client.status === 'PENDING'}
          isApproving={approveMutation.isPending}
          onApprove={() => approveMutation.mutate()}
        />

        {/* ── Shadcn Tabs ───────────────────────────────────── */}
        {/*
        Tab state is owned by shadcn Tabs (no useState needed).
        To persist tab in URL:
          defaultValue={searchParams.get('tab') ?? 'overview'}
          onValueChange={(v) => router.replace(`?tab=${v}`, { scroll: false })}
      */}
        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6">
            <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
              {[
                { value: 'overview', label: 'Overview', count: 0 },
                { value: 'contacts', label: 'Contacts', count: client.contacts?.length },
                {
                  value: 'requirements',
                  label: 'Requirements',
                  count: client.requirements?.length,
                },
                { value: 'handlers', label: 'Handlers', count: client.handlers?.length },
                { value: 'teams', label: 'Teams', count: client.teamAssignments?.length },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="group relative h-8 rounded-lg border-b-2 border-transparent px-4 text-sm font-medium text-slate-500 transition-all data-[state=active]:border-[#0066CC] data-[state=active]:text-[#0066CC] data-[state=active]:bg-transparent hover:text-slate-800"
                >
                  {tab.label}
                  <Count n={tab.count} />
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Tab content — only this div scrolls ─────────── */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1080px] px-6 py-6 space-y-5">
              {/* OVERVIEW */}
              <TabsContent value="overview" className="mt-0 space-y-5 focus-visible:outline-none">
                <StatsBar client={client} />
                <OverviewPanel client={client} />
              </TabsContent>

              {/* CONTACTS */}
              <TabsContent value="contacts" className="mt-0 focus-visible:outline-none">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">
                    Contacts{' '}
                    <span className="ml-1 font-normal text-slate-400">
                      ({client.contacts?.length})
                    </span>
                  </h3>
                  {canAdd && (
                    // <button onClick={() => router.push(`/dashboard/clients/${id}/contacts/new`)}>
                    //   <svg
                    //     width="12"
                    //     height="12"
                    //     viewBox="0 0 24 24"
                    //     fill="none"
                    //     stroke="currentColor"
                    //     strokeWidth="2.5"
                    //   >
                    //     <line x1="12" y1="5" x2="12" y2="19" />
                    //     <line x1="5" y1="12" x2="19" y2="12" />
                    //   </svg>
                    //   Add Contact
                    // </button>
                    <AddContactDialog
                      clientId={id}
                      onSuccess={() => {
                        // OPTIONAL: refetch client data
                      }}
                    />
                  )}
                </div>
                <ContactsPanel contacts={client.contacts} canAdd={!!canAdd} clientId={id} />
              </TabsContent>

              {/* REQUIREMENTS */}
              <TabsContent value="requirements" className="mt-0 focus-visible:outline-none">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">
                    Requirements{' '}
                    <span className="ml-1 font-normal text-slate-400">
                      ({client.requirements?.length})
                    </span>
                  </h3>
                  {canAdd && (
                    <button
                      onClick={() => router.push(`/requirements/new?clientId=${id}`)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#0066CC] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052A3] active:scale-95 transition-all"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      New Requirement
                    </button>
                  )}
                </div>
                <RequirementsPanel
                  requirements={client.requirements}
                  clientId={id}
                  canAdd={!!canAdd}
                />
              </TabsContent>

              {/* HANDLERS */}
              <TabsContent value="handlers" className="mt-0 focus-visible:outline-none">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    Handlers{' '}
                    <span className="ml-1 font-normal text-slate-400">
                      ({client.handlers?.length})
                    </span>
                  </h3>
                  <button
                    onClick={openDialog}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0066CC] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052A3] active:scale-95 transition-all"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Handler
                  </button>
                </div>
                <HandlersPanel handlers={client.handlers} />
              </TabsContent>

              {/* TEAMS */}
              <TabsContent value="teams" className="mt-0 focus-visible:outline-none">
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                  Team Assignments{' '}
                  <span className="ml-1 font-normal text-slate-400">
                    ({client.teamAssignments?.length})
                  </span>
                </h3>
                <TeamsPanel teamAssignments={client.teamAssignments} />
              </TabsContent>
              <AddHandlerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                clientId={client.id}
                contactId={primaryContactId}
                assignedUserIds={assignedUserIds}
              />
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
