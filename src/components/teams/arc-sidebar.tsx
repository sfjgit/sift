/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/teams/arc-sidebar.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Building2,
  ChevronRight,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  Network,
  Users,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import type { TeamArc, BusinessUnit } from '@/types/team.types';

// ─────────────────────────────────────────────────────────────────────────────
// Create Arc Dialog
// ─────────────────────────────────────────────────────────────────────────────

function CreateArcDialog({
  open,
  defaultBuId,
  businessUnits,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultBuId: string;
  businessUnits: BusinessUnit[];
  onClose: () => void;
  onCreated: (arc: TeamArc) => void;
}) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [buId, setBuId] = useState(defaultBuId);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !buId) return;
    setIsPending(true);
    setError('');
    try {
      const res = await axios.post('/arcs', {
        name: name.trim(),
        description: desc.trim() || undefined,
        businessUnitId: buId,
      });
      queryClient.invalidateQueries({ queryKey: ['arcs'] });
      onCreated(res.data.data);
      setName('');
      setDesc('');
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create arc');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create team arc</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Business Unit</Label>
            <Select value={buId} onValueChange={setBuId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select BU…" />
              </SelectTrigger>
              <SelectContent>
                {businessUnits.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Arc name</Label>
            <Input
              placeholder="e.g. KaaS Delivery Arc"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              placeholder="What is this arc for?"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!name.trim() || !buId || isPending} onClick={submit}>
            {isPending ? 'Creating…' : 'Create arc'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rename Arc Dialog
// ─────────────────────────────────────────────────────────────────────────────

function RenameArcDialog({
  arc,
  open,
  onClose,
}: {
  arc: TeamArc | null;
  open: boolean;
  onClose: () => void;
}) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [name, setName] = useState(arc?.name ?? '');
  const [desc, setDesc] = useState(arc?.description ?? '');
  const [isPending, setIsPending] = useState(false);

  const submit = async () => {
    if (!arc || !name.trim()) return;
    setIsPending(true);
    try {
      await axios.put(`/teams/arcs/${arc.id}`, {
        name: name.trim(),
        description: desc.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ['arcs'] });
      onClose();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit arc</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!name.trim() || isPending} onClick={submit}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Arc Sidebar
// ─────────────────────────────────────────────────────────────────────────────

interface ArcSidebarProps {
  selectedArcId: string | null;
  onSelectArc: (id: string) => void;
}

export function ArcSidebar({ selectedArcId, onSelectArc }: ArcSidebarProps) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('team_arcs');

  const [selectedBuId, setSelectedBuId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingArc, setEditingArc] = useState<TeamArc | null>(null);
  const [deletingArc, setDeletingArc] = useState<TeamArc | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Fetch BUs
  const { data: busData } = useQuery<{ success: boolean; data: BusinessUnit[] }>({
    queryKey: ['business-units'],
    queryFn: async () => (await axios.get('/business-units')).data,
  });
  const businessUnits = busData?.data ?? [];

  // Fetch arcs (filtered by BU if selected)
  const { data: arcsData, isLoading } = useQuery<{ success: boolean; data: TeamArc[] }>({
    queryKey: ['arcs', selectedBuId],
    queryFn: async () => {
      const params = selectedBuId ? `?buId=${selectedBuId}` : '';
      return (await axios.get(`/teams/arcs${params}`)).data;
    },
  });
  const arcs = arcsData?.data ?? [];

  // Group arcs by BU
  const byBU = arcs.reduce<Record<string, { buName: string; arcs: TeamArc[] }>>((acc, arc) => {
    const key = arc.businessUnit?.id ?? '__none__';
    const label = arc.businessUnit?.name ?? 'No BU';
    if (!acc[key]) acc[key] = { buName: label, arcs: [] };
    acc[key].arcs.push(arc);
    return acc;
  }, {});

  const deleteArc = useMutation({
    mutationFn: async (id: string) => (await axios.delete(`/arcs/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arcs'] });
      setDeletingArc(null);
    },
    onError: (e: any) => setDeleteError(e?.response?.data?.message ?? 'Cannot delete'),
  });

  return (
    <div className="flex flex-col h-full border-r bg-card w-56 shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Arcs
        </span>
        {permission.canAdd && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* BU filter pills */}
      <div className="flex items-center gap-1 px-2 py-2 border-b overflow-x-auto shrink-0">
        <button
          onClick={() => setSelectedBuId(null)}
          className={cn(
            'flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors',
            !selectedBuId
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          All
        </button>
        {businessUnits.map(bu => (
          <button
            key={bu.id}
            onClick={() => setSelectedBuId(prev => (prev === bu.id ? null : bu.id))}
            className={cn(
              'flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors',
              selectedBuId === bu.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {bu.name.replace(' BU', '')}
          </button>
        ))}
      </div>

      {/* Arc list */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : arcs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 px-3 text-center">
            <Layers className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No arcs yet</p>
            {permission.canAdd && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="mr-1 h-3 w-3" /> Create arc
              </Button>
            )}
          </div>
        ) : (
          Object.values(byBU).map(({ buName, arcs: buArcs }) => (
            <div key={buName}>
              {/* BU group label */}
              <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                <Building2 className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 truncate">
                  {buName}
                </span>
              </div>
              {/* Arcs in this BU */}
              {buArcs.map(arc => {
                const isSelected = selectedArcId === arc.id;
                return (
                  <div
                    key={arc.id}
                    className={cn(
                      'group relative mx-1.5 mb-0.5 rounded-lg cursor-pointer transition-all',
                      isSelected ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-muted/60'
                    )}
                    onClick={() => onSelectArc(arc.id)}
                  >
                    <div className="flex items-start gap-2 px-2.5 py-2.5">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-md shrink-0 mt-0.5',
                          isSelected ? 'bg-primary/15' : 'bg-muted'
                        )}
                      >
                        <Layers
                          className={cn(
                            'h-3.5 w-3.5',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-xs font-medium leading-tight truncate',
                            isSelected && 'text-primary'
                          )}
                        >
                          {arc.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {(arc as any)._count?.teams ?? 0} teams
                        </p>
                      </div>
                      {permission.canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => setEditingArc(arc)}>
                              <Pencil className="mr-2 h-3 w-3" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setDeleteError('');
                                setDeletingArc(arc);
                              }}
                            >
                              <Trash2 className="mr-2 h-3 w-3" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Dialogs */}
      <CreateArcDialog
        open={showCreate}
        defaultBuId={selectedBuId ?? businessUnits[0]?.id ?? ''}
        businessUnits={businessUnits}
        onClose={() => setShowCreate(false)}
        onCreated={arc => onSelectArc(arc.id)}
      />

      <RenameArcDialog arc={editingArc} open={!!editingArc} onClose={() => setEditingArc(null)} />

      <AlertDialog open={!!deletingArc} onOpenChange={v => !v && setDeletingArc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete arc</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-medium text-foreground">{deletingArc?.name}</span>? This
              cannot be undone. All teams must be removed first.
              {deleteError && <p className="mt-2 text-destructive text-sm">{deleteError}</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingArc && deleteArc.mutate(deletingArc.id)}
              disabled={deleteArc.isPending}
            >
              {deleteArc.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
