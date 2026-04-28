'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Network,
  Crown,
  BadgeCheck,
  UserCircle2,
  ArrowRightLeft,
  Eye,
  GitBranch,
  Users,
  Briefcase,
  FileText,
  History,
  ChevronRight,
  X,
  ExternalLink,
  AlertTriangle,
  CalendarClock,
  Plus,
  UserPlus,
  Link2,
  Link2Off,
  Building2,
  Layers,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import type {
  TeamDetail,
  TeamDetailResponse,
  TeamEdge,
  TeamMemberFull,
  TeamRequirementAssignment,
  TeamMemberHistoryEntry,
  EdgeType,
  TeamRole,
  RequirementStatus,
  Priority,
} from '@/types/team.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ini = (f: string, l: string) => `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase();

const fmtSalary = (min?: number | null, max?: number | null, type?: string | null) => {
  if (!min && !max) return null;
  const f = (n: number) =>
    n >= 100_000 ? `${(n / 100_000).toFixed(1)}L` : `${(n / 1_000).toFixed(0)}K`;
  return `₹${[min, max]
    .filter(Boolean)
    .map(n => f(n!))
    .join('–')}${type === 'ANNUAL' ? ' PA' : type === 'MONTHLY' ? '/mo' : ''}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — shared with canvas page aesthetic
// ─────────────────────────────────────────────────────────────────────────────

const NODE_CLS = {
  MANAGEMENT: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    icon: 'text-violet-500',
    strip: 'bg-violet-400',
    badge: 'bg-violet-100 text-violet-700',
  },
  GROUP: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800',
    icon: 'text-sky-500',
    strip: 'bg-sky-400',
    badge: 'bg-sky-100 text-sky-700',
  },
  INDIVIDUAL: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
    strip: 'bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
  },
};

const EDGE_CFG: Record<
  EdgeType,
  {
    label: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    activeBg: string;
    stroke: string;
  }
> = {
  ASSIGNS_TO: {
    label: 'Assigns to',
    desc: 'Work routing — parent assigns requirements downstream',
    icon: ArrowRightLeft,
    color: 'text-blue-500',
    activeBg: 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    stroke: '#3b82f6',
  },
  REPORTS_TO: {
    label: 'Reports to',
    desc: 'Org reporting line — child reports up to parent',
    icon: GitBranch,
    color: 'text-violet-500',
    activeBg: 'bg-violet-50/80 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800',
    stroke: '#8b5cf6',
  },
  VISIBILITY: {
    label: 'Visibility',
    desc: "Data access — parent can see this team's requirements",
    icon: Eye,
    color: 'text-emerald-500',
    activeBg: 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    stroke: '#10b981',
  },
};

const REQ_STYLE: Record<RequirementStatus, string> = {
  ACTIVE:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  CLOSED: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  PENDING_APPROVAL: 'bg-blue-50 text-blue-700 border-blue-200',
};

const PRI_STYLE: Record<Priority, string> = {
  HIGH: 'text-red-600 bg-red-50 border-red-200',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  LOW: 'text-zinc-500 bg-zinc-50 border-zinc-200',
};

const ROLE_CFG: Record<TeamRole, { label: string; icon: React.ElementType; cls: string }> = {
  LEAD: { label: 'Lead', icon: Crown, cls: 'text-amber-500' },
  CO_LEAD: { label: 'Co-lead', icon: BadgeCheck, cls: 'text-blue-500' },
  MEMBER: { label: 'Member', icon: UserCircle2, cls: 'text-muted-foreground' },
};

const EVENT_CLS: Record<string, string> = {
  JOINED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60',
  LEFT: 'bg-red-100 text-red-700 dark:bg-red-950/50',
  REPLACED: 'bg-amber-100 text-amber-700',
  DEACTIVATED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800',
};

// ─────────────────────────────────────────────────────────────────────────────
// Edge card — inline line visual + toggle + unlink
// ─────────────────────────────────────────────────────────────────────────────

function EdgeCard({
  edge,
  direction,
  canEdit,
  onToggle,
  onDelete,
}: {
  edge: TeamEdge;
  direction: 'in' | 'out';
  canEdit: boolean;
  onToggle: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = EDGE_CFG[edge.edgeType];
  const Icon = cfg.icon;
  const related = direction === 'out' ? edge.child : edge.parent;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all',
        edge.isActive ? cfg.activeBg : 'border-border/40 bg-transparent opacity-50'
      )}
    >
      {/* Direction wire */}
      <div className="flex items-center gap-1.5 shrink-0">
        {direction === 'in' && (
          <div
            className="w-5 h-px"
            style={{ background: edge.isActive ? cfg.stroke : '#94a3b8' }}
          />
        )}
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
            edge.isActive ? 'bg-white dark:bg-black/20' : 'bg-muted'
          )}
        >
          <Icon
            className={cn('h-3.5 w-3.5', edge.isActive ? cfg.color : 'text-muted-foreground')}
          />
        </div>
        {direction === 'out' && (
          <div
            className="w-5 h-px"
            style={{ background: edge.isActive ? cfg.stroke : '#94a3b8' }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{cfg.label}</span>
          <span
            className={cn(
              'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
              edge.isActive
                ? 'bg-white/80 dark:bg-black/30 text-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {edge.isActive ? 'active' : 'off'}
          </span>
        </div>
        {related && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {direction === 'out' ? '→' : '←'}{' '}
            <span className="font-medium text-foreground">{related.name}</span>
            <span className="text-muted-foreground/60 ml-1">{related.nodeType}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canEdit && (
          <Switch
            checked={edge.isActive}
            onCheckedChange={v => onToggle(edge.id, v)}
            className="scale-[0.7]"
          />
        )}
        {canEdit && (
          <button
            onClick={() => onDelete(edge.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Link2Off className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add edge dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddEdgeDialog({
  open,
  teamId,
  onClose,
  onAdded,
}: {
  open: boolean;
  teamId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const axios = useAxios();
  const [targetId, setTargetId] = useState('');
  const [edgeType, setEdgeType] = useState<EdgeType>('ASSIGNS_TO');
  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [pending, setPending] = useState(false);

  const { data: teamsData } = useQuery<{ success: boolean; flat: any[] }>({
    queryKey: ['teams-flat'],
    queryFn: async () => (await axios.get('/teams?isActive=true')).data,
  });
  const other = (teamsData?.flat ?? []).filter((t: any) => t.id !== teamId);

  const submit = async () => {
    if (!targetId) return;
    setPending(true);
    try {
      await axios.post(`/teams/${teamId}/edges`, { targetTeamId: targetId, edgeType, direction });
      onAdded();
      onClose();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add edge</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Direction</Label>
            <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outgoing">Outgoing — this team → target</SelectItem>
                <SelectItem value="incoming">Incoming — target → this team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Target team</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select team…" />
              </SelectTrigger>
              <SelectContent>
                {other.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Edge type</Label>
            <Select value={edgeType} onValueChange={(v: any) => setEdgeType(v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['ASSIGNS_TO', 'REPORTS_TO', 'VISIBILITY'] as EdgeType[]).map(t => (
                  <SelectItem key={t} value={t}>
                    <span className="font-medium">{t.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {EDGE_CFG[t].desc}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!targetId || pending} onClick={submit}>
            {pending ? 'Adding…' : 'Add edge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add member dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddMemberDialog({
  open,
  teamId,
  onClose,
  onAdded,
}: {
  open: boolean;
  teamId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const axios = useAxios();
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<{ id: string; name: string; role: TeamRole }[]>([]);
  const [pending, setPending] = useState(false);

  const { data } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['avail', teamId, search],
    queryFn: async () =>
      (await axios.get(`/teams/${teamId}/available-users${search ? `?search=${search}` : ''}`))
        .data,
    enabled: open,
  });

  const toggle = (u: any) =>
    setSel(prev => {
      if (prev.find(x => x.id === u.id)) return prev.filter(x => x.id !== u.id);
      return [...prev, { id: u.id, name: `${u.firstName} ${u.lastName}`, role: 'MEMBER' }];
    });

  const setRole = (userId: string, role: TeamRole) =>
    setSel(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));

  const submit = async () => {
    if (!sel.length) return;
    setPending(true);
    try {
      await axios.post(`/teams/${teamId}/members`, {
        members: sel.map(u => ({ userId: u.id, teamRole: u.role })),
      });
      onAdded();
      onClose();
      setSel([]);
      setSearch('');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
            {(data?.data ?? []).length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No available users
              </div>
            ) : (
              (data?.data ?? []).map((u: any) => {
                const selected = sel.find(s => s.id === u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggle(u)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40',
                      selected && 'bg-muted/60'
                    )}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {ini(u.firstName, u.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {u.role?.name?.replace(/_/g, ' ')} · {u.employeeId}
                      </p>
                    </div>
                    {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
          {sel.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Set roles</p>
              {sel.map(u => (
                <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <span className="flex-1 text-xs font-medium truncate">{u.name}</span>
                  <Select value={u.role} onValueChange={(v: TeamRole) => setRole(u.id, v)}>
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD">Lead</SelectItem>
                      <SelectItem value="CO_LEAD">Co-lead</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => toggle({ id: u.id })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!sel.length || pending} onClick={submit}>
            {pending ? 'Adding…' : `Add ${sel.length || ''} member${sel.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirement sheet
// ─────────────────────────────────────────────────────────────────────────────

function ReqSheet({
  assignment,
  open,
  onClose,
}: {
  assignment: TeamRequirementAssignment | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!assignment) return null;
  const req = assignment.requirement;
  const salary = fmtSalary(req.salaryMin, req.salaryMax, req.salaryType);
  const fillPct =
    req.totalOpenings > 0 ? Math.round((req.filledOpenings / req.totalOpenings) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted-foreground mb-1">{req.reqCode}</p>
              <SheetTitle className="text-base leading-snug">{req.title}</SheetTitle>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground shrink-0 mt-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>
        <div className="pt-5 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', REQ_STYLE[req.status])}
            >
              {req.status.replace(/_/g, ' ')}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', PRI_STYLE[req.priority])}
            >
              {req.priority}
            </Badge>
            {req.isRespondByBreached && (
              <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-medium">
                <AlertTriangle className="h-3 w-3" /> Breached
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Client', value: req.client.name },
              ...(salary ? [{ label: 'Salary', value: salary }] : []),
              { label: 'Openings', value: `${req.filledOpenings}/${req.totalOpenings} filled` },
              { label: 'Submissions', value: String(assignment.submissionsCount) },
              { label: 'Interviews', value: String(assignment.interviewsCount) },
              ...(assignment.allocatedOpenings != null
                ? [{ label: 'Allocated', value: String(assignment.allocatedOpenings) }]
                : []),
              ...(assignment.deadline
                ? [{ label: 'Deadline', value: fmtDate(assignment.deadline) }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                  {label}
                </p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Fill progress</span>
              <span className="font-semibold tabular-nums">{fillPct}%</span>
            </div>
            <Progress value={fillPct} className="h-1.5" />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onClose();
              router.push(`/requirements/${req.id}`);
            }}
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open full requirement
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT PANEL — fixed identity strip
// Identity card + edge map + parent/child hierarchy
// ─────────────────────────────────────────────────────────────────────────────

function LeftPanel({
  team,
  canEdit,
  onAddEdge,
  onToggleEdge,
  onDeleteEdge,
}: {
  team: TeamDetail;
  canEdit: boolean;
  onAddEdge: () => void;
  onToggleEdge: (id: string, val: boolean) => void;
  onDeleteEdge: (id: string) => void;
}) {
  const router = useRouter();
  const colors = NODE_CLS[team.nodeType] ?? NODE_CLS.GROUP;

  return (
    <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Identity card */}
      <div className={cn('rounded-2xl border-2 overflow-hidden', colors.bg, colors.border)}>
        {/* Colored top strip */}
        <div className={cn('h-1.5 w-full', colors.strip)} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 bg-white/60 dark:bg-black/20">
              <Network className={cn('h-5 w-5', colors.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold leading-tight">{team.name}</h2>
              {team.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span
              className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', colors.badge)}
            >
              {team.nodeType}
            </span>
            {team.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                {team.category}
              </span>
            )}
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                team.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              )}
            >
              {team.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Meta */}
          <div className="mt-3 space-y-1.5">
            {team.businessUnit && (
              <button
                onClick={() => router.push(`/business-units/${team.businessUnit!.id}`)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Building2 className="h-3 w-3 shrink-0" />
                {team.businessUnit.name}
              </button>
            )}
            {team.teamArc && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Layers className="h-3 w-3 shrink-0" />
                {team.teamArc.name}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              Created {fmtDate(team.createdAt)}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 border-t divide-x">
          {[
            { label: 'Members', value: team._count.members },
            { label: 'Reqs', value: team._count.requirementAssignments },
            { label: 'Clients', value: team._count.clientAssignments },
            { label: 'Links', value: team._count.childEdges },
          ].map(s => (
            <div key={s.label} className="py-2.5 text-center">
              <div className="text-base font-bold leading-none">{s.value}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edge relationships */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b bg-muted/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Link2 className="h-3 w-3" /> Edges
          </span>
          {canEdit && (
            <button
              onClick={onAddEdge}
              className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>

        <div className="p-3 space-y-2">
          {/* Parent teams section */}
          {team.parentEdges.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-0.5">
                From
              </p>
              {team.parentEdges.map(edge => (
                <EdgeCard
                  key={edge.id}
                  edge={edge}
                  direction="in"
                  canEdit={canEdit}
                  onToggle={onToggleEdge}
                  onDelete={onDeleteEdge}
                />
              ))}
            </div>
          )}

          {/* Child edges section */}
          {team.childEdges.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-0.5">
                To
              </p>
              {team.childEdges.map(edge => (
                <EdgeCard
                  key={edge.id}
                  edge={edge}
                  direction="out"
                  canEdit={canEdit}
                  onToggle={onToggleEdge}
                  onDelete={onDeleteEdge}
                />
              ))}
            </div>
          )}

          {team.parentEdges.length === 0 && team.childEdges.length === 0 && (
            <div className="py-5 text-center">
              <Link2 className="h-5 w-5 text-muted-foreground/25 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">No edges</p>
              {canEdit && (
                <button
                  onClick={onAddEdge}
                  className="text-[11px] text-primary mt-1 hover:underline"
                >
                  Add first edge
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Parent teams (from ASSIGNS_TO) */}
      {team.parentTeams.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-3.5 py-2.5 border-b bg-muted/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Parent teams
            </span>
          </div>
          <div className="p-2 space-y-1">
            {team.parentTeams.map(p => (
              <button
                key={p.id}
                onClick={() => router.push(`/teams/${p.id}`)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 text-left group transition-colors"
              >
                <Network className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-xs font-medium truncate">{p.name}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                  {p.nodeType.charAt(0)}
                </Badge>
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Child teams */}
      {team.childTeams.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-3.5 py-2.5 border-b bg-muted/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Child teams ({team.childTeams.length})
            </span>
          </div>
          <div className="p-2 space-y-1">
            {team.childTeams.map(child => {
              const lead = child.members.find(m => m.teamRole === 'LEAD');
              return (
                <button
                  key={child.id}
                  onClick={() => router.push(`/teams/${child.id}`)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 text-left group transition-colors"
                >
                  <Network className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{child.name}</p>
                    {lead && (
                      <p className="text-[9px] text-muted-foreground">
                        {lead.user.firstName} {lead.user.lastName}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {child._count.members}m
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Visibility config */}
      {team.visibilityConfig && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-3.5 py-2.5 border-b bg-muted/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Visibility
            </span>
          </div>
          <div className="divide-y">
            {[
              { key: 'membersCanSeePeerReqs', label: 'Peers see each others reqs' },
              { key: 'leadCanSeeChildReqs', label: 'Lead sees child reqs' },
              { key: 'canSeeInboundReqs', label: 'Sees inbound reqs' },
              { key: 'canSeeOutboundReqs', label: 'Sees outbound reqs' },
            ].map(({ key, label }) => {
              const on = (team.visibilityConfig as any)[key];
              return (
                <div key={key} className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                      on ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {on ? 'On' : 'Off'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function MembersTab({
  team,
  canEdit,
  onRefresh,
}: {
  team: TeamDetail;
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const axios = useAxios();
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const removeM = useMutation({
    mutationFn: async (userId: string) =>
      (
        await axios.delete(`/teams/${team.id}/members/${userId}`, {
          data: { reason: reason || undefined },
        })
      ).data,
    onSuccess: () => {
      onRefresh();
      setRemoving(null);
      setReason('');
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, teamRole }: { userId: string; teamRole: TeamRole }) =>
      (await axios.patch(`/teams/${team.id}/members/${userId}/role`, { teamRole })).data,
    onSuccess: onRefresh,
  });

  const leadership = team.members.filter(m => m.teamRole !== 'MEMBER');
  const members = team.members.filter(m => m.teamRole === 'MEMBER');

  const MemberRow = ({ m }: { m: TeamMemberFull }) => {
    const cfg = ROLE_CFG[m.teamRole];
    const Icon = cfg.icon;
    return (
      <div className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-[11px]">
            {ini(m.user.firstName, m.user.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {m.user.firstName} {m.user.lastName}
            </span>
            {m.user.employeeId && (
              <span className="text-xs font-mono text-muted-foreground">{m.user.employeeId}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
            {m.user.role.name.replace(/_/g, ' ')}
          </Badge>
          {canEdit ? (
            <Select
              value={m.teamRole}
              onValueChange={(v: TeamRole) => changeRole.mutate({ userId: m.user.id, teamRole: v })}
            >
              <SelectTrigger className="h-7 w-24 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="CO_LEAD">Co-lead</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className={cn('flex items-center gap-1 text-[10px]', cfg.cls)}>
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
          )}
          {canEdit && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => setRemoving(m.user.id)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm text-muted-foreground">
          {team._count.members} active member{team._count.members !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <Button size="sm" variant="outline" className="h-8" onClick={() => setShowAdd(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>

      {team.members.length === 0 ? (
        <div className="py-20 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">No members</p>
          {canEdit && (
            <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add members
            </Button>
          )}
        </div>
      ) : (
        <>
          {leadership.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Leadership
                </p>
              </div>
              <div className="divide-y divide-border/40">
                {leadership.map(m => (
                  <MemberRow key={m.id} m={m} />
                ))}
              </div>
            </>
          )}
          {members.length > 0 && (
            <>
              <div
                className={cn(
                  'px-4 pb-1',
                  leadership.length > 0 ? 'pt-4 border-t border-border/40 mt-2' : 'pt-4'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Members ({members.length})
                </p>
              </div>
              <div className="divide-y divide-border/40">
                {members.map(m => (
                  <MemberRow key={m.id} m={m} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <AddMemberDialog
        open={showAdd}
        teamId={team.id}
        onClose={() => setShowAdd(false)}
        onAdded={() => {
          onRefresh();
          setShowAdd(false);
        }}
      />

      <AlertDialog open={!!removing} onOpenChange={v => !v && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to requirements assigned through this team.
              <Input
                placeholder="Reason (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="mt-3"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removing && removeM.mutate(removing)}
              disabled={removeM.isPending}
            >
              {removeM.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ClientsTab({ team }: { team: TeamDetail }) {
  const router = useRouter();
  if (!team.clientAssignments.length)
    return (
      <div className="py-20 text-center">
        <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No clients assigned</p>
      </div>
    );

  return (
    <div className="divide-y">
      {team.clientAssignments.map(({ client, assignedAt }) => (
        <div
          key={client.id}
          onClick={() => router.push(`/clients/${client.id}`)}
          className="flex items-start gap-3 px-4 py-4 hover:bg-muted/30 cursor-pointer transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-bold shrink-0">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium">{client.name}</span>
              {client.category && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  {client.category}
                </Badge>
              )}
            </div>
            {client.industry && <p className="text-xs text-muted-foreground">{client.industry}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Assigned {fmtShort(assignedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                client.status === 'ACTIVE'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : client.status === 'PENDING'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600'
              )}
            >
              {client.status}
            </Badge>
            {client._count.requirements > 0 && (
              <span className="text-xs font-medium text-blue-600">
                {client._count.requirements} open req{client._count.requirements !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function RequirementsTab({ team }: { team: TeamDetail }) {
  const [selected, setSelected] = useState<TeamRequirementAssignment | null>(null);

  if (!team.requirementAssignments.length)
    return (
      <div className="py-20 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No active assignments</p>
      </div>
    );

  return (
    <>
      <div className="divide-y">
        {team.requirementAssignments.map(a => {
          const req = a.requirement;
          const salary = fmtSalary(req.salaryMin, req.salaryMax, req.salaryType);
          const fillPct =
            req.totalOpenings > 0 ? Math.round((req.filledOpenings / req.totalOpenings) * 100) : 0;
          return (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              className={cn(
                'flex items-start gap-3 px-4 py-4 hover:bg-muted/40 cursor-pointer',
                req.isRespondByBreached && 'border-l-2 border-l-destructive'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-[11px] text-muted-foreground">{req.reqCode}</span>
                  {req.isRespondByBreached && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" /> Breached
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium leading-snug">{req.title}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>{req.client.name}</span>
                  {salary && <span>· {salary}</span>}
                  {req.respondBy && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" /> {fmtShort(req.respondBy)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span>{a.submissionsCount} sub</span>
                  <span>· {a.interviewsCount} int</span>
                  {a.allocatedOpenings != null && <span>· {a.allocatedOpenings} alloc</span>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 max-w-[90px] h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        fillPct >= 100
                          ? 'bg-emerald-500'
                          : fillPct > 0
                            ? 'bg-blue-500'
                            : 'bg-muted-foreground/20'
                      )}
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {req.filledOpenings}/{req.totalOpenings}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', REQ_STYLE[req.status])}
                >
                  {req.status.replace(/_/g, ' ')}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', PRI_STYLE[req.priority])}
                >
                  {req.priority}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
      <ReqSheet assignment={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TAB
// ─────────────────────────────────────────────────────────────────────────────

function ActivityTab({ history }: { history: TeamMemberHistoryEntry[] }) {
  if (!history.length)
    return (
      <div className="py-20 text-center">
        <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );

  return (
    <div className="p-5">
      {history.map((entry, i) => {
        const ec = EVENT_CLS[entry.event] ?? 'bg-muted text-muted-foreground';
        return (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold',
                  ec
                )}
              >
                {entry.event[0]}
              </div>
              {i < history.length - 1 && <div className="w-px flex-1 bg-border/40 my-1" />}
            </div>
            <div className="pb-5 flex-1">
              <p className="text-sm leading-snug">
                <span className="font-semibold">
                  {entry.user.firstName} {entry.user.lastName}
                </span>{' '}
                <span className="text-muted-foreground">
                  {entry.event === 'JOINED'
                    ? 'joined'
                    : entry.event === 'LEFT'
                      ? 'left'
                      : entry.event === 'REPLACED'
                        ? 'was replaced'
                        : 'was deactivated'}
                </span>
              </p>
              {entry.reason && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">"{entry.reason}"</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {fmtTime(entry.eventAt)}
                {entry.performedBy && (
                  <>
                    {' '}
                    · by {entry.performedBy.firstName} {entry.performedBy.lastName}
                  </>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const qc = useQueryClient();
  const permission = usePermission('teams');
  const [showDelete, setShowDelete] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);

  const { data, isLoading, isError } = useQuery<TeamDetailResponse>({
    queryKey: ['team', id],
    queryFn: async () => (await axios.get<TeamDetailResponse>(`/teams/${id}`)).data,
    enabled: !!id,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['team', id] });

  const deleteMut = useMutation({
    mutationFn: async () => (await axios.delete(`/teams/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      router.push('/teams');
    },
  });

  const toggleEdge = useMutation({
    mutationFn: async ({ edgeId, isActive }: { edgeId: string; isActive: boolean }) =>
      (await axios.patch(`/teams/${id}/edges/${edgeId}`, { isActive })).data,
    onSuccess: refresh,
  });

  const deleteEdge = useMutation({
    mutationFn: async (edgeId: string) => (await axios.delete(`/teams/${id}/edges/${edgeId}`)).data,
    onSuccess: refresh,
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] p-6 gap-6 max-w-6xl mx-auto">
        <div className="w-72 space-y-3">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load.{' '}
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const team = data.data;

  // ── Delete guard — uses new _count.childEdges ─────────────────────────────
  const canDelete =
    permission.canDelete &&
    team._count.members === 0 &&
    team._count.requirementAssignments === 0 &&
    team._count.childEdges === 0;

  const TABS = [
    { value: 'members', label: `Members (${team._count.members})`, icon: Users },
    { value: 'clients', label: `Clients (${team._count.clientAssignments})`, icon: Briefcase },
    {
      value: 'requirements',
      label: `Reqs (${team._count.requirementAssignments})`,
      icon: FileText,
    },
    { value: 'activity', label: 'Activity', icon: History },
  ];

  return (
    <TooltipProvider>
      {/* Dot-grid background matching canvas page */}
      <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Top nav bar */}
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="bg-background/80 backdrop-blur"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {permission.canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background/80 backdrop-blur"
                  onClick={() => router.push(`/teams/${id}/edit`)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {permission.canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDelete(true)}
                      disabled={!canDelete}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </TooltipTrigger>
                  {!canDelete && (
                    <TooltipContent className="text-xs max-w-48">
                      Remove all members, active assignments, and linked child teams first
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </div>
          </div>

          {/* Main two-column layout */}
          <div className="flex gap-5 items-start">
            {/* ── Left: identity + edges + hierarchy ── */}
            <LeftPanel
              team={team}
              canEdit={permission.canEdit === true}
              onAddEdge={() => setShowAddEdge(true)}
              onToggleEdge={(eid, val) => toggleEdge.mutate({ edgeId: eid, isActive: val })}
              onDeleteEdge={eid => deleteEdge.mutate(eid)}
            />

            {/* ── Right: tabs ── */}
            <div className="flex-1 min-w-0">
              <Tabs
                defaultValue="members"
                className="rounded-xl border bg-card overflow-hidden shadow-sm"
              >
                <div className="overflow-x-auto border-b bg-muted/30">
                  <TabsList className="w-full justify-start rounded-none bg-transparent h-auto p-0 gap-0 min-w-max">
                    {TABS.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-normal data-[state=active]:font-semibold whitespace-nowrap flex items-center gap-1.5"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
                <TabsContent value="members" className="m-0">
                  <MembersTab
                    team={team}
                    canEdit={permission.canEdit === true}
                    onRefresh={refresh}
                  />
                </TabsContent>
                <TabsContent value="clients" className="m-0">
                  <ClientsTab team={team} />
                </TabsContent>
                <TabsContent value="requirements" className="m-0">
                  <RequirementsTab team={team} />
                </TabsContent>
                <TabsContent value="activity" className="m-0">
                  <ActivityTab history={team.memberHistories} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddEdgeDialog
        open={showAddEdge}
        teamId={id}
        onClose={() => setShowAddEdge(false)}
        onAdded={refresh}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Delete <span className="font-semibold text-foreground">{team.name}</span>? This
                cannot be undone.
                {!canDelete && (
                  <p className="mt-2 text-destructive text-sm">
                    Remove all members, active assignments, and child links first.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending || !canDelete}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
