'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Briefcase, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';
import { usePermissions } from '@/hooks/usePermission';
import { useClients } from '@/lib/clients.api';
import { useRequirementsApi } from '@/lib/requirements.api';
import { MODULES, QUERY_KEYS } from '@/constants/modules';
import { StatCard } from './StatCard';

export function StatsRow() {
  const api = useAxios();
  const clientsApi = useClients();
  const clientPerms = usePermissions(MODULES.CLIENTS);
  const reqPerms = usePermissions(MODULES.REQUIREMENTS);

  const { getAll } = useRequirementsApi();

  const { data: allClients, isLoading: l1 } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS, 'stat-all'],
    queryFn: () => clientsApi.getAll({ page: 1, limit: 1 }),
    enabled: clientPerms.canView,
    staleTime: 60_000,
  });
  const { data: activeClients, isLoading: l2 } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS, 'stat-active'],
    queryFn: () => clientsApi.getAll({ page: 1, limit: 1, status: 'ACTIVE' }),
    enabled: clientPerms.canView,
    staleTime: 60_000,
  });
  const { data: allReqs, isLoading: l3 } = useQuery({
    queryKey: [QUERY_KEYS.REQUIREMENTS, 'stat-all'],
    queryFn: () => getAll({ page: 1, limit: 1 }),
    enabled: reqPerms.canView,
    staleTime: 60_000,
  });
  const { data: activeReqs, isLoading: l4 } = useQuery({
    queryKey: [QUERY_KEYS.REQUIREMENTS, 'stat-active'],
    queryFn: () => getAll({ page: 1, limit: 1, status: 'ACTIVE' }),
    enabled: reqPerms.canView,
    staleTime: 60_000,
  });

  if (!clientPerms.canView && !reqPerms.canView) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {clientPerms.canView && (
        <>
          <StatCard
            label="Total Clients"
            value={allClients?.data?.pagination?.total}
            icon={Building2}
            href="/dashboard/clients"
            isLoading={l1}
          />
          <StatCard
            label="Active Clients"
            value={activeClients?.data?.pagination?.total}
            icon={CheckCircle2}
            href="/dashboard/clients?status=ACTIVE"
            isLoading={l2}
            valueClass="text-emerald-600"
            sublabel="currently active"
          />
        </>
      )}
      {reqPerms.canView && (
        <>
          <StatCard
            label="Total Reqs"
            value={allReqs?.data?.count}
            icon={Briefcase}
            href="/dashboard/requirements"
            isLoading={l3}
          />
          <StatCard
            label="Active Reqs"
            value={activeReqs?.data?.count}
            icon={TrendingUp}
            href="/dashboard/requirements?status=ACTIVE"
            isLoading={l4}
            valueClass="text-blue-600"
            sublabel="in progress"
          />
        </>
      )}
    </div>
  );
}
