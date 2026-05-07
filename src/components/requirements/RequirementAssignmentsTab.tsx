/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Calendar, ChevronRight, Plus, Trash2, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';
import { STAGE_LABEL, STAGE_COLOR, daysRemaining, fullName } from './types';
import type { AssignmentNode, RequirementTree } from './types';

interface Props {
  requirementId: string;
  canEdit: boolean;
}

interface SubordinateUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  department: { id: string; name: string } | null;
  role: { id: string; name: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Deadline badge
// ─────────────────────────────────────────────────────────────────────────────

function DeadlineBadge({
  deadline,
  breachedAt,
}: {
  deadline: string | null;
  breachedAt: string | null;
}) {
  if (!deadline) return null;
  const days = daysRemaining(deadline);
  const breached = !!breachedAt || (days !== null && days < 0);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium',
        breached
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          : days !== null && days <= 2
            ? 'bg-amber-100 text-amber-700'
            : 'bg-muted text-muted-foreground'
      )}
    >
      <Calendar className="h-2.5 w-2.5" />
      {breached ? `${Math.abs(days ?? 0)}d overdue` : `${days}d left`}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment node card — recursive
// ─────────────────────────────────────────────────────────────────────────────

function AssignmentCard({
  node,
  canEdit,
  onAssignChild,
  onRemove,
}: {
  node: AssignmentNode;
  canEdit: boolean;
  onAssignChild: (parentId: string) => void;
  onRemove: (assignmentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  const borderColors = [
    'border-l-blue-400',
    'border-l-violet-400',
    'border-l-amber-400',
    'border-l-emerald-400',
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Card */}
      <div
        className={cn(
          'rounded-lg border border-l-4 bg-card shadow-sm p-4',
          borderColors[node.depth % borderColors.length]
        )}
      >
        {/* Top row: avatar + name + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{fullName(node.assignedTo)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {node.assignedTo.department?.name}
                {node.assigneeBU ? ` · ${node.assigneeBU.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <DeadlineBadge deadline={node.deadline} breachedAt={node.breachedAt} />
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => onAssignChild(node.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Sub-assign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemove(node.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Allocated', value: node.allocatedOpenings ?? '—' },
            { label: 'Filled', value: node.filledOpenings },
            { label: 'Submitted', value: node.submissionsCount },
            { label: 'Interviews', value: node.interviewsCount },
          ].map(s => (
            <div key={s.label} className="rounded-md bg-muted/50 py-1.5">
              <p className="text-sm font-bold tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Deadline row */}
        {node.deadline && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Deadline: {format(new Date(node.deadline), 'dd MMM yyyy')}</span>
            {node.deadlineMet === true && (
              <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-600">
                Met
              </Badge>
            )}
            {node.deadlineMet === false && (
              <Badge variant="outline" className="text-[9px] border-red-300 text-red-600">
                Missed
              </Badge>
            )}
          </div>
        )}

        {/* Candidates */}
        {node.candidates.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Candidates ({node.candidates.length})
            </p>
            {node.candidates.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium truncate max-w-[200px]">{c.candidateName}</span>
                <Badge className={cn('text-[9px]', STAGE_COLOR[c.currentStage])} variant="outline">
                  {STAGE_LABEL[c.currentStage]}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="mt-2.5 text-[10px] text-muted-foreground">
          Assigned by {fullName(node.assignedBy)} ·{' '}
          {formatDistanceToNow(new Date(node.assignedAt), { addSuffix: true })}
        </p>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-8 pl-4 space-y-2 border-l-2 border-dashed border-border">
          {node.children.map(child => (
            <AssignmentCard
              key={child.id}
              node={child}
              canEdit={canEdit}
              onAssignChild={onAssignChild}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* Collapse toggle */}
      {hasChildren && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(e => !e)}
          onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
          className="ml-4 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer select-none"
        >
          <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
          {expanded ? 'Collapse' : `Show ${node.children.length} sub-assignment(s)`}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assign dialog
// ─────────────────────────────────────────────────────────────────────────────

function AssignDialog({
  open,
  parentAssignmentId,
  requirementId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  parentAssignmentId: string | null;
  requirementId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const axios = useAxios();
  const [selectedId, setSelectedId] = useState<string>('');
  const [allocated, setAllocated] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [calOpen, setCalOpen] = useState(false);

  const subsQuery = useQuery<{ success: boolean; data: SubordinateUser[] }>({
    queryKey: ['my-subordinates'],
    queryFn: async () => (await axios.get('/users/subordinates')).data,
    enabled: open,
    staleTime: 30_000,
  });

  const subs = subsQuery.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await axios.post(`/requirements/${requirementId}/assignments`, {
          assignedToId: selectedId,
          parentAssignmentId: parentAssignmentId ?? undefined,
          allocatedOpenings: allocated ? parseInt(allocated) : undefined,
          deadline: deadline?.toISOString(),
        })
      ).data,
    onSuccess: () => {
      toast.success('Assignment created');
      onSuccess();
      onClose();
      setSelectedId('');
      setAllocated('');
      setDeadline(undefined);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Failed to create assignment'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{parentAssignmentId ? 'Sub-Assign' : 'Assign Requirement'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Subordinates */}
          <div className="space-y-1.5">
            <Label>
              Assign To <span className="text-destructive">*</span>
            </Label>

            {subsQuery.isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-11 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!subsQuery.isLoading && subs.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No direct reports found
              </div>
            )}

            {!subsQuery.isLoading && subs.length > 0 && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {subs.map(u => (
                  <div
                    key={u.id}
                    role="option"
                    aria-selected={selectedId === u.id}
                    tabIndex={0}
                    onClick={() => setSelectedId(u.id)}
                    onKeyDown={e => e.key === 'Enter' && setSelectedId(u.id)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer select-none transition-colors',
                      selectedId === u.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50 border-border'
                    )}
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-primary">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {u.role.name}
                        {u.department ? ` · ${u.department.name}` : ''}
                      </p>
                    </div>
                    {selectedId === u.id && (
                      <span className="text-primary text-sm shrink-0">✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allocated openings */}
          <div className="space-y-1.5">
            <Label>Allocated Openings</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 2"
              value={allocated}
              onChange={e => setAllocated(e.target.value)}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    'w-full justify-start text-sm font-normal',
                    !deadline && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, 'dd MMM yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI
                  mode="single"
                  selected={deadline}
                  onSelect={d => {
                    setDeadline(d);
                    setCalOpen(false);
                  }}
                  disabled={date => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tab
// ─────────────────────────────────────────────────────────────────────────────

export function RequirementAssignmentsTab({ requirementId, canEdit }: Props) {
  const axios = useAxios();
  const queryClient = useQueryClient();

  // undefined = dialog closed | null = top-level assign | string = sub-assign
  const [assignParentId, setAssignParentId] = useState<string | null | undefined>(undefined);

  const treeQuery = useQuery<{ success: boolean; data: RequirementTree }>({
    queryKey: ['requirement-tree', requirementId],
    queryFn: async () => (await axios.get(`/requirements/${requirementId}/tree`)).data,
  });

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) =>
      (await axios.delete(`/requirements/${requirementId}/assignments/${assignmentId}`)).data,
    onSuccess: () => {
      toast.success('Assignment removed');
      queryClient.invalidateQueries({ queryKey: ['requirement-tree', requirementId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to remove'),
  });

  const tree = treeQuery.data?.data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Assignment Tree</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each node can sub-assign to their direct reports
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setAssignParentId(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign
          </Button>
        )}
      </div>

      {/* Loading */}
      {treeQuery.isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!treeQuery.isLoading && (tree?.assignmentTree.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-2">
          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No assignments yet</p>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setAssignParentId(null)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Make first assignment
            </Button>
          )}
        </div>
      )}

      {/* Tree */}
      {!treeQuery.isLoading && (tree?.assignmentTree.length ?? 0) > 0 && (
        <div className="space-y-4">
          {tree!.assignmentTree.map(node => (
            <AssignmentCard
              key={node.id}
              node={node}
              canEdit={canEdit}
              onAssignChild={id => setAssignParentId(id)}
              onRemove={id => removeMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <AssignDialog
        open={assignParentId !== undefined}
        parentAssignmentId={assignParentId ?? null}
        requirementId={requirementId}
        onClose={() => setAssignParentId(undefined)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['requirement-tree', requirementId] });
          setAssignParentId(undefined);
        }}
      />
    </div>
  );
}
