'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

// File: reportViewStore.ts
// Path: src/stores/reportViewStore.ts
//
// Per-table column layout + saved views ("templates"), kept in this browser.
//   Working state  hiddenColumns + columnOrder per table key
//   Saved views    name + hidden + order; one can be the table's DEFAULT,
//                  applied automatically the next time the table opens
// Table keys are built by callers (e.g. `reports.recruiterActivity:<lineId>`),
// so each service line keeps its own stage columns — nothing hardcoded here.

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_SAVED_VIEWS = 10;
export const VIEW_NAME_MAX = 40;

export type ReportTableKey = string;

export interface SavedReportView {
  id: string;
  name: string;
  tableKey: ReportTableKey;
  /** Hidden ids only. Anything absent is visible, so new columns default to on. */
  hiddenColumns: string[];
  /** Column order (movable columns only). Empty = natural order. New columns go last. */
  columnOrder: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveResult {
  ok: boolean;
  id?: string;
  error?: string;
}

interface ReportViewState {
  hiddenColumns: Record<ReportTableKey, string[]>;
  columnOrder: Record<ReportTableKey, string[]>;
  activeViewId: Record<ReportTableKey, string | null>;
  defaultViewId: Record<ReportTableKey, string | null>;
  views: SavedReportView[];
}

interface ReportViewActions {
  toggleColumn: (tableKey: ReportTableKey, columnId: string) => void;
  setHiddenColumns: (tableKey: ReportTableKey, columnIds: string[]) => void;
  showAllColumns: (tableKey: ReportTableKey) => void;
  hideAllColumns: (tableKey: ReportTableKey, hidableIds: string[]) => void;
  setColumnOrder: (tableKey: ReportTableKey, columnIds: string[]) => void;
  resetColumnOrder: (tableKey: ReportTableKey) => void;
  saveView: (tableKey: ReportTableKey, name: string) => SaveResult;
  updateView: (viewId: string) => SaveResult;
  renameView: (viewId: string, name: string) => SaveResult;
  deleteView: (viewId: string) => void;
  applyView: (viewId: string) => void;
  clearActiveView: (tableKey: ReportTableKey) => void;
  /** Pass null to remove the default for that table */
  setDefaultView: (tableKey: ReportTableKey, viewId: string | null) => void;
}

export type ReportViewStore = ReportViewState & ReportViewActions;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

const sameList = (a: string[], b: string[]) => a.length === b.length && a.join('|') === b.join('|');

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, VIEW_NAME_MAX);

export const useReportViewStore = create<ReportViewStore>()(
  persist(
    (set, get) => ({
      hiddenColumns: {},
      columnOrder: {},
      activeViewId: {},
      defaultViewId: {},
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

      setColumnOrder: (tableKey, columnIds) =>
        set(state => ({
          columnOrder: { ...state.columnOrder, [tableKey]: [...new Set(columnIds)] },
        })),

      resetColumnOrder: tableKey =>
        set(state => ({ columnOrder: { ...state.columnOrder, [tableKey]: [] } })),

      saveView: (tableKey, rawName) => {
        const name = cleanName(rawName);
        if (!name) return { ok: false, error: 'Give the view a name first.' };

        const { views, hiddenColumns, columnOrder } = get();
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
          columnOrder: [...(columnOrder[tableKey] ?? [])],
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
        const order = [...(get().columnOrder[target.tableKey] ?? [])];
        set(state => ({
          views: state.views.map(v =>
            v.id === viewId
              ? {
                  ...v,
                  hiddenColumns: hidden,
                  columnOrder: order,
                  updatedAt: new Date().toISOString(),
                }
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
          const defaultViewId = { ...state.defaultViewId };
          if (target && activeViewId[target.tableKey] === viewId)
            activeViewId[target.tableKey] = null;
          if (target && defaultViewId[target.tableKey] === viewId)
            defaultViewId[target.tableKey] = null;
          return { views: state.views.filter(v => v.id !== viewId), activeViewId, defaultViewId };
        }),

      applyView: viewId =>
        set(state => {
          const view = state.views.find(v => v.id === viewId);
          if (!view) return state;
          return {
            hiddenColumns: { ...state.hiddenColumns, [view.tableKey]: [...view.hiddenColumns] },
            columnOrder: { ...state.columnOrder, [view.tableKey]: [...(view.columnOrder ?? [])] },
            activeViewId: { ...state.activeViewId, [view.tableKey]: view.id },
          };
        }),

      clearActiveView: tableKey =>
        set(state => ({ activeViewId: { ...state.activeViewId, [tableKey]: null } })),

      setDefaultView: (tableKey, viewId) =>
        set(state => ({ defaultViewId: { ...state.defaultViewId, [tableKey]: viewId } })),
    }),
    {
      // Default engine is localStorage — everything stays on the user's machine.
      name: 'talentos.reports.views',
      version: 2,
      // v1 → v2: add column order + default views; existing views keep natural order
      migrate: (persisted: any, version) => {
        const s = persisted ?? {};
        if (version < 2) {
          return {
            hiddenColumns: s.hiddenColumns ?? {},
            columnOrder: {},
            activeViewId: s.activeViewId ?? {},
            defaultViewId: {},
            views: (s.views ?? []).map((v: SavedReportView) => ({
              ...v,
              columnOrder: v.columnOrder ?? [],
            })),
          };
        }
        return s;
      },
      partialize: state => ({
        hiddenColumns: state.hiddenColumns,
        columnOrder: state.columnOrder,
        activeViewId: state.activeViewId,
        defaultViewId: state.defaultViewId,
        views: state.views,
      }),
    }
  )
);

/**
 * localStorage is synchronous, so `persist` hydrates inside `create()` above —
 * before any component mounts. What the UI needs is "am I past the first client
 * render?", so persisted values can be read without an SSR hydration mismatch.
 */
export function useReportViewsReady() {
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReady(true), []);
  return ready;
}

const EMPTY: string[] = [];

/**
 * Everything a table needs for its layout, in one hook.
 * Applies the table's DEFAULT view once, the first time the table opens in a
 * session with no view active.
 */
export function useReportTableLayout(tableKey: ReportTableKey) {
  const ready = useReportViewsReady();
  const hiddenRaw = useReportViewStore(s => s.hiddenColumns[tableKey]);
  const orderRaw = useReportViewStore(s => s.columnOrder[tableKey]);
  const activeId = useReportViewStore(s => s.activeViewId[tableKey] ?? null);
  const defaultId = useReportViewStore(s => s.defaultViewId[tableKey] ?? null);
  const applyView = useReportViewStore(s => s.applyView);
  const setColumnOrder = useReportViewStore(s => s.setColumnOrder);

  useEffect(() => {
    if (ready && !activeId && defaultId) applyView(defaultId);
  }, [ready, activeId, defaultId, applyView]);

  return {
    ready,
    hidden: ready ? (hiddenRaw ?? EMPTY) : EMPTY,
    order: ready ? (orderRaw ?? EMPTY) : EMPTY,
    setOrder: (ids: string[]) => setColumnOrder(tableKey, ids),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR HELPERS — selectors must return stable references
// ─────────────────────────────────────────────────────────────────────────────

export const selectHidden = (tableKey: ReportTableKey) => (s: ReportViewStore) =>
  s.hiddenColumns[tableKey];

export const selectActiveViewId = (tableKey: ReportTableKey) => (s: ReportViewStore) =>
  s.activeViewId[tableKey] ?? null;

export const viewsForTable = (views: SavedReportView[], tableKey: ReportTableKey) =>
  views.filter(v => v.tableKey === tableKey);

/** Unsaved changes = visibility OR order differs from the active view */
export const isViewDirty = (
  views: SavedReportView[],
  activeId: string | null,
  hidden: string[],
  order: string[] = []
) => {
  if (!activeId) return hidden.length > 0 || order.length > 0;
  const view = views.find(v => v.id === activeId);
  if (!view) return true;
  return !sameSet(view.hiddenColumns, hidden) || !sameList(view.columnOrder ?? [], order);
};
