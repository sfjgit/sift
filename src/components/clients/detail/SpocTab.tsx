// components/clients/detail/SpocTab.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useAxios } from '@/hooks/useAxios';
import { AddSpocDialog } from './AddSpocDialog';
import { EditSpocDialog } from './EditSpocDialog';
import type { ClientSpoc } from './types';

interface Props {
  clientId: string;
  spocs: ClientSpoc[];
  canEdit: boolean;
  onMutated: () => void;
}

export function SpocTab({ clientId, spocs, canEdit, onMutated }: Props) {
  const axios = useAxios();

  const [addOpen, setAddOpen] = useState(false);
  const [editSpoc, setEditSpoc] = useState<ClientSpoc | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const activeSpocs = spocs.filter(s => s.isActive);
  const inactiveSpocs = spocs.filter(s => !s.isActive);

  const removeMutation = useMutation({
    mutationFn: async (spocId: string) =>
      (await axios.delete(`/clients/${clientId}/spocs/${spocId}`)).data,
    onSuccess: () => {
      toast.success('SPOC removed');
      setRemoveId(null);
      onMutated();
    },
    onError: () => toast.error('Failed to remove SPOC'),
  });

  return (
    <>
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Client-side contacts for this account.</p>
          {canEdit && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              + Add SPOC
            </Button>
          )}
        </div>

        {activeSpocs.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No SPOCs assigned yet.
            {canEdit && (
              <button
                onClick={() => setAddOpen(true)}
                className="ml-1 text-primary hover:underline"
              >
                Add one
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeSpocs.map(s => (
              <div
                key={s.id}
                className="rounded-lg border bg-card p-4 flex items-start justify-between gap-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {s.firstName} {s.lastName}
                    </span>
                    {s.isPrimary && (
                      <Badge variant="outline" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  {s.designation && (
                    <span className="text-xs text-muted-foreground">
                      {s.designation}
                      {s.department ? ` · ${s.department}` : ''}
                    </span>
                  )}
                  {s.email && <span className="text-xs text-muted-foreground">{s.email}</span>}
                  {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}

                  <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-border/40 flex-wrap">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Handled by
                    </span>
                    <span className="text-xs font-medium">
                      {s.handler.firstName} {s.handler.lastName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      · {s.serviceLine.name} · {s.businessUnit.name}
                    </span>
                  </div>

                  {s.notes && (
                    <span className="text-xs text-muted-foreground italic mt-0.5">{s.notes}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Added {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })} by{' '}
                    {s.addedBy.firstName} {s.addedBy.lastName}
                  </span>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditSpoc(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoveId(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {inactiveSpocs.length > 0 && (
          <>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Past SPOCs
            </p>
            <div className="flex flex-col gap-2">
              {inactiveSpocs.map(s => (
                <div
                  key={s.id}
                  className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-0.5 opacity-60"
                >
                  <span className="text-sm">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.serviceLine.name}
                    {s.designation ? ` · ${s.designation}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AddSpocDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientId={clientId}
        onAdded={onMutated}
      />

      <EditSpocDialog
        spoc={editSpoc}
        clientId={clientId}
        onClose={() => setEditSpoc(null)}
        onUpdated={onMutated}
      />

      <AlertDialog open={!!removeId} onOpenChange={o => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove SPOC?</AlertDialogTitle>
            <AlertDialogDescription>
              This person will no longer be a SPOC for this client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
              onClick={() => removeId && removeMutation.mutate(removeId)}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
