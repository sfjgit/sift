// File: ImportSheetDialog.tsx
// Path: src/components/common/ImportSheetDialog.tsx
//
// Bulk add rows from an Excel / CSV file (CASPA "Bulk Upload"): download the
// template, pick a file, see what was read, import. Rows are added one by one
// through the normal API, so every rule and the activity log still apply;
// rows that fail are listed with the reason and the rest still go in.

'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { downloadRecords } from '@/components/data-table/exporter';
import { toApiError } from '@/lib/api/client';

export interface SheetColumn {
  key: string;
  label: string;
  required?: boolean;
  example?: string;
  /** other header spellings that mean this column */
  aliases?: string[];
}

export type SheetRow = Record<string, string>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function readSheet(file: File, columns: SheetColumn[]) {
  const XLSX = await import('xlsx');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = book.Sheets[book.SheetNames[0]!];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  // header → column key, matched loosely ("Branch Office" = "branch_office" = "BRANCH OFFICE")
  const keyOf = new Map<string, string>();
  for (const c of columns)
    for (const h of [c.label, c.key, ...(c.aliases ?? [])]) keyOf.set(norm(h), c.key);
  return raw
    .map(r => {
      const row: SheetRow = {};
      for (const [h, v] of Object.entries(r)) {
        const k = keyOf.get(norm(h));
        if (k) row[k] = String(v ?? '').trim();
      }
      return row;
    })
    .filter(r => Object.values(r).some(Boolean));
}

export function ImportSheetDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  templateName,
  addRow,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  columns: SheetColumn[];
  templateName: string;
  /** add one row; throw to skip it with that message */
  addRow: (row: SheetRow) => Promise<unknown>;
  onDone?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<{ line: number; reason: string }[]>([]);
  const [finished, setFinished] = useState(false);

  const required = columns.filter(c => c.required);
  const missing = (r: SheetRow) => required.filter(c => !r[c.key]).map(c => c.label);

  const pick = async (f: File | null) => {
    setFile(f);
    setRows(null);
    setReadError(null);
    setFinished(false);
    setFailed([]);
    setDone(0);
    if (!f) return;
    try {
      const read = await readSheet(f, columns);
      if (!read.length) setReadError('No rows found. Is the first row the column headings?');
      setRows(read);
    } catch {
      setReadError('Could not read this file. Save it as .xlsx or .csv and try again.');
    }
  };

  const template = () =>
    void downloadRecords(
      [Object.fromEntries(columns.map(c => [c.label, c.example ?? '']))],
      templateName,
      'xlsx'
    );

  const run = async () => {
    if (!rows) return;
    setBusy(true);
    const fails: { line: number; reason: string }[] = [];
    let ok = 0;
    for (const [i, r] of rows.entries()) {
      const line = i + 2; // heading is line 1
      const gaps = missing(r);
      if (gaps.length) {
        fails.push({ line, reason: `${gaps.join(', ')} missing` });
        continue;
      }
      try {
        await addRow(r);
        ok++;
        setDone(ok);
      } catch (e) {
        fails.push({ line, reason: toApiError(e).message });
      }
    }
    setFailed(fails);
    setBusy(false);
    setFinished(true);
    onDone?.();
  };

  const close = (o: boolean) => {
    if (busy) return;
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Columns:{' '}
            {columns.map((c, i) => (
              <span key={c.key}>
                {i > 0 && ' · '}
                <b className="text-foreground">{c.label}</b>
                {c.required && <span className="text-destructive">*</span>}
              </span>
            ))}
            . First row = headings. Rows are added to what is already there.
            <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={template}>
              <Download className="size-3" /> Excel template
            </Button>
          </div>

          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            {file ? (
              <span className="flex items-center gap-2 font-medium">
                <FileSpreadsheet className="size-4 text-success" /> {file.name}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Paperclip className="size-4" /> Choose an .xlsx or .csv file
              </span>
            )}
          </button>
          <input
            ref={input}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => void pick(e.target.files?.[0] ?? null)}
          />

          {readError && <p className="text-xs text-destructive">{readError}</p>}

          {rows && rows.length > 0 && !finished && (
            <div className="space-y-1.5">
              <p>
                <b>{rows.length}</b> row{rows.length === 1 ? '' : 's'} read
                {rows.some(r => missing(r).length) && (
                  <span className="text-warning-foreground">
                    {' '}
                    · {rows.filter(r => missing(r).length).length} without a required value (they
                    will be skipped)
                  </span>
                )}
              </p>
              <div className="max-h-40 overflow-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      {columns.map(c => (
                        <th
                          key={c.key}
                          className="px-2 py-1 text-left font-medium whitespace-nowrap"
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t">
                        {columns.map(c => (
                          <td key={c.key} className="max-w-40 truncate px-2 py-1">
                            {r[c.key] || <span className="text-muted-foreground">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <p className="text-xs text-muted-foreground">…and {rows.length - 5} more.</p>
              )}
            </div>
          )}

          {busy && (
            <p className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Adding… {done} of {rows?.length}
            </p>
          )}

          {finished && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-success" /> {done} added
                {failed.length > 0 && `, ${failed.length} skipped`}
              </p>
              {failed.length > 0 && (
                <ul className="max-h-36 overflow-auto rounded-lg border px-3 py-2 text-xs">
                  {failed.map(f => (
                    <li key={f.line}>
                      Row {f.line}: <span className="text-muted-foreground">{f.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            {finished ? 'Close' : 'Cancel'}
          </Button>
          {!finished && (
            <Button onClick={() => void run()} disabled={busy || !rows?.length}>
              {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Import
              {rows?.length ? ` ${rows.length} row${rows.length === 1 ? '' : 's'}` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
