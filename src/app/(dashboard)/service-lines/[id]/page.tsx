/* eslint-disable @typescript-eslint/no-explicit-any */
// app/service-lines/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useAxios } from '@/hooks/useAxios';
import { ServiceLineForm } from '@/components/service-lines/ServiceLineForm';
import { ToggleConfirmDialog } from '@/components/service-lines/ToggleConfirmDialog';
import type { ServiceLineDetail } from '@/components/service-lines/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-lg border bg-muted/30">
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  CLOSED: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceLineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  const { data, isLoading } = useQuery<{ data: ServiceLineDetail }>({
    queryKey: ['service-line', id],
    queryFn: async () => (await axios.get(`/service-lines/${id}`)).data,
    enabled: !!id,
  });

  const sl = data?.data;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['service-line', id] });
    qc.invalidateQueries({ queryKey: ['service-lines'] });
  };

  const toggleMutation = useMutation({
    mutationFn: async () => (await axios.patch(`/service-lines/${id}/toggle`)).data,
    onSuccess: () => {
      toast.success(`Service line ${sl?.isActive ? 'deactivated' : 'activated'}`);
      setToggleOpen(false);
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed');
      setToggleOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-24" />
          ))}
        </div>
        <Skeleton className="h-64 mt-4" />
      </div>
    );
  }

  if (!sl) {
    return <div className="p-6 text-sm text-muted-foreground">Service line not found.</div>;
  }

  // group spocs by client for cleaner display
  const spocsByClient = sl.clientSpocs.reduce(
    (acc, spoc) => {
      const key = spoc.client.id;
      if (!acc[key]) acc[key] = { client: spoc.client, spocs: [] };
      acc[key].spocs.push(spoc);
      return acc;
    },
    {} as Record<
      string,
      {
        client: ServiceLineDetail['clientSpocs'][0]['client'];
        spocs: ServiceLineDetail['clientSpocs'];
      }
    >
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b bg-background px-6 pt-4 pb-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <button
            onClick={() => router.push('/service-lines')}
            className="hover:text-foreground transition-colors"
          >
            Service Lines
          </button>
          <span>/</span>
          <span>{sl.name}</span>
        </div>

        {/* Title + actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold">{sl.name}</h1>
              {sl.code && (
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border">
                  {sl.code}
                </span>
              )}
              <Badge variant={sl.isActive ? 'default' : 'outline'} className="text-xs">
                {sl.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(sl.createdAt), 'dd MMM yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={
                sl.isActive ? 'text-destructive hover:text-destructive border-destructive/30' : ''
              }
              onClick={() => setToggleOpen(true)}
            >
              {sl.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex items-center gap-3 flex-wrap mt-4">
          <StatCard label="Total requirements" value={sl.stats.totalRequirements} />
          <StatCard label="Active SPOCs" value={sl.stats.activeSpocs} />
          <StatCard label="Unique clients" value={sl.stats.uniqueClients} />
          {Object.entries(sl.stats.requirementsByStatus).map(([status, count]) => (
            <StatCard key={status} label={humanize(status)} value={count ?? 0} />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-6 pt-4 pb-6">
        <Tabs defaultValue="spocs" className="flex flex-col h-full">
          <TabsList className="shrink-0 w-fit">
            <TabsTrigger value="spocs">
              SPOCs
              {sl.stats.activeSpocs > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{sl.stats.activeSpocs}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="requirements">
              Requirements
              {sl.stats.totalRequirements > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{sl.stats.totalRequirements}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* SPOCs tab — grouped by client */}
          <TabsContent value="spocs" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full">
              {sl.clientSpocs.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">
                  No active SPOCs using this service line.
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-4">
                  {Object.values(spocsByClient).map(({ client, spocs }) => (
                    <div key={client.id} className="rounded-lg border overflow-hidden">
                      {/* Client header */}
                      <div
                        className="flex items-center justify-between px-4 py-2.5 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{client.name}</span>
                          {client.industry && (
                            <span className="text-xs text-muted-foreground">
                              · {client.industry}
                            </span>
                          )}
                          {client.businessUnit && (
                            <span className="text-xs text-muted-foreground">
                              · {client.businessUnit.name}
                            </span>
                          )}
                        </div>
                        <Badge
                          variant={client.status === 'ACTIVE' ? 'default' : 'outline'}
                          className="text-[10px]"
                        >
                          {humanize(client.status)}
                        </Badge>
                      </div>

                      {/* Spocs under this client */}
                      <div className="divide-y divide-border">
                        {spocs.map(spoc => (
                          <div
                            key={spoc.id}
                            className="flex items-center justify-between px-4 py-3 gap-3"
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {spoc.firstName} {spoc.lastName}
                                </span>
                                {spoc.isPrimary && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              {spoc.designation && (
                                <span className="text-xs text-muted-foreground">
                                  {spoc.designation}
                                </span>
                              )}
                              {spoc.email && (
                                <span className="text-xs text-muted-foreground">{spoc.email}</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-medium">
                                {spoc.handler.firstName} {spoc.handler.lastName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Handler · {spoc.businessUnit.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Requirements tab */}
          <TabsContent value="requirements" className="mt-4 flex-1 min-h-0">
            <ScrollArea className="h-full">
              {sl.requirements.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">
                  No requirements under this service line yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-4">
                  {sl.requirements.map(r => (
                    <div
                      key={r.id}
                      className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => router.push(`/requirements/${r.id}`)}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.reqCode}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${r.priority === 'HIGH' ? 'border-destructive/40 text-destructive' : ''}`}
                          >
                            {humanize(r.priority)}
                          </Badge>
                          {r.businessUnit && (
                            <span className="text-[10px] text-muted-foreground">
                              {r.businessUnit.name}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium line-clamp-1">{r.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.client.name} · {r.createdBy.firstName} {r.createdBy.lastName} ·{' '}
                          {format(new Date(r.createdAt), 'dd MMM yyyy')}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[r.status] ?? 'bg-muted text-muted-foreground'}`}
                        >
                          {humanize(r.status)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {r.filledOpenings}/{r.totalOpenings} filled
                        </span>
                        {r.activeApplications > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {r.activeApplications} active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit dialog */}
      <ServiceLineForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={invalidate}
        editing={sl}
      />

      {/* Toggle confirm */}
      <ToggleConfirmDialog
        serviceLine={toggleOpen ? sl : null}
        isPending={toggleMutation.isPending}
        onConfirm={() => toggleMutation.mutate()}
        onClose={() => setToggleOpen(false)}
      />
    </div>
  );
}
