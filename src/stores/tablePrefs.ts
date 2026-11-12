// File: tablePrefs.ts
// Path: src/stores/tablePrefs.ts
//
// How each user arranged each table (columns shown, their order, density, rows
// per page) — per user + per table. Kept in this browser (zustand persist) and
// mirrored to the server as a hidden saved view (module "layout:<table>"), so the
// same layout comes back after logging in on another machine.

'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { viewsApi } from '@/lib/api/endpoints';
import type { Density } from '@/components/data-table/types';

export interface TablePrefs {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  density: Density;
  limit: number;
  /** the table's default-layout version this was arranged against; an older
   *  layout's columns give way once to new defaults (density / rows stay) */
  layoutVersion?: number;
  /** ms — newest copy (browser vs server) wins */
  updatedAt: number;
}

interface PrefsState {
  prefs: Record<string, TablePrefs>;
  save: (key: string, p: Omit<TablePrefs, 'updatedAt'>, updatedAt?: number) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    return localStorage;
  } catch {
    // private mode / blocked storage: keep it in memory for this tab
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const useTablePrefs = create<PrefsState>()(
  persist(
    set => ({
      prefs: {},
      save: (key, p, updatedAt = Date.now()) =>
        set(s => ({ prefs: { ...s.prefs, [key]: { ...p, updatedAt } } })),
    }),
    { name: 'crm:table-prefs', storage: safeStorage, version: 1 }
  )
);

export const prefsKey = (userId: string | undefined, tableId: string) =>
  `${userId ?? 'anon'}:${tableId}`;

/** settings saved before prefs were per user (one copy per browser) */
export const legacyPrefs = (tableId: string): Partial<TablePrefs> => {
  try {
    return JSON.parse(localStorage.getItem(`crm:table:${tableId}`) ?? '{}');
  } catch {
    return {};
  }
};

// ── server copy ──────────────────────────────────────────────────────────────

const LAYOUT_MODULE = (tableId: string) => `layout:${tableId}`.slice(0, 50);
const serverIds = new Map<string, string>(); // table → its saved-view id

/** the server's copy, if any (null when none / offline) */
export async function fetchServerPrefs(tableId: string): Promise<TablePrefs | null> {
  try {
    const views = await viewsApi.list<TablePrefs>(LAYOUT_MODULE(tableId));
    const mine = views.find(v => v.isOwner);
    if (!mine) return null;
    serverIds.set(tableId, mine.id);
    return mine.config;
  } catch {
    return null;
  }
}

/** write the layout to the server (quietly — the browser copy is enough to carry on) */
export async function pushServerPrefs(tableId: string, p: TablePrefs) {
  try {
    const id = serverIds.get(tableId);
    if (id) {
      await viewsApi.update(id, { config: p });
    } else {
      const v = await viewsApi.create({ module: LAYOUT_MODULE(tableId), name: 'My layout', config: p });
      serverIds.set(tableId, v.id);
    }
  } catch {
    serverIds.delete(tableId); // deleted elsewhere / offline: create again next time
  }
}
