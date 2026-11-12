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

export interface ExportSheet {
  name: string;
  rows: Record<string, string | number>[];
}

/** Excel: one workbook, the table first then one sheet per extra; CSV: one file each */
export async function downloadRecords(
  records: Record<string, string | number>[],
  name: string,
  fmt: ExportFormat,
  extra: ExportSheet[] = []
) {
  const XLSX = await import('xlsx');
  const day = format(new Date(), 'yyyy-MM-dd');
  const sheetOf = (rows: Record<string, string | number>[]) =>
    rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['(nothing)']]);
  if (fmt === 'xlsx') {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheetOf(records), name.slice(0, 31));
    for (const s of extra) XLSX.utils.book_append_sheet(book, sheetOf(s.rows), s.name.slice(0, 31));
    XLSX.writeFile(book, `${name}-${day}.xlsx`, { bookType: 'xlsx' });
    return;
  }
  for (const [i, s] of [{ name, rows: records }, ...extra].entries()) {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheetOf(s.rows), s.name.slice(0, 31));
    const file = i === 0 ? name : `${name}-${s.name.toLowerCase().replace(/\W+/g, '-')}`;
    XLSX.writeFile(book, `${file}-${day}.csv`, { bookType: 'csv' });
  }
}
