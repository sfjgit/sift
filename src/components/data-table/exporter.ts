// File: exporter.ts
// Path: src/components/data-table/exporter.ts
//
// CSV / Excel export of the visible columns. xlsx is loaded on demand so it
// stays out of the main bundle.

import type { Table } from '@tanstack/react-table';
import { format } from 'date-fns';

export type ExportFormat = 'csv' | 'xlsx';

export function rowsToRecords<T>(table: Table<T>, rows: T[]) {
  const cols = table.getVisibleLeafColumns().filter(c => c.id !== '__select' && c.id !== '__actions');
  return rows.map(row => {
    const rec: Record<string, string | number> = {};
    for (const c of cols) {
      const meta = c.columnDef.meta;
      const key = meta?.label ?? c.id;
      let v: unknown;
      if (meta?.exportValue) v = meta.exportValue(row);
      else if ('accessorFn' in c.columnDef && c.columnDef.accessorFn) v = c.columnDef.accessorFn(row, 0);
      else if ('accessorKey' in c.columnDef) v = (row as Record<string, unknown>)[c.columnDef.accessorKey as string];
      rec[key] = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : (v as string | number);
    }
    return rec;
  });
}

export async function downloadRecords(records: Record<string, string | number>[], name: string, fmt: ExportFormat) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(records);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, name.slice(0, 31));
  XLSX.writeFile(book, `${name}-${format(new Date(), 'yyyy-MM-dd')}.${fmt}`, { bookType: fmt });
}
