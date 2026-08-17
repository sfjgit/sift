/* eslint-disable @typescript-eslint/no-explicit-any */
// File: requirementsStore.ts
// Path: src/stores/requirementsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColKey =
  | 'code'
  | 'title'
  | 'status'
  | 'priority'
  | 'createdBy'
  | 'client'
  | 'spoc'
  | 'agreement'
  | 'band'
  | 'salaryMin'
  | 'salaryMax'
  | 'reqSaleValue'
  | 'computedSaleValue'
  | 'openings'
  | 'totalFunnel'
  | 'age'
  | 'assignedTo'
  | 'terminalCount'
  | 'achievedValue';

export type TerminalColKey = string; // 'ts_{stageId}'

export interface ColumnTemplate {
  id: string;
  name: string;
  cols: ColKey[];
  terminalCols: TerminalColKey[];
  createdAt: number;
}

export const DEFAULT_COLS: ColKey[] = [
  'code',
  'title',
  'status',
  'priority',
  'createdBy',
  'client',
  'spoc',
  'agreement',
  'band',
  'salaryMin',
  'salaryMax',
  'reqSaleValue',
  'computedSaleValue',
  'openings',
  'totalFunnel',
  'age',
  'assignedTo',
  'terminalCount',
  'achievedValue',
];

const COL_ORDER = new Map(DEFAULT_COLS.map((k, i) => [k, i]));

/** Accepts an array, a Set, or anything else and returns a clean, ordered ColKey[]. */
function sanitizeCols(input: unknown): ColKey[] {
  const arr = input instanceof Set ? [...input] : Array.isArray(input) ? input : null;
  if (!arr) return DEFAULT_COLS;
  const seen = new Set<ColKey>();
  for (const k of arr) if (COL_ORDER.has(k as ColKey)) seen.add(k as ColKey);
  return DEFAULT_COLS.filter(k => seen.has(k));
}

function sanitizeTerminalCols(input: unknown): TerminalColKey[] {
  const arr = input instanceof Set ? [...input] : Array.isArray(input) ? input : null;
  if (!arr) return [];
  return [...new Set(arr.filter((k): k is string => typeof k === 'string'))];
}

/** Setters accept a value or an updater, mirroring React's setState. */
type Updater<T extends readonly unknown[]> = T | ((prev: T) => T | Set<T[number]>);

interface RequirementsStore {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  visibleCols: ColKey[];
  visibleTerminalCols: TerminalColKey[];
  templates: ColumnTemplate[];

  setVisibleCols: (cols: Updater<ColKey[]>) => void;
  toggleCol: (key: ColKey) => void;
  toggleTerminalCol: (key: TerminalColKey) => void;
  setVisibleTerminalCols: (cols: Updater<TerminalColKey[]>) => void;

  saveTemplate: (name: string, cols: ColKey[], terminalCols: TerminalColKey[]) => void;
  applyTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  resetToDefault: () => void;
}

export const useRequirementsStore = create<RequirementsStore>()(
  persist(
    set => ({
      _hasHydrated: false,
      setHasHydrated: v => set({ _hasHydrated: v }),

      visibleCols: DEFAULT_COLS,
      visibleTerminalCols: [],
      templates: [],

      setVisibleCols: cols =>
        set(s => ({
          visibleCols: sanitizeCols(
            typeof cols === 'function' ? cols(sanitizeCols(s.visibleCols)) : cols
          ),
        })),

      setVisibleTerminalCols: cols =>
        set(s => ({
          visibleTerminalCols: sanitizeTerminalCols(
            typeof cols === 'function'
              ? cols(sanitizeTerminalCols(s.visibleTerminalCols))
              : cols
          ),
        })),

      toggleCol: key =>
        set(s => {
          const cur = sanitizeCols(s.visibleCols);
          return {
            visibleCols: cur.includes(key)
              ? cur.filter(k => k !== key)
              : sanitizeCols([...cur, key]),
          };
        }),

      toggleTerminalCol: key =>
        set(s => {
          const cur = sanitizeTerminalCols(s.visibleTerminalCols);
          return {
            visibleTerminalCols: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key],
          };
        }),

      saveTemplate: (name, cols, terminalCols) =>
        set(s => ({
          templates: [
            ...s.templates,
            {
              id: `tpl_${Date.now()}`,
              name,
              cols: sanitizeCols(cols),
              terminalCols: sanitizeTerminalCols(terminalCols),
              createdAt: Date.now(),
            },
          ],
        })),

      applyTemplate: id =>
        set(s => {
          const tpl = s.templates.find(t => t.id === id);
          return tpl
            ? {
                visibleCols: sanitizeCols(tpl.cols),
                visibleTerminalCols: sanitizeTerminalCols(tpl.terminalCols),
              }
            : {};
        }),

      deleteTemplate: id => set(s => ({ templates: s.templates.filter(t => t.id !== id) })),

      resetToDefault: () => set({ visibleCols: DEFAULT_COLS, visibleTerminalCols: [] }),
    }),
    {
      name: 'talentos-requirements-cols-v1',
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
      // Only persist data — never the action functions.
      partialize: s => ({
        visibleCols: s.visibleCols,
        visibleTerminalCols: s.visibleTerminalCols,
        templates: s.templates,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        visibleCols: sanitizeCols(persisted?.visibleCols),
        visibleTerminalCols: sanitizeTerminalCols(persisted?.visibleTerminalCols),
        templates: Array.isArray(persisted?.templates)
          ? persisted.templates.map((t: any) => ({
              ...t,
              cols: sanitizeCols(t?.cols),
              terminalCols: sanitizeTerminalCols(t?.terminalCols),
            }))
          : [],
      }),
    }
  )
);

// Hook — wait for hydration before rendering column-dependent UI
// Same pattern as reportViewStore in reports section
export function useRequirementsStoreReady() {
  return useRequirementsStore(s => s._hasHydrated);
}
