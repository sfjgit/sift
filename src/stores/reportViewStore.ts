'use client';

// File: reportViewStore.ts
// Path: src/stores/reportViewStore.ts

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_SAVED_VIEWS = 10;
export const VIEW_NAME_MAX = 40;

/**
 * A table key namespaces both the working column state and the saved views.
 * Callers build it (e.g. `reports.recruiters:<serviceLineId>`) so each service
 * line keeps its own stage columns — nothing here is a hardcoded union.
 */
export type ReportTableKey = string;

export interface SavedReportView {
  id: string;
  name: string;
  tableKey: ReportTableKey;
  /** Hidden ids only. Anything absent is visible, so new columns default to on. */
  hiddenColumns: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveResult {
  ok: boolean;
  id?: string;
  error?: string;
}

interface ReportViewState {
  /** Working (unsaved) visibility per table key. */
  hiddenColumns: Record<ReportTableKey, string[]>;
  /** Which saved view each table currently has applied. */
  activeViewId: Record<ReportTableKey, string | null>;
  views: SavedReportView[];
}

interface ReportViewActions {
  toggleColumn: (tableKey: ReportTableKey, columnId: string) => void;
  setHiddenColumns: (tableKey: ReportTableKey, columnIds: string[]) => void;
  showAllColumns: (tableKey: ReportTableKey) => void;
  hideAllColumns: (tableKey: ReportTableKey, hidableIds: string[]) => void;
  saveView: (tableKey: ReportTableKey, name: string) => SaveResult;
  updateView: (viewId: string) => SaveResult;
  renameView: (viewId: string, name: string) => SaveResult;
  deleteView: (viewId: string) => void;
  applyView: (viewId: string) => void;
  clearActiveView: (tableKey: ReportTableKey) => void;
}

export type ReportViewStore = ReportViewState & ReportViewActions;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, VIEW_NAME_MAX);

export const useReportViewStore = create<ReportViewStore>()(
  persist(
    (set, get) => ({
      hiddenColumns: {},
      activeViewId: {},
      views: [],

      toggleColumn: (tableKey, columnId) =>
        set(state => {
          const current = state.hiddenColumns[tableKey] ?? [];
          const next = current.includes(columnId)
            ? current.filter(id => id !== columnId)
            : [...current, columnId];
          return { hiddenColumns: { ...state.hiddenColumns, [tableKey]: next } };
        }),

      setHiddenColumns: (tableKey, columnIds) =>
        set(state => ({
          hiddenColumns: { ...state.hiddenColumns, [tableKey]: [...new Set(columnIds)] },
        })),

      showAllColumns: tableKey =>
        set(state => ({ hiddenColumns: { ...state.hiddenColumns, [tableKey]: [] } })),

      hideAllColumns: (tableKey, hidableIds) =>
        set(state => ({
          hiddenColumns: { ...state.hiddenColumns, [tableKey]: [...new Set(hidableIds)] },
        })),

      saveView: (tableKey, rawName) => {
        const name = cleanName(rawName);
        if (!name) return { ok: false, error: 'Give the view a name first.' };

        const { views, hiddenColumns } = get();
        const scoped = views.filter(v => v.tableKey === tableKey);

        if (scoped.length >= MAX_SAVED_VIEWS)
          return {
            ok: false,
            error: `You can keep ${MAX_SAVED_VIEWS} views per table. Delete one to add another.`,
          };

        if (scoped.some(v => v.name.toLowerCase() === name.toLowerCase()))
          return { ok: false, error: 'A view with that name already exists.' };

        const now = new Date().toISOString();
        const view: SavedReportView = {
          id: newId(),
          name,
          tableKey,
          hiddenColumns: [...(hiddenColumns[tableKey] ?? [])],
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          views: [...state.views, view],
          activeViewId: { ...state.activeViewId, [tableKey]: view.id },
        }));

        return { ok: true, id: view.id };
      },

      updateView: viewId => {
        const target = get().views.find(v => v.id === viewId);
        if (!target) return { ok: false, error: 'That view no longer exists.' };

        const hidden = [...(get().hiddenColumns[target.tableKey] ?? [])];
        set(state => ({
          views: state.views.map(v =>
            v.id === viewId
              ? { ...v, hiddenColumns: hidden, updatedAt: new Date().toISOString() }
              : v
          ),
          activeViewId: { ...state.activeViewId, [target.tableKey]: viewId },
        }));

        return { ok: true, id: viewId };
      },

      renameView: (viewId, rawName) => {
        const name = cleanName(rawName);
        if (!name) return { ok: false, error: 'Name cannot be empty.' };

        const target = get().views.find(v => v.id === viewId);
        if (!target) return { ok: false, error: 'That view no longer exists.' };

        const clash = get().views.some(
          v =>
            v.id !== viewId &&
            v.tableKey === target.tableKey &&
            v.name.toLowerCase() === name.toLowerCase()
        );
        if (clash) return { ok: false, error: 'A view with that name already exists.' };

        set(state => ({
          views: state.views.map(v =>
            v.id === viewId ? { ...v, name, updatedAt: new Date().toISOString() } : v
          ),
        }));

        return { ok: true, id: viewId };
      },

      deleteView: viewId =>
        set(state => {
          const target = state.views.find(v => v.id === viewId);
          const activeViewId = { ...state.activeViewId };
          if (target && activeViewId[target.tableKey] === viewId)
            activeViewId[target.tableKey] = null;
          return { views: state.views.filter(v => v.id !== viewId), activeViewId };
        }),

      applyView: viewId =>
        set(state => {
          const view = state.views.find(v => v.id === viewId);
          if (!view) return state;
          return {
            hiddenColumns: {
              ...state.hiddenColumns,
              [view.tableKey]: [...view.hiddenColumns],
            },
            activeViewId: { ...state.activeViewId, [view.tableKey]: view.id },
          };
        }),

      clearActiveView: tableKey =>
        set(state => ({ activeViewId: { ...state.activeViewId, [tableKey]: null } })),
    }),
    {
      // Default engine is localStorage — everything stays on the user's machine.
      name: 'talentos.reports.views',
      version: 1,
      partialize: state => ({
        hiddenColumns: state.hiddenColumns,
        activeViewId: state.activeViewId,
        views: state.views,
      }),
    }
  )
);

/**
 * localStorage is synchronous, so `persist` finishes hydrating inside `create()`
 * above — before any component mounts. Registering `onFinishHydration` out here
 * would therefore never fire. What the UI actually needs is "am I past the first
 * client render?", so the persisted values can be read without tripping an SSR
 * hydration mismatch. That is what this returns.
 */
export function useReportViewsReady() {
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReady(true), []);
  return ready;
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR HELPERS
// Selectors must return stable references — do not filter inside useStore.
// ─────────────────────────────────────────────────────────────────────────────

export const selectHidden = (tableKey: ReportTableKey) => (s: ReportViewStore) =>
  s.hiddenColumns[tableKey];

export const selectActiveViewId = (tableKey: ReportTableKey) => (s: ReportViewStore) =>
  s.activeViewId[tableKey] ?? null;

export const viewsForTable = (views: SavedReportView[], tableKey: ReportTableKey) =>
  views.filter(v => v.tableKey === tableKey);

export const isViewDirty = (
  views: SavedReportView[],
  activeId: string | null,
  hidden: string[]
) => {
  if (!activeId) return hidden.length > 0;
  const view = views.find(v => v.id === activeId);
  if (!view) return true;
  return !sameSet(view.hiddenColumns, hidden);
};
