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

interface RequirementsStore {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  visibleCols: ColKey[];
  visibleTerminalCols: TerminalColKey[];
  templates: ColumnTemplate[];

  setVisibleCols: (cols: ColKey[]) => void;
  toggleCol: (key: ColKey) => void;
  toggleTerminalCol: (key: TerminalColKey) => void;
  setVisibleTerminalCols: (cols: TerminalColKey[]) => void;

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

      setVisibleCols: cols => set({ visibleCols: cols }),
      setVisibleTerminalCols: cols => set({ visibleTerminalCols: cols }),

      toggleCol: key =>
        set(s => ({
          visibleCols: s.visibleCols.includes(key)
            ? s.visibleCols.filter(k => k !== key)
            : [...s.visibleCols, key],
        })),

      toggleTerminalCol: key =>
        set(s => ({
          visibleTerminalCols: s.visibleTerminalCols.includes(key)
            ? s.visibleTerminalCols.filter(k => k !== key)
            : [...s.visibleTerminalCols, key],
        })),

      saveTemplate: (name, cols, terminalCols) =>
        set(s => ({
          templates: [
            ...s.templates,
            { id: `tpl_${Date.now()}`, name, cols, terminalCols, createdAt: Date.now() },
          ],
        })),

      applyTemplate: id =>
        set(s => {
          const tpl = s.templates.find(t => t.id === id);
          return tpl ? { visibleCols: tpl.cols, visibleTerminalCols: tpl.terminalCols } : {};
        }),

      deleteTemplate: id => set(s => ({ templates: s.templates.filter(t => t.id !== id) })),

      resetToDefault: () => set({ visibleCols: DEFAULT_COLS, visibleTerminalCols: [] }),
    }),
    {
      name: 'talentos-requirements-cols-v1',
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
      merge: (persisted: any, current) => ({
        ...current,
        visibleCols: Array.isArray(persisted?.visibleCols) ? persisted.visibleCols : DEFAULT_COLS,
        visibleTerminalCols: Array.isArray(persisted?.visibleTerminalCols)
          ? persisted.visibleTerminalCols
          : [],
        templates: Array.isArray(persisted?.templates) ? persisted.templates : [],
      }),
    }
  )
);

// Hook — wait for hydration before rendering column-dependent UI
// Same pattern as reportViewStore in reports section
export function useRequirementsStoreReady() {
  return useRequirementsStore(s => s._hasHydrated);
}
