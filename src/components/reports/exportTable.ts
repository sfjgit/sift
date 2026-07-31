// File: exportTable.ts
// Path: src/components/reports/exportTable.ts

import { visibleColumns, type ColumnDef } from './DataTable';

export type ExportCellValue = string | number | boolean | null | undefined;

export interface LocalExportOptions<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  /** Same hidden-id list the table renders with — keeps export and screen identical. */
  hiddenColumns?: string[];
  filename: string;
  sheetName?: string;
}

export interface LocalExportResult {
  ok: boolean;
  rows: number;
  columns: number;
  reason?: 'no-rows' | 'no-columns' | 'failed';
  error?: unknown;
}

interface FlatField<T> {
  label: string;
  value: (row: T, index: number) => ExportCellValue;
}

/**
 * Flattens the on-screen columns into spreadsheet fields. Columns with no
 * `exportValue`/`exportFields` (selection boxes, chevrons, action buttons) drop out.
 */
export function resolveExportFields<T>(
  columns: ColumnDef<T>[],
  hidden: string[] = []
): FlatField<T>[] {
  const fields: FlatField<T>[] = [];

  for (const col of visibleColumns(columns, hidden)) {
    if (col.exportFields?.length) {
      for (const f of col.exportFields) fields.push({ label: f.label, value: f.value });
    } else if (col.exportValue) {
      fields.push({ label: col.label, value: col.exportValue });
    }
  }

  // Excel rejects duplicate-ish headers less gracefully than humans do — de-dupe.
  const seen = new Map<string, number>();
  return fields.map(f => {
    const n = (seen.get(f.label) ?? 0) + 1;
    seen.set(f.label, n);
    return n === 1 ? f : { ...f, label: `${f.label} (${n})` };
  });
}

const normalize = (v: ExportCellValue): string | number => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isFinite(v) ? v : '';
  return v;
};

/** Excel forbids : \ / ? * [ ] in sheet names and caps them at 31 chars. */
const safeSheetName = (name: string) =>
  (name.replace(/[:\\/?*[\]]/g, '-').trim() || 'Report').slice(0, 31);

function buildMatrix<T>(fields: FlatField<T>[], rows: T[]) {
  const header = fields.map(f => f.label);
  const body = rows.map((row, i) => fields.map(f => normalize(f.value(row, i))));
  return { header, body };
}

/**
 * Builds an .xlsx in the browser from data already in memory. No request, no
 * server work — so it reflects the current view (columns, order, selection) exactly.
 */
export async function exportViewToXlsx<T>({
  columns,
  rows,
  hiddenColumns = [],
  filename,
  sheetName = 'Report',
}: LocalExportOptions<T>): Promise<LocalExportResult> {
  const fields = resolveExportFields(columns, hiddenColumns);
  if (!rows.length) return { ok: false, rows: 0, columns: fields.length, reason: 'no-rows' };
  if (!fields.length) return { ok: false, rows: rows.length, columns: 0, reason: 'no-columns' };

  try {
    // Dynamic import keeps SheetJS out of the initial route bundle.
    const XLSX = await import('xlsx');
    const { header, body } = buildMatrix(fields, rows);

    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);

    ws['!cols'] = header.map((label, ci) => ({
      wch: Math.min(
        44,
        Math.max(label.length + 2, ...body.map(r => String(r[ci] ?? '').length + 2), 8)
      ),
    }));

    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: body.length, c: header.length - 1 },
      }),
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);

    return { ok: true, rows: body.length, columns: header.length };
  } catch (error) {
    console.error('[reports] local xlsx export failed', error);
    return { ok: false, rows: rows.length, columns: fields.length, reason: 'failed', error };
  }
}

/** Zero-dependency fallback — useful if you would rather not ship SheetJS. */
export function exportViewToCsv<T>({
  columns,
  rows,
  hiddenColumns = [],
  filename,
}: LocalExportOptions<T>): LocalExportResult {
  const fields = resolveExportFields(columns, hiddenColumns);
  if (!rows.length) return { ok: false, rows: 0, columns: fields.length, reason: 'no-rows' };
  if (!fields.length) return { ok: false, rows: rows.length, columns: 0, reason: 'no-columns' };

  const { header, body } = buildMatrix(fields, rows);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [header, ...body].map(r => r.map(esc).join(',')).join('\r\n');
  // BOM so Excel reads UTF-8 names correctly.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  return { ok: true, rows: body.length, columns: header.length };
}
