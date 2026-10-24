// File: useTableState.ts
// Path: src/components/data-table/useTableState.ts
//
// Table state in one place:
//   • page / search / sort / filters → URL query (shareable links, back button)
//   • columns / density / page size  → localStorage per table (personal prefs)
//   • saved views apply / capture the whole thing
// The URL is written with history.replaceState so typing in search doesn't
// spam history or re-render the route.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ListParams } from '@/types/api';
import type { Density, SortState, TableState, TableViewConfig } from './types';

const PREF_KEY = (id: string) => `crm:table:${id}`;
const PAGE_SIZES = [10, 25, 50, 100] as const;
export { PAGE_SIZES };

interface Defaults {
  sort?: SortState | null;
  limit?: number;
  filters?: Record<string, string>;
  density?: Density;
  /** false for tables embedded in another page (detail tabs) — keeps the URL clean */
  syncUrl?: boolean;
}

const readPrefs = (id: string): Partial<TableState> => {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY(id)) ?? '{}');
  } catch {
    return {};
  }
};

const readUrl = (filterKeys: string[]) => {
  if (typeof window === 'undefined') return null;
  const sp = new URLSearchParams(window.location.search);
  if (![...sp.keys()].length) return null;
  const filters: Record<string, string> = {};
  for (const k of filterKeys) {
    const v = sp.get(k);
    if (v) filters[k] = v;
  }
  const sortRaw = sp.get('sort');
  return {
    page: Math.max(1, Number(sp.get('page')) || 1),
    search: sp.get('q') ?? '',
    sort: sortRaw ? { id: sortRaw.replace(/^-/, ''), desc: sortRaw.startsWith('-') } : undefined,
    filters,
  };
};

export function useTableState(id: string, filterKeys: string[], defaults: Defaults = {}) {
  const filterKeysRef = useRef(filterKeys);
  const defaultsRef = useRef(defaults);

  const [state, setState] = useState<TableState>(() => {
    const prefs = typeof window === 'undefined' ? {} : readPrefs(id);
    const url = defaults.syncUrl === false ? null : readUrl(filterKeys);
    return {
      page: url?.page ?? 1,
      search: url?.search ?? '',
      sort: url?.sort ?? defaults.sort ?? null,
      filters: url?.filters ?? defaults.filters ?? {},
      filterLabels: {},
      columnVisibility: prefs.columnVisibility ?? {},
      columnOrder: prefs.columnOrder ?? [],
      density: prefs.density ?? defaults.density ?? 'comfortable',
      limit: prefs.limit ?? defaults.limit ?? 25,
    };
  });

  /** true when the page opened with filters in the URL — skip auto default view */
  const [fromUrl] = useState(() => defaults.syncUrl !== false && readUrl(filterKeys) !== null);

  // persist personal prefs
  useEffect(() => {
    try {
      localStorage.setItem(
        PREF_KEY(id),
        JSON.stringify({
          columnVisibility: state.columnVisibility,
          columnOrder: state.columnOrder,
          density: state.density,
          limit: state.limit,
        })
      );
    } catch {
      /* storage full / private mode — prefs just won't stick */
    }
  }, [id, state.columnVisibility, state.columnOrder, state.density, state.limit]);

  // mirror query state into the URL
  const syncUrl = defaults.syncUrl !== false;
  useEffect(() => {
    if (!syncUrl) return;
    // only touch the keys this table owns — other params (?run=, ?tab=) survive
    const sp = new URLSearchParams(window.location.search);
    ['q', 'page', 'sort', ...filterKeysRef.current].forEach(k => sp.delete(k));
    if (state.search) sp.set('q', state.search);
    if (state.page > 1) sp.set('page', String(state.page));
    if (state.sort) sp.set('sort', `${state.sort.desc ? '-' : ''}${state.sort.id}`);
    Object.entries(state.filters).forEach(([k, v]) => v && sp.set(k, v));
    const qs = sp.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [syncUrl, state.search, state.page, state.sort, state.filters]);

  const patch = useCallback((p: Partial<TableState>) => setState(s => ({ ...s, ...p })), []);

  const actions = useMemo(
    () => ({
      setPage: (page: number) => patch({ page }),
      setLimit: (limit: number) => patch({ limit, page: 1 }),
      setSearch: (search: string) => patch({ search, page: 1 }),
      setSort: (sort: SortState | null) => patch({ sort, page: 1 }),
      setDensity: (density: Density) => patch({ density }),
      setColumnVisibility: (columnVisibility: Record<string, boolean>) => patch({ columnVisibility }),
      setColumnOrder: (columnOrder: string[]) => patch({ columnOrder }),
      setFilter: (key: string, value: string | null, label?: string) =>
        setState(s => {
          const filters = { ...s.filters };
          const filterLabels = { ...s.filterLabels };
          if (value) {
            filters[key] = value;
            if (label) filterLabels[key] = label;
          } else {
            delete filters[key];
            delete filterLabels[key];
          }
          return { ...s, filters, filterLabels, page: 1 };
        }),
      clearFilters: () => patch({ filters: defaultsRef.current.filters ?? {}, filterLabels: {}, search: '', page: 1 }),
      resetColumns: () => patch({ columnVisibility: {}, columnOrder: [] }),
      applyView: (v: TableViewConfig) =>
        setState(s => ({
          ...s,
          page: 1,
          search: v.search ?? '',
          filters: Object.fromEntries(
            Object.entries(v.filters ?? {}).filter(([k]) => filterKeysRef.current.includes(k))
          ),
          filterLabels: v.filterLabels ?? {},
          sort: v.sort ?? defaultsRef.current.sort ?? null,
          columnVisibility: v.columnVisibility ?? s.columnVisibility,
          columnOrder: v.columnOrder ?? s.columnOrder,
          density: v.density ?? s.density,
          limit: v.limit ?? s.limit,
        })),
    }),
    [patch]
  );

  const captureView = useCallback(
    (): TableViewConfig => ({
      search: state.search || undefined,
      filters: state.filters,
      filterLabels: state.filterLabels,
      sort: state.sort,
      columnVisibility: state.columnVisibility,
      columnOrder: state.columnOrder,
      density: state.density,
      limit: state.limit,
    }),
    [state]
  );

  /** Params for the list endpoint — sort ids map to backend sortBy via column meta upstream */
  const params = useMemo<ListParams>(
    () => ({
      page: state.page,
      limit: state.limit,
      search: state.search || undefined,
      sortBy: state.sort?.id,
      sortDir: state.sort ? (state.sort.desc ? 'desc' : 'asc') : undefined,
      ...state.filters,
    }),
    [state.page, state.limit, state.search, state.sort, state.filters]
  );

  const activeFilterCount = Object.keys(state.filters).length + (state.search ? 1 : 0);

  return { state, params, actions, captureView, fromUrl, activeFilterCount };
}

export type TableController = ReturnType<typeof useTableState>;
