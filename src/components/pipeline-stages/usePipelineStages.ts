// File: usePipelineStages.ts
// Path: src/app/(dashboard)/settings/pipeline-stages/usePipelineStages.ts

import { useAxios } from '@/hooks/useAxios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type CanonicalStage = 'SOURCED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'JOINED' | 'DROPPED';

export const CANONICAL_STAGES: { value: CanonicalStage; label: string }[] = [
  { value: 'SOURCED', label: 'Sourced' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'JOINED', label: 'Joined' },
  { value: 'DROPPED', label: 'Dropped' },
];

export type PipelineStage = {
  id: string;
  code: string;
  label: string;
  order: number;
  isMandatory: boolean;
  isTerminal: boolean;
  isActive: boolean;
  canonicalStage: CanonicalStage | null;
  serviceLineId: string | null;
  serviceLine: { id: string; name: string } | null;
};

export type StagePayloadItem = {
  id?: string;
  code: string;
  label: string;
  order: number;
  isMandatory: boolean;
  isTerminal: boolean;
  isActive: boolean;
  isNew: boolean;
  canonicalStage: CanonicalStage | null;
  serviceLineId: string | null;
};

export type SavePayload = {
  deletedIds: string[];
  stages: StagePayloadItem[];
};

const QK = ['pipeline-stages'];

export function usePipelineStages() {
  const axios = useAxios();
  return useQuery<PipelineStage[]>({
    queryKey: QK,
    queryFn: async () => {
      // fetch all — no serviceLineId filter, includeInactive true
      const res = await axios.get('/pipeline-stages?includeInactive=true');
      return res.data.data;
    },
  });
}

export function useSaveStages() {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePayload) =>
      axios.patch('/pipeline-stages/reorder', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
