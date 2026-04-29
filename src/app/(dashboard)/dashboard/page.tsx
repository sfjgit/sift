/* eslint-disable react/no-unescaped-entities */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ReqStatus = 'ACTIVE' | 'DRAFT' | 'PENDING_APPROVAL' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

interface DashboardStats {
  totalRequirements: number;
  active: number;
  pendingApproval: number;
  draft: number;
  onHold: number;
  closed: number;
  cancelled: number;
  breached: number;
  thisWeek: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

interface RecentReq {
  id: string;
  reqCode: string;
  title: string;
  status: ReqStatus;
  priority: Priority;
  totalOpenings: number;
  filledOpenings: number;
  respondBy?: string | null;
  isRespondByBreached: boolean;
  createdAt: string;
  client: { id: string; name: string };
  businessUnit?: { id: string; name: string } | null;
}

interface MyAssignment {
  id: string;
  assignmentType: string;
  allocatedOpenings: number;
  filledOpenings: number;
  submissionsCount: number;
  deadline?: string | null;
  breachedAt?: string | null;
  team?: { id: string; name: string } | null;
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: ReqStatus;
    priority: Priority;
    client: { id: string; name: string };
  };
}

interface UpcomingDeadline {
  id: string;
  reqCode: string;
  title: string;
  priority: Priority;
  respondBy: string;
  isRespondByBreached: boolean;
  totalOpenings: number;
  filledOpenings: number;
  client: { id: string; name: string };
}

interface TopClient {
  id: string;
  name: string;
  status: string;
  industry?: string | null;
  _count: { requirements: number };
}

interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string };
  requirement: { id: string; reqCode: string; title: string };
}

interface DashboardData {
  stats: DashboardStats;
  recentRequirements: RecentReq[];
  myAssignments: MyAssignment[];
  upcomingDeadlines: UpcomingDeadline[];
  topClients: TopClient[];
  recentActivity: ActivityItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CLS: Record<ReqStatus, string> = {
  ACTIVE:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  PENDING_APPROVAL:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400',
  ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400',
  CLOSED: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400',
};

const PRI_CLS: Record<Priority, string> = {
  HIGH: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/50 dark:text-red-400',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  LOW: 'text-zinc-500 bg-zinc-50 border-zinc-200',
};

const PRI_DOT: Record<Priority, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-zinc-400',
};

function StatusBadge({ status }: { status: ReqStatus }) {
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', STATUS_CLS[status])}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function PriBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', PRI_CLS[priority])}>
      {priority}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  alert,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border p-4 transition-colors',
        alert && value > 0 ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30 border-border',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
    >
      <span
        className={cn('text-xs text-muted-foreground', alert && value > 0 && 'text-destructive')}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-3xl font-bold tabular-nums leading-none',
          alert && value > 0 && 'text-destructive'
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const axios = useAxios();
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{ success: boolean; data: DashboardData }>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await axios.get('/dashboard/summary')).data,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <DashboardSkeleton />;

  const d = data?.data;
  if (!d) return <div className="p-6 text-sm text-muted-foreground">Failed to load dashboard.</div>;

  const { stats } = d;
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">
          {greeting()}
          {user?.firstName ? `, ${user.firstName}` : ''} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's what's happening across your requirements today.
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Active"
          value={stats.active}
          sub="requirements"
          onClick={() => router.push('/requirements?status=ACTIVE')}
        />
        <StatCard
          label="Pending approval"
          value={stats.pendingApproval}
          sub="awaiting review"
          onClick={() => router.push('/requirements?status=PENDING_APPROVAL')}
        />
        <StatCard
          label="Breached"
          value={stats.breached}
          sub="deadline passed"
          alert
          onClick={() => router.push('/requirements?breached=true')}
        />
        <StatCard label="This week" value={stats.thisWeek} sub="newly created" />
        <StatCard
          label="Draft"
          value={stats.draft}
          onClick={() => router.push('/requirements?status=DRAFT')}
        />
        <StatCard
          label="On hold"
          value={stats.onHold}
          onClick={() => router.push('/requirements?status=ON_HOLD')}
        />
        <StatCard
          label="High priority"
          value={stats.highPriority}
          sub="active reqs"
          alert
          onClick={() => router.push('/requirements?status=ACTIVE&priority=HIGH')}
        />
        <StatCard label="Total" value={stats.totalRequirements} sub="all time" />
      </div>

      <Separator />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent requirements — 2/3 width */}
        <div className="lg:col-span-2 rounded-xl border bg-card flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Recent requirements</h2>
            <button
              onClick={() => router.push('/requirements')}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y">
            {d.recentRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No requirements yet</p>
            ) : (
              d.recentRequirements.map(req => (
                <div
                  key={req.id}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/requirements/${req.id}`)}
                >
                  <span
                    className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', PRI_DOT[req.priority])}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {req.reqCode}
                      </span>
                      {req.isRespondByBreached && (
                        <span className="text-[10px] text-destructive font-medium">⚠ Breached</span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-1">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {req.client.name}
                      {req.businessUnit && ` · ${req.businessUnit.name}`}
                      {' · '}
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={req.status} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {req.filledOpenings}/{req.totalOpenings} filled
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Upcoming deadlines */}
          <div className="rounded-xl border bg-card flex flex-col">
            <div className="px-4 py-3.5 border-b">
              <h2 className="text-sm font-semibold">Due in 7 days</h2>
            </div>
            {d.upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No upcoming deadlines
              </p>
            ) : (
              <div className="divide-y">
                {d.upcomingDeadlines.map(req => (
                  <div
                    key={req.id}
                    className="flex items-start gap-2.5 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/requirements/${req.id}`)}
                  >
                    <span
                      className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', PRI_DOT[req.priority])}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{req.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{req.client.name}</p>
                    </div>
                    <span
                      className={cn(
                        'text-[11px] shrink-0 font-medium tabular-nums',
                        req.isRespondByBreached ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {format(new Date(req.respondBy), 'dd MMM')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top clients */}
          <div className="rounded-xl border bg-card flex flex-col">
            <div className="px-4 py-3.5 border-b">
              <h2 className="text-sm font-semibold">Top clients</h2>
            </div>
            {d.topClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No clients</p>
            ) : (
              <div className="divide-y">
                {d.topClients.map(client => (
                  <div
                    key={client.id}
                    className="flex items-center gap-2.5 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-[11px] font-semibold shrink-0">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{client.name}</p>
                      {client.industry && (
                        <p className="text-[11px] text-muted-foreground">{client.industry}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
                      {client._count.requirements} req{client._count.requirements !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My assignments — only if any */}
      {d.myAssignments.length > 0 && (
        <div className="rounded-xl border bg-card flex flex-col">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">My assignments</h2>
          </div>
          <div className="divide-y">
            {d.myAssignments.map(a => (
              <div
                key={a.id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => router.push(`/requirements/${a.requirement.id}`)}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0 mt-1.5',
                    PRI_DOT[a.requirement.priority]
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{a.requirement.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.requirement.client.name}
                    {a.team && ` · ${a.team.name}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {a.filledOpenings}/{a.allocatedOpenings} filled
                  </span>
                  {a.deadline && (
                    <span
                      className={cn(
                        'text-[11px] tabular-nums',
                        a.breachedAt ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      Due {format(new Date(a.deadline), 'dd MMM')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity feed */}
      {d.recentActivity.length > 0 && (
        <div className="rounded-xl border bg-card flex flex-col">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          <ScrollArea className="max-h-72">
            <div className="flex flex-col px-5 py-2">
              {d.recentActivity.map((a, i) => (
                <div key={a.id} className="flex gap-3 py-2.5">
                  <div className="flex flex-col items-center pt-1 shrink-0">
                    <div className="h-2 w-2 rounded-full bg-border ring-2 ring-background" />
                    {i < d.recentActivity.length - 1 && (
                      <div className="flex-1 w-px bg-border/50 mt-1" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{a.summary}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <button
                        onClick={() => router.push(`/requirements/${a.requirement.id}`)}
                        className="font-mono hover:text-foreground hover:underline"
                      >
                        {a.requirement.reqCode}
                      </button>
                      <span>·</span>
                      <span>
                        {a.actor.firstName} {a.actor.lastName}
                      </span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
