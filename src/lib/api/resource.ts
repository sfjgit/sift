// File: resource.ts
// Path: src/lib/api/resource.ts
//
// Generic REST resource: one line per backend collection gives typed
// list / get / create / update / remove. Paired with createResourceHooks
// (src/hooks/useResource.ts) for react-query caching + toasts.

import { api } from './client';
import type { ListParams, Paginated } from '@/types/api';

export interface ResourceOptions {
  /** HTTP verb for updates — core-service uses PATCH for CRM, PUT for admin masters. */
  updateMethod?: 'patch' | 'put';
}

export interface Resource<TList, TDetail, TCreate, TUpdate> {
  key: string;
  path: string;
  list: (params?: ListParams) => Promise<Paginated<TList>>;
  all: (params?: ListParams) => Promise<TList[]>;
  get: (id: string) => Promise<TDetail>;
  create: (body: TCreate) => Promise<TDetail>;
  update: (id: string, body: TUpdate) => Promise<TDetail>;
  remove: (id: string) => Promise<void>;
}

export function createResource<TList, TDetail = TList, TCreate = Partial<TDetail>, TUpdate = Partial<TCreate>>(
  key: string,
  path: string,
  { updateMethod = 'patch' }: ResourceOptions = {}
): Resource<TList, TDetail, TCreate, TUpdate> {
  return {
    key,
    path,
    list: params => api.page<TList>(path, params),
    /** Non-paginated endpoints (masters, lookups) return a plain array. */
    all: params => api.get<TList[]>(path, params),
    get: id => api.get<TDetail>(`${path}/${id}`),
    create: body => api.post<TDetail>(path, body),
    update: (id, body) => api[updateMethod]<TDetail>(`${path}/${id}`, body),
    remove: id => api.delete(`${path}/${id}`),
  };
}

/** Walks every page — for "export all" (backend caps limit at 100). */
export async function fetchAllPages<T>(
  list: (params: ListParams) => Promise<Paginated<T>>,
  params: ListParams,
  { max = 5000, onProgress }: { max?: number; onProgress?: (done: number, total: number) => void } = {}
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const res = await list({ ...params, page, limit: 100 });
    out.push(...res.data);
    onProgress?.(out.length, Math.min(res.meta.total, max));
    if (page >= res.meta.pages || out.length >= max) break;
    page += 1;
  }
  return out.slice(0, max);
}
