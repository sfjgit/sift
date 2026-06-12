// File: useCandidateMeta.ts
// Path: src/hooks/useCandidateMeta.ts

import { useQuery } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';

export interface CanonicalStageMeta {
  key: string;
  pipelineStageIds: string[];
  count?: number;
}

export interface PipelineStageMeta {
  id: string;
  code: string;
  label: string;
  order: number;
  canonicalStage: string | null;
  isMandatory: boolean;
  isTerminal: boolean;
  serviceLineId: string | null;
}

export interface CandidateMeta {
  canonicalStages: CanonicalStageMeta[];
  pipelineStages: PipelineStageMeta[];
}

// Dot colors are purely presentational — frontend concern, not DB concern.
// Keyed by canonical stage key, falls back to a neutral gray.
const CANONICAL_DOT_MAP: Record<string, string> = {
  SOURCED: 'bg-slate-500',
  SCREENING: 'bg-blue-600',
  SUBMMITED: 'bg-sky-600', // note: matches enum typo in schema
  SHORTLISTED: 'bg-indigo-600',
  INTERVIEW: 'bg-violet-600',
  OFFER_IN_PROGRESS: 'bg-amber-600',
  OFFERED: 'bg-orange-600',
  HIRED: 'bg-emerald-700',
  JOINED: 'bg-green-700',
  REJECTED: 'bg-rose-600',
  DECLINED: 'bg-pink-600',
  DROPPED: 'bg-red-600',
};

export function canonicalDot(key: string): string {
  return CANONICAL_DOT_MAP[key] ?? 'bg-slate-400';
}

export function useCandidateMeta() {
  const axios = useAxios();

  return useQuery<CandidateMeta>({
    queryKey: ['candidate-meta'],
    queryFn: async () => {
      const res = await axios.get('/candidates/meta');
      return res.data.data as CandidateMeta;
    },
    staleTime: 5 * 60 * 1000, // stages don't change mid-session — cache 5 min
  });
}
