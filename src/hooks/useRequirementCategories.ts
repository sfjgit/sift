// File: useRequirementCategories.ts
// Path: src/hooks/useRequirementCategories.ts

import { useQuery } from '@tanstack/react-query';
import { useAxios } from './useAxios';

export interface RequirementCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  order?: number | null;
  isActive: boolean;
  createdAt: string;
  _count?: { requirements: number };
}

// Picker dropdown — active only
export function useRequirementCategories() {
  const axios = useAxios();
  return useQuery<RequirementCategory[]>({
    queryKey: ['requirement-categories'],
    queryFn: async () => {
      const res = await axios.get('/requirementCategories?isActive=true');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Admin page — all including inactive
export function useAllRequirementCategories() {
  const axios = useAxios();
  return useQuery<RequirementCategory[]>({
    queryKey: ['requirement-categories', 'all'],
    queryFn: async () => {
      const res = await axios.get('/requirementCategories?isActive=all');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}
