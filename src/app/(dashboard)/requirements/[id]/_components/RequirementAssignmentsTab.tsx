/* eslint-disable react/no-unescaped-entities */
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
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  Search,
  Check,
  Loader2,
  X,
  UserPlus,
  TreePine,
  Clock,
  Briefcase,
  AlertCircle,
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
import { daysRemaining, fullName } from './types';
import type { RequirementTree } from './types';

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
  _source?: 'chain' | 'extra';
  department: { id: string; name: string } | null;
  role: { id: string; name: string };
}

// ─── Avatar palette ───────────────────────────────────────────────────────────

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

const initials = (first = '', last = '') => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

// ─── Stage pill colors ────────────────────────────────────────────────────────

const STAGE_PILL: Record<string, string> = {
  '01': 'bg-slate-100 text-slate-600',
  '02': 'bg-blue-50 text-blue-700',
  '03': 'bg-indigo-50 text-indigo-700',
  '04': 'bg-violet-50 text-violet-700',
  '05': 'bg-purple-50 text-purple-700',
  '06': 'bg-fuchsia-50 text-fuchsia-700',
  '07A': 'bg-pink-50 text-pink-700',
  '07B': 'bg-pink-50 text-pink-700',
  '08': 'bg-rose-50 text-rose-700',
  '09': 'bg-orange-50 text-orange-700',
  '10': 'bg-green-50 text-green-700',
};

// Depth → connector + card accent colors
const DEPTH_COLORS = [
  {
    connector: 'border-blue-300',
    accent: 'border-l-blue-400',
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700',
  },
  {
    connector: 'border-violet-300',
    accent: 'border-l-violet-400',
    dot: 'bg-violet-400',
    badge: 'bg-violet-50 text-violet-700',
  },
  {
    connector: 'border-amber-300',
    accent: 'border-l-amber-400',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700',
  },
];
const depthColor = (depth: number) => DEPTH_COLORS[depth % DEPTH_COLORS.length];

// ─── Deadline badge ───────────────────────────────────────────────────────────

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
        'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border',
        breached
          ? 'bg-red-50 text-red-600 border-red-200'
          : days !== null && days <= 3
            ? 'bg-amber-50 text-amber-600 border-amber-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
      )}
    >
      <Calendar className="h-2.5 w-2.5" />
      {breached ? `${Math.abs(days ?? 0)}d overdue` : `${days}d left`}
    </span>
  );
}

// ─── Candidate mini-row ───────────────────────────────────────────────────────

function CandidateRow({ p }: { p: any }) {
  const stageCls = STAGE_PILL[p.currentStage?.code] ?? 'bg-slate-100 text-slate-600';
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
          avatarColor(p.snapshot?.fullName ?? p.id)
        )}
      >
        {(p.snapshot?.fullName ?? '?')[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-800 truncate">
          {p.snapshot?.fullName ?? '—'}
        </p>
        {(p.snapshot?.currentTitle || p.snapshot?.currentCompany) && (
          <p className="text-[10px] text-slate-400 truncate">
            {[p.snapshot.currentTitle, p.snapshot.currentCompany].filter(Boolean).join(' @ ')}
          </p>
        )}
      </div>
      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0', stageCls)}>
        {p.currentStage?.label ?? '—'}
      </span>
    </div>
  );
}

// ─── Assignment Node Card ─────────────────────────────────────────────────────
// Compact card — name, dept, stats, candidates (collapsed), actions

function AssignmentNode({
  node,
  canEdit,
  onSubAssign,
  onRemove,
  isLast,
}: {
  node: any;
  canEdit: boolean;
  onSubAssign: (parentId: string) => void;
  onRemove: (assignmentId: string) => void;
  isLast: boolean;
}) {
  const [showCandidates, setShowCandidates] = useState(false);
  const [childrenExpanded, setChildrenExpanded] = useState(true);

  const depth = node.depth ?? 0;
  const dc = depthColor(depth);
  const hasChildren = (node.children ?? []).length > 0;
  const pipelines: any[] = node.pipelines ?? [];
  const activePipelines = pipelines.filter((p: any) => !p.isRejected && !p.isWithdrawn);
  const ac = avatarColor(node.assignedTo?.id ?? '');

  return (
    <div className="flex flex-col items-center">
      {/* ── Card ── */}
      <div
        className={cn(
          'w-64 rounded-xl border border-l-[3px] bg-white shadow-sm transition-shadow hover:shadow-md',
          dc.accent
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-2.5 px-3.5 py-3">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
              ac
            )}
          >
            {initials(node.assignedTo?.firstName, node.assignedTo?.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-900 leading-tight truncate">
              {node.assignedTo?.firstName} {node.assignedTo?.lastName}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {node.assignedTo?.department?.name ?? 'No department'}
            </p>
            {node.assignedTo?.employeeId && (
              <p className="text-[10px] font-mono text-slate-300 truncate">
                {node.assignedTo.employeeId}
              </p>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => onRemove(node.id)}
              className="text-slate-200 hover:text-red-400 transition-colors shrink-0 mt-0.5"
              title="Remove assignment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
          {[
            { label: 'Sourced', value: pipelines.length, color: 'text-blue-600' },
            { label: 'Submitted', value: node.submissionsCount ?? 0, color: 'text-violet-600' },
            { label: 'Interviews', value: node.interviewsCount ?? 0, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-2.5">
              <p className={cn('text-[18px] font-black tabular-nums leading-none', s.color)}>
                {s.value}
              </p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Footer: deadline + meta + actions */}
        <div className="px-3.5 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <DeadlineBadge deadline={node.deadline} breachedAt={node.breachedAt} />
          </div>
          <div className="flex items-center gap-1">
            {/* Candidates toggle */}
            {pipelines.length > 0 && (
              <button
                onClick={() => setShowCandidates(v => !v)}
                className={cn(
                  'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors',
                  showCandidates
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                )}
                title={showCandidates ? 'Hide candidates' : 'Show candidates'}
              >
                <Users className="w-3 h-3" />
                {activePipelines.length}
              </button>
            )}
            {/* Sub-assign */}
            {canEdit && depth < 2 && (
              <button
                onClick={() => onSubAssign(node.id)}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                title="Sub-assign"
              >
                <Plus className="w-3 h-3" />
                Sub
              </button>
            )}
          </div>
        </div>

        {/* Assigned by */}
        <div className="px-3.5 pb-2.5">
          <p className="text-[10px] text-slate-300">
            by {node.assignedBy?.firstName} {node.assignedBy?.lastName}
            {' · '}
            {formatDistanceToNow(new Date(node.assignedAt), { addSuffix: true })}
          </p>
        </div>

        {/* Candidates list — collapsible */}
        {showCandidates && pipelines.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2.5 space-y-1.5 max-h-48 overflow-y-auto">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Candidates ({activePipelines.length} active)
            </p>
            {activePipelines.slice(0, 8).map((p: any) => (
              <CandidateRow key={p.id} p={p} />
            ))}
            {activePipelines.length > 8 && (
              <p className="text-[10px] text-slate-400 text-center pt-1">
                +{activePipelines.length - 8} more
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Connector down + children ── */}
      {hasChildren && (
        <>
          {/* Vertical line down from card to children row */}
          <div className={cn('w-px h-6 border-l-2 border-dashed', dc.connector)} />

          {/* Collapse toggle */}
          <button
            onClick={() => setChildrenExpanded(e => !e)}
            className={cn(
              'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors mb-1',
              dc.badge,
              'border-transparent hover:border-current'
            )}
          >
            {childrenExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            {node.children.length} sub-assignment{node.children.length !== 1 ? 's' : ''}
          </button>

          {childrenExpanded && (
            <>
              {/* Horizontal rail connecting children */}
              <div className="flex items-start gap-0">
                {node.children.map((child: any, ci: number) => {
                  const isFirstChild = ci === 0;
                  const isLastChild = ci === node.children.length - 1;
                  const isOnlyChild = node.children.length === 1;
                  return (
                    <div key={child.id} className="flex flex-col items-center">
                      {/* Top connector per child */}
                      <div className="flex items-center w-full justify-center">
                        {/* Left arm */}
                        {!isOnlyChild && !isFirstChild && (
                          <div
                            className={cn('flex-1 h-px border-t-2 border-dashed', dc.connector)}
                          />
                        )}
                        {isOnlyChild && <div className="w-8" />}
                        {/* Down stub */}
                        <div className={cn('w-px h-4 border-l-2 border-dashed', dc.connector)} />
                        {/* Right arm */}
                        {!isOnlyChild && !isLastChild && (
                          <div
                            className={cn('flex-1 h-px border-t-2 border-dashed', dc.connector)}
                          />
                        )}
                        {isOnlyChild && <div className="w-8" />}
                      </div>

                      {/* Recursive child node */}
                      <div className={cn(ci !== node.children.length - 1 ? 'mr-6' : '')}>
                        <AssignmentNode
                          node={child}
                          canEdit={canEdit}
                          onSubAssign={onSubAssign}
                          onRemove={onRemove}
                          isLast={isLastChild}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
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
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-20 bg-slate-100 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );

  if (subs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
        <Users className="w-10 h-10 opacity-20" />
        <p className="text-sm">No people in your reporting tree</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, employee ID…"
          className="pl-9 h-9 text-sm"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white min-h-0 divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-400">
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
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
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
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>

                {/* Avatar */}
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                    isSelected ? 'bg-primary/15 text-primary' : ac
                  )}
                >
                  {initials(u.firstName, u.lastName)}
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
                    {u._source === 'extra' && (
                      <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        Extended
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {u.role.name}
                    {u.department ? ` · ${u.department.name}` : ''}
                    {u.employeeId && <span className="ml-1.5 font-mono">{u.employeeId}</span>}
                  </p>
                </div>

                {isAssigned ? (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                    Assigned
                  </span>
                ) : isSelected ? (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {multi && selectedIds.size > 0 && (
        <div className="flex items-center justify-between shrink-0">
          <p className="text-sm font-semibold text-primary">{selectedIds.size} selected</p>
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
        if (skipped.length > 0) toast.warning(`${skipped.length} skipped — already assigned`);
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
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 max-w-3xl w-[90vw] h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                isTopLevel ? 'bg-primary/10' : 'bg-violet-100'
              )}
            >
              {isTopLevel ? (
                <UserPlus className="w-5 h-5 text-primary" />
              ) : (
                <TreePine className="w-5 h-5 text-violet-600" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">
                {isTopLevel ? 'Assign Recruiters' : 'Sub-Assign'}
              </h2>
              {req && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {req.reqCode} · {req.title}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex gap-0 overflow-hidden">
          {/* Left — person list */}
          <div className="flex-1 min-w-0 p-5 flex flex-col gap-3 border-r border-slate-100">
            <div className="flex items-center justify-between shrink-0">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                {isTopLevel ? 'Select people' : 'Select one person'}
              </Label>
              <span className="text-[11px] text-slate-400">{subs.length} available</span>
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

          {/* Right — deadline + selected */}
          <div className="w-60 shrink-0 p-5 flex flex-col gap-5">
            {/* Deadline */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Deadline <span className="font-normal text-slate-400 normal-case">(optional)</span>
              </Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      'w-full justify-start text-xs font-normal h-9',
                      !deadline && 'text-slate-400'
                    )}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5 shrink-0" />
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
                  className="text-[11px] text-slate-400 hover:text-rose-500 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear date
                </button>
              )}
            </div>

            {/* Selected summary — top level only */}
            {isTopLevel && (
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Selected
                    {selectedIds.size > 0 && (
                      <span className="ml-1.5 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {selectedIds.size}
                      </span>
                    )}
                  </Label>
                </div>
                <div
                  className={cn(
                    'flex-1 rounded-xl border-2 border-dashed min-h-0 overflow-y-auto',
                    selectedIds.size === 0
                      ? 'border-slate-100 flex items-center justify-center'
                      : 'border-primary/10 bg-primary/[0.02] p-2 space-y-1.5'
                  )}
                >
                  {selectedIds.size === 0 ? (
                    <p className="text-xs text-slate-300 text-center px-3">
                      Selected people appear here
                    </p>
                  ) : (
                    Array.from(selectedIds).map(id => {
                      const u = subs.find(s => s.id === id);
                      if (!u) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-primary/10 shadow-sm"
                        >
                          <div
                            className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                              avatarColor(id)
                            )}
                          >
                            {initials(u.firstName, u.lastName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {u.firstName} {u.lastName}
                            </p>
                          </div>
                          <button
                            onClick={() => toggle(id)}
                            className="text-slate-200 hover:text-rose-400 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-500 h-9 px-5 text-sm"
          >
            Cancel
          </Button>
          <Button
            disabled={selectedIds.size === 0 || isSubmitting}
            onClick={handleSubmit}
            className="min-w-[140px] h-9 gap-1.5 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Assigning…
              </>
            ) : isTopLevel ? (
              <>
                <UserPlus className="w-3.5 h-3.5" /> Assign{' '}
                {selectedIds.size > 0 ? selectedIds.size : ''}
              </>
            ) : (
              <>
                <TreePine className="w-3.5 h-3.5" /> Sub-Assign
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function RequirementAssignmentsTab({ requirementId, canEdit, req }: Props) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [assignParentId, setAssignParentId] = useState<string | null | undefined>(undefined);

  // GET /requirements/:id/tree
  const treeQuery = useQuery<{ success: boolean; data: RequirementTree }>({
    queryKey: ['requirement-tree', requirementId],
    queryFn: async () => (await axios.get(`/requirements/${requirementId}/tree`)).data,
  });

  // DELETE /requirements/:id/assignments/:assignmentId
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
  const nodes: any[] = tree?.assignmentTree ?? [];

  const activeTopLevelIds = useMemo<Set<string>>(
    () => new Set(nodes.map((n: any) => n.assignedTo?.id).filter(Boolean)),
    [nodes]
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['requirement-tree', requirementId] });
    queryClient.invalidateQueries({ queryKey: ['requirement-detail', requirementId] });
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
  }

  const totalCandidates = nodes.reduce(
    (sum: number, n: any) => sum + (n.pipelines?.length ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Assignment Tree</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {nodes.length} recruiter{nodes.length !== 1 ? 's' : ''} assigned
            {totalCandidates > 0 && ` · ${totalCandidates} candidates sourced`}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setAssignParentId(null)}>
            <UserPlus className="h-3.5 w-3.5" /> Assign
          </Button>
        )}
      </div>

      {/* Loading */}
      {treeQuery.isLoading && (
        <div className="flex items-center justify-center gap-6 py-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-56 h-36 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!treeQuery.isLoading && nodes.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">No assignments yet</p>
            <p className="text-xs text-slate-400 mt-1">Assign recruiters to start sourcing</p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setAssignParentId(null)}
            >
              <UserPlus className="h-3.5 w-3.5" /> Make first assignment
            </Button>
          )}
        </div>
      )}

      {/* ── Tree canvas ── */}
      {!treeQuery.isLoading && nodes.length > 0 && (
        <div className="w-full overflow-x-auto pb-4">
          {/* Root node — the requirement itself */}
          <div className="flex flex-col items-center">
            {/* Requirement root pill */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-md mb-0">
              <Briefcase className="w-4 h-4 opacity-70 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{req?.title ?? 'Requirement'}</p>
                {req?.reqCode && <p className="text-[10px] font-mono opacity-50">{req.reqCode}</p>}
              </div>
              <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                {req?.totalOpenings ?? 0} open
              </span>
            </div>

            {/* Vertical line from root to children row */}
            <div className="w-px h-6 bg-slate-300" />

            {/* Children rail */}
            {nodes.length === 1 ? (
              // Single node — just drop straight down
              <AssignmentNode
                node={nodes[0]}
                canEdit={canEdit}
                onSubAssign={id => setAssignParentId(id)}
                onRemove={id => removeMutation.mutate(id)}
                isLast
              />
            ) : (
              // Multiple nodes — horizontal spread with connectors
              <div className="flex items-start">
                {nodes.map((node: any, i: number) => {
                  const isFirst = i === 0;
                  const isLast = i === nodes.length - 1;
                  return (
                    <div key={node.id} className="flex flex-col items-center">
                      {/* T-connector top */}
                      <div className="flex items-center w-full">
                        {/* Left arm: invisible for first, line for rest */}
                        <div
                          className={cn('flex-1 h-px', isFirst ? 'invisible' : 'bg-slate-300')}
                        />
                        {/* Down stub */}
                        <div className="w-px h-6 bg-slate-300" />
                        {/* Right arm: invisible for last, line for rest */}
                        <div className={cn('flex-1 h-px', isLast ? 'invisible' : 'bg-slate-300')} />
                      </div>

                      {/* Node */}
                      <div className={cn(i !== nodes.length - 1 ? 'mr-5' : '')}>
                        <AssignmentNode
                          node={node}
                          canEdit={canEdit}
                          onSubAssign={id => setAssignParentId(id)}
                          onRemove={id => removeMutation.mutate(id)}
                          isLast={isLast}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign dialog */}
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
