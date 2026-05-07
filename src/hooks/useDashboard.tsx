import { useQuery } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import type {
  DashboardStats,
  RequirementSummary,
  ClientSummary,
  AssignmentSummary,
  BU,
  Department,
  ServiceLine,
  ClientOption,
  OrgNode,
  ActivityItem,
  BreachAlert,
} from '@/types/dashboard';

// ── lookup data ───────────────────────────────────────────────────────────────

export function useBusinessUnits() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await axios.get('/business-units');
      return res.data.flat as BU[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useDepartments() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await axios.get('/departments');
      return res.data.data as Department[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useServiceLines() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['service-lines'],
    queryFn: async () => {
      const res = await axios.get('/service-lines');
      return res.data.data as ServiceLine[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useClientOptions(buId?: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['client-options', buId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (buId) params.set('buId', buId);
      const res = await axios.get(`/clients?${params}`);
      return (res.data.data as ClientSummary[]).map(c => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
      })) as ClientOption[];
    },
    staleTime: 2 * 60_000,
  });
}

// ── dashboard data ────────────────────────────────────────────────────────────

export function useDashboardStats(filters: {
  buId?: string;
  deptId?: string;
  serviceLineId?: string;
  clientId?: string;
}) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['dashboard-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.buId) params.set('buId', filters.buId);
      if (filters.deptId) params.set('deptId', filters.deptId);
      if (filters.serviceLineId) params.set('serviceLineId', filters.serviceLineId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      const res = await axios.get(`/dashboard/stats?${params}`);
      return res.data.data as DashboardStats;
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });
}

export function useRequirements(filters: {
  buId?: string;
  deptId?: string;
  serviceLineId?: string;
  clientId?: string;
  status?: string;
  priority?: string;
  limit?: number;
  page?: number;
}) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['requirements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(filters.limit ?? 10));
      params.set('page', String(filters.page ?? 1));
      params.set('sortBy', 'createdAt');
      params.set('sortDir', 'desc');
      if (filters.buId) params.set('buId', filters.buId);
      if (filters.deptId) params.set('deptId', filters.deptId);
      if (filters.serviceLineId) params.set('serviceLineId', filters.serviceLineId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      const res = await axios.get(`/requirements?${params}`);
      return res.data.data as RequirementSummary[];
    },
    staleTime: 30_000,
  });
}

export function useMyAssignments() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await axios.get('/dashboard/my-assignments');
      return res.data.data as AssignmentSummary[];
    },
    staleTime: 30_000,
  });
}

export function useClients(filters: { buId?: string; serviceLineId?: string; limit?: number }) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['clients-dashboard', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', String(filters.limit ?? 8));
      params.set('sortBy', 'createdAt');
      params.set('sortDir', 'desc');
      if (filters.buId) params.set('buId', filters.buId);
      if (filters.serviceLineId) params.set('serviceLineId', filters.serviceLineId);
      const res = await axios.get(`/clients?${params}`);
      return res.data.data as ClientSummary[];
    },
    staleTime: 60_000,
  });
}

export function useOrgTree(rootUserId?: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['org-tree', rootUserId],
    queryFn: async () => {
      const url = rootUserId ? `/users/${rootUserId}/tree` : '/users/tree';
      const res = await axios.get(url);
      return res.data.data as OrgNode;
    },
    staleTime: 5 * 60_000,
    enabled: !!rootUserId,
  });
}

export function useActivityFeed(filters: { buId?: string }) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['activity-feed', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (filters.buId) params.set('buId', filters.buId);
      const res = await axios.get(`/dashboard/activity?${params}`);
      return res.data.data as ActivityItem[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useBreachAlerts() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['breach-alerts'],
    queryFn: async () => {
      const res = await axios.get('/requirements?breached=true&status=ACTIVE&limit=10');
      return res.data.data as BreachAlert[];
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
