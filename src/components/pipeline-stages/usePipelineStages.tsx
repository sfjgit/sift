'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import { toast } from 'sonner';

export type PipelineStage = {
  id: string;
  code: string;
  label: string;
  order: number;
  isMandatory: boolean;
  isTerminal: boolean;
  isActive: boolean;
  serviceLineId: string | null;
  serviceLine: { id: string; name: string } | null;
};

export type ServiceLine = {
  id: string;
  name: string;
  code: string | null;
};

// ── fetch all stages (including inactive for admin view)
export function usePipelineStages() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['pipeline-stages-admin'],
    queryFn: async () => {
      const res = await axios.get('/pipeline-stages?includeInactive=true');
      return res.data.data as PipelineStage[];
    },
  });
}

// ── fetch service lines for dropdown
export function useServiceLines() {
  const axios = useAxios();
  return useQuery({
    queryKey: ['service-lines'],
    queryFn: async () => {
      const res = await axios.get('/service-lines?isActive=true');
      return res.data.data as ServiceLine[];
    },
    staleTime: 60_000,
  });
}

// ── create
export function useCreateStage() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      code: string;
      label: string;
      order: number;
      serviceLineId?: string | null;
      isMandatory: boolean;
      isTerminal: boolean;
    }) => {
      const res = await axios.post('/pipeline-stages', body);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Stage created');
      qc.invalidateQueries({ queryKey: ['pipeline-stages-admin'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create stage'),
  });
}

// ── update (label, isMandatory, isActive only)
export function useUpdateStage() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      code?: string;
      label?: string;
      order?: number;
      serviceLineId?: string | null;
      isMandatory?: boolean;
      isTerminal?: boolean;
      isActive?: boolean;
    }) => {
      const res = await axios.patch(`/pipeline-stages/${id}`, body);
      // show warning toast if backend sends one
      if (res.data.warning) {
        toast.warning(res.data.warning);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success('Stage updated');
      qc.invalidateQueries({ queryKey: ['pipeline-stages-admin'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update stage'),
  });
}

// ── delete
export function useDeleteStage() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/pipeline-stages/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Stage deleted');
      qc.invalidateQueries({ queryKey: ['pipeline-stages-admin'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete stage'),
  });
}
