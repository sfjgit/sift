'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  ChevronRight,
  ChevronDown,
  Users,
  Briefcase,
  FileText,
  LayoutGrid,
  Crown,
  BadgeCheck,
  UserCircle2,
  ArrowRightLeft,
  Eye,
  GitBranch,
  AlertTriangle,
  CalendarClock,
  X,
  ExternalLink,
  TrendingUp,
  Circle,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';

// ── exact imports from your types file ──────────────────────────────────────
import type {
  BUDetail,
  BUDetailResponse,
  BUTeamDetail,
  BUUserDetail,
  BUClientDetail,
  BURequirementDetail,
  BUChildItem,
  BUParentChain,
  TeamRole,
  EdgeType,
  RequirementStatus,
  Priority,
  ClientStatus,
  ClientHandlerRole,
  ReqBreakdown,
} from '@/types/bu.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ini = (f: string, l: string) => `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();

function fmtSalary(min?: number | null, max?: number | null, type?: string | null) {
  if (!min && !max) return null;
  const f = (n: number) =>
    n >= 100_000 ? `${(n / 100_000).toFixed(1)}L` : `${(n / 1_000).toFixed(0)}K`;
  const range = [min, max]
    .filter(Boolean)
    .map(n => f(n!))
    .join('–');
  const sfx =
    type === 'ANNUAL' ? ' PA' : type === 'MONTHLY' ? '/mo' : type === 'HOURLY' ? '/hr' : '';
  return `₹${range}${sfx}`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// ─────────────────────────────────────────────────────────────────────────────
// Style config maps
// ─────────────────────────────────────────────────────────────────────────────

const REQ_STYLE: Record<RequirementStatus, string> = {
  ACTIVE:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400',
  CLOSED: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400',
  PENDING_APPROVAL:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400',
};

const PRI_STYLE: Record<Priority, string> = {
  HIGH: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/50 dark:text-red-400',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400',
  LOW: 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400',
};

const ROLE_CFG: Record<TeamRole, { label: string; icon: React.ElementType; cls: string }> = {
  LEAD: { label: 'Lead', icon: Crown, cls: 'text-amber-500' },
  CO_LEAD: { label: 'Co-lead', icon: BadgeCheck, cls: 'text-blue-500' },
  MEMBER: { label: 'Member', icon: UserCircle2, cls: 'text-muted-foreground' },
};

const EDGE_CFG: Record<EdgeType, { label: string; icon: React.ElementType; color: string }> = {
  ASSIGNS_TO: { label: 'Assigns to', icon: ArrowRightLeft, color: 'text-blue-500' },
  REPORTS_TO: { label: 'Reports to', icon: GitBranch, color: 'text-violet-500' },
  VISIBILITY: { label: 'Visibility', icon: Eye, color: 'text-emerald-500' },
};

const CLIENT_STATUS_CLS: Record<ClientStatus, string> = {
  ACTIVE:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  INACTIVE: 'border-zinc-200 bg-zinc-50 text-zinc-600',
};

const NODE_TYPE_BORDER: Record<string, string> = {
  MANAGEMENT: 'border-l-violet-400',
  GROUP: 'border-l-blue-400',
  INDIVIDUAL: 'border-l-emerald-400',
};

const NODE_TYPE_ICON_CLS: Record<string, string> = {
  MANAGEMENT: 'bg-violet-50 dark:bg-violet-950/40 text-violet-500',
  GROUP: 'bg-blue-50 dark:bg-blue-950/40 text-blue-500',
  INDIVIDUAL: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500',
};

const CAT_CLS: Record<string, string> = {
  DELIVERY: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400',
  SALES: 'bg-amber-50 text-amber-700 border-amber-200',
  SUPPORT: 'bg-violet-50 text-violet-700 border-violet-200',
  MANAGEMENT: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
};

const REQ_BAR_CLS: Record<RequirementStatus, string> = {
  ACTIVE: 'bg-emerald-500',
  PENDING_APPROVAL: 'bg-blue-500',
  ON_HOLD: 'bg-amber-400',
  DRAFT: 'bg-muted-foreground/30',
  CLOSED: 'bg-zinc-400',
  CANCELLED: 'bg-red-400',
};

const REQ_ORDER: RequirementStatus[] = [
  'ACTIVE',
  'PENDING_APPROVAL',
  'ON_HOLD',
  'DRAFT',
  'CLOSED',
  'CANCELLED',
];

// ─────────────────────────────────────────────────────────────────────────────
// Micro atoms
// ─────────────────────────────────────────────────────────────────────────────

function ReqStatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] px-1.5 py-0 font-medium', REQ_STYLE[status])}
    >
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', PRI_STYLE[priority])}>
      {priority}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirement Sheet
// ─────────────────────────────────────────────────────────────────────────────

function ReqSheet({
  req,
  open,
  onClose,
}: {
  req: BURequirementDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!req) return null;
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
            <ReqStatusBadge status={req.status} />
            <PriorityBadge priority={req.priority} />
            {req.isRespondByBreached && (
              <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-medium">
                <AlertTriangle className="h-3 w-3" /> Deadline breached
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Client
              </p>
              <p className="text-sm font-medium">{req.client.name}</p>
            </div>
            {salary && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                  Salary
                </p>
                <p className="text-sm font-medium">{salary}</p>
              </div>
            )}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Openings
              </p>
              <p className="text-sm font-medium">
                {req.filledOpenings} / {req.totalOpenings} filled
              </p>
            </div>
            {req.respondBy && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                  Respond by
                </p>
                <p
                  className={cn(
                    'text-sm font-medium',
                    req.isRespondByBreached && 'text-destructive'
                  )}
                >
                  {fmtDate(req.respondBy)}
                </p>
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Fill progress</span>
              <span className="font-medium tabular-nums">{fillPct}%</span>
            </div>
            <Progress value={fillPct} className="h-2" />
          </div>
          <Separator />
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
// BU hierarchy tree
// ─────────────────────────────────────────────────────────────────────────────

type TreeNode = {
  id: string;
  name: string;
  isActive: boolean;
  _count?: { users: number; teams: number };
  childBUs?: TreeNode[];
};

function HierarchyNode({
  node,
  currentId,
  depth = 0,
}: {
  node: TreeNode;
  currentId: string;
  depth?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const isCurrent = node.id === currentId;
  const hasChildren = (node.childBUs?.length ?? 0) > 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-all cursor-pointer select-none',
          isCurrent ? 'bg-primary/8 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'
        )}
        style={{ marginLeft: depth > 0 ? `${depth * 20}px` : undefined }}
        onClick={() => !isCurrent && router.push(`/business-units/${node.id}`)}
      >
        <button
          className={cn(
            'shrink-0 text-muted-foreground hover:text-foreground transition-colors',
            !hasChildren && 'invisible'
          )}
          onClick={e => {
            e.stopPropagation();
            setOpen(v => !v);
          }}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <span
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            node.isActive ? 'bg-emerald-500' : 'bg-red-400'
          )}
        />
        <Building2
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isCurrent ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <span className="flex-1 truncate">{node.name}</span>
        {isCurrent && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 font-normal">
            you are here
          </Badge>
        )}
        {node._count && !isCurrent && (
          <span className="text-[11px] text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {node._count.users}u · {node._count.teams}t
          </span>
        )}
      </div>
      {hasChildren && open && (
        <div className="relative" style={{ marginLeft: `${(depth + 1) * 20 + 14}px` }}>
          <div className="absolute left-0 top-0 bottom-2 w-px bg-border/60" />
          <div className="pl-4 space-y-0.5">
            {node.childBUs!.map(child => (
              <HierarchyNode key={child.id} node={child} currentId={currentId} depth={0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Team node — recursive, uses BUTeamDetail exactly
// ─────────────────────────────────────────────────────────────────────────────

function MemberRow({ member }: { member: BUTeamDetail['members'][number] }) {
  const cfg = ROLE_CFG[member.teamRole];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="text-[9px] bg-muted">
          {ini(member.user.firstName, member.user.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">
          {member.user.firstName} {member.user.lastName}
        </span>
        {member.user.employeeId && (
          <span className="ml-1.5 text-[10px] font-mono text-muted-foreground">
            {member.user.employeeId}
          </span>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('flex items-center gap-1 text-[10px] shrink-0', cfg.cls)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{member.user.email}</TooltipContent>
      </Tooltip>
    </div>
  );
}

// NOTE: BUTeamDetail doesn't carry parentTeamId in your current types file.
// Add `parentTeamId: string | null` to BUTeamDetail to enable the recursive tree.
// Until then the teams tab renders a flat list of team cards, each expandable.
function TeamCard({ team, allTeams }: { team: BUTeamDetail; allTeams: BUTeamDetail[] }) {
  const router = useRouter();
  const [showMembers, setShowMembers] = useState(false);

  // child teams — works once parentTeamId is added to BUTeamDetail
  const childTeams = allTeams.filter((t: any) => t.parentTeamId === team.id);
  const [childrenOpen, setChildrenOpen] = useState(true);

  const lead = team.members.find(m => m.teamRole === 'LEAD');
  const iconCls = NODE_TYPE_ICON_CLS[team.nodeType] ?? 'bg-muted text-muted-foreground';
  const borderCls = NODE_TYPE_BORDER[team.nodeType] ?? 'border-l-blue-400';

  return (
    <div>
      <div
        className={cn(
          'border border-border/60 rounded-lg overflow-hidden bg-card transition-shadow hover:shadow-sm',
          'border-l-2',
          borderCls
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* collapse toggle for children */}
          <button
            className={cn(
              'shrink-0 text-muted-foreground hover:text-foreground transition-colors',
              !childTeams.length && 'invisible'
            )}
            onClick={() => setChildrenOpen(v => !v)}
          >
            {childrenOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          <div
            className={cn('flex h-7 w-7 items-center justify-center rounded-md shrink-0', iconCls)}
          >
            <Network className="h-3.5 w-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="text-sm font-medium hover:text-primary transition-colors"
                onClick={() => router.push(`/teams/${team.id}`)}
              >
                {team.name}
              </button>
              {team.category && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    CAT_CLS[team.category] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {team.category}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted"
              >
                {team.nodeType}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {lead && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5 text-amber-500" />
                  {lead.user.firstName} {lead.user.lastName}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {team._count.members} member{team._count.members !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Stacked avatar preview */}
          <div className="flex -space-x-1.5 shrink-0">
            {team.members.slice(0, 5).map(m => (
              <Avatar key={m.id} className="h-6 w-6 border border-background">
                <AvatarFallback className="text-[9px] bg-muted">
                  {ini(m.user.firstName, m.user.lastName)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          <button
            className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border/60 rounded px-2 py-1 hover:bg-muted/40 transition-colors"
            onClick={() => setShowMembers(v => !v)}
          >
            <Users className="h-3 w-3" />
            {showMembers ? 'Hide' : 'Members'}
          </button>
        </div>

        {/* Members panel */}
        {showMembers && (
          <div className="border-t bg-muted/20 px-4 py-3">
            {team.members.length === 0 ? (
              <p className="text-xs text-muted-foreground">No members yet</p>
            ) : (
              <>
                {team.members.filter(m => m.teamRole !== 'MEMBER').length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Leadership
                    </p>
                    {team.members
                      .filter(m => m.teamRole !== 'MEMBER')
                      .map(m => (
                        <MemberRow key={m.id} member={m} />
                      ))}
                  </div>
                )}
                {team.members.filter(m => m.teamRole === 'MEMBER').length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Members ({team.members.filter(m => m.teamRole === 'MEMBER').length})
                    </p>
                    <div className="grid grid-cols-2 gap-x-4">
                      {team.members
                        .filter(m => m.teamRole === 'MEMBER')
                        .map(m => (
                          <MemberRow key={m.id} member={m} />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Child teams — indented with connector line */}
      {childTeams.length > 0 && childrenOpen && (
        <div className="relative mt-1.5 ml-6">
          <div className="absolute left-0 top-0 bottom-2 w-px bg-border/50" />
          <div className="pl-4 space-y-2">
            {childTeams.map(child => (
              <TeamCard key={child.id} team={child} allTeams={allTeams} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamsTab({ teams }: { teams: BUTeamDetail[] }) {
  // root teams = those whose parentTeamId isn't in this BU's team list
  const teamIds = new Set(teams.map(t => t.id));
  const roots = teams.filter((t: any) => !t.parentTeamId || !teamIds.has(t.parentTeamId));

  if (!teams.length) {
    return <p className="text-sm text-muted-foreground text-center py-10">No active teams</p>;
  }

  return (
    <div className="p-4 space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 border border-border/50">
        <span className="font-medium text-xs text-foreground">Edge types</span>
        {(Object.entries(EDGE_CFG) as [EdgeType, (typeof EDGE_CFG)[EdgeType]][]).map(
          ([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={type} className={cn('flex items-center gap-1.5', cfg.color)}>
                <Icon className="h-3 w-3" />
                {type.replace(/_/g, ' ')}
              </span>
            );
          }
        )}
        <Separator orientation="vertical" className="h-4" />
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-violet-400 rounded" />
          MANAGEMENT
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-blue-400 rounded" />
          GROUP
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-emerald-400 rounded" />
          INDIVIDUAL
        </span>
      </div>
      <div className="space-y-2">
        {roots.map(team => (
          <TeamCard key={team.id} team={team} allTeams={teams} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ bu }: { bu: BUDetail }) {
  const router = useRouter();
  const breakdown = REQ_ORDER.map(s => ({ s, n: bu.reqBreakdown[s] ?? 0 })).filter(e => e.n > 0);

  // leads across all teams
  const leads = bu.teams.flatMap(t =>
    t.members.filter(m => m.teamRole === 'LEAD').map(m => ({ ...m, teamName: t.name }))
  );

  const totalOpenings = bu.requirements.reduce((s, r) => s + r.totalOpenings, 0);
  const filledOpenings = bu.requirements.reduce((s, r) => s + r.filledOpenings, 0);
  const fillRate = totalOpenings > 0 ? Math.round((filledOpenings / totalOpenings) * 100) : 0;
  const breached = bu.requirements.filter(r => r.isRespondByBreached).length;

  return (
    <div className="p-5 space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Users</span>
          </div>
          <span className="text-3xl font-semibold tabular-nums leading-none">
            {bu._count.users}
          </span>
          <span className="text-[11px] text-muted-foreground">{bu.teams.length} teams</span>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Clients</span>
          </div>
          <span className="text-3xl font-semibold tabular-nums leading-none">
            {bu._count.clients}
          </span>
          <span className="text-[11px] text-muted-foreground">active accounts</span>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Fill rate</span>
          </div>
          <span className="text-3xl font-semibold tabular-nums leading-none">{fillRate}%</span>
          <Progress value={fillRate} className="h-1.5 mt-auto" />
        </div>
        <div
          className={cn(
            'rounded-xl p-4 flex flex-col gap-2',
            breached > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-muted/50'
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-3.5 w-3.5',
                breached > 0 ? 'text-destructive' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn('text-xs', breached > 0 ? 'text-destructive' : 'text-muted-foreground')}
            >
              Breached
            </span>
          </div>
          <span
            className={cn(
              'text-3xl font-semibold tabular-nums leading-none',
              breached > 0 && 'text-destructive'
            )}
          >
            {breached}
          </span>
          <span className="text-[11px] text-muted-foreground">requirements</span>
        </div>
      </div>

      {/* Req status breakdown bars */}
      {breakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Requirement breakdown
          </p>
          <div className="space-y-2.5">
            {breakdown.map(({ s, n }) => (
              <div key={s} className="flex items-center gap-3">
                <ReqStatusBadge status={s} />
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', REQ_BAR_CLS[s])}
                    style={{
                      width: `${bu._count.requirements > 0 ? Math.round((n / bu._count.requirements) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums font-medium w-5 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team leads grid */}
      {leads.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Team leads
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {leads.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 border border-border/60 rounded-lg px-3 py-2.5"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-[11px]">
                    {ini(m.user.firstName, m.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                    {m.user.firstName} {m.user.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{m.teamName}</p>
                </div>
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-units */}
      {bu.childBUs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Sub-units ({bu.childBUs.length})
          </p>
          <div className="space-y-1.5">
            {bu.childBUs.map(child => (
              <button
                key={child.id}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border/60 hover:bg-muted/50 hover:border-border transition-all text-left group"
                onClick={() => router.push(`/business-units/${child.id}`)}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    child.isActive ? 'bg-emerald-500' : 'bg-red-400'
                  )}
                />
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium truncate">{child.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {child._count.users}u · {child._count.teams}t · {child._count.clients}c
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function BUDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('business_units');
  const [showDelete, setShowDelete] = useState(false);
  const [selectedReq, setSelectedReq] = useState<BURequirementDetail | null>(null);

  const { data, isLoading, isError } = useQuery<BUDetailResponse>({
    queryKey: ['business-unit', id],
    queryFn: async () => (await axios.get<BUDetailResponse>(`/business-units/${id}`)).data,
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => (await axios.delete(`/business-units/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      router.push('/business-units');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
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

  const bu = data.data;

  const canDelete =
    permission.canDelete &&
    bu._count.users === 0 &&
    bu._count.teams === 0 &&
    bu._count.clients === 0 &&
    bu.childBUs.length === 0;

  // Breadcrumb: grandparent → parent → current
  const breadcrumb = [
    bu.parentBU?.parentBU ?? null,
    bu.parentBU ? { id: bu.parentBU.id, name: bu.parentBU.name } : null,
    { id: bu.id, name: bu.name },
  ].filter(Boolean) as Array<{ id: string; name: string }>;

  // Build tree root from available parent data
  const leafChildren: TreeNode[] = bu.childBUs.map(c => ({
    ...c,
    _count: { users: c._count.users, teams: c._count.teams },
    childBUs: c.childBUs.map(gc => ({
      ...gc,
      _count: { users: gc._count.users, teams: 0 },
      childBUs: [],
    })),
  }));

  const currentNode: TreeNode = {
    id: bu.id,
    name: bu.name,
    isActive: bu.isActive,
    _count: { users: bu._count.users, teams: bu._count.teams },
    childBUs: leafChildren,
  };

  const treeRoot: TreeNode = bu.parentBU?.parentBU
    ? { ...bu.parentBU.parentBU, childBUs: [{ ...bu.parentBU, childBUs: [currentNode] }] }
    : bu.parentBU
      ? { ...bu.parentBU, childBUs: [currentNode] }
      : currentNode;

  const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'hierarchy', label: 'BU Tree' },
    { value: 'teams', label: `Teams (${bu._count.teams})` },
    { value: 'users', label: `Users (${bu._count.users})` },
    { value: 'clients', label: `Clients (${bu._count.clients})` },
    { value: 'requirements', label: `Requirements (${bu._count.requirements})` },
  ];

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-5">
        {/* Topbar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {permission.canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/business-units/${id}/edit`)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {permission.canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDelete(true)}
                disabled={!canDelete}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Hero */}
        <div className="rounded-xl border bg-card p-5">
          {breadcrumb.length > 1 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4 flex-wrap">
              {breadcrumb.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                  {b.id === id ? (
                    <span className="text-foreground font-medium">{b.name}</span>
                  ) : (
                    <button
                      className="hover:text-foreground transition-colors"
                      onClick={() => router.push(`/business-units/${b.id}`)}
                    >
                      {b.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight">{bu.name}</h1>
                <Badge
                  variant="outline"
                  className={
                    bu.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }
                >
                  <Circle
                    className={cn(
                      'h-1.5 w-1.5 mr-1.5 fill-current',
                      bu.isActive ? 'text-emerald-500' : 'text-red-400'
                    )}
                  />
                  {bu.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Created {fmtDate(bu.createdAt)}
                {bu.parentBU && (
                  <>
                    {' '}
                    · Under{' '}
                    <button
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                      onClick={() => router.push(`/business-units/${bu.parentBU!.id}`)}
                    >
                      {bu.parentBU.name}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto border-b">
            <TabsList className="w-full justify-start rounded-none bg-transparent h-auto p-0 gap-0 min-w-max">
              {TABS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-normal data-[state=active]:font-medium whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="m-0">
            <OverviewTab bu={bu} />
          </TabsContent>

          <TabsContent value="hierarchy" className="m-0 p-4">
            <div className="space-y-1">
              <HierarchyNode node={treeRoot} currentId={id} />
            </div>
          </TabsContent>

          <TabsContent value="teams" className="m-0">
            <TeamsTab teams={bu.teams} />
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="m-0">
            {bu.users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No active users</p>
            ) : (
              <>
                <div className="divide-y">
                  {bu.users.map((u: BUUserDetail) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[11px]">
                          {ini(u.firstName, u.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">
                          {u.firstName} {u.lastName}
                          {u.employeeId && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal font-mono">
                              {u.employeeId}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {u.role.name.replace(/_/g, ' ')}
                        </Badge>
                        {u.teamMemberships.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] text-muted-foreground max-w-[180px] truncate text-right cursor-default">
                                {u.teamMemberships.map(m => m.team.name).join(', ')}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              <div className="space-y-1.5">
                                {u.teamMemberships.map((m, i) => {
                                  const cfg = ROLE_CFG[m.teamRole];
                                  const Icon = cfg.icon;
                                  return (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <Icon className={cn('h-3 w-3', cfg.cls)} />
                                      <span className="font-medium">{m.team.name}</span>
                                      <span className="text-muted-foreground">({cfg.label})</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {bu._count.users > 50 && (
                  <p className="text-xs text-center text-muted-foreground py-3 border-t">
                    Showing 50 of {bu._count.users} users
                  </p>
                )}
              </>
            )}
          </TabsContent>

          {/* Clients */}
          <TabsContent value="clients" className="m-0">
            {bu.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No clients</p>
            ) : (
              <>
                <div className="divide-y">
                  {bu.clients.map((client: BUClientDetail) => (
                    <div
                      key={client.id}
                      className="flex items-start gap-3 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-semibold shrink-0">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium">{client.name}</span>
                          {client.category && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 text-muted-foreground"
                            >
                              {client.category}
                            </Badge>
                          )}
                        </div>
                        {client.industry && (
                          <p className="text-xs text-muted-foreground mb-1.5">{client.industry}</p>
                        )}
                        {client.handlers.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {client.handlers.map((h, i) => (
                              <span
                                key={i}
                                className="text-xs text-muted-foreground flex items-center gap-1.5"
                              >
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full shrink-0',
                                    h.role === 'PRIMARY'
                                      ? 'bg-blue-500'
                                      : h.role === 'SECONDARY'
                                        ? 'bg-violet-400'
                                        : 'bg-zinc-400'
                                  )}
                                />
                                {h.role.charAt(0) + h.role.slice(1).toLowerCase()}:{' '}
                                <span className="text-foreground font-medium">
                                  {h.user.firstName} {h.user.lastName}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            CLIENT_STATUS_CLS[client.status]
                          )}
                        >
                          {client.status}
                        </Badge>
                        {client._count.requirements > 0 ? (
                          <span className="text-xs font-medium text-blue-600">
                            {client._count.requirements} open req
                            {client._count.requirements !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No open reqs</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {bu._count.clients > 25 && (
                  <p className="text-xs text-center text-muted-foreground py-3 border-t">
                    Showing 25 of {bu._count.clients} clients
                  </p>
                )}
              </>
            )}
          </TabsContent>

          {/* Requirements */}
          <TabsContent value="requirements" className="m-0">
            {bu.requirements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No requirements</p>
            ) : (
              <>
                <div className="divide-y">
                  {bu.requirements.map((req: BURequirementDetail) => {
                    const salary = fmtSalary(req.salaryMin, req.salaryMax, req.salaryType);
                    const fillPct =
                      req.totalOpenings > 0
                        ? Math.round((req.filledOpenings / req.totalOpenings) * 100)
                        : 0;
                    return (
                      <div
                        key={req.id}
                        className={cn(
                          'flex items-start gap-3 px-5 py-4 hover:bg-muted/40 cursor-pointer transition-colors',
                          req.isRespondByBreached && 'border-l-2 border-l-destructive'
                        )}
                        onClick={() => setSelectedReq(req)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {req.reqCode}
                            </span>
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
                                <CalendarClock className="h-3 w-3" /> Due {fmtShort(req.respondBy)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
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
                          <ReqStatusBadge status={req.status} />
                          <PriorityBadge priority={req.priority} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {bu._count.requirements > 20 && (
                  <p className="text-xs text-center text-muted-foreground py-3 border-t">
                    Showing top 20 of {bu._count.requirements} requirements
                  </p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Req Sheet */}
        <ReqSheet req={selectedReq} open={!!selectedReq} onClose={() => setSelectedReq(null)} />

        {/* Delete dialog */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Business Unit</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-foreground">{bu.name}</span>?
                  {!canDelete && (
                    <p className="mt-2 text-destructive text-sm">
                      This BU still has users, teams, clients, or child BUs. Remove them first.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending || !canDelete}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
