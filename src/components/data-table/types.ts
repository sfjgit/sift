// File: types.ts
// Path: src/components/data-table/types.ts

import type { ColumnDef, RowData } from '@tanstack/react-table';
import type { MasterKind } from '@/lib/api/endpoints';
import type { LookupType } from '@/types/org';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Header text in menus / exports (header can be a node) */
    label?: string;
    /** Backend sortBy value — column is sortable only when set */
    sortKey?: string;
    align?: 'left' | 'right' | 'center';
    /** Hidden until the user turns it on */
    defaultHidden?: boolean;
    /** Can't be hidden / reordered (select, name) */
    locked?: boolean;
    /** Pin to the left edge while scrolling sideways */
    sticky?: boolean;
    width?: number;
    /** Plain value for CSV / Excel; defaults to the accessor value */
    exportValue?: (row: TData) => string | number | null | undefined;
  }
}

export type DataColumn<T> = ColumnDef<T, unknown>;

/** shared by every filter: where it sits in the filter sheet and its one-line guide */
interface FilterBase {
  key: string;
  label: string;
  /** section in the filter sheet ("Ownership", "Pipeline"…) */
  group?: string;
  /** one-line guide under the control, and the chip tooltip */
  hint?: string;
}

/** multi: several values, sent as "a,b,c" */
export type FilterDef = FilterBase &
  (
    | { type: 'select'; options: { value: string; label: string }[]; multi?: boolean }
    | { type: 'lookup'; lookupType: LookupType; multi?: boolean }
    | { type: 'master'; kind: MasterKind; multi?: boolean }
    | { type: 'user'; purpose?: 'assign' | 'filter'; multi?: boolean }
    | { type: 'client' }
    | { type: 'date'; placeholder?: string }
    | { type: 'text'; placeholder?: string }
    | { type: 'boolean'; trueLabel?: string; falseLabel?: string }
  );

export type Density = 'compact' | 'comfortable';

export interface SortState {
  id: string;
  desc: boolean;
}

/** Everything a saved view stores — opaque JSON on the backend. */
export interface TableViewConfig {
  search?: string;
  filters?: Record<string, string>;
  /** display labels for filter values that can't be resolved locally (users) */
  filterLabels?: Record<string, string>;
  sort?: SortState | null;
  columnVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  density?: Density;
  limit?: number;
}

export interface TableState extends Required<Omit<TableViewConfig, 'sort'>> {
  page: number;
  sort: SortState | null;
}
