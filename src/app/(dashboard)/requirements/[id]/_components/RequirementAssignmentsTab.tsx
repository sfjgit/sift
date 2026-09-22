/* eslint-disable react/no-unescaped-entities */
// File: RequirementAssignmentsTab.tsx
// Path: src/components/requirements/RequirementAssignmentsTab.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Fragment, useMemo, useState } from 'react';
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
  CornerDownRight,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAxios } from '@/hooks/useAxios';
import { daysRemaining } from './types';
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

interface FlatRow {
  node: any;
  depth: number;
  isLastChild: boolean;
}

/** Deepest level that may still receive a sub-assignment — mirrors the API tree rule. */
const MAX_SUB_ASSIGN_DEPTH = 2;

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
const avatarColor = (seed: string) =>
  AVATAR_PALETTE[(seed?.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length];

const initials = (first = '', last = '') => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

const personName = (p?: { firstName?: string; lastName?: string } | null) =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || '—' : '—';

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

// ─── Tree helpers ─────────────────────────────────────────────────────────────

const childrenOf = (n: any): any[] => n?.children ?? [];
const pipelinesOf = (n: any): any[] => n?.pipelines ?? [];
const isLive = (p: any) => !p?.isRejected && !p?.isWithdrawn;

/** Depth-first flatten. Children are emitted only when the parent isn't collapsed. */
function flatten(nodes: any[], collapsed: Set<string>, depth = 0, out: FlatRow[] = []): FlatRow[] {
  nodes.forEach((node, i) => {
    out.push({ node, depth, isLastChild: i === nodes.length - 1 });
    const kids = childrenOf(node);
    if (kids.length > 0 && !collapsed.has(node.id)) {
      flatten(kids, collapsed, depth + 1, out);
    }
  });
  return out;
}

interface Rollup {
  people: number;
  sourced: number;
  live: number;
  submitted: number;
  interviews: number;
  breached: number;
}

/** Subtree totals, self included. */
function rollup(node: any): Rollup {
  const pipelines = pipelinesOf(node);
  const self: Rollup = {
    people: 1,
    sourced: pipelines.length,
    live: pipelines.filter(isLive).length,
    submitted: node.submissionsCount ?? 0,
    interviews: node.interviewsCount ?? 0,
    breached: node.breachedAt ? 1 : 0,
  };
  return childrenOf(node).reduce((acc: Rollup, child: any) => {
    const r = rollup(child);
    return {
      people: acc.people + r.people,
      sourced: acc.sourced + r.sourced,
      live: acc.live + r.live,
      submitted: acc.submitted + r.submitted,
      interviews: acc.interviews + r.interviews,
      breached: acc.breached + r.breached,
    };
  }, self);
}

function idsWithChildren(nodes: any[], out: string[] = []): string[] {
  nodes.forEach(n => {
    if (childrenOf(n).length > 0) out.push(n.id);
    idsWithChildren(childrenOf(n), out);
  });
  return out;
}

// ─── Deadline badge ───────────────────────────────────────────────────────────

function DeadlineBadge({
  deadline,
  breachedAt,
}: {
  deadline?: string | null;
  breachedAt?: string | null;
}) {
  if (!deadline) return <span className="text-slate-300">—</span>;
  const days = daysRemaining(deadline);
  const breached = !!breachedAt || (days !== null && days < 0);
  return (
    <span
      title={format(new Date(deadline), 'dd MMM yyyy')}
      className={cn(
        'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border whitespace-nowrap',
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

// ─── Metric cell ──────────────────────────────────────────────────────────────
// Own count in bold; subtree total appended in muted text when it's larger.

function MetricCell({
  own,
  total,
  emphasis,
  onClick,
}: {
  own: number;
  total: number;
  emphasis?: string;
  onClick?: () => void;
}) {
  if (own === 0 && total === 0) return <span className="text-slate-300">—</span>;
  const body = (
    <>
      <span className={cn('font-bold tabular-nums', own > 0 ? emphasis : 'text-slate-300')}>
        {own}
      </span>
      {total > own && (
        <span className="text-[11px] font-medium text-slate-400 tabular-nums"> / {total}</span>
      )}
    </>
  );
  if (!onClick || own === 0) return <span>{body}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-1 -mx-1 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      {body}
    </button>
  );
}

// ─── Candidate sub-table ──────────────────────────────────────────────────────

function CandidateSubTable({ pipelines }: { pipelines: any[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
            <th className="font-semibold px-3 py-1.5">Candidate</th>
            <th className="font-semibold px-3 py-1.5">Current role</th>
            <th className="font-semibold px-3 py-1.5">Stage</th>
            <th className="font-semibold px-3 py-1.5 whitespace-nowrap">Added</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pipelines.map(p => {
            const name = p.snapshot?.fullName ?? '—';
            const dropped = !isLive(p);
            return (
              <tr key={p.id} className={cn(dropped && 'opacity-50')}>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                        avatarColor(name)
                      )}
                    >
                      {name[0]}
                    </span>
                    <span className="font-semibold text-slate-800">{name}</span>
                    {dropped && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        {p.isRejected ? 'Rejected' : 'Withdrawn'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-500">
                  {[p.snapshot?.currentTitle, p.snapshot?.currentCompany]
                    .filter(Boolean)
                    .join(' @ ') || '—'}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                      STAGE_PILL[p.currentStage?.code] ?? 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {p.currentStage?.label ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">
                  {p.createdAt ? format(new Date(p.createdAt), 'dd MMM yy') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
                <div
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>

                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                    isSelected ? 'bg-primary/15 text-primary' : ac
                  )}
                >
                  {initials(u.firstName, u.lastName)}
                </div>

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

export function AssignDialog({
  open,
  parentAssignmentId,
  parentName,
  requirementId,
  existingAssignedIds,
  req,
  onClose,
  onSuccess,
}: {
  open: boolean;
  parentAssignmentId: string | null;
  parentName?: string | null;
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
              <h2 className="text-base font-bold text-slate-900 truncate">
                {isTopLevel ? 'Assign recruiters' : `Sub-assign under ${parentName ?? 'assignee'}`}
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

          <div className="w-60 shrink-0 p-5 flex flex-col gap-5">
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
                      : 'border-primary/10 bg-primary/2 p-2 space-y-1.5'
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
            className="min-w-35 h-9 gap-1.5 text-sm"
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
                <TreePine className="w-3.5 h-3.5" /> Sub-assign
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

  const [assignParent, setAssignParent] = useState<
    { id: string | null; name?: string | null } | undefined
  >(undefined);
  /** Inverted state: rows are expanded by default, so we track the collapsed ones. */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openCandidates, setOpenCandidates] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const treeQuery = useQuery<{ success: boolean; data: RequirementTree }>({
    queryKey: ['requirement-tree', requirementId],
    queryFn: async () => (await axios.get(`/requirements/${requirementId}/tree`)).data,
  });

  const tree = treeQuery.data?.data;
  const nodes: any[] = (tree as any)?.assignmentTree ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['requirement-tree', requirementId] });
    queryClient.invalidateQueries({ queryKey: ['requirement-detail', requirementId] });
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
  }

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) =>
      (await axios.delete(`/requirements/${requirementId}/assignments/${assignmentId}`)).data,
    onSuccess: () => {
      toast.success('Assignment removed');
      invalidate();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Could not remove assignment'),
    onSettled: () => setRemovingId(null),
  });

  const activeTopLevelIds = useMemo<Set<string>>(
    () => new Set(nodes.map((n: any) => n.assignedTo?.id).filter(Boolean)),
    [nodes]
  );

  const parentIds = useMemo(() => idsWithChildren(nodes), [nodes]);
  const allCollapsed = parentIds.length > 0 && parentIds.every(id => collapsed.has(id));
  const rows = useMemo(() => flatten(nodes, collapsed), [nodes, collapsed]);

  /** Per-node subtree totals computed once per data change, not once per rendered cell. */
  const rollups = useMemo(() => {
    const map = new Map<string, Rollup>();
    const walk = (list: any[]) =>
      list.forEach(n => {
        map.set(n.id, rollup(n));
        walk(childrenOf(n));
      });
    walk(nodes);
    return map;
  }, [nodes]);

  const totals = useMemo(
    () =>
      nodes.reduce(
        (acc: Rollup, n: any) => {
          const r = rollups.get(n.id);
          if (!r) return acc;
          return {
            people: acc.people + r.people,
            sourced: acc.sourced + r.sourced,
            live: acc.live + r.live,
            submitted: acc.submitted + r.submitted,
            interviews: acc.interviews + r.interviews,
            breached: acc.breached + r.breached,
          };
        },
        { people: 0, sourced: 0, live: 0, submitted: 0, interviews: 0, breached: 0 }
      ),
    [nodes, rollups]
  );

  const toggleIn = (setter: typeof setCollapsed) => (id: string) =>
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleRow = toggleIn(setCollapsed);
  const toggleCandidates = toggleIn(setOpenCandidates);

  const TH = 'h-9 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide';

  return (
    <div className="space-y-3">
      {/* ── Summary bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate">
            {req?.title ?? 'Assignments'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {req?.reqCode && <span className="font-mono">{req.reqCode}</span>}
            {req?.reqCode && ' · '}
            {req?.totalOpenings ?? 0} openings · {totals.people}{' '}
            {totals.people === 1 ? 'person' : 'people'} assigned
            {totals.breached > 0 && (
              <span className="text-red-600 font-semibold"> · {totals.breached} overdue</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {[
            { label: 'Sourced', value: totals.sourced, color: 'text-blue-600' },
            { label: 'Active', value: totals.live, color: 'text-slate-900' },
            { label: 'Submitted', value: totals.submitted, color: 'text-violet-600' },
            { label: 'Interviews', value: totals.interviews, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={cn('text-lg font-black tabular-nums leading-none', s.color)}>
                {s.value}
              </p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-1">
                {s.label}
              </p>
            </div>
          ))}

          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            {parentIds.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-slate-600"
                onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(parentIds))}
              >
                {allCollapsed ? 'Expand all' : 'Collapse all'}
              </Button>
            )}
            {canEdit && (
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => setAssignParent({ id: null })}
              >
                <UserPlus className="h-3.5 w-3.5" /> Assign
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {treeQuery.isLoading && (
        <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          <div className="h-9 bg-slate-50" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-slate-50/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {treeQuery.isError && !treeQuery.isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-red-700">Assignments didn't load</p>
          <p className="text-xs text-red-500">
            {(treeQuery.error as any)?.response?.data?.message ?? 'The request failed.'}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => treeQuery.refetch()}
          >
            <RotateCw className="h-3.5 w-3.5" /> Try again
          </Button>
        </div>
      )}

      {/* ── Empty ── */}
      {!treeQuery.isLoading && !treeQuery.isError && nodes.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">No one assigned yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Assign a manager or recruiter to start sourcing.
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setAssignParent({ id: null })}
            >
              <UserPlus className="h-3.5 w-3.5" /> Make first assignment
            </Button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {!treeQuery.isLoading && rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-xs border-collapse">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[14%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[72px]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className={TH}>Assignee</th>
                  <th className={TH}>Role · Department</th>
                  <th className={cn(TH, 'text-center')}>Subs</th>
                  <th className={cn(TH, 'text-center')}>Sourced</th>
                  <th className={cn(TH, 'text-center')}>Submitted</th>
                  <th className={cn(TH, 'text-center')}>Interviews</th>
                  <th className={TH}>Deadline</th>
                  <th className={TH}>Assigned by</th>
                  <th className={cn(TH, 'text-right')}>Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(({ node, depth }) => {
                  const kids = childrenOf(node);
                  const pipelines = pipelinesOf(node);
                  const sub = rollups.get(node.id);
                  const isCollapsed = collapsed.has(node.id);
                  const candidatesOpen = openCandidates.has(node.id);
                  const name = personName(node.assignedTo);
                  const indent = depth * 22;
                  const overdue = !!node.breachedAt;
                  const liveHere = pipelines.filter(isLive).length;

                  return (
                    <Fragment key={node.id}>
                      <tr
                        className={cn(
                          'group transition-colors hover:bg-slate-50/80',
                          depth === 1 && 'bg-slate-50/40',
                          depth >= 2 && 'bg-slate-50/70'
                        )}
                      >
                        {/* Assignee */}
                        <td className="px-3 py-2 align-middle">
                          <div
                            className="flex items-center gap-1.5"
                            style={{ paddingLeft: indent }}
                          >
                            {depth > 0 && (
                              <CornerDownRight className="h-3 w-3 text-slate-300 shrink-0" />
                            )}

                            {kids.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleRow(node.id)}
                                aria-expanded={!isCollapsed}
                                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${name}`}
                                className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="h-5 w-5 shrink-0" />
                            )}

                            <span
                              className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                                avatarColor(node.assignedTo?.id ?? node.id)
                              )}
                            >
                              {initials(node.assignedTo?.firstName, node.assignedTo?.lastName)}
                            </span>

                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate leading-tight">
                                {name}
                                {overdue && (
                                  <span className="ml-1.5 text-[9px] font-bold uppercase text-red-600">
                                    overdue
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {node.assignedTo?.email ?? '—'}
                                {node.assignedTo?.employeeId && (
                                  <span className="ml-1.5 font-mono text-slate-300">
                                    {node.assignedTo.employeeId}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role · Department */}
                        <td className="px-3 py-2 align-middle">
                          <p className="font-semibold text-slate-700 truncate">
                            {node.assignedTo?.role?.name ?? '—'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {node.assignedTo?.department?.name ?? 'No department'}
                          </p>
                        </td>

                        {/* Subs */}
                        <td className="px-3 py-2 text-center align-middle">
                          {kids.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleRow(node.id)}
                              className="rounded px-1 hover:bg-slate-100"
                            >
                              <span className="font-bold text-slate-700 tabular-nums">
                                {kids.length}
                              </span>
                              {sub && sub.people - 1 > kids.length && (
                                <span className="text-[11px] text-slate-400 tabular-nums">
                                  {' '}
                                  / {sub.people - 1}
                                </span>
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Sourced — click reveals the candidate sub-table */}
                        <td className="px-3 py-2 text-center align-middle">
                          <MetricCell
                            own={pipelines.length}
                            total={sub?.sourced ?? pipelines.length}
                            emphasis="text-blue-600"
                            onClick={() => toggleCandidates(node.id)}
                          />
                        </td>

                        {/* Submitted */}
                        <td className="px-3 py-2 text-center align-middle">
                          <MetricCell
                            own={node.submissionsCount ?? 0}
                            total={sub?.submitted ?? node.submissionsCount ?? 0}
                            emphasis="text-violet-600"
                          />
                        </td>

                        {/* Interviews */}
                        <td className="px-3 py-2 text-center align-middle">
                          <MetricCell
                            own={node.interviewsCount ?? 0}
                            total={sub?.interviews ?? node.interviewsCount ?? 0}
                            emphasis="text-emerald-600"
                          />
                        </td>

                        {/* Deadline */}
                        <td className="px-3 py-2 align-middle">
                          <DeadlineBadge deadline={node.deadline} breachedAt={node.breachedAt} />
                        </td>

                        {/* Assigned by */}
                        <td className="px-3 py-2 align-middle">
                          <p className="text-slate-600 truncate">{personName(node.assignedBy)}</p>
                          {node.assignedAt && (
                            <p className="text-[10px] text-slate-400 truncate">
                              {formatDistanceToNow(new Date(node.assignedAt), { addSuffix: true })}
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-2 align-middle">
                          <div className="flex items-center justify-end gap-0.5">
                            {canEdit && depth < MAX_SUB_ASSIGN_DEPTH && (
                              <button
                                type="button"
                                onClick={() => setAssignParent({ id: node.id, name })}
                                title={`Sub-assign under ${name}`}
                                className="h-7 w-7 rounded-md flex items-center justify-center text-slate-300 hover:bg-slate-100 hover:text-slate-700 transition md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                disabled={removingId === node.id}
                                onClick={() => {
                                  setRemovingId(node.id);
                                  removeMutation.mutate(node.id);
                                }}
                                title={
                                  kids.length > 0 && sub
                                    ? `Remove ${name} and ${sub.people - 1} sub-assignment(s)`
                                    : 'Remove assignment'
                                }
                                className="h-7 w-7 rounded-md flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                              >
                                {removingId === node.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Candidate sub-table for this assignee */}
                      {candidatesOpen && pipelines.length > 0 && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={9} className="p-0">
                            <div style={{ paddingLeft: indent + 46 }} className="pr-4 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                  Candidates sourced by {name} · {liveHere} active of{' '}
                                  {pipelines.length}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => toggleCandidates(node.id)}
                                  className="text-[10px] font-semibold text-slate-400 hover:text-slate-700"
                                >
                                  Hide
                                </button>
                              </div>
                              <CandidateSubTable pipelines={pipelines} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-t border-slate-100 bg-slate-50/60 text-[10px] text-slate-400">
            <span>
              <span className="font-bold text-slate-600">Bold</span> = this person ·{' '}
              <span className="text-slate-500">/ n</span> = including everyone under them
            </span>
            <span>Click a Sourced count to see the candidates.</span>
          </div>
        </div>
      )}

      {/* Assign dialog */}
      <AssignDialog
        open={assignParent !== undefined}
        parentAssignmentId={assignParent?.id ?? null}
        parentName={assignParent?.name}
        requirementId={requirementId}
        existingAssignedIds={activeTopLevelIds}
        req={req}
        onClose={() => setAssignParent(undefined)}
        onSuccess={() => {
          invalidate();
          setAssignParent(undefined);
        }}
      />
    </div>
  );
}
