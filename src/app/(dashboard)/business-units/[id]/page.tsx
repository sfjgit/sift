// File: page.tsx
// Path: src/app/business-units/[id]/page.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Briefcase,
  FileText,
  AlertTriangle,
  CalendarClock,
  X,
  ExternalLink,
  Users,
  TrendingUp,
  Circle,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type RequirementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
type ClientStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

interface SpocStub {
  isPrimary: boolean;
  handler: { id: string; firstName: string; lastName: string };
  serviceLine: { id: string; name: string };
}
interface ClientStub {
  id: string;
  name: string;
  industry: string | null;
  status: ClientStatus;
  spocs: SpocStub[];
  _count: { requirements: number };
}
interface RequirementStub {
  id: string;
  reqCode: string;
  title: string;
  status: RequirementStatus;
  priority: Priority;
  totalOpenings: number;
  filledOpenings: number;
  respondBy: string | null;
  isRespondByBreached: boolean;
  client: { id: string; name: string };
  serviceLine: { id: string; name: string } | null;
}
interface ChildBU {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  _count: { clients: number };
  childBUs: { id: string; name: string; isActive: boolean }[];
}
interface ParentBU {
  id: string;
  name: string;
  isActive: boolean;
  parentBU: { id: string; name: string } | null;
}
interface BUDetail {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  ancestorIds: string[];
  createdAt: string;
  parentBU: ParentBU | null;
  childBUs: ChildBU[];
  clients: ClientStub[];
  requirementsBU: RequirementStub[];
  reqBreakdown: Partial<Record<RequirementStatus, number>>;
  _count: { clients: number; requirementsBU: number; clientSpocs: number };
}
interface BUDetailResponse {
  success: boolean;
  data: BUDetail;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// ─── Style config ─────────────────────────────────────────────────────────────

const REQ_STYLE: Record<RequirementStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  DRAFT: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  ON_HOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CLOSED: 'bg-zinc-600/10 text-zinc-500 border-zinc-600/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  PENDING_APPROVAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};
const REQ_DOT: Record<RequirementStatus, string> = {
  ACTIVE: 'bg-emerald-400',
  DRAFT: 'bg-zinc-500',
  ON_HOLD: 'bg-amber-400',
  CLOSED: 'bg-zinc-600',
  CANCELLED: 'bg-red-400',
  PENDING_APPROVAL: 'bg-blue-400',
};
const REQ_BAR: Record<RequirementStatus, string> = {
  ACTIVE: 'bg-emerald-400',
  PENDING_APPROVAL: 'bg-blue-400',
  ON_HOLD: 'bg-amber-400',
  DRAFT: 'bg-zinc-600',
  CLOSED: 'bg-zinc-500',
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
const PRI_STYLE: Record<Priority, string> = {
  HIGH: 'bg-red-500/10 text-red-400 border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  LOW: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};
const CLIENT_STATUS: Record<ClientStatus, { cls: string; dot: string }> = {
  ACTIVE: {
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  PENDING: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  INACTIVE: { cls: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20', dot: 'bg-zinc-500' },
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2 w-2',
          active ? 'bg-emerald-400' : 'bg-zinc-600'
        )}
      />
    </span>
  );
}

function ReqBadge({ status }: { status: RequirementStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border',
        REQ_STYLE[status]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', REQ_DOT[status])} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function PriBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide',
        PRI_STYLE[priority]
      )}
    >
      {priority}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border p-5 flex flex-col gap-3 overflow-hidden',
        accent ? 'border-red-500/30 bg-red-500/5' : 'border-border/50 bg-card/50 backdrop-blur-sm'
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl',
            accent ? 'bg-red-500/15' : 'bg-muted/60'
          )}
        >
          <Icon className={cn('h-4 w-4', accent ? 'text-red-400' : 'text-muted-foreground')} />
        </div>
        <span
          className={cn('text-xs font-medium', accent ? 'text-red-400' : 'text-muted-foreground')}
        >
          {label}
        </span>
      </div>
      <div>
        <p
          className={cn(
            'text-4xl font-bold tabular-nums tracking-tight leading-none',
            accent && Number(value) > 0 && 'text-red-400'
          )}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Req Sheet ────────────────────────────────────────────────────────────────

function ReqSheet({
  req,
  open,
  onClose,
}: {
  req: RequirementStub | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!req) return null;
  const fillPct =
    req.totalOpenings > 0 ? Math.round((req.filledOpenings / req.totalOpenings) * 100) : 0;
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l border-border/60 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="pb-5 border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono text-muted-foreground mb-1.5 tracking-wider">
                {req.reqCode}
              </p>
              <SheetTitle className="text-lg leading-snug font-semibold">{req.title}</SheetTitle>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors mt-1 p-1 rounded-lg hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>
        <div className="pt-6 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <ReqBadge status={req.status} />
            <PriBadge priority={req.priority} />
            {req.isRespondByBreached && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                <AlertTriangle className="h-3 w-3" /> Deadline breached
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Client', value: req.client.name },
              req.serviceLine ? { label: 'Service line', value: req.serviceLine.name } : null,
              { label: 'Openings', value: `${req.filledOpenings} / ${req.totalOpenings} filled` },
              req.respondBy
                ? {
                    label: 'Respond by',
                    value: fmtDate(req.respondBy),
                    danger: req.isRespondByBreached,
                  }
                : null,
            ]
              .filter(Boolean)
              .map((item: any) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-muted/30 border border-border/40 p-3.5"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
                    {item.label}
                  </p>
                  <p className={cn('text-sm font-semibold', item.danger && 'text-red-400')}>
                    {item.value}
                  </p>
                </div>
              ))}
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Fill progress</span>
              <span className="font-bold tabular-nums">{fillPct}%</span>
            </div>
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  fillPct >= 100 ? 'bg-emerald-400' : 'bg-blue-400'
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
          <Separator className="bg-border/40" />
          <Button
            variant="outline"
            size="sm"
            className="w-full border-border/60 hover:bg-muted/50"
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

// ─── Hierarchy tree ───────────────────────────────────────────────────────────

type TreeNode = { id: string; name: string; isActive: boolean; childBUs?: TreeNode[] };

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
          'group flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm transition-all cursor-pointer select-none',
          isCurrent
            ? 'bg-primary/10 text-primary border border-primary/20 font-medium'
            : 'hover:bg-muted/40 text-foreground border border-transparent'
        )}
        style={{ marginLeft: depth > 0 ? `${depth * 24}px` : undefined }}
        onClick={() => !isCurrent && router.push(`/business-units/${node.id}`)}
      >
        <button
          className={cn(
            'shrink-0 text-muted-foreground hover:text-foreground',
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
        <StatusDot active={node.isActive} />
        <span className="flex-1 truncate">{node.name}</span>
        {isCurrent && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5"
          >
            current
          </Badge>
        )}
      </div>
      {hasChildren && open && (
        <div className="relative mt-0.5" style={{ marginLeft: `${(depth + 1) * 24 + 14}px` }}>
          <div className="absolute left-0 top-1 bottom-2 w-px bg-border/40" />
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

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ bu }: { bu: BUDetail }) {
  const router = useRouter();
  const totalReqs = bu._count.requirementsBU;
  const totalOpenings = bu.requirementsBU.reduce((s, r) => s + r.totalOpenings, 0);
  const filledOpenings = bu.requirementsBU.reduce((s, r) => s + r.filledOpenings, 0);
  const fillRate = totalOpenings > 0 ? Math.round((filledOpenings / totalOpenings) * 100) : 0;
  const breached = bu.requirementsBU.filter(r => r.isRespondByBreached).length;
  const breakdown = REQ_ORDER.map(s => ({ s, n: bu.reqBreakdown[s] ?? 0 })).filter(e => e.n > 0);

  return (
    <div className="p-6 space-y-8">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Briefcase}
          label="Clients"
          value={bu._count.clients}
          sub={`${bu._count.clientSpocs} active spocs`}
        />
        <StatCard
          icon={FileText}
          label="Requirements"
          value={totalReqs}
          sub={`${bu.reqBreakdown['ACTIVE'] ?? 0} active`}
        />
        <StatCard
          icon={TrendingUp}
          label="Fill rate"
          value={`${fillRate}%`}
          sub={`${filledOpenings}/${totalOpenings} openings`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Breached"
          value={breached}
          sub="deadline breached"
          accent={breached > 0}
        />
      </div>

      {/* Fill rate bar */}
      {totalOpenings > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Overall fill progress</p>
            <span className="text-2xl font-bold tabular-nums">{fillRate}%</span>
          </div>
          <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                fillRate >= 100 ? 'bg-emerald-400' : 'bg-blue-400'
              )}
              style={{ width: `${Math.min(fillRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {filledOpenings} of {totalOpenings} openings filled across all requirements
          </p>
        </div>
      )}

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <p className="text-sm font-semibold">Requirements by status</p>
          <div className="space-y-3">
            {breakdown.map(({ s, n }) => (
              <div key={s} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <ReqBadge status={s} />
                </div>
                <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', REQ_BAR[s])}
                    style={{ width: `${totalReqs > 0 ? Math.round((n / totalReqs) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums w-6 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-units */}
      {bu.childBUs.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            Sub-units{' '}
            <span className="text-muted-foreground font-normal ml-1">({bu.childBUs.length})</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bu.childBUs.map(child => (
              <button
                key={child.id}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border/50 hover:border-border bg-card/50 hover:bg-muted/30 transition-all text-left"
                onClick={() => router.push(`/business-units/${child.id}`)}
              >
                <StatusDot active={child.isActive} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{child.name}</p>
                  {child.code && (
                    <p className="text-[11px] font-mono text-muted-foreground">{child.code}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{child._count.clients}c</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BUDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const permission = usePermission('business_units');
  const [showDelete, setShowDelete] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RequirementStub | null>(null);

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
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
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
    bu._count.clients === 0 &&
    bu._count.requirementsBU === 0 &&
    bu.childBUs.length === 0;

  const breadcrumb = [
    bu.parentBU?.parentBU ?? null,
    bu.parentBU ? { id: bu.parentBU.id, name: bu.parentBU.name } : null,
    { id: bu.id, name: bu.name },
  ].filter(Boolean) as Array<{ id: string; name: string }>;

  const currentNode: TreeNode = {
    id: bu.id,
    name: bu.name,
    isActive: bu.isActive,
    childBUs: bu.childBUs.map(c => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      childBUs: c.childBUs.map(gc => ({
        id: gc.id,
        name: gc.name,
        isActive: gc.isActive,
        childBUs: [],
      })),
    })),
  };
  const treeRoot: TreeNode = bu.parentBU?.parentBU
    ? {
        ...(bu.parentBU.parentBU as any),
        isActive: true,
        childBUs: [{ ...bu.parentBU, childBUs: [currentNode] }],
      }
    : bu.parentBU
      ? { ...bu.parentBU, childBUs: [currentNode] }
      : currentNode;

  const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'hierarchy', label: 'BU Tree' },
    { value: 'clients', label: 'Clients', count: bu._count.clients },
    { value: 'requirements', label: 'Requirements', count: bu._count.requirementsBU },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-5">
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {permission.canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/business-units/${id}/edit`)}
              className="border-border/60 hover:bg-muted/50 gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
          {permission.canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDelete(true)}
              disabled={!canDelete}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent pointer-events-none" />

        <div className="relative p-6">
          {/* Breadcrumb */}
          {breadcrumb.length > 1 && (
            <div className="flex items-center gap-1 mb-5 flex-wrap">
              {breadcrumb.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
                  {b.id === id ? (
                    <span className="text-xs font-medium text-foreground">{b.name}</span>
                  ) : (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => router.push(`/business-units/${b.id}`)}
                    >
                      {b.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-start gap-5">
            {/* Icon */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
              <Building2 className="h-7 w-7 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold tracking-tight">{bu.name}</h1>
                    {bu.code && (
                      <code className="text-xs text-muted-foreground bg-muted border border-border/60 px-2 py-0.5 rounded-lg font-mono">
                        {bu.code}
                      </code>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
                        bu.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      )}
                    >
                      <StatusDot active={bu.isActive} />
                      {bu.isActive ? 'Active' : 'Inactive'}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Created {fmtDate(bu.createdAt)}
                      {bu.parentBU && (
                        <>
                          {' '}
                          · Under{' '}
                          <button
                            className="underline-offset-2 hover:underline hover:text-foreground transition-colors"
                            onClick={() => router.push(`/business-units/${bu.parentBU!.id}`)}
                          >
                            {bu.parentBU.name}
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat pills */}
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                {[
                  {
                    icon: Briefcase,
                    value: bu._count.clients,
                    label: bu._count.clients === 1 ? 'client' : 'clients',
                  },
                  {
                    icon: FileText,
                    value: bu._count.requirementsBU,
                    label: bu._count.requirementsBU === 1 ? 'requirement' : 'requirements',
                  },
                  {
                    icon: Users,
                    value: bu._count.clientSpocs,
                    label: bu._count.clientSpocs === 1 ? 'spoc' : 'spocs',
                  },
                  ...(bu.childBUs.length > 0
                    ? [
                        {
                          icon: Building2,
                          value: bu.childBUs.length,
                          label: bu.childBUs.length === 1 ? 'sub-unit' : 'sub-units',
                        },
                      ]
                    : []),
                ].map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">{value}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <Tabs defaultValue="overview">
          <div className="border-b border-border/50 px-2 overflow-x-auto">
            <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none min-w-max">
              {TABS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative rounded-none h-12 px-4 text-sm font-normal text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-medium data-[state=active]:shadow-none bg-transparent data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary transition-all gap-2"
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground tabular-nums">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="m-0">
            <OverviewTab bu={bu} />
          </TabsContent>

          <TabsContent value="hierarchy" className="m-0 p-6">
            <div className="space-y-1">
              <HierarchyNode node={treeRoot} currentId={id} />
            </div>
          </TabsContent>

          {/* Clients */}
          <TabsContent value="clients" className="m-0">
            {bu.clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No clients in this BU</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/40">
                  {bu.clients.map(client => {
                    const statusCfg = CLIENT_STATUS[client.status];
                    return (
                      <div
                        key={client.id}
                        className="group flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-sm font-bold shrink-0 border border-border/40">
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-0.5 group-hover:text-primary transition-colors">
                            {client.name}
                          </p>
                          {client.industry && (
                            <p className="text-xs text-muted-foreground mb-2">{client.industry}</p>
                          )}
                          {client.spocs.length > 0 && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {client.spocs.map((spoc, i) => (
                                <span
                                  key={i}
                                  className="text-xs text-muted-foreground flex items-center gap-1.5"
                                >
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 rounded-full',
                                      spoc.isPrimary ? 'bg-primary' : 'bg-muted-foreground/40'
                                    )}
                                  />
                                  <span className="font-medium text-foreground">
                                    {spoc.handler.firstName} {spoc.handler.lastName}
                                  </span>
                                  {spoc.serviceLine && <span>· {spoc.serviceLine.name}</span>}
                                  {spoc.isPrimary && (
                                    <span className="text-[10px] text-primary font-medium">
                                      Primary
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border',
                              statusCfg.cls
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                            {client.status}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              client._count.requirements > 0
                                ? 'text-blue-400'
                                : 'text-muted-foreground'
                            )}
                          >
                            {client._count.requirements > 0
                              ? `${client._count.requirements} open req${client._count.requirements !== 1 ? 's' : ''}`
                              : 'No open reqs'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {bu._count.clients > 25 && (
                  <div className="px-6 py-3 border-t border-border/40 text-xs text-muted-foreground text-center">
                    Showing 25 of {bu._count.clients} clients
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Requirements */}
          <TabsContent value="requirements" className="m-0">
            {bu.requirementsBU.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No requirements</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/40">
                  {bu.requirementsBU.map(req => {
                    const fillPct =
                      req.totalOpenings > 0
                        ? Math.round((req.filledOpenings / req.totalOpenings) * 100)
                        : 0;
                    return (
                      <div
                        key={req.id}
                        className={cn(
                          'group flex items-start gap-4 px-6 py-4 hover:bg-muted/20 cursor-pointer transition-colors',
                          req.isRespondByBreached && 'border-l-2 border-l-red-500/60'
                        )}
                        onClick={() => setSelectedReq(req)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <code className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                              {req.reqCode}
                            </code>
                            {req.isRespondByBreached && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-medium">
                                <AlertTriangle className="h-3 w-3" /> Breached
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors mb-1.5">
                            {req.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>{req.client.name}</span>
                            {req.serviceLine && (
                              <>
                                <span>·</span>
                                <span>{req.serviceLine.name}</span>
                              </>
                            )}
                            {req.respondBy && (
                              <span className="flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" /> {fmtShort(req.respondBy)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2.5">
                            <div className="w-24 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  fillPct >= 100
                                    ? 'bg-emerald-400'
                                    : fillPct > 0
                                      ? 'bg-blue-400'
                                      : 'bg-muted-foreground/20'
                                )}
                                style={{ width: `${Math.min(fillPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
                              {req.filledOpenings}/{req.totalOpenings}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <ReqBadge status={req.status} />
                          <PriBadge priority={req.priority} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {bu._count.requirementsBU > 20 && (
                  <div className="px-6 py-3 border-t border-border/40 text-xs text-muted-foreground text-center">
                    Showing top 20 of {bu._count.requirementsBU} requirements
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ReqSheet req={selectedReq} open={!!selectedReq} onClose={() => setSelectedReq(null)} />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Business Unit</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">{bu.name}</span>?
                {!canDelete && (
                  <p className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    This BU still has clients, requirements, or child BUs. Remove them first.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || !canDelete}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
