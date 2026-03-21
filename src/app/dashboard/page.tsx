/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { requirementsApi } from '@/lib/requirements.api';
import { clientsApi } from '@/lib/clients.api';
import { teamsApi } from '@/lib/teams.api';
import PermissionGate from '@/components/ui/PermissionGate';
import Link from 'next/link';

interface Stats {
  totalRequirements: number;
  activeRequirements: number;
  totalClients: number;
  totalTeams: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRequirements, setRecentRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [reqRes, activeReqRes, clientRes, teamRes] = await Promise.allSettled([
          requirementsApi.getAll({ limit: 5 }),
          requirementsApi.getAll({ status: 'ACTIVE', limit: 1 }),
          clientsApi.getAll({ limit: 1 }),
          teamsApi.getAll({ limit: 1 }),
        ]);

        const reqs = reqRes.status === 'fulfilled' ? reqRes.value.data : null;
        const active = activeReqRes.status === 'fulfilled' ? activeReqRes.value.data : null;
        const clients = clientRes.status === 'fulfilled' ? clientRes.value.data : null;
        const teams = teamRes.status === 'fulfilled' ? teamRes.value.data : null;

        setRecentRequirements(reqs?.data ?? []);
        setStats({
          totalRequirements: reqs?.total ?? 0,
          activeRequirements: active?.total ?? 0,
          totalClients: clients?.total ?? 0,
          totalTeams: teams?.total ?? 0,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const firstName = user?.firstName ?? 'there';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold text-foreground tracking-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          Good to see you, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user?.role.name} · {user?.businessUnit?.name ?? 'TalentOS'}
        </p>
      </div>

      {/* Stats */}
      <PermissionGate module="requirements" action="canView">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total requirements" value={stats?.totalRequirements} loading={loading} />
          <StatCard
            label="Active requirements"
            value={stats?.activeRequirements}
            loading={loading}
            highlight
          />
          <PermissionGate module="clients" action="canView">
            <StatCard label="Total clients" value={stats?.totalClients} loading={loading} />
          </PermissionGate>
          <PermissionGate module="teams" action="canView">
            <StatCard label="Teams" value={stats?.totalTeams} loading={loading} />
          </PermissionGate>
        </div>
      </PermissionGate>

      {/* Recent requirements */}
      <PermissionGate module="requirements" action="canView">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent requirements</h2>
            <Link
              href="/requirements"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : recentRequirements.length === 0 ? (
            <EmptyState message="No requirements yet" />
          ) : (
            <div className="space-y-2">
              {recentRequirements.map(req => (
                <RequirementRow key={req.id} req={req} />
              ))}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  highlight,
}: {
  label: string;
  value?: number;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? 'border-primary/20 bg-primary/[0.04]' : 'border-border bg-card'}`}
    >
      {loading ? (
        <div className="h-7 w-12 bg-muted/40 rounded animate-pulse mb-1" />
      ) : (
        <p
          className={`text-2xl font-bold tracking-tight ${highlight ? 'text-primary' : 'text-foreground'}`}
          style={{ letterSpacing: '-0.03em' }}
        >
          {value ?? '—'}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function RequirementRow({ req }: { req: any }) {
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    PENDING_APPROVAL: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    ACTIVE: 'bg-green-500/10 text-green-600 dark:text-green-400',
    ON_HOLD: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    CLOSED: 'bg-muted text-muted-foreground',
    CANCELLED: 'bg-destructive/10 text-destructive',
  };

  return (
    <Link
      href={`/requirements/${req.id}`}
      className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-all duration-150"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{req.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {req.reqCode} · {req.client?.name ?? '—'}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-xs text-muted-foreground">
          {req.filledOpenings}/{req.totalOpenings} filled
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] ?? 'bg-muted text-muted-foreground'}`}
        >
          {req.status.replace('_', ' ').toLowerCase()}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-border">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
