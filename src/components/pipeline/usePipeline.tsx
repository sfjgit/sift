'use client';

import { useAxios } from '@/hooks/useAxios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import useAxios from '@/hooks/useAxios';

export type PipelineStage = {
  id: string;
  code: string;
  label: string;
  order: number;
  canonicalStage?: string | null; // ← NEW — needed to detect "Submitted to Client" (SUBMMITED)
};

export type PipelineRow = {
  id: string;
  recruiterId: string;
  isRejected: boolean;
  isWithdrawn: boolean;
  isOnHold: boolean;
  rejectionReason: string | null;
  withdrawnReason: string | null;
  onHoldReason: string | null;
  submittedAt: string | null;
  offeredCtc: number | null;
  offerStatus: string | null;
  stageUpdatedAt: string;
  createdAt: string;
  currentStage: PipelineStage;
  snapshot: {
    id: string;
    candidateServiceId: string;
    fullName: string;
    email: string;
    phone: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    totalExpYears: number | null;
    topSkills: string[];
    resumeUrl: string | null;
  };
  requirement: {
    id: string;
    reqCode: string;
    title: string;
    status: string;
    priority: string;
    client: { id: string; name: string };
    serviceLine: { id: string; name: string } | null;
  };
  recruiter: { id: string; firstName: string; lastName: string };
  assignment: {
    id: string;
    assignedTo: { id: string; firstName: string; lastName: string };
  } | null;
};

export type PipelineStats = {
  total: number;
  rejected: number;
  withdrawn: number;
  onHold: number;
  byStage: { stageId: string; code: string; label: string; order: number; count: number }[];
};

export type ServiceLine = { id: string; name: string; code: string | null };

export type PipelineFilters = {
  stageCode?: string;
  recruiterId?: string;
  requirementId?: string;
  clientId?: string;
  isRejected?: string;
  isWithdrawn?: string;
  isOnHold?: string;
  search?: string;
  page?: number;
  limit?: number;
};

// ── hooks

export function usePipelineStats(
  filters: Omit<PipelineFilters, 'page' | 'limit' | 'search' | 'stageCode'>
) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['pipeline-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.requirementId) params.set('requirementId', filters.requirementId);
      if (filters.recruiterId) params.set('recruiterId', filters.recruiterId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      const res = await axios.get(`/pipeline/stats?${params.toString()}`);
      return res.data.data as PipelineStats;
    },
  });
}

export function usePipelines(filters: PipelineFilters) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['pipelines', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const res = await axios.get(`/pipeline?${params.toString()}`);
      return res.data as {
        data: PipelineRow[];
        meta: { total: number; page: number; limit: number; pages: number };
      };
    },
  });
}

export function useServiceLines() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['service-lines'],
    queryFn: async () => {
      const res = await axios.get('/service-lines?isActive=true');
      return res.data.data as ServiceLine[];
    },
  });
}

export function usePipelineStages(serviceLineId?: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: ['pipeline-stages', serviceLineId],
    queryFn: async () => {
      const params = serviceLineId ? `?serviceLineId=${serviceLineId}` : '';
      const res = await axios.get(`/pipeline-stages${params}`);
      return res.data.data as PipelineStage[];
    },
  });
}

// ── mutations

export function useMoveStage() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      stageId,
      skipReason,
      note,
      noticePeriod, // ← NEW
    }: {
      pipelineId: string;
      stageId: string;
      skipReason?: string;
      note?: string;
      noticePeriod?: string; // ← NEW
    }) => {
      const res = await axios.patch(`/pipeline/${pipelineId}/stage`, {
        stageId,
        skipReason,
        note,
        noticePeriod, // ← NEW
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });
}

export function useRejectCandidate() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      rejectionReason,
    }: {
      pipelineId: string;
      rejectionReason: string;
    }) => {
      const res = await axios.patch(`/pipeline/${pipelineId}/reject`, { rejectionReason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });
}

export function useWithdrawCandidate() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      withdrawnReason,
    }: {
      pipelineId: string;
      withdrawnReason: string;
    }) => {
      const res = await axios.patch(`/pipeline/${pipelineId}/withdraw`, { withdrawnReason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });
}

export function useHoldCandidate() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      onHoldReason,
    }: {
      pipelineId: string;
      onHoldReason: string;
    }) => {
      const res = await axios.patch(`/pipeline/${pipelineId}/hold`, { onHoldReason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });
}

export function useSubmitCandidate() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      submissionNote,
    }: {
      pipelineId: string;
      submissionNote: string;
    }) => {
      const res = await axios.patch(`/pipeline/${pipelineId}/submit`, { submissionNote });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });
}

export function useRollOffer() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pipelineId: string;
      offeredCtc: number;
      salaryCurrency: string;
      salaryType: string;
      expectedJoiningDate?: string;
    }) => {
      const { pipelineId, ...body } = payload;
      const res = await axios.patch(`/pipeline/${pipelineId}/offer`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });
}

export function usePushCandidate() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      requirementId: string;
      candidateServiceId: string;
      recruiterId: string;
      assignmentId?: string;
      fullName: string;
      email: string;
      phone?: string;
      currentTitle?: string;
      currentCompany?: string;
      totalExpYears?: number;
      topSkills?: string[];
      resumeUrl?: string;
      rawSnapshot: Record<string, unknown>;
    }) => {
      const { requirementId, ...body } = payload;
      const res = await axios.post(`/requirements/${requirementId}/candidates`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
  });
}
