// File: usePipelineStages.ts
// Path: src/app/(dashboard)/settings/pipeline-stages/usePipelineStages.ts

import { useAxios } from '@/hooks/useAxios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// one query key per scope
const QK = (scopeId: string) => ['pipeline-stages', scopeId];

export function usePipelineStagesByScope(scopeId: string) {
  const axios = useAxios();
  return useQuery<PipelineStage[]>({
    queryKey: QK(scopeId),
    queryFn: async () => {
      const res = await axios.get(`/pipeline-stages?includeInactive=true&serviceLineId=${scopeId}`);
      return res.data.data;
    },
  });
}

export function useReorderStages() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      serviceLineId: string | null;
      stages: {
        id?: string;
        label: string;
        isMandatory: boolean;
        isTerminal: boolean;
        isActive: boolean;
        isNew: boolean;
      }[];
    }) => axios.patch('/pipeline-stages/reorder', payload).then(r => r.data),
    onSuccess: (_data, variables) => {
      const scopeId = variables.serviceLineId ?? 'universal';
      qc.invalidateQueries({ queryKey: QK(scopeId) });
    },
  });
}

export function useDeleteStage() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/pipeline-stages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  });
}
