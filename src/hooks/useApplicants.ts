// File: useApplicants.ts
// Path: src/hooks/useApplicants.ts

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import type {
  Applicant,
  ApplicantFilters,
  ApplicantListMeta,
  AssignableUser,
  AssignResultItem,
} from '@/types/applicant';

type ApplicantFilterParams = Omit<ApplicantFilters, 'page' | 'limit'>;

/** Same query string for list + export — keeps both in sync */
const toFilterParams = (filters: ApplicantFilterParams) => {
  const params = new URLSearchParams();
  if (filters.requirementIds?.length)
    params.set('requirementIds', filters.requirementIds.join(','));
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params;
};

// ── lookup data ───────────────────────────────────────────────────────────────

export function useAssignableRecruiters(enabled = true) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => {
      const res = await axios.get('/users/subordinates');
      return res.data.data as AssignableUser[];
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

// ── applicants dashboard (single API) ─────────────────────────────────────────

export function useApplicants(filters: ApplicantFilters) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['applicants', filters],
    queryFn: async () => {
      const params = toFilterParams(filters);
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));
      const res = await axios.get(`/applicants?${params}`);
      return {
        data: res.data.data as Applicant[],
        meta: res.data.meta as ApplicantListMeta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// ── export — same filters (+ optional ticked rows), downloads a CSV ───────────

export function useExportApplicants() {
  const axios = useAxios();
  return useMutation({
    mutationFn: async (
      payload: ApplicantFilterParams & { columns: string[]; snapshotIds?: string[] }
    ) => {
      const params = toFilterParams(payload);
      if (payload.columns.length) params.set('columns', payload.columns.join(','));
      if (payload.snapshotIds?.length) params.set('snapshotIds', payload.snapshotIds.join(','));

      const res = await axios.get(`/applicants/export?${params}`, { responseType: 'blob' });

      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `applicants-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}

// ── mutations ─────────────────────────────────────────────────────────────────

export function useAssignApplicants() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { snapshotIds: string[]; recruiterId: string }) => {
      const res = await axios.post('/applicants/assign', payload);
      return res.data as {
        success: boolean;
        message: string;
        data?: { assigned: AssignResultItem[]; skipped: AssignResultItem[] };
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
    },
  });
}
