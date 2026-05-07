'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { RequirementsSection } from '@/components/dashboard/RequirementsSection';
import { ClientsSection } from '@/components/dashboard/ClientsSection';
import { MyAssignmentsSection } from '@/components/dashboard/MyAssignmentsSection';
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel';
import { BUBreakdown } from '@/components/dashboard/BUBreakdown';
import { OrgTreePanel } from '@/components/dashboard/OrgTreePanel';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { BreachAlerts } from '@/components/dashboard/BreachAlerts';
import { useDashboardStats } from '@/hooks/useDashboard';
import { Separator } from '@/components/ui/separator';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-card flex flex-col overflow-hidden ${className ?? ''}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="text-xs text-primary hover:underline">
      View all
    </Link>
  );
}

// ── Stats + Breakdowns combined so we only call useDashboardStats once ────────

function StatsAndBreakdowns({
  buId,
  deptId,
  serviceLineId,
  clientId,
  status,
}: {
  buId?: string;
  deptId?: string;
  serviceLineId?: string;
  clientId?: string;
  status?: string;
}) {
  const { data: stats, isLoading } = useDashboardStats({
    buId,
    deptId,
    serviceLineId,
    clientId,
  });

  return (
    <>
      <StatsRow
        // @ts-expect-error errr
        stats={stats}
        loading={isLoading}
        buId={buId}
        status={status}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Candidate Pipeline">
          <PipelineFunnel pipeline={stats?.pipeline} loading={isLoading} />
        </SectionCard>

        <SectionCard title="Requirements by BU & Service Line">
          <BUBreakdown
            buBreakdown={stats?.buBreakdown}
            slBreakdown={stats?.slBreakdown}
            loading={isLoading}
          />
        </SectionCard>
      </div>
    </>
  );
}

// ── Main dashboard content ────────────────────────────────────────────────────

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const buId = searchParams.get('buId') ?? undefined;
  const deptId = searchParams.get('deptId') ?? undefined;
  const serviceLineId = searchParams.get('serviceLineId') ?? undefined;
  const clientId = searchParams.get('clientId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const priority = searchParams.get('priority') ?? undefined;

  const isSuperAdmin = user?.isSuperAdmin;
  const isAdmin = isSuperAdmin || user?.role?.name?.toLowerCase().includes('admin');
  const isRecruiter = user?.role?.name?.toLowerCase().includes('recruiter');

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">
            {greeting()}
            {user?.firstName ? `, ${user.firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSuperAdmin
              ? 'Full org view — all requirements, assignments and pipeline.'
              : isRecruiter
                ? 'Here are your active assignments and candidate pipeline.'
                : "Here's what's happening across your requirements today."}
          </p>
        </div>

        {/* filter bar — hide BU/dept for recruiters */}
        <FilterBar
          showBU={!isRecruiter}
          showDept={!isRecruiter}
          showServiceLine={!isRecruiter}
          showClient={true}
          showStatus={true}
          showPriority={true}
        />
      </div>

      {/* Stats + pipeline + BU breakdown */}
      {!isRecruiter && (
        <StatsAndBreakdowns
          buId={buId}
          deptId={deptId}
          serviceLineId={serviceLineId}
          clientId={clientId}
          status={status}
        />
      )}

      <Separator />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Requirements — 2/3 */}
        <SectionCard
          className="lg:col-span-2"
          title="Requirements"
          action={<ViewAll href="/requirements" />}
        >
          <RequirementsSection
            buId={buId}
            // @ts-expect-error errr
            deptId={deptId}
            serviceLineId={serviceLineId}
            clientId={clientId}
            status={status}
            priority={priority}
          />
        </SectionCard>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Breach alerts */}
          <SectionCard
            title="⚠ Breach Alerts"
            action={<ViewAll href="/requirements?breached=true" />}
          >
            <BreachAlerts />
          </SectionCard>

          {/* Clients — hide for recruiter */}
          {!isRecruiter && (
            <SectionCard title="Clients" action={<ViewAll href="/clients" />}>
              <ClientsSection
                buId={buId}
                // @ts-expect-error errr
                serviceLineId={serviceLineId}
              />
            </SectionCard>
          )}
        </div>
      </div>

      {/* My assignments */}
      <MyAssignmentsSection />

      {/* Bottom grid — org tree + activity feed */}
      {!isRecruiter && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Org tree — admin/super admin only */}
          {isAdmin && (
            <SectionCard title="Org Tree" action={<ViewAll href="/org" />}>
              <OrgTreePanel />
            </SectionCard>
          )}

          {/* Activity feed */}
          <SectionCard title="Recent Activity" className={!isAdmin ? 'lg:col-span-2' : ''}>
            <ActivityFeed buId={buId} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
