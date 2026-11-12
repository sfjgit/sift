// File: page.tsx
// Path: src/app/(app)/dashboard/page.tsx

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, subMonths } from 'date-fns';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ContactRound,
  Hourglass,
  Sparkles,
  UserRoundCheck,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { HelpButton } from '@/features/help/HelpSheet';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/states';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HBarChart,
  Legend,
  STATUS_COLORS,
  SegmentBar,
  TrendChart,
  bucketLabel,
} from '@/components/charts/Charts';
import { ActivityTimeline } from '@/features/activity/ActivityTimeline';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useTour } from '@/features/tour/useTour';
import { welcomeTour } from '@/features/tour/tours/catalog';
import { reportsApi } from '@/lib/api/endpoints';
import { fmtNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUi } from '@/stores/ui';
import type { TrendInterval } from '@/types/reports';

type Range = '7d' | '30d' | '90d' | '12m';

const RANGES: Record<
  Range,
  { label: string; from: () => Date; interval: TrendInterval; hint: string }
> = {
  '7d': { label: '7D', from: () => subDays(new Date(), 7), interval: 'day', hint: 'last 7 days' },
  '30d': {
    label: '30D',
    from: () => subDays(new Date(), 30),
    interval: 'day',
    hint: 'last 30 days',
  },
  '90d': {
    label: '90D',
    from: () => subDays(new Date(), 90),
    interval: 'week',
    hint: 'last 90 days',
  },
  '12m': {
    label: '12M',
    from: () => subMonths(new Date(), 12),
    interval: 'month',
    hint: 'last 12 months',
  },
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { openClientDialog, openSpocDialog } = useUi();
  const [range, setRange] = useState<Range>('30d');
  const r = RANGES[range];
  const from = useMemo(() => format(r.from(), 'yyyy-MM-dd'), [r]);
  // every widget here comes from /reports/*, which needs reports.read too
  const canReports = can('reports.read');
  const canClients = canReports && can('clients.read');
  const canSpocs = canReports && can('spocs.read');

  const overview = useQuery({
    queryKey: ['reports', 'overview', from],
    queryFn: () => reportsApi.overview({ from }),
    enabled: canClients || canSpocs,
  });

  const trendSpocs = useQuery({
    queryKey: ['reports', 'trend', 'spocs', from, r.interval],
    queryFn: () => reportsApi.trend({ entity: 'spocs', interval: r.interval, from }),
    enabled: canSpocs,
  });
  const trendClients = useQuery({
    queryKey: ['reports', 'trend', 'clients', from, r.interval],
    queryFn: () => reportsApi.trend({ entity: 'clients', interval: r.interval, from }),
    enabled: canClients,
  });

  const bySales = useQuery({
    queryKey: ['reports', 'breakdown', 'spocs', 'salesStatus'],
    queryFn: () => reportsApi.breakdown({ entity: 'spocs', groupBy: 'salesStatus', limit: 8 }),
    enabled: canSpocs,
  });
  const byHandler = useQuery({
    queryKey: ['reports', 'breakdown', 'spocs', 'handler-band'],
    queryFn: () =>
      reportsApi.breakdown({
        entity: 'spocs',
        groupBy: 'handler',
        splitBy: 'validationBand',
        limit: 6,
      }),
    enabled: canSpocs,
  });
  const bySize = useQuery({
    queryKey: ['reports', 'breakdown', 'clients', 'employeeSize'],
    queryFn: () => reportsApi.breakdown({ entity: 'clients', groupBy: 'employeeSize', limit: 10 }),
    enabled: canClients,
  });
  const activity = useQuery({
    queryKey: ['reports', 'activities', 'dashboard'],
    queryFn: () => reportsApi.activities({ limit: 12 }),
    enabled: canClients,
  });

  useTour(welcomeTour, { ready: !overview.isLoading });

  const o = overview.data;
  const trendData = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    trendClients.data?.points.forEach(p =>
      map.set(p.bucket, { bucket: p.bucket, clients: p.total, spocs: 0 })
    );
    trendSpocs.data?.points.forEach(p =>
      map.set(p.bucket, {
        ...(map.get(p.bucket) ?? { bucket: p.bucket, clients: 0 }),
        spocs: p.total,
      })
    );
    return [...map.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
  }, [trendClients.data, trendSpocs.data]);

  const trendSeries = [
    ...(canClients ? [{ key: 'clients', label: 'New clients' }] : []),
    ...(canSpocs ? [{ key: 'spocs', label: 'New SPOCs' }] : []),
  ];

  const bandKeys = [
    { key: 'READY', label: 'Ready', color: STATUS_COLORS.good },
    { key: 'REVIEW', label: 'Review', color: STATUS_COLORS.warning },
    { key: 'NOT_USABLE', label: 'Not usable', color: STATUS_COLORS.critical },
    { key: '__none', label: 'Unscored', color: STATUS_COLORS.neutral },
  ];

  const handlerRows = (byHandler.data?.rows ?? []).map(row => ({
    key: row.key,
    label: row.label,
    ...Object.fromEntries(bandKeys.map(b => [b.key, row.split?.[b.key] ?? 0])),
  }));

  // on wide screens the dashboard is exactly one screen tall: the two panel rows
  // share the height left under the KPIs, charts stretch to their panel, and long
  // lists scroll inside it — no blank space anywhere
  const rowPanel = 'flex min-h-0 flex-col';
  const rowBody = 'min-h-0 flex-1 overflow-y-auto p-3';

  return (
    <div className="flex flex-col gap-3 xl:h-[calc(100svh-var(--topbar-h,3.5rem)-1.5rem)]">
      <PageHeader
        title={
          <>
            {greeting()}, {user?.firstName}{' '}
            <span className="inline-block origin-bottom-right animate-[wave_1.6s_ease-in-out_1]">
              👋
            </span>
          </>
        }
        description={format(new Date(), 'EEEE, d MMMM')}
        actions={
          <>
            <HelpButton module="dashboard" />
            <div {...tourTarget('dashboard-range')}>
              <Segmented
                value={range}
                onChange={setRange}
                options={(Object.keys(RANGES) as Range[]).map(k => ({
                  value: k,
                  label: RANGES[k].label,
                  title: RANGES[k].hint,
                }))}
              />
            </div>
            {can('clients.create') && (
              <Button variant="outline" size="sm" onClick={() => openClientDialog(true)}>
                <Building2 /> Add client
              </Button>
            )}
            {can('spocs.create') && (
              <Button size="sm" onClick={() => openSpocDialog({})}>
                <UserPlus /> Add SPOC
              </Button>
            )}
          </>
        }
      />

      {!canClients && !canSpocs && (
        <EmptyState
          icon={Sparkles}
          title="Your workspace is ready"
          description="Your role doesn’t include client or SPOC access yet. Ask an admin to grant it, or explore the help center."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/help">Open help center</Link>
            </Button>
          }
        />
      )}

      {/* KPIs */}
      {(canClients || canSpocs) && (
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
          {...tourTarget('dashboard-kpis')}
        >
          {canClients && (
            <>
              <StatCard
                compact
                label="Clients"
                icon={Building2}
                value={o?.clients?.total}
                loading={overview.isLoading}
                href="/clients"
                hint={o?.clients ? `+${fmtNumber(o.clients.newInRange)} in ${r.hint}` : undefined}
              />
              <StatCard
                compact
                label="Pending approval"
                icon={Hourglass}
                accent="warning"
                value={o?.clients?.byStatus.PENDING}
                loading={overview.isLoading}
                href="/clients?status=PENDING"
                hint="to activate"
              />
              <StatCard
                compact
                label="Active clients"
                icon={BadgeCheck}
                accent="success"
                value={o?.clients?.byStatus.ACTIVE}
                loading={overview.isLoading}
                href="/clients?status=ACTIVE"
              />
            </>
          )}
          {canSpocs && (
            <>
              <StatCard
                compact
                label="Active SPOCs"
                icon={ContactRound}
                accent="info"
                value={o?.spocs?.total}
                loading={overview.isLoading}
                href="/spocs"
                hint={o?.spocs ? `+${fmtNumber(o.spocs.newInRange)} in ${r.hint}` : undefined}
              />
              <StatCard
                compact
                label="My SPOCs"
                icon={UserRoundCheck}
                accent="violet"
                value={o?.spocs?.mine}
                loading={overview.isLoading}
                href={`/spocs?handlerId=${user?.id}`}
                hint="you handle"
              />
              <StatCard
                compact
                label="Ready to contact"
                icon={Sparkles}
                accent="success"
                value={o?.spocs?.byBand.READY}
                loading={overview.isLoading}
                href="/spocs?validationBand=READY"
                hint="score ≥ 75"
              />
            </>
          )}
        </div>
      )}

      {/* growth · data quality */}
      {(canClients || canSpocs) && (
        <div className="grid gap-3 xl:min-h-[300px] xl:flex-1 xl:grid-cols-12">
          <Panel
            title="Growth"
            description={`New records, ${r.hint}`}
            actions={<Legend series={trendSeries} />}
            className={cn(rowPanel, canSpocs ? 'xl:col-span-9' : 'xl:col-span-12')}
            bodyClassName={rowBody}
          >
            {trendClients.isLoading || trendSpocs.isLoading ? (
              <Skeleton className="h-full min-h-[220px] w-full" />
            ) : (
              <TrendChart
                data={trendData}
                series={trendSeries}
                xFormatter={bucketLabel(r.interval)}
                height="fill"
              />
            )}
          </Panel>

          {canSpocs && (
            <Panel
              title="Data quality"
              description="SPOC validation, email and client status"
              {...tourTarget('dashboard-quality')}
              className={cn(rowPanel, 'xl:col-span-3')}
              bodyClassName={rowBody}
              actions={
                <Button asChild variant="ghost" size="xs">
                  <Link href="/reports?template=quality">
                    Details <ArrowRight />
                  </Link>
                </Button>
              }
            >
              {overview.isLoading || !o?.spocs ? (
                <Skeleton className="h-full min-h-[200px] w-full" />
              ) : (
                <div className="space-y-3">
                  <SegmentBar
                    segments={[
                      {
                        key: 'READY',
                        label: 'Ready',
                        value: o.spocs.byBand.READY,
                        color: STATUS_COLORS.good,
                      },
                      {
                        key: 'REVIEW',
                        label: 'Review',
                        value: o.spocs.byBand.REVIEW,
                        color: STATUS_COLORS.warning,
                      },
                      {
                        key: 'NOT_USABLE',
                        label: 'Not usable',
                        value: o.spocs.byBand.NOT_USABLE,
                        color: STATUS_COLORS.critical,
                      },
                      {
                        key: 'UNSCORED',
                        label: 'Unscored',
                        value: o.spocs.byBand.UNSCORED,
                        color: STATUS_COLORS.neutral,
                      },
                    ]}
                    onSelect={k => k !== 'UNSCORED' && router.push(`/spocs?validationBand=${k}`)}
                  />
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Email status</p>
                    <SegmentBar
                      segments={[
                        {
                          key: 'GOOD',
                          label: 'Verified',
                          value: o.spocs.byEmailStatus.GOOD,
                          color: STATUS_COLORS.good,
                        },
                        {
                          key: 'RISKY',
                          label: 'Risky',
                          value: o.spocs.byEmailStatus.RISKY,
                          color: STATUS_COLORS.warning,
                        },
                        {
                          key: 'BAD',
                          label: 'Bounces',
                          value: o.spocs.byEmailStatus.BAD,
                          color: STATUS_COLORS.critical,
                        },
                        {
                          key: 'UNVERIFIED',
                          label: 'Unverified',
                          value: o.spocs.byEmailStatus.UNVERIFIED,
                          color: STATUS_COLORS.neutral,
                        },
                      ]}
                      onSelect={k => router.push(`/spocs?emailStatus=${k}`)}
                    />
                  </div>
                  {o.clients && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Client status
                      </p>
                      <SegmentBar
                        segments={[
                          {
                            key: 'ACTIVE',
                            label: 'Active',
                            value: o.clients.byStatus.ACTIVE ?? 0,
                            color: STATUS_COLORS.good,
                          },
                          {
                            key: 'PENDING',
                            label: 'Pending',
                            value: o.clients.byStatus.PENDING ?? 0,
                            color: STATUS_COLORS.warning,
                          },
                          {
                            key: 'INACTIVE',
                            label: 'Inactive',
                            value: o.clients.byStatus.INACTIVE ?? 0,
                            color: STATUS_COLORS.neutral,
                          },
                        ]}
                        onSelect={k => router.push(`/clients?status=${k}`)}
                      />
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

        </div>
      )}

      {/* pipeline · handlers · company size · activity */}
      {(canClients || canSpocs) && (
        <div className="grid gap-3 md:grid-cols-2 xl:min-h-[300px] xl:flex-[1.15] xl:grid-cols-4">
          {canSpocs && (
            <Panel
              title="Pipeline by sales status"
              description="Active SPOCs · click a bar to open them"
              className={rowPanel}
              bodyClassName={rowBody}
            >
              <BreakdownBars
                query={bySales}
                labelWidth={110}
                empty="No SPOCs yet"
                onSelect={k => router.push(`/spocs?salesStatusId=${k}`)}
              />
            </Panel>
          )}
          {canSpocs && (
            <Panel
              title="Top handlers"
              description="SPOCs owned, by quality band"
              actions={<Legend series={bandKeys} className="max-w-[200px] justify-end gap-x-2" />}
              className={rowPanel}
              bodyClassName={rowBody}
            >
              {byHandler.isLoading ? (
                <Skeleton className="h-full min-h-[200px] w-full" />
              ) : handlerRows.length ? (
                <HBarChart
                  data={handlerRows}
                  series={bandKeys}
                  labelWidth={110}
                  height="fill"
                  onSelect={(k, band) =>
                    router.push(
                      `/spocs?handlerId=${k}${band && band !== '__none' ? `&validationBand=${band}` : ''}`
                    )
                  }
                />
              ) : (
                <EmptyState compact title="No handlers yet" />
              )}
            </Panel>
          )}
          {canClients && (
            <Panel
              title="Clients by employee size"
              description="Company size band · click a bar to open them"
              className={rowPanel}
              bodyClassName={rowBody}
            >
              <BreakdownBars
                query={bySize}
                labelWidth={110}
                empty="No employee sizes yet"
                onSelect={k => router.push(`/clients?employeeSizeId=${k}`)}
              />
            </Panel>
          )}
          {canClients && (
            <Panel
              title="Recent activity"
              description="Across the clients you can see"
              {...tourTarget('dashboard-activity')}
              className={rowPanel}
              bodyClassName={rowBody}
            >
              <ActivityTimeline
                items={activity.data?.data}
                loading={activity.isLoading}
                showClient
                compact
              />
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

/** One-series bar list from a /reports/breakdown query (rows without a value are left out). */
function BreakdownBars({
  query,
  labelWidth,
  empty,
  onSelect,
}: {
  query: { isLoading: boolean; data?: { rows: { key: string; label: string; total: number }[] } };
  labelWidth: number;
  empty: string;
  onSelect: (key: string) => void;
}) {
  if (query.isLoading) return <Skeleton className="h-full min-h-[200px] w-full" />;
  const rows = (query.data?.rows ?? []).filter(row => row.key !== '__none');
  if (!rows.length) return <EmptyState compact title={empty} />;
  return (
    <HBarChart
      data={rows.map(row => ({ key: row.key, label: row.label, total: row.total }))}
      series={[{ key: 'total', label: 'Count' }]}
      onSelect={k => k !== '__none' && onSelect(k)}
      labelWidth={labelWidth}
      height="fill"
    />
  );
}
