// File: useLocalQuery.ts
// Path: src/components/data-table/useLocalQuery.ts
//
// Adapts a plain (non-paginated) array query — masters, lookups — into the
// paginated shape DataTable expects. Search, filters, sort and paging run
// client-side off table.params, so the table UX is identical to server lists.
//
//   const q = useMasters(kind);
//   const local = useLocalQuery(q, table.params, { searchText: r => `${r.name} ${r.code}` });
//   <DataTable query={local} fetchAll={() => Promise.resolve(local.all)} … />

'use client';

import { useMemo } from 'react';
import type { ListParams, Paginated } from '@/types/api';

interface ArrayQuery<T> {
  data?: T[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
}

const RESERVED = new Set(['page', 'limit', 'search', 'sortBy', 'sortDir']);

export interface LocalQueryOptions<T> {
  /** Text the search box matches against (case-insensitive) */
  searchText?: (row: T) => string;
  /** Sort value for a sortKey; defaults to row[sortKey] */
  sortValue?: (row: T, sortKey: string) => string | number | boolean | null | undefined;
  /** Filter match for a key; defaults to String(row[key]) === value */
  match?: (row: T, key: string, value: string) => boolean;
}

const defaultMatch = <T,>(row: T, key: string, value: string) =>
  String((row as Record<string, unknown>)[key]) === value;

export function useLocalQuery<T>(
  source: ArrayQuery<T>,
  params: ListParams,
  { searchText, sortValue, match = defaultMatch }: LocalQueryOptions<T> = {}
) {
  const { data: rows, isLoading, isFetching, error, refetch } = source;

  // filtered + sorted, unpaged — also what "export all" should download
  const all = useMemo(() => {
    let out = rows ?? [];
    const q = (params.search ?? '').toString().trim().toLowerCase();
    if (q && searchText) out = out.filter(r => searchText(r).toLowerCase().includes(q));

    for (const [key, value] of Object.entries(params)) {
      if (RESERVED.has(key) || value === undefined || value === null || value === '') continue;
      out = out.filter(r => match(r, key, String(value)));
    }

    if (params.sortBy) {
      const key = params.sortBy;
      const dir = params.sortDir === 'desc' ? -1 : 1;
      const get = (r: T) => (sortValue ? sortValue(r, key) : (r as Record<string, unknown>)[key]);
      out = [...out].sort((a, b) => {
        const va = get(a);
        const vb = get(b);
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
      });
    }
    return out;
  }, [rows, params, searchText, sortValue, match]);

  const data = useMemo<Paginated<T> | undefined>(() => {
    if (!rows) return undefined;
    const limit = Number(params.limit) || 25;
    const pages = Math.max(1, Math.ceil(all.length / limit));
    const page = Math.min(Math.max(1, Number(params.page) || 1), pages);
    return {
      data: all.slice((page - 1) * limit, page * limit),
      meta: { total: all.length, page, limit, pages },
    };
  }, [rows, all, params.limit, params.page]);

  return { data, all, isLoading, isFetching, error, refetch };
}
