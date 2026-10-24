// File: useResource.ts
// Path: src/hooks/useResource.ts
//
// react-query hooks generated from a Resource. Every mutation toasts and
// invalidates the resource's cache key, so lists and details stay in sync.

'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Resource } from '@/lib/api/resource';
import type { ApiError } from '@/lib/api/client';
import type { ListParams } from '@/types/api';

export function createResourceHooks<TList, TDetail, TCreate, TUpdate>(
  resource: Resource<TList, TDetail, TCreate, TUpdate>,
  labels: { singular: string }
) {
  const keys = {
    all: [resource.key] as const,
    list: (params?: ListParams) => [resource.key, 'list', params ?? {}] as const,
    detail: (id: string) => [resource.key, 'detail', id] as const,
  };

  const useList = (params?: ListParams, opts: { enabled?: boolean } = {}) =>
    useQuery({
      queryKey: keys.list(params),
      queryFn: () => resource.list(params),
      placeholderData: keepPreviousData,
      enabled: opts.enabled ?? true,
    });

  const useDetail = (id?: string | null) =>
    useQuery({
      queryKey: keys.detail(id ?? ''),
      queryFn: () => resource.get(id!),
      enabled: !!id,
    });

  const useCreate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (body: TCreate) => resource.create(body),
      onSuccess: () => {
        toast.success(`${labels.singular} created`);
        qc.invalidateQueries({ queryKey: keys.all });
      },
      onError: (e: ApiError) => toast.error(e.message),
    });
  };

  const useUpdate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: TUpdate }) => resource.update(id, body),
      onSuccess: () => {
        toast.success(`${labels.singular} updated`);
        qc.invalidateQueries({ queryKey: keys.all });
      },
      onError: (e: ApiError) => toast.error(e.message),
    });
  };

  const useRemove = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => resource.remove(id),
      onSuccess: () => {
        toast.success(`${labels.singular} removed`);
        qc.invalidateQueries({ queryKey: keys.all });
      },
      onError: (e: ApiError) => toast.error(e.message),
    });
  };

  return { keys, useList, useDetail, useCreate, useUpdate, useRemove };
}

/** Ad-hoc mutation with the same toast + invalidate behaviour. */
export function useAction<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  {
    success,
    invalidate = [],
    onSuccess,
  }: {
    success?: string | ((r: TResult, v: TVars) => string);
    invalidate?: QueryKey[];
    onSuccess?: (r: TResult, v: TVars) => void;
  } = {}
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, v) => {
      if (success) toast.success(typeof success === 'function' ? success(r, v) : success);
      invalidate.forEach(queryKey => qc.invalidateQueries({ queryKey }));
      onSuccess?.(r, v);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
