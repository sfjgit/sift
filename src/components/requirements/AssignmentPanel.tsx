// File: AssignmentPanel.tsx
// Path: src/components/requirements/AssignmentPanel.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  Plus,
  Users,
  Clock,
  Target,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Edit3,
  BarChart2,
  Calendar,
  Search,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateStats {
  total: number;
  active: number;
  placed: number;
  dropped: number;
  onHold: number;
  rejected: number;
  withdrawn: number;
  submitted: number;
  offered: number;
  offerAccepted: number;
  joined: number;
  agingBuckets: { fresh: number; normal: number; stale: number; critical: number };
  rates: { submission: number; offer: number; joining: number };
}

interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  role: { id: string; name: string };
  department?: { id: string; name: string };
}

interface AssignmentNode {
  id: string;
  depth: number;
  status: string;
  allocatedOpenings: number | null;
  filledOpenings: number;
  deadline: string | null;
  breachedAt: string | null;
  assignedAt: string;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
  };
  assignedBy: { id: string; firstName: string; lastName: string };
  candidateStats: CandidateStats;
  childAssignments: AssignmentNode[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEPTH_META: Record<number, { role: string; pill: string; connector: string }> = {
  0: {
    role: 'DM',
    pill: 'bg-blue-50 text-blue-700 border border-blue-100',
    connector: 'border-blue-200',
  },
  1: {
    role: 'TL',
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
    connector: 'border-slate-200',
  },
  2: {
    role: 'Recruiter',
    pill: 'bg-slate-100 text-slate-600 border border-slate-200',
    connector: 'border-slate-200',
  },
};

const AVATAR_SEEDS = ['violet', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
function avatarBg(s: string) {
  const i = s.charCodeAt(0) % AVATAR_SEEDS.length;
  const m: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    cyan: 'bg-cyan-100 text-cyan-700',
  };
  return m[AVATAR_SEEDS[i]];
}
function initials(n: string) {
  return n
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days === 0 ? 'Today' : days === 1 ? '1d ago' : `${days}d ago`;
}

// ─── Assign Dialog ────────────────────────────────────────────────────────────

function AssignDialog({
  open,
  onClose,
  requirementId,
  parentAssignmentId,
  parentDepth,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  requirementId: string;
  parentAssignmentId: string | null;
  parentDepth: number | null;
  onSuccess: () => void;
}) {
  const axios = useAxios();
  const [selectedId, setSelectedId] = useState('');
  const [allocatedOpenings, setAllocatedOpenings] = useState('');
  const [deadline, setDeadline] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedId('');
      setAllocatedOpenings('');
      setDeadline('');
      setUserSearch('');
    }
  }, [open]);

  const { data: targetsData, isLoading: targetsLoading } = useQuery({
    queryKey: ['assignable-targets', requirementId, parentAssignmentId],
    queryFn: async () => {
      const p = new URLSearchParams({ requirementId });
      if (parentAssignmentId) p.set('parentAssignmentId', parentAssignmentId);
      const res = await axios.get(`/assignments/assignable-targets?${p}`);
      return res.data.data as AssignableUser[];
    },
    enabled: open,
  });

  const targets = (targetsData ?? []).filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.role.name.toLowerCase().includes(q)
    );
  });

  const nextDepth = parentDepth === null ? 0 : parentDepth + 1;
  const depthMeta = DEPTH_META[nextDepth];

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        assignedToId: selectedId,
        allocatedOpenings: allocatedOpenings ? parseInt(allocatedOpenings) : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      };
      if (parentAssignmentId) {
        await axios.post(`/assignments/${parentAssignmentId}/sub-assign`, body);
      } else {
        await axios.post('/assignments', { ...body, requirementId });
      }
    },
    onSuccess: () => {
      toast.success('Assignment created');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to assign');
    },
  });

  const selectedUser = targets.find(u => u.id === selectedId);

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-bold text-slate-900">
            {parentAssignmentId ? 'Sub-assign' : 'Assign Requirement'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Depth indicator */}
          {depthMeta && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <GitBranch size={12} className="text-blue-600" />
              <span className="text-[12px] font-semibold text-blue-700">
                Assigning as {depthMeta.role} (level {nextDepth})
              </span>
            </div>
          )}

          {/* User select */}
          <div className="space-y-2">
            <Label className="text-[12px] font-bold text-slate-700">Assign To *</Label>
            <div className="relative mb-2">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or role…"
                className="pl-9 h-9 text-[12px] rounded-xl border-slate-200"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {targetsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))
              ) : targets.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-slate-400">
                  No eligible users found
                </div>
              ) : (
                targets.map(u => {
                  const name = `${u.firstName} ${u.lastName}`;
                  const sel = selectedId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarBg(u.firstName)}`}
                      >
                        {initials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{name}</p>
                        <p className="text-[11px] text-slate-400">
                          {u.role.name}
                          {u.department ? ` · ${u.department.name}` : ''}
                        </p>
                      </div>
                      {sel && <Check size={13} className="text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Openings + deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-bold text-slate-700">Allocated Openings</Label>
              <Input
                type="number"
                min={1}
                value={allocatedOpenings}
                onChange={e => setAllocatedOpenings(e.target.value)}
                placeholder="e.g. 3"
                className="h-9 text-[13px] rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-bold text-slate-700">Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="h-9 text-[13px] rounded-xl border-slate-200"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-[13px] rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selectedId || mutation.isPending}
            className="text-[13px] rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            {mutation.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  open,
  onClose,
  assignment,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  assignment: AssignmentNode | null;
  onSuccess: () => void;
}) {
  const axios = useAxios();
  const [allocatedOpenings, setAllocatedOpenings] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (assignment) {
      setAllocatedOpenings(
        assignment.allocatedOpenings != null ? String(assignment.allocatedOpenings) : ''
      );
      setDeadline(
        assignment.deadline ? new Date(assignment.deadline).toISOString().split('T')[0] : ''
      );
    }
  }, [assignment]);

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.patch(`/assignments/${assignment!.id}`, {
        allocatedOpenings: allocatedOpenings ? parseInt(allocatedOpenings) : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
    },
    onSuccess: () => {
      toast.success('Updated');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to update');
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-bold text-slate-900">
            Edit Assignment
          </DialogTitle>
        </DialogHeader>
        {assignment && (
          <div className="space-y-4 py-1">
            <div
              className={`flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${avatarBg(assignment.assignedTo.firstName)}`}
              >
                {initials(`${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`)}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">
                  {assignment.assignedTo.firstName} {assignment.assignedTo.lastName}
                </p>
                <p className="text-[11px] text-slate-400">{assignment.assignedTo.role.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold text-slate-700">Allocated Openings</Label>
                <Input
                  type="number"
                  min={1}
                  value={allocatedOpenings}
                  onChange={e => setAllocatedOpenings(e.target.value)}
                  placeholder="—"
                  className="h-9 text-[13px] rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold text-slate-700">Deadline</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="h-9 text-[13px] rounded-xl border-slate-200"
                />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-[13px] rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="text-[13px] rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Remove Dialog ────────────────────────────────────────────────────────────

function RemoveDialog({
  open,
  onClose,
  assignment,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  assignment: AssignmentNode | null;
  onSuccess: () => void;
}) {
  const axios = useAxios();
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/assignments/${assignment!.id}`, {
        data: { reason: reason || undefined },
      });
    },
    onSuccess: () => {
      toast.success('Assignment removed');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to remove');
    },
  });

  const hasChildren = (assignment?.childAssignments.length ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-bold text-slate-900">
            Remove Assignment
          </DialogTitle>
        </DialogHeader>
        {assignment && (
          <div className="space-y-4 py-1">
            <p className="text-[13px] text-slate-600">
              Remove the assignment for{' '}
              <span className="font-semibold text-slate-800">
                {assignment.assignedTo.firstName} {assignment.assignedTo.lastName}
              </span>
              ?
            </p>
            {hasChildren && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-700">
                  This will also remove <strong>{assignment.childAssignments.length}</strong>{' '}
                  sub-assignment{assignment.childAssignments.length !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-bold text-slate-700">Reason (optional)</Label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. No longer available"
                className="h-9 text-[13px] rounded-xl border-slate-200"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-[13px] rounded-xl"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="text-[13px] rounded-xl"
          >
            {mutation.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat bubble ──────────────────────────────────────────────────────────────

function StatBubble({
  value,
  label,
  highlight = false,
  warn = false,
}: {
  value: number;
  label: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  if (value === 0) return null;
  return (
    <div
      className={`flex flex-col items-center px-3 py-1.5 rounded-lg border min-w-[48px] ${
        warn
          ? 'bg-red-50 border-red-100'
          : highlight
            ? 'bg-blue-50 border-blue-100'
            : 'bg-slate-50 border-slate-200'
      }`}
    >
      <span
        className={`text-[15px] font-black leading-none ${warn ? 'text-red-600' : highlight ? 'text-blue-700' : 'text-slate-800'}`}
      >
        {value}
      </span>
      <span
        className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${warn ? 'text-red-400' : highlight ? 'text-blue-500' : 'text-slate-400'}`}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Assignment Tree Node ─────────────────────────────────────────────────────

function TreeNode({
  node,
  level,
  canManage,
  onSubAssign,
  onEdit,
  onRemove,
  requirementOpenings,
}: {
  node: AssignmentNode;
  level: number;
  canManage: boolean;
  onSubAssign: (n: AssignmentNode) => void;
  onEdit: (n: AssignmentNode) => void;
  onRemove: (n: AssignmentNode) => void;
  requirementOpenings: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const meta = DEPTH_META[node.depth] ?? DEPTH_META[2];
  const stats = node.candidateStats;
  const dl = node.deadline ? daysLeft(node.deadline) : null;
  const target = node.allocatedOpenings ?? requirementOpenings;
  const fillPct = target > 0 ? Math.round((node.filledOpenings / target) * 100) : 0;
  const isRemoved = node.status !== 'ACTIVE';
  const hasChildren = node.childAssignments.length > 0;
  const canSubAssign = node.depth < 2 && !isRemoved && canManage;

  return (
    <div style={{ marginLeft: level > 0 ? '28px' : '0px' }}>
      {/* Connector line for non-root */}
      {level > 0 && (
        <div
          className={`absolute left-0 top-0 w-5 h-6 border-l-2 border-b-2 rounded-bl-lg ${meta.connector} -ml-5 mt-3`}
          style={{
            position: 'relative',
            marginLeft: '-20px',
            marginTop: '-4px',
            display: 'inline-block',
            verticalAlign: 'top',
          }}
        />
      )}

      <div
        className={`rounded-xl border transition-all mb-2 ${isRemoved ? 'opacity-50 border-slate-100 bg-slate-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Expand toggle */}
          {hasChildren ? (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0"
            >
              <ChevronRight
                size={13}
                className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            </button>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarBg(node.assignedTo.firstName)}`}
          >
            {initials(`${node.assignedTo.firstName} ${node.assignedTo.lastName}`)}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[13px] font-bold text-slate-800">
                {node.assignedTo.firstName} {node.assignedTo.lastName}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.pill}`}>
                {meta.role}
              </span>
              {node.breachedAt && (
                <span className="text-[10px] font-semibold text-red-600 flex items-center gap-0.5">
                  <AlertTriangle size={9} />
                  Breached
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {node.assignedTo.role.name} · assigned {timeAgo(node.assignedAt)}
              {node.assignedBy && ` by ${node.assignedBy.firstName}`}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 shrink-0">
            <StatBubble value={stats.total} label="total" highlight />
            <StatBubble value={stats.submitted} label="sub" />
            <StatBubble value={stats.offered} label="offered" />
            <StatBubble value={stats.placed} label="placed" />
            {stats.agingBuckets.critical > 0 && (
              <StatBubble value={stats.agingBuckets.critical} label="stale" warn />
            )}
          </div>

          {/* Fill */}
          {node.allocatedOpenings != null && (
            <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-slate-100">
              <div className="relative w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${fillPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(fillPct, 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-600">
                {node.filledOpenings}/{node.allocatedOpenings}
              </span>
            </div>
          )}

          {/* Deadline */}
          {dl != null && (
            <span
              className={`text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0 ${dl < 0 ? 'bg-red-50 text-red-600' : dl <= 3 ? 'bg-amber-50 text-amber-600' : 'text-slate-400'}`}
            >
              {dl < 0 ? `${Math.abs(dl)}d over` : `${dl}d left`}
            </span>
          )}

          {/* Rate */}
          {stats.rates.submission > 0 && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg shrink-0">
              {stats.rates.submission}%
            </span>
          )}

          {/* Action buttons */}
          {canManage && !isRemoved && (
            <div
              className={`flex items-center gap-1 shrink-0 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}
            >
              {canSubAssign && (
                <button
                  onClick={() => onSubAssign(node)}
                  className="h-7 px-2 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 transition-colors"
                >
                  <Plus size={11} />
                  Sub-assign
                </button>
              )}
              <button
                onClick={() => onEdit(node)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={() => onRemove(node)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded &&
        node.childAssignments.map(child => (
          <TreeNode
            key={child.id}
            node={child}
            level={level + 1}
            canManage={canManage}
            onSubAssign={onSubAssign}
            onEdit={onEdit}
            onRemove={onRemove}
            requirementOpenings={requirementOpenings}
          />
        ))}
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function TotalSummary({ stats, openings }: { stats: any; openings: number }) {
  const fillPct = openings > 0 ? Math.round((stats.placed / openings) * 100) : 0;
  return (
    <div className="flex items-center gap-4 flex-wrap text-[12px]">
      <div className="flex items-center gap-2">
        <div className="relative w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${fillPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>
        <span className="font-bold text-slate-700">
          {stats.placed}/{openings} filled
        </span>
      </div>
      {[
        { v: stats.total, l: 'in pipeline' },
        { v: stats.submitted, l: 'submitted' },
        { v: stats.offered, l: 'offered' },
        { v: stats.joined, l: 'joined' },
      ].map(({ v, l }) =>
        v > 0 ? (
          <span key={l} className="text-slate-500">
            <span className="font-bold text-slate-800">{v}</span> {l}
          </span>
        ) : null
      )}
      {stats.agingBuckets?.critical > 0 && (
        <span className="font-semibold text-red-500 flex items-center gap-1">
          <AlertTriangle size={10} />
          {stats.agingBuckets.critical} stale &gt;14d
        </span>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AssignmentPanel({
  requirementId,
  requirementStatus,
  canManage = false,
}: {
  requirementId: string;
  requirementStatus: string;
  canManage?: boolean;
}) {
  const axios = useAxios();
  const qc = useQueryClient();

  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    parentAssignmentId: string | null;
    parentDepth: number | null;
  }>({ open: false, parentAssignmentId: null, parentDepth: null });
  const [editTarget, setEditTarget] = useState<AssignmentNode | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AssignmentNode | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['requirement-assignments', requirementId],
    queryFn: async () => {
      const r = await axios.get(`/assignments/requirement/${requirementId}`);
      return r.data.data as {
        requirement: {
          id: string;
          reqCode: string;
          title: string;
          status: string;
          totalOpenings: number;
        };
        totalCandidateStats: any;
        assignments: AssignmentNode[];
      };
    },
    enabled: !!requirementId,
  });

  const assignments = res?.assignments ?? [];
  const totalStats = res?.totalCandidateStats;
  const openings = res?.requirement?.totalOpenings ?? 1;
  const canAssign = canManage && ['ACTIVE', 'PENDING_APPROVAL'].includes(requirementStatus);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['requirement-assignments', requirementId] });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <GitBranch size={13} className="text-white" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-900">Assignments</h3>
          {!isLoading && assignments.length > 0 && (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {assignments.length}
            </span>
          )}
        </div>
        {canAssign && (
          <Button
            size="sm"
            className="h-8 px-3 text-[12px] rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
            onClick={() =>
              setAssignDialog({ open: true, parentAssignmentId: null, parentDepth: null })
            }
          >
            <Plus size={13} className="mr-1" />
            Assign
          </Button>
        )}
      </div>

      {/* Summary */}
      {!isLoading && totalStats && totalStats.total > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <TotalSummary stats={totalStats} openings={openings} />
        </div>
      )}

      {/* Tree */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl"
              >
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Users size={20} className="text-slate-300" />
            </div>
            <p className="text-[13px] font-semibold text-slate-600">No assignments yet</p>
            <p className="text-[12px] text-slate-400">
              {canAssign
                ? 'Assign this requirement to get started.'
                : 'This requirement has not been assigned yet.'}
            </p>
            {canAssign && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-[12px] rounded-xl mt-1"
                onClick={() =>
                  setAssignDialog({ open: true, parentAssignmentId: null, parentDepth: null })
                }
              >
                <Plus size={12} className="mr-1" />
                Assign Now
              </Button>
            )}
          </div>
        ) : (
          <div>
            {assignments.map(a => (
              <TreeNode
                key={a.id}
                node={a}
                level={0}
                canManage={canManage}
                onSubAssign={n =>
                  setAssignDialog({ open: true, parentAssignmentId: n.id, parentDepth: n.depth })
                }
                onEdit={n => setEditTarget(n)}
                onRemove={n => setRemoveTarget(n)}
                requirementOpenings={openings}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AssignDialog
        open={assignDialog.open}
        onClose={() => setAssignDialog(d => ({ ...d, open: false }))}
        requirementId={requirementId}
        parentAssignmentId={assignDialog.parentAssignmentId}
        parentDepth={assignDialog.parentDepth}
        onSuccess={invalidate}
      />
      <EditDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        assignment={editTarget}
        onSuccess={invalidate}
      />
      <RemoveDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        assignment={removeTarget}
        onSuccess={invalidate}
      />
    </div>
  );
}
