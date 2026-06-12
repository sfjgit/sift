// File: RequirementAssignmentsTab.tsx
// Path: src/components/requirements/RequirementAssignmentsTab.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Calendar,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  ExternalLink,
  Search,
  Check,
  Loader2,
  X,
  UserPlus,
  TreePine,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';
import { useRouter } from 'next/navigation';
import { daysRemaining, fullName } from './types';
import type { RequirementTree } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  '01': 'bg-slate-100 text-slate-700 border-slate-200',
  '02': 'bg-blue-50 text-blue-700 border-blue-200',
  '03': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '04': 'bg-violet-50 text-violet-700 border-violet-200',
  '05': 'bg-purple-50 text-purple-700 border-purple-200',
  '06': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  '07A': 'bg-pink-50 text-pink-700 border-pink-200',
  '07B': 'bg-pink-50 text-pink-700 border-pink-200',
  '08': 'bg-rose-50 text-rose-700 border-rose-200',
  '09': 'bg-orange-50 text-orange-700 border-orange-200',
  '10': 'bg-green-50 text-green-700 border-green-200',
};

const BORDER_COLORS = [
  'border-l-blue-400',
  'border-l-violet-400',
  'border-l-amber-400',
  'border-l-emerald-400',
];

const AVATAR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];
const avatarColor = (seed: string) => AVATAR_PALETTE[seed.charCodeAt(0) % AVATAR_PALETTE.length];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  requirementId: string;
  canEdit: boolean;
  req?: {
    id: string;
    reqCode: string;
    title: string;
    totalOpenings: number;
    deadline?: string | null;
  };
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

// ─── Deadline Badge ───────────────────────────────────────────────────────────

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
        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border',
        breached
          ? 'bg-red-50 text-red-700 border-red-200'
          : days !== null && days <= 2
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'
      )}
    >
      <Calendar className="h-3 w-3" />
      {breached ? `${Math.abs(days ?? 0)}d overdue` : `${days}d left`}
    </span>
  );
}

// ─── Person Picker ────────────────────────────────────────────────────────────

function PersonPicker({
  subs,
  loading,
  selectedIds,
  onToggle,
  multi,
  alreadyAssignedIds,
}: {
  subs: SubordinateUser[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  multi: boolean;
  alreadyAssignedIds?: Set<string>;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return subs;
    return subs.filter(
      s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.role.name.toLowerCase().includes(q) ||
        (s.employeeId ?? '').toLowerCase().includes(q)
    );
  }, [subs, search]);

  if (loading)
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-slate-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );

  if (subs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <Users className="w-12 h-12 opacity-20" />
        <p className="text-sm font-medium">No direct reports found</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Search */}
      <div className="relative shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, employee ID…"
          className="pl-10 h-10 text-sm"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white min-h-0">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            No match for "{search}"
          </div>
        ) : (
          filtered.map(u => {
            const isSelected = selectedIds.has(u.id);
            const isAssigned = alreadyAssignedIds?.has(u.id) ?? false;
            const ac = avatarColor(u.id);
            return (
              <button
                key={u.id}
                disabled={isAssigned}
                onClick={() => !isAssigned && onToggle(u.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 text-left transition-colors',
                  isAssigned
                    ? 'opacity-40 cursor-not-allowed bg-slate-50'
                    : isSelected
                      ? 'bg-primary/5 hover:bg-primary/8'
                      : 'hover:bg-slate-50'
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>

                {/* Avatar */}
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                    isSelected ? 'bg-primary/15 text-primary' : ac
                  )}
                >
                  {u.firstName[0]}
                  {u.lastName[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isSelected ? 'text-primary' : 'text-slate-900'
                    )}
                  >
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {u.role.name}
                    {u.department ? ` · ${u.department.name}` : ''}
                    {u.employeeId && (
                      <span className="ml-2 font-mono text-slate-400">{u.employeeId}</span>
                    )}
                  </p>
                </div>

                {isAssigned ? (
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
                    Assigned
                  </span>
                ) : isSelected ? (
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                    ✓ Selected
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {/* Count */}
      {multi && selectedIds.size > 0 && (
        <div className="flex items-center justify-between shrink-0">
          <p className="text-sm font-semibold text-primary">
            {selectedIds.size} recruiter{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={() => Array.from(selectedIds).forEach(id => onToggle(id))}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Assign Dialog ────────────────────────────────────────────────────────────

function AssignDialog({
  open,
  parentAssignmentId,
  requirementId,
  existingAssignedIds,
  req,
  onClose,
  onSuccess,
}: {
  open: boolean;
  parentAssignmentId: string | null;
  requirementId: string;
  existingAssignedIds: Set<string>;
  req?: Props['req'];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const axios = useAxios();
  const isTopLevel = parentAssignmentId === null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState<Date | undefined>(
    isTopLevel && req?.deadline ? new Date(req.deadline) : undefined
  );
  const [calOpen, setCalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subsQuery = useQuery<{ success: boolean; data: SubordinateUser[] }>({
    queryKey: ['my-subordinates'],
    queryFn: async () => (await axios.get('/users/subordinates')).data,
    enabled: open,
    staleTime: 30_000,
  });
  const subs = subsQuery.data?.data ?? [];

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isTopLevel) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }

  function handleClose() {
    if (isSubmitting) return;
    onClose();
    setSelectedIds(new Set());
    setDeadline(isTopLevel && req?.deadline ? new Date(req.deadline) : undefined);
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      if (isTopLevel) {
        const res = await axios.post(`/requirements/${requirementId}/assignments`, {
          assignedToIds: Array.from(selectedIds),
          deadline: deadline?.toISOString() ?? null,
          parentAssignmentId: null,
        });
        const { created = [], skipped = [] } = res.data?.data ?? {};
        if (created.length > 0)
          toast.success(`${created.length} assignment${created.length !== 1 ? 's' : ''} created`);
        if (skipped.length > 0)
          toast.warning(`${skipped.length} skipped — ${skipped[0]?.reason ?? 'already assigned'}`);
      } else {
        const [assignedToId] = Array.from(selectedIds);
        await axios.post(`/requirements/${requirementId}/assignments`, {
          assignedToId,
          deadline: deadline?.toISOString() ?? null,
          parentAssignmentId,
        });
        toast.success('Sub-assignment created');
      }
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      {/*
        p-0 gap-0: kill DialogContent's default padding/gap so we control every zone.
        max-w-5xl w-[90vw]: genuinely large — ~1024px cap, 90vw on smaller screens.
        h-[85vh]: tall enough to show the full list without tiny scrollboxes.
        showCloseButton=false: we render our own X in the header.
      */}
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 max-w-5xl w-[90vw] h-[85vh] flex flex-col overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0',
            isTopLevel
              ? 'bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5'
              : 'bg-slate-50'
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                isTopLevel ? 'bg-primary/10' : 'bg-violet-100'
              )}
            >
              {isTopLevel ? (
                <UserPlus className="w-6 h-6 text-primary" />
              ) : (
                <TreePine className="w-6 h-6 text-violet-600" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">
                {isTopLevel ? 'Assign Recruiters' : 'Sub-Assign Recruiter'}
              </h2>
              {isTopLevel && req ? (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {req.reqCode}
                  </span>
                  <span className="text-sm text-slate-600 truncate">{req.title}</span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {req.totalOpenings} openings
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-1">
                  Select one person to sub-assign under this recruiter
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div
          className={cn('flex-1 min-h-0 p-8', isTopLevel ? 'grid gap-8' : 'flex flex-col gap-6')}
          style={isTopLevel ? { gridTemplateColumns: '1fr 320px' } : undefined}
        >
          {/* Left — person picker (fills all height) */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <Label className="text-sm font-semibold text-slate-800">
                {isTopLevel ? 'Select recruiters' : 'Select person'}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <span className="text-xs text-slate-400">
                {subs.length} people in your reporting tree
              </span>
            </div>
            <PersonPicker
              subs={subs}
              loading={subsQuery.isLoading}
              selectedIds={selectedIds}
              onToggle={toggle}
              multi={isTopLevel}
              alreadyAssignedIds={isTopLevel ? existingAssignedIds : undefined}
            />
          </div>

          {/* Right — deadline + selected summary */}
          <div className="flex flex-col gap-5 min-h-0">
            {/* Deadline */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-800">
                Deadline
                <span className="font-normal text-slate-400 ml-1">(optional)</span>
              </Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      'w-full justify-start text-sm font-normal h-11',
                      !deadline && 'text-slate-400'
                    )}
                  >
                    <Calendar className="mr-2.5 h-4 w-4 shrink-0" />
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
              {deadline && (
                <button
                  onClick={() => setDeadline(undefined)}
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear deadline
                </button>
              )}
              {isTopLevel && req?.deadline && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-snug">
                    Pre-filled from requirement's respond-by date
                  </p>
                </div>
              )}
            </div>

            {/* Selected summary — only top-level */}
            {isTopLevel && (
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    Selected
                    {selectedIds.size > 0 && (
                      <span className="ml-2 text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {selectedIds.size}
                      </span>
                    )}
                  </p>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => Array.from(selectedIds).forEach(id => toggle(id))}
                      className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div
                  className={cn(
                    'flex-1 rounded-xl border-2 border-dashed min-h-0 overflow-y-auto',
                    selectedIds.size === 0
                      ? 'border-slate-200 flex items-center justify-center'
                      : 'border-primary/20 bg-primary/5 p-3 space-y-2'
                  )}
                >
                  {selectedIds.size === 0 ? (
                    <p className="text-sm text-slate-400 text-center px-4">
                      Selected recruiters will appear here
                    </p>
                  ) : (
                    Array.from(selectedIds).map(id => {
                      const u = subs.find(s => s.id === id);
                      if (!u) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-primary/10 shadow-sm"
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              avatarColor(id)
                            )}
                          >
                            {u.firstName[0]}
                            {u.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{u.role.name}</p>
                          </div>
                          <button
                            onClick={() => toggle(id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/80 shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-500 h-11 px-6"
          >
            Cancel
          </Button>
          <Button
            disabled={selectedIds.size === 0 || isSubmitting}
            onClick={handleSubmit}
            className="min-w-[180px] h-11 gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning…
              </>
            ) : isTopLevel ? (
              <>
                <UserPlus className="w-4 h-4" />
                Assign
                {selectedIds.size > 0
                  ? ` ${selectedIds.size} Recruiter${selectedIds.size !== 1 ? 's' : ''}`
                  : ''}
              </>
            ) : (
              <>
                <TreePine className="w-4 h-4" />
                Sub-Assign
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({
  node,
  canEdit,
  onAssignChild,
  onRemove,
}: {
  node: any;
  canEdit: boolean;
  onAssignChild: (parentId: string) => void;
  onRemove: (assignmentId: string) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children?.length > 0;

  const pipelines: any[] = node.pipelines ?? [];
  const activePipelines = pipelines.filter((p: any) => !p.isRejected && !p.isWithdrawn);
  const rejectedCount = pipelines.filter((p: any) => p.isRejected).length;
  const withdrawnCount = pipelines.filter((p: any) => p.isWithdrawn).length;
  const ac = avatarColor(node.assignedTo?.id ?? '');

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'rounded-xl border border-l-4 bg-white shadow-sm',
          BORDER_COLORS[node.depth % BORDER_COLORS.length]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                ac
              )}
            >
              {node.assignedTo?.firstName?.[0]}
              {node.assignedTo?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900">{fullName(node.assignedTo)}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {node.assignedTo?.role?.name}
                {node.assignedTo?.department?.name ? ` · ${node.assignedTo.department.name}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <DeadlineBadge deadline={node.deadline} breachedAt={node.breachedAt} />
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-3 gap-1.5"
                  onClick={() => onAssignChild(node.id)}
                >
                  <Plus className="h-3.5 w-3.5" /> Sub-assign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemove(node.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {[
            { label: 'Candidates', value: pipelines.length, color: 'text-blue-600' },
            { label: 'Submitted', value: node.submissionsCount, color: 'text-violet-600' },
            { label: 'Interviews', value: node.interviewsCount, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-4">
              <p className={cn('text-2xl font-black tabular-nums leading-none', s.color)}>
                {s.value}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Deadline row */}
        {node.deadline && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Deadline:{' '}
            <span className="font-semibold text-slate-700">
              {format(new Date(node.deadline), 'dd MMM yyyy')}
            </span>
            {node.deadlineMet === true && (
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-300 text-emerald-600 ml-1"
              >
                Met
              </Badge>
            )}
            {node.deadlineMet === false && (
              <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 ml-1">
                Missed
              </Badge>
            )}
          </div>
        )}

        {/* Candidates */}
        {pipelines.length > 0 && (
          <div className="px-6 py-5 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Candidates · {activePipelines.length} active
              {rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ''}
              {withdrawnCount > 0 ? ` · ${withdrawnCount} withdrawn` : ''}
            </p>
            {activePipelines.slice(0, 5).map((p: any) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3"
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    avatarColor(p.snapshot?.candidateServiceId ?? p.id)
                  )}
                >
                  {p.snapshot?.fullName?.[0] ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {p.snapshot?.fullName}
                  </p>
                  {p.snapshot?.currentTitle && (
                    <p className="text-xs text-slate-400 truncate">
                      {p.snapshot.currentTitle}
                      {p.snapshot.currentCompany ? ` @ ${p.snapshot.currentCompany}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.isOnHold && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Hold
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] whitespace-nowrap',
                      STAGE_COLORS[p.currentStage?.code] ?? 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {p.currentStage?.code} · {p.currentStage?.label}
                  </Badge>
                  <button
                    onClick={() => router.push(`/pipeline/${p.id}`)}
                    className="text-slate-300 hover:text-slate-600 transition-colors ml-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {activePipelines.length > 5 && (
              <p className="text-xs text-slate-400 text-center pt-1">
                +{activePipelines.length - 5} more candidates
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/40">
          <p className="text-xs text-slate-400">
            Assigned by{' '}
            <span className="font-semibold text-slate-600">{fullName(node.assignedBy)}</span>
            {' · '}
            {formatDistanceToNow(new Date(node.assignedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-10 pl-5 space-y-3 border-l-2 border-dashed border-slate-200">
          {node.children.map((child: any) => (
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
      {hasChildren && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="ml-6 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors select-none"
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
          />
          {expanded
            ? 'Collapse sub-assignments'
            : `Show ${node.children.length} sub-assignment${node.children.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function RequirementAssignmentsTab({ requirementId, canEdit, req }: Props) {
  const axios = useAxios();
  const queryClient = useQueryClient();
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

  const activeTopLevelIds = useMemo<Set<string>>(() => {
    const nodes: any[] = tree?.assignmentTree ?? [];
    return new Set(nodes.map((n: any) => n.assignedTo?.id).filter(Boolean));
  }, [tree]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['requirement-tree', requirementId] });
    queryClient.invalidateQueries({ queryKey: ['requirement-detail', requirementId] });
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Assignment Tree</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Each recruiter can sub-assign to their own direct reports
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-2 h-9" onClick={() => setAssignParentId(null)}>
            <UserPlus className="h-4 w-4" /> Assign Recruiters
          </Button>
        )}
      </div>

      {/* Loading */}
      {treeQuery.isLoading && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!treeQuery.isLoading && (tree?.assignmentTree.length ?? 0) === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-14 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <Users className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">No assignments yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Assign recruiters to start sourcing candidates
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setAssignParentId(null)}
            >
              <UserPlus className="h-3.5 w-3.5" /> Make first assignment
            </Button>
          )}
        </div>
      )}

      {/* Tree */}
      {!treeQuery.isLoading && (tree?.assignmentTree.length ?? 0) > 0 && (
        <div className="space-y-5">
          {tree!.assignmentTree.map((node: any) => (
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

      <AssignDialog
        open={assignParentId !== undefined}
        parentAssignmentId={assignParentId ?? null}
        requirementId={requirementId}
        existingAssignedIds={activeTopLevelIds}
        req={req}
        onClose={() => setAssignParentId(undefined)}
        onSuccess={() => {
          invalidate();
          setAssignParentId(undefined);
        }}
      />
    </div>
  );
}
