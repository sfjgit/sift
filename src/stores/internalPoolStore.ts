// File: internalPoolStore.ts
// Path: src/stores/internalPoolStore.ts

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export interface InternalPoolFilters {
  // ── Core ──────────────────────────────────────────────────────────────────
  keyword: string;
  skills: string[];
  minExp: string;
  maxExp: string;
  city: string;
  state: string;

  // ── Employment Details ────────────────────────────────────────────────────
  maxNoticeDays: string;
  isImmediateJoiner: boolean;
  company: string;
  designation: string;
  source: string;

  // ── Education Details ─────────────────────────────────────────────────────
  degree: string;
  fieldOfStudy: string;

  // ── Salary ────────────────────────────────────────────────────────────────
  minSalary: string;
  maxSalary: string;
}

export interface ActiveContext {
  assignmentId: string;
  requirementId: string;
  reqCode: string;
  requirementTitle: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: InternalPoolFilters;
  requirementId?: string;
  assignmentId?: string;
  lastRunAt?: string;
  runCount?: number;
}

export interface RecentSearch {
  id: string;
  filters: InternalPoolFilters;
  resultCount: number;
  searchedAt: string;
  label: string;
}

export const DEFAULT_FILTERS: InternalPoolFilters = {
  keyword: '',
  skills: [],
  minExp: '',
  maxExp: '',
  city: '',
  state: '',
  maxNoticeDays: '',
  isImmediateJoiner: false,
  company: '',
  designation: '',
  source: '',
  degree: '',
  fieldOfStudy: '',
  minSalary: '',
  maxSalary: '',
};

export function buildSearchLabel(f: InternalPoolFilters): string {
  const parts: string[] = [];
  if (f.keyword) parts.push(f.keyword);
  if (f.skills.length) parts.push(f.skills.slice(0, 3).join(', '));
  if (f.city) parts.push(f.city);
  if (f.minExp || f.maxExp) {
    parts.push(
      f.minExp && f.maxExp
        ? `${f.minExp}-${f.maxExp}y`
        : f.minExp
          ? `${f.minExp}y+`
          : `up to ${f.maxExp}y`
    );
  }
  if (f.isImmediateJoiner) parts.push('Immediate');
  return parts.join(' · ') || 'Search';
}

interface InternalPoolState {
  _hasHydrated: boolean;
  filters: InternalPoolFilters;
  page: number;
  hasSearched: boolean;
  activeContext: ActiveContext | null;
  savedSearches: SavedSearch[];
  recentSearches: RecentSearch[];
  previewCandidateId: string | null;
}

interface InternalPoolActions {
  setHasHydrated: (v: boolean) => void;
  setFilters: (filters: Partial<InternalPoolFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setHasSearched: (v: boolean) => void;
  setActiveContext: (ctx: ActiveContext | null) => void;
  setSavedSearches: (searches: SavedSearch[]) => void;
  addSavedSearch: (search: SavedSearch) => void;
  removeSavedSearch: (id: string) => void;
  pushRecentSearch: (filters: InternalPoolFilters, resultCount: number) => void;
  applyRecentSearch: (search: RecentSearch) => void;
  applySavedSearch: (search: SavedSearch) => void;
  setPreviewCandidateId: (id: string | null) => void;
}

export type InternalPoolStore = InternalPoolState & InternalPoolActions;

export const useInternalPoolStore = create<InternalPoolStore>()(
  persist(
    set => ({
      _hasHydrated: false,
      filters: DEFAULT_FILTERS,
      page: 1,
      hasSearched: false,
      activeContext: null,
      savedSearches: [],
      recentSearches: [],
      previewCandidateId: null,

      setHasHydrated: v => set({ _hasHydrated: v }),

      setFilters: incoming => set(s => ({ filters: { ...s.filters, ...incoming }, page: 1 })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS, page: 1, hasSearched: false }),

      setPage: page => set({ page }),
      setHasSearched: v => set({ hasSearched: v }),
      setActiveContext: ctx => set({ activeContext: ctx }),
      setSavedSearches: searches => set({ savedSearches: searches }),
      addSavedSearch: search => set(s => ({ savedSearches: [search, ...s.savedSearches] })),
      removeSavedSearch: id =>
        set(s => ({
          savedSearches: s.savedSearches.filter(ss => ss.id !== id),
        })),

      pushRecentSearch: (filters, resultCount) =>
        set(s => {
          const label = buildSearchLabel(filters);
          const entry: RecentSearch = {
            id: `rs_${Date.now()}`,
            filters,
            resultCount,
            searchedAt: new Date().toISOString(),
            label,
          };
          const deduped = s.recentSearches.filter(r => r.label !== label);
          return { recentSearches: [entry, ...deduped].slice(0, 10) };
        }),

      applyRecentSearch: search =>
        set({ filters: { ...DEFAULT_FILTERS, ...search.filters }, page: 1, hasSearched: false }),

      applySavedSearch: search =>
        set(s => ({
          filters: { ...DEFAULT_FILTERS, ...search.filters },
          page: 1,
          hasSearched: false,
          savedSearches: s.savedSearches.map(ss =>
            ss.id === search.id
              ? { ...ss, runCount: (ss.runCount ?? 0) + 1, lastRunAt: new Date().toISOString() }
              : ss
          ),
        })),

      setPreviewCandidateId: id => set({ previewCandidateId: id }),
    }),
    {
      name: 'talentos.internal-pool.v2',
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
      partialize: s => ({
        filters: s.filters,
        page: s.page,
        hasSearched: s.hasSearched,
        activeContext: s.activeContext,
        savedSearches: s.savedSearches,
        recentSearches: s.recentSearches,
      }),
    }
  )
);

export function useInternalPoolStoreReady() {
  return useInternalPoolStore(s => s._hasHydrated);
}
