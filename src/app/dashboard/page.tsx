'use client';

import { usePermissions } from '@/hooks/usePermission';
import { MODULES } from '@/constants/modules';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { PendingApproval } from '@/components/dashboard/PendingApproval';
import { RecentRequirements } from '@/components/dashboard/RecentRequirements';
import { RecentClients } from '@/components/dashboard/RecentClients';

export default function DashboardPage() {
  const clientPerms = usePermissions(MODULES.CLIENTS);
  const reqPerms = usePermissions(MODULES.REQUIREMENTS);

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-7">
      <DashboardGreeting />

      {/* Stat cards — each internally checks permissions */}
      <StatsRow />

      {/* Pending approval alert — only renders if data exists */}
      {reqPerms.canView && <PendingApproval />}

      {/* Recent lists — side by side, each only renders if canView */}
      {(clientPerms.canView || reqPerms.canView) && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {reqPerms.canView && <RecentRequirements />}
          {clientPerms.canView && <RecentClients />}
        </div>
      )}
    </div>
  );
}
