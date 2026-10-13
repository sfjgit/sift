// File: useApplicants.ts
// Path: src/hooks/useApplicants.ts

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import type {
  Applicant,
  ApplicantFilters,
  ApplicantListMeta,
  ApplicantRequirementFilters,
  ApplicantRequirementMeta,
  ApplicantRequirementRow,
  AssignableUser,
  AssignResultItem,
} from '@/types/applicant';

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

// ── applicants data ───────────────────────────────────────────────────────────

export function useApplicantRequirements(filters: ApplicantRequirementFilters) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['applicants', 'requirements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);

      const res = await axios.get(`/applicants/requirements?${params}`);
      return {
        data: res.data.data as ApplicantRequirementRow[],
        meta: res.data.meta as ApplicantRequirementMeta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useApplicants(filters: ApplicantFilters, enabled = true) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['applicants', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));
      if (filters.requirementId) params.set('requirementId', filters.requirementId);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const res = await axios.get(`/applicants?${params}`);
      return {
        data: res.data.data as Applicant[],
        meta: res.data.meta as ApplicantListMeta,
      };
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
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
      // 'applicants' prefix refreshes requirement counts + every open applicant list
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
    },
  });
}
