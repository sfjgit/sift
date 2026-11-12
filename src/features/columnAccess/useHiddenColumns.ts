// File: useHiddenColumns.ts
// Path: src/features/columnAccess/useHiddenColumns.ts
//
// The columns an admin has taken away from my role on a table. They are dropped
// before the table sees them: not on screen, not in the column bar, not in
// exports.

'use client';

import { useQuery } from '@tanstack/react-query';
import { columnAccessApi } from '@/lib/api/endpoints';

export const columnAccessKeys = {
  mine: (table: string) => ['column-access', table, 'mine'] as const,
  all: (table: string) => ['column-access', table, 'all'] as const,
};

export function useHiddenColumns(table: string) {
  const q = useQuery({
    queryKey: columnAccessKeys.mine(table),
    queryFn: () => columnAccessApi.mine(table),
    staleTime: 5 * 60_000,
  });
  return { hidden: q.data?.hidden ?? [], ready: !q.isLoading };
}
