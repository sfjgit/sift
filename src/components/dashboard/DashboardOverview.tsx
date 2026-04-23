/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAxios } from '@/hooks/useAxios';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, Briefcase, Building2, Layers, TrendingUp } from 'lucide-react';

// ─────────────────────────────────────────
// TYPES — all fields optional for safety
// ─────────────────────────────────────────

interface TeamHeadcount {
  id?: string;
  name?: string;
  category?: string | null;
  businessUnit?: string | null;
  memberCount?: number;
}

interface DashboardData {
  totals?: { requirements?: number; clients?: number; users?: number; teams?: number };
  requirements?: {
    byStatus?: { status?: string; count?: number }[];
    byPriority?: { priority?: string; count?: number }[];
    byJobType?: { jobType?: string; count?: number }[];
    byRemoteType?: { remoteType?: string; count?: number }[];
  };
  clients?: { byStatus?: { status?: string; count?: number }[] };
  users?: { byRole?: { roleId?: string; roleName?: string; count?: number }[] };
  teams?: {
    byCategory?: { category?: string | null; count?: number }[];
    headcounts?: TeamHeadcount[];
  };
  pipeline?: {
    totalOpenings?: number;
    filledOpenings?: number;
    activeApplications?: number;
    interviewsScheduled?: number;
    offersRolledOut?: number;
  };
  recentRequirements?: {
    id?: string;
    reqCode?: string;
    title?: string;
    status?: string;
    priority?: string;
    jobType?: string;
    remoteType?: string;
    totalOpenings?: number;
    filledOpenings?: number;
    createdAt?: string;
    client?: { name?: string };
    createdBy?: { firstName?: string; lastName?: string };
    businessUnit?: { name?: string } | null;
  }[];
}

// ─────────────────────────────────────────
// NORMALIZER — converts raw API shape into safe, fully-present shape
// handles both { data: { totals, ... } } and { totals, ... } response wrappers
// ─────────────────────────────────────────

interface SafeData {
  totals: { requirements: number; clients: number; users: number; teams: number };
  requirements: {
    byStatus: { name: string; value: number; fill: string }[];
    byPriority: { name: string; value: number; fill: string }[];
    byJobType: { name: string; value: number; fill: string }[];
    byRemoteType: { name: string; value: number; fill: string }[];
  };
  clients: { byStatus: { name: string; value: number; fill: string }[] };
  users: { byRole: { name: string; value: number; fill: string }[] };
  teams: {
    byCategory: { category: string; count: number }[];
    headcounts: Required<TeamHeadcount>[];
  };
  pipeline: {
    totalOpenings: number;
    filledOpenings: number;
    activeApplications: number;
    interviewsScheduled: number;
    offersRolledOut: number;
  };
  recentRequirements: Required<NonNullable<DashboardData['recentRequirements']>>[number][];
}

const STATUS_HEX: Record<string, string> = {
  DRAFT: '#888780',
  PENDING_APPROVAL: '#EF9F27',
  ACTIVE: '#1D9E75',
  ON_HOLD: '#7F77DD',
  CLOSED: '#378ADD',
  CANCELLED: '#E24B4A',
};
const PRIORITY_HEX: Record<string, string> = {
  LOW: '#1D9E75',
  MEDIUM: '#EF9F27',
  HIGH: '#E24B4A',
};
const JOBTYPE_HEX: Record<string, string> = {
  PERMANENT: '#378ADD',
  CONTRACT: '#7F77DD',
  CONTRACT_TO_HIRE: '#1D9E75',
  FREELANCE: '#EF9F27',
};
const REMOTE_HEX: Record<string, string> = {
  ONSITE: '#378ADD',
  REMOTE: '#1D9E75',
  HYBRID: '#7F77DD',
};
const CLIENT_HEX: Record<string, string> = {
  PENDING: '#EF9F27',
  ACTIVE: '#1D9E75',
  INACTIVE: '#888780',
};
const CATEGORY_HEX: Record<string, string> = {
  DELIVERY: '#1D9E75',
  SALES: '#378ADD',
  SUPPORT: '#7F77DD',
  MANAGEMENT: '#888780',
};
const ROLE_HEX: Record<string, string> = {
  SUPER_ADMIN: '#E24B4A',
  ADMIN: '#7F77DD',
  DELIVERY_MANAGER: '#EF9F27',
  TEAM_LEAD: '#378ADD',
  RECRUITER: '#1D9E75',
  SALES: '#D4537E',
};
const FB = '#888780'; // fallback hex

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' },
  PENDING_APPROVAL: { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  ACTIVE: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)' },
  ON_HOLD: { bg: '#EEEDFE', color: '#534AB7' },
  CLOSED: { bg: 'var(--color-background-info)', color: 'var(--color-text-info)' },
  CANCELLED: { bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)' },
};
const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  LOW: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)' },
  MEDIUM: { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  HIGH: { bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)' },
};
const FALLBACK_STYLE = {
  bg: 'var(--color-background-secondary)',
  color: 'var(--color-text-secondary)',
};

function normalize(raw: DashboardData | undefined | null): SafeData {
  const r = raw ?? {};
  const n = (v: number | undefined | null) => v ?? 0;
  const s = (v: string | undefined | null) => v ?? '';

  return {
    totals: {
      requirements: n(r.totals?.requirements),
      clients: n(r.totals?.clients),
      users: n(r.totals?.users),
      teams: n(r.totals?.teams),
    },
    requirements: {
      byStatus: (r.requirements?.byStatus ?? []).map(x => ({
        name: s(x.status),
        value: n(x.count),
        fill: STATUS_HEX[s(x.status)] ?? FB,
      })),
      byPriority: (r.requirements?.byPriority ?? []).map(x => ({
        name: s(x.priority),
        value: n(x.count),
        fill: PRIORITY_HEX[s(x.priority)] ?? FB,
      })),
      byJobType: (r.requirements?.byJobType ?? []).map(x => ({
        name: s(x.jobType),
        value: n(x.count),
        fill: JOBTYPE_HEX[s(x.jobType)] ?? FB,
      })),
      byRemoteType: (r.requirements?.byRemoteType ?? []).map(x => ({
        name: s(x.remoteType),
        value: n(x.count),
        fill: REMOTE_HEX[s(x.remoteType)] ?? FB,
      })),
    },
    clients: {
      byStatus: (r.clients?.byStatus ?? []).map(x => ({
        name: s(x.status),
        value: n(x.count),
        fill: CLIENT_HEX[s(x.status)] ?? FB,
      })),
    },
    users: {
      byRole: (r.users?.byRole ?? []).map(x => ({
        name: s(x.roleName),
        value: n(x.count),
        fill: ROLE_HEX[s(x.roleName)] ?? FB,
      })),
    },
    teams: {
      byCategory: (r.teams?.byCategory ?? []).map(x => ({
        category: s(x.category),
        count: n(x.count),
      })),
      headcounts: (r.teams?.headcounts ?? []).map(x => ({
        id: s(x.id) || s(x.name) || Math.random().toString(),
        name: s(x.name) || 'Unnamed Team',
        category: x.category ?? null,
        businessUnit: x.businessUnit ?? null,
        memberCount: n(x.memberCount),
      })),
    },
    pipeline: {
      totalOpenings: n(r.pipeline?.totalOpenings),
      filledOpenings: n(r.pipeline?.filledOpenings),
      activeApplications: n(r.pipeline?.activeApplications),
      interviewsScheduled: n(r.pipeline?.interviewsScheduled),
      offersRolledOut: n(r.pipeline?.offersRolledOut),
    },
    recentRequirements: (r.recentRequirements ?? []).map(x => ({
      id: s(x.id) || Math.random().toString(),
      reqCode: s(x.reqCode),
      title: s(x.title) || 'Untitled',
      status: s(x.status),
      priority: s(x.priority),
      jobType: s(x.jobType),
      remoteType: s(x.remoteType),
      totalOpenings: n(x.totalOpenings),
      filledOpenings: n(x.filledOpenings),
      createdAt: s(x.createdAt),
      client: { name: s(x.client?.name) || 'Unknown client' },
      createdBy: { firstName: s(x.createdBy?.firstName), lastName: s(x.createdBy?.lastName) },
      businessUnit: x.businessUnit ? { name: s(x.businessUnit.name) } : null,
    })),
  };
}

// ─────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-6">
      <p className="text-[12px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  if (!label) return null;
  return (
    <span
      style={{
        background: style.bg || FALLBACK_STYLE.bg,
        color: style.color || FALLBACK_STYLE.color,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 7px',
        borderRadius: 4,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        textTransform: 'capitalize',
      }}
    >
      {label.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hex,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  hex: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: hex + '18' }}
      >
        <Icon size={16} style={{ color: hex }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest leading-none mb-1.5">
          {label}
        </p>
        <p className="text-2xl font-semibold text-foreground leading-none">
          {(value ?? 0).toLocaleString()}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <p className="text-[13px] font-medium text-foreground mb-4 leading-none">{title}</p>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-sm">
      <p className="text-[12px] font-medium text-foreground mb-1">
        {(label || payload[0]?.name || '').toString().replace(/_/g, ' ').toLowerCase()}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px]" style={{ color: p.fill || p.color || FB }}>
          {p.value ?? 0}
        </p>
      ))}
    </div>
  );
}

function HBar({
  label,
  value,
  max,
  hex,
}: {
  label: string;
  value: number;
  max: number;
  hex: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, Math.round(((value ?? 0) / safeMax) * 100)));
  return (
    <div className="flex items-center gap-2.5 mb-2.5 last:mb-0">
      <span className="text-[11px] text-muted-foreground w-28 flex-shrink-0 truncate capitalize">
        {(label ?? '').replace(/_/g, ' ').toLowerCase() || '—'}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-border">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: hex || FB }}
        />
      </div>
      <span className="text-[11px] font-medium text-foreground w-5 text-right flex-shrink-0">
        {value ?? 0}
      </span>
    </div>
  );
}

function DonutWithLegend({ data }: { data: { name: string; value: number; fill: string }[] }) {
  const filtered = (data ?? []).filter(d => (d?.value ?? 0) > 0);
  const total = filtered.reduce((s, d) => s + (d.value ?? 0), 0);
  if (filtered.length === 0) return <EmptyState label="No data yet" />;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0" style={{ width: 130, height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={58}
              paddingAngle={2}
            >
              {filtered.map((e, i) => (
                <Cell key={i} fill={e.fill || FB} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {filtered.map(item => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: item.fill || FB }}
            />
            <span className="text-[11px] text-muted-foreground capitalize flex-1 truncate">
              {(item.name ?? '').replace(/_/g, ' ').toLowerCase() || '—'}
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {total > 0 ? Math.round(((item.value ?? 0) / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamRow({ team, maxCount }: { team: Required<TeamHeadcount>; maxCount: number }) {
  const name = team.name || 'Unknown';
  const initials =
    name
      .split(' ')
      .map(w => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const hex = CATEGORY_HEX[team.category ?? ''] ?? FB;
  const safeMax = maxCount > 0 ? maxCount : 1;
  const pct = Math.min(100, Math.round(((team.memberCount ?? 0) / safeMax) * 100));

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
        style={{ background: hex + '20', color: hex }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-foreground truncate">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[10px] px-1.5 rounded-sm font-medium capitalize"
            style={{ background: hex + '18', color: hex }}
          >
            {(team.category ?? 'N/A').toLowerCase()}
          </span>
          {team.businessUnit && (
            <span className="text-[10px] text-muted-foreground">{team.businessUnit}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: hex }} />
        </div>
        <span className="text-[12px] font-medium text-foreground w-4 text-right">
          {team.memberCount ?? 0}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

export default function DashboardOverview() {
  const api = useAxios();
  const params = useParams();
  const buId = params?.buId as string | undefined;

  const {
    data: raw,
    isLoading,
    isError,
  } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary', buId ?? 'all'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary', {
        params: buId ? { buId } : {},
      });
      // Handle both { data: {...} } and bare {...} shapes
      const body = res?.data ?? {};
      return body?.data ?? body;
    },
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Failed to load dashboard data.
      </div>
    );

  // Always safe after normalize — no optional chaining needed below this line
  const d = normalize(raw);

  const maxStatusCount =
    d.requirements.byStatus.length > 0 ? Math.max(...d.requirements.byStatus.map(r => r.value)) : 1;
  const maxTeamCount =
    d.teams.headcounts.length > 0
      ? Math.max(...d.teams.headcounts.map(t => t.memberCount ?? 0))
      : 1;

  const { pipeline, totals } = d;

  const fillRate =
    pipeline.totalOpenings > 0
      ? Math.round((pipeline.filledOpenings / pipeline.totalOpenings) * 100)
      : 0;

  // Safe derived sub-labels
  const activeReqCount = d.requirements.byStatus.find(r => r.name === 'ACTIVE')?.value ?? 0;
  const activeClientCount = d.clients.byStatus.find(s => s.name === 'ACTIVE')?.value ?? 0;
  const recruiterCount = d.users.byRole.find(r => r.name === 'RECRUITER')?.value ?? 0;
  const deliveryTeamCount = d.teams.byCategory.find(c => c.category === 'DELIVERY')?.count ?? 0;

  return (
    <div className="p-6 space-y-5">
      {/* ── Row 1: Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Requirements"
          value={totals.requirements}
          icon={Briefcase}
          hex="#1D9E75"
          sub={`${activeReqCount} active`}
        />
        <StatCard
          label="Clients"
          value={totals.clients}
          icon={Building2}
          hex="#378ADD"
          sub={`${activeClientCount} active`}
        />
        <StatCard
          label="Users"
          value={totals.users}
          icon={Users}
          hex="#7F77DD"
          sub={`${recruiterCount} recruiters`}
        />
        <StatCard
          label="Teams"
          value={totals.teams}
          icon={Layers}
          hex="#EF9F27"
          sub={`${deliveryTeamCount} delivery`}
        />
      </div>

      {/* ── Row 2: Pipeline strip ── */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
            <TrendingUp size={13} className="text-muted-foreground" />
            Openings pipeline
          </p>
          <span className="text-[11px] text-muted-foreground">
            Fill rate — <span className="font-semibold text-foreground">{fillRate}%</span>
          </span>
        </div>
        <div className="grid grid-cols-5 divide-x divide-border">
          {(
            [
              { label: 'Total openings', value: pipeline.totalOpenings, hex: '#888780' },
              { label: 'Active apps', value: pipeline.activeApplications, hex: '#378ADD' },
              { label: 'Interviews', value: pipeline.interviewsScheduled, hex: '#7F77DD' },
              { label: 'Offers out', value: pipeline.offersRolledOut, hex: '#EF9F27' },
              { label: 'Filled', value: pipeline.filledOpenings, hex: '#1D9E75' },
            ] as const
          ).map(stat => (
            <div key={stat.label} className="px-4 first:pl-0 last:pr-0 text-center">
              <p className="text-[22px] font-semibold leading-none" style={{ color: stat.hex }}>
                {stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Status bars + Priority & Remote donuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Requirements by status">
          {d.requirements.byStatus.length === 0 ? (
            <EmptyState label="No requirements yet" />
          ) : (
            d.requirements.byStatus.map(r => (
              <HBar key={r.name} label={r.name} value={r.value} max={maxStatusCount} hex={r.fill} />
            ))
          )}
        </SectionCard>

        <SectionCard title="Requirements by priority">
          <DonutWithLegend data={d.requirements.byPriority} />
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[11px] text-muted-foreground mb-3 uppercase tracking-wide font-medium">
              Remote type
            </p>
            <DonutWithLegend data={d.requirements.byRemoteType} />
          </div>
        </SectionCard>
      </div>

      {/* ── Row 4: Job type bar + Clients donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Requirements by job type">
          {d.requirements.byJobType.length === 0 ? (
            <EmptyState label="No requirements yet" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={d.requirements.byJobType}
                barSize={22}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickFormatter={v => (v ?? '').toString().replace(/_/g, ' ').toLowerCase()}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={96}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {d.requirements.byJobType.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Clients by status">
          <DonutWithLegend data={d.clients.byStatus} />
        </SectionCard>
      </div>

      {/* ── Row 5: Team headcounts + Users by role ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Team headcounts">
          {d.teams.headcounts.length === 0 ? (
            <EmptyState label="No teams found" />
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1">
              {d.teams.headcounts.map(t => (
                <TeamRow key={t.id} team={t} maxCount={maxTeamCount} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Users by role">
          {d.users.byRole.length === 0 ? (
            <EmptyState label="No users found" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={d.users.byRole}
                  barSize={20}
                  margin={{ top: 0, right: 4, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tickFormatter={v => {
                      const s = (v ?? '').toString();
                      const map: Record<string, string> = {
                        DELIVERY_MANAGER: 'DM',
                        TEAM_LEAD: 'TL',
                        RECRUITER: 'Rec',
                        SUPER_ADMIN: 'SA',
                        ADMIN: 'Adm',
                        SALES: 'Sales',
                      };
                      return map[s] ?? s.slice(0, 4);
                    }}
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {d.users.byRole.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="border-t border-border pt-3 mt-1">
                {d.users.byRole.map(r => (
                  <div key={r.name} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: r.fill }}
                      />
                      <span className="text-[11px] text-muted-foreground capitalize">
                        {(r.name ?? '').replace(/_/g, ' ').toLowerCase() || '—'}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Row 6: Recent requirements ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Briefcase size={13} className="text-muted-foreground" />
          <p className="text-[13px] font-medium text-foreground">Recent requirements</p>
        </div>
        {d.recentRequirements.length === 0 ? (
          <p className="px-5 py-10 text-[13px] text-muted-foreground text-center">
            No requirements yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {d.recentRequirements.map(req => (
              <div key={req.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-medium text-foreground truncate">{req.title}</p>
                    {req.businessUnit?.name && (
                      <span className="text-[10px] text-muted-foreground hidden sm:block flex-shrink-0">
                        {req.businessUnit.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {req.reqCode || '—'} · {req.client.name}
                    {(req.createdBy.firstName || req.createdBy.lastName) &&
                      ` · ${req.createdBy.firstName} ${req.createdBy.lastName}`.trimEnd()}
                    {req.totalOpenings > 0 &&
                      ` · ${req.totalOpenings} opening${req.totalOpenings !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {req.jobType && <Badge label={req.jobType} style={FALLBACK_STYLE} />}
                  {req.priority && (
                    <Badge
                      label={req.priority}
                      style={PRIORITY_STYLE[req.priority] ?? FALLBACK_STYLE}
                    />
                  )}
                  {req.status && (
                    <Badge label={req.status} style={STATUS_STYLE[req.status] ?? FALLBACK_STYLE} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-16 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-52 rounded-xl bg-muted" />
        <div className="h-52 rounded-xl bg-muted" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-44 rounded-xl bg-muted" />
        <div className="h-44 rounded-xl bg-muted" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-56 rounded-xl bg-muted" />
        <div className="h-56 rounded-xl bg-muted" />
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
