// app/clients/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';

import { ClientDetailHeader } from '@/components/clients/detail/ClientDetailHeader';
import { ClientDetailSidebar } from '@/components/clients/detail/ClientDetailSidebar';
import { SpocTab } from '@/components/clients/detail/SpocTab';
import { RequirementsTab } from '@/components/clients/detail/RequirementsTab';
import { NotesTab } from '@/components/clients/detail/NotesTab';
import type { ClientDetail, ClientDetailPermissions } from '@/components/clients/detail/types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{
    data: ClientDetail;
    permissions: ClientDetailPermissions;
  }>({
    queryKey: ['client', id],
    queryFn: async () => (await axios.get(`/clients/${id}`)).data,
    enabled: !!id,
  });

  const client = data?.data;
  const permissions = data?.permissions;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['client', id] });

  const statusMutation = useMutation({
    mutationFn: async (status: string) =>
      (await axios.patch(`/clients/${id}/status`, { status })).data,
    onSuccess: (_, status) => {
      toast.success(`Client ${status.toLowerCase()}`);
      invalidate();
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-96 mt-4" />
      </div>
    );
  }

  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">Client not found.</div>;
  }

  const activeSpocs = client.spocs.filter(s => s.isActive);

  return (
    <div className="flex flex-col h-full">
      <ClientDetailHeader
        client={client}
        permissions={permissions}
        onStatusChange={s => statusMutation.mutate(s)}
        isStatusPending={statusMutation.isPending}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ClientDetailSidebar client={client} />

        <div className="flex-1 min-w-0 flex flex-col min-h-0 px-6 pt-4 pb-6">
          <Tabs defaultValue="spocs" className="flex flex-col flex-1 min-h-0">
            <TabsList className="shrink-0 w-fit">
              <TabsTrigger value="spocs">
                SPOCs{' '}
                {activeSpocs.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{activeSpocs.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requirements">
                Requirements{' '}
                {client.requirements.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{client.requirements.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes{' '}
                {client.notes.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{client.notes.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spocs" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <SpocTab
                  clientId={id}
                  spocs={client.spocs}
                  canEdit={permissions?.canEdit ?? false}
                  onMutated={invalidate}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="requirements" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <RequirementsTab requirements={client.requirements} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="notes" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <NotesTab
                  clientId={id}
                  notes={client.notes}
                  currentUserId={user?.id}
                  isSuperAdmin={user?.isSuperAdmin}
                  onMutated={invalidate}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
