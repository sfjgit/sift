/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/context/AuthContext';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_FLOW,
  PRIORITY_COLOR,
} from '@/components/requirements/types';
import type { RequirementDetail } from '@/components/requirements/types';

import { RequirementOverviewTab } from '@/components/requirements/RequirementOverviewTab';
import { RequirementPipelineTab } from '@/components/requirements/RequirementPipelineTab';
import { RequirementAssignmentsTab } from '@/components/requirements/RequirementAssignmentsTab';
import {
  RequirementNotesTab,
  RequirementDocumentsTab,
  RequirementActivityTab,
} from '@/components/requirements/RequirementNotesDocsActivityTabs';
interface DetailResponse {
  success: boolean;
  data: RequirementDetail;
  permissions: { canEdit: boolean; canDelete: boolean };
}

export default function RequirementDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('requirements');
  const { user } = useAuth();

  const [statusDialog, setStatusDialog] = useState<{ toStatus: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  // ── Fetch requirement ─────────────────────────────────────────────────────
  const reqQuery = useQuery<DetailResponse>({
    queryKey: ['requirement', id],
    queryFn: async () => (await axios.get<DetailResponse>(`/requirements/${id}`)).data,
    enabled: !!id,
  });

  // ── Status mutation ───────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason: string }) =>
      (await axios.patch(`/requirements/${id}/status`, { status, reason: reason || undefined }))
        .data,
    onSuccess: (_, vars) => {
      toast.success(`Status changed to ${STATUS_LABEL[vars.status as keyof typeof STATUS_LABEL]}`);
      queryClient.invalidateQueries({ queryKey: ['requirement', id] });
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      setStatusDialog(null);
      setStatusReason('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to change status'),
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (reqQuery.isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (reqQuery.isError || !reqQuery.data?.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load requirement.{' '}
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const r = reqQuery.data.data;
  const perms = reqQuery.data.permissions;
  const canEdit = permission.canEdit && perms.canEdit;
  const nextStatuses = STATUS_FLOW[r.status] ?? [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mt-0.5"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{r.reqCode}</span>
              <Badge className={`text-[10px] ${STATUS_COLOR[r.status]}`} variant="outline">
                {STATUS_LABEL[r.status]}
              </Badge>
              <Badge className={`text-[10px] ${PRIORITY_COLOR[r.priority]}`} variant="outline">
                {r.priority}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold mt-1">{r.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {r.client.name}
              {r.businessUnit ? ` · ${r.businessUnit.name}` : ''}
              {r.serviceLine ? ` · ${r.serviceLine.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && nextStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Change Status
                  <ChevronDown className="ml-2 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextStatuses.map(s => (
                  <DropdownMenuItem key={s} onClick={() => setStatusDialog({ toStatus: s })}>
                    → {STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => router.push(`/requirements/${id}/edit`)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-0">
          {[
            { value: 'overview', label: 'Overview' },
            { value: 'pipeline', label: 'Pipeline' },
            { value: 'assignments', label: 'Assignments' },
            { value: 'notes', label: 'Notes' },
            { value: 'documents', label: 'Documents' },
            { value: 'activity', label: 'Activity' },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="pt-5">
          <TabsContent value="overview" className="mt-0">
            <RequirementOverviewTab requirement={r} />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-0">
            <RequirementPipelineTab requirementId={id} currentStatus={r.status} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="assignments" className="mt-0">
            <RequirementAssignmentsTab requirementId={id} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="notes" className="mt-0">
            <RequirementNotesTab
              requirementId={id}
              initialNotes={r.notes}
              canEdit={canEdit}
              currentUserId={user?.id ?? ''}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <RequirementDocumentsTab requirementId={id} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <RequirementActivityTab requirementId={id} />
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Status change dialog ──────────────────────────────────────────── */}
      <Dialog open={!!statusDialog} onOpenChange={o => !o && setStatusDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Change to{' '}
              {statusDialog && STATUS_LABEL[statusDialog.toStatus as keyof typeof STATUS_LABEL]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Reason <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                placeholder="Why is this status changing?"
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusDialog &&
                statusMutation.mutate({
                  status: statusDialog.toStatus,
                  reason: statusReason,
                })
              }
            >
              {statusMutation.isPending ? 'Updating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
