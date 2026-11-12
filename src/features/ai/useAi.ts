// File: useAi.ts
// Path: src/features/ai/useAi.ts
//
// The signed-in user's AI assistant state (GET /ai/me): whether it is on,
// which modes they may use / switched on, and their command quota.

'use client';

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import type { AiMe, AiQuota } from '@/types/ai';

export const AI_ME_KEY = ['ai', 'me'] as const;

export function useAiMe(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: AI_ME_KEY,
    queryFn: aiApi.me,
    staleTime: 60_000,
    enabled: opts.enabled ?? true,
    // 4xx (no permission, switched off) won't change on a retry
    retry: (count, err) =>
      !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
  });
}

export const invalidateAiMe = (qc: QueryClient) => qc.invalidateQueries({ queryKey: AI_ME_KEY });

/** refresh /ai/me; optionally patch the command quota right away from a response */
export function useRefreshAiMe() {
  const qc = useQueryClient();
  return (quota?: AiQuota) => {
    if (quota) {
      qc.setQueryData<AiMe>(AI_ME_KEY, me =>
        me ? { ...me, quota: { ...me.quota, command: quota } } : me
      );
    }
    void invalidateAiMe(qc);
  };
}

/** "42 / 100 today" · "Unlimited" */
export function quotaLabel(q: AiQuota | null | undefined) {
  if (!q || q.max === null) return 'Unlimited';
  const per = q.period === 'WEEK' ? 'this week' : q.period === 'MONTH' ? 'this month' : 'today';
  return `${q.used} / ${q.max} ${per}`;
}

/** shown wherever the assistant is offered */
export const READ_ONLY_NOTE =
  'Read-only — I open pages and filters for you; I can’t change anything.';
