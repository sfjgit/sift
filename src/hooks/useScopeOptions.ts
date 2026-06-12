// File: useScopeOptions.ts
// Path: src/hooks/useScopeOptions.ts

import { useQuery } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import type { ScopeOption } from '@/types/role.types';

export interface UseScopeOptionsResult {
  scopeOptions: ScopeOption[];
  isLoading: boolean;
}

/**
 * Fetches PermissionScope values from GET /roles/scopes.
 * Cache is permanent (staleTime: Infinity) — scopes don't change at runtime.
 * Use this everywhere instead of the old SCOPE_OPTIONS constant.
 */
export function useScopeOptions(): UseScopeOptionsResult {
  const axios = useAxios();

  const { data, isLoading } = useQuery<{ success: boolean; data: ScopeOption[] }>({
    queryKey: ['role-scopes'],
    queryFn: async () => (await axios.get('/roles/scopes')).data,
    staleTime: Infinity,
  });

  return {
    scopeOptions: data?.data ?? [],
    isLoading,
  };
}
