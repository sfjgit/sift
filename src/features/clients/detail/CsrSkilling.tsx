// File: CsrSkilling.tsx
// Path: src/features/clients/detail/CsrSkilling.tsx
//
// "CSR skilling programmes" — the CASPA section, in the same order:
//   1. attachments by financial year (BRSR for listed companies, CSR report,
//      impact assessment, annual report, action plan + budget / spent / unspent)
//   2. add / replace for one year (amounts + one file per report type, one Save)
//   3. saved programmes with totals (summary like CASPA, or every detail)
//   4. add programme(s) in rows, or import a sheet

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InlineEmpty, SubSection } from '@/components/common/SubSection';
import { Pill } from '@/components/common/badges';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { ImportSheetDialog } from '@/components/common/ImportSheetDialog';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { clientHooks, useLookups } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { fmtInr, fmtNumber } from '@/lib/format';
import { currentFy, lastClosedFy, previousFy } from '@/lib/fy';
import { parseSdgs, sdgLabel } from '@/lib/sdg';
import type { ClientCsrProgram, ClientDetail, ClientDocument } from '@/types/crm';
import { CsrProgramDialog } from './CsrProgramDialog';
import { PROGRAM_COLUMNS, ProgramTable, exportPrograms, useProgramFromRow } from './CsrTab';
import { UploadDialog, YearGrid } from './DocumentsPanel';

const REPORT_TYPES = ['BRSR', 'CSR_REPORT', 'IMPACT_REPORT', 'ANNUAL_REPORT', 'CSR_ACTION_PLAN'];
const MAX_MB = 25;

const rupees = (s: string) => {
  const n = Number(s.replace(/[,₹\s]/g, ''));
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : null;
};
const asText = (v: string | null | undefined) => (v ? String(Number(v)) : '');
const firstNumber = (s: string | null) => {
  const m = s?.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

/** this year, the last two closed years, and any year already on file */
function fyOptions(client: ClientDetail) {
  const last = lastClosedFy();
  return [
    ...new Set([
      currentFy(),
      last,
      previousFy(last),
      ...(client.csrFinancials ?? []).map(f => f.fy),
      ...(client.documents ?? []).map(d => d.fy),
    ]),
  ].sort((a, b) => b.localeCompare(a));
}

export function CsrSkilling({ client }: { client: ClientDetail }) {
  const { can, isSuperAdmin } = usePermissions();
  const confirm = useConfirm();
  const { data: types = [] } = useLookups('DOCUMENT_TYPE');
  const programs = client.csrPrograms ?? [];
  const [upload, setUpload] = useState<{ typeId: string; fy: string } | null>(null);
  const [dialog, setDialog] = useState<{ row: ClientCsrProgram | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const [view, setView] = useState<'summary' | 'detail'>('summary');
  const qc = useQueryClient();
  const programFromRow = useProgramFromRow(client.id);

  const remove = useAction((r: ClientCsrProgram) => clientsApi.removeCsrProgram(client.id, r.id), {
    success: (_, r) => `“${r.name}” removed`,
    invalidate: [clientHooks.keys.all],
  });
  const unlock = useAction(
    (r: ClientCsrProgram) => clientsApi.updateCsrProgram(client.id, r.id, { isLocked: false }),
    {
      success: (_, r) => `“${r.name}” handed back to the pipeline`,
      invalidate: [clientHooks.keys.all],
    }
  );
  const askRemove = async (r: ClientCsrProgram) =>
    (await confirm({
      title: `Remove “${r.name}” (FY ${r.fy})?`,
      description: 'The recycle bin keeps it.',
      destructive: true,
      confirmLabel: 'Remove',
    })) && remove.mutate(r);

  const openDoc = async (d: ClientDocument) => {
    try {
      const { url } = await clientsApi.documentUrl(client.id, d.id);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error(toApiError(e).message);
    }
  };

  const canDocs = can('client_documents.read');
  const canYear = can('client_documents.upload') || can('client_financials.update');

  return (
    <div className="space-y-6">
      {canDocs && (
        <SubSection
          title="Attachments — by financial year"
          description="The reports on file for each year, with that year’s CSR figures"
        >
          <YearGrid
            client={client}
            types={types}
            onOpen={d => void openDoc(d)}
            onUpload={
              can('client_documents.upload') ? (typeId, fy) => setUpload({ typeId, fy }) : undefined
            }
          />
        </SubSection>
      )}

      {canYear && (
        <SubSection
          title="Add / replace for a year"
          description="Pick the year: its saved amounts and files show; change what you need and save once"
        >
          <YearForm client={client} types={types} />
        </SubSection>
      )}

      {can('client_programs.read') && (
        <SubSection
          title="Saved programmes"
          description={`${programs.length} programme${programs.length === 1 ? '' : 's'} · amounts in ₹`}
          actions={
            <>
              {programs.length > 0 && (
                <Segmented
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'summary', label: 'Summary' },
                    { value: 'detail', label: 'All details' },
                  ]}
                />
              )}
              {isSuperAdmin && programs.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void exportPrograms(client.name, programs)}
                >
                  <Download /> Export
                </Button>
              )}
              {can('client_programs.create') && (
                <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
                  <FileSpreadsheet /> Import from Excel
                </Button>
              )}
            </>
          }
        >
          {programs.length === 0 ? (
            <InlineEmpty>
              No programmes yet. The pipeline reads them from CSR reports, or add them below.
            </InlineEmpty>
          ) : view === 'summary' ? (
            <SummaryTable
              client={client}
              rows={programs}
              onOpenDoc={d => void openDoc(d)}
              onEdit={can('client_programs.update') ? r => setDialog({ row: r }) : undefined}
              onRemove={can('client_programs.delete') ? r => void askRemove(r) : undefined}
            />
          ) : (
            <ProgramTable
              rows={programs}
              onEdit={can('client_programs.update') ? r => setDialog({ row: r }) : undefined}
              onUnlock={can('client_programs.update') ? r => unlock.mutate(r) : undefined}
              onRemove={can('client_programs.delete') ? r => void askRemove(r) : undefined}
            />
          )}
        </SubSection>
      )}

      {can('client_programs.create') && (
        <SubSection
          title="Add programme(s)"
          description="One row per programme; add rows as needed and save them together"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setDialog({ row: null })}>
              <Plus /> Full form
            </Button>
          }
        >
          <AddRows
            client={client}
            addRow={programFromRow}
            onSaved={() => void qc.invalidateQueries({ queryKey: clientHooks.keys.all })}
          />
        </SubSection>
      )}

      {upload && (
        <UploadDialog
          client={client}
          open
          preset={upload}
          onOpenChange={o => !o && setUpload(null)}
        />
      )}
      {dialog && (
        <CsrProgramDialog
          clientId={client.id}
          program={dialog.row}
          open
          onOpenChange={o => !o && setDialog(null)}
        />
      )}
      {importing && (
        <ImportSheetDialog
          open
          onOpenChange={setImporting}
          title="Import CSR programmes"
          description={`Adds programmes to ${client.name} from an Excel or CSV file. Amounts in rupees.`}
          templateName="csr-programmes-template"
          columns={PROGRAM_COLUMNS}
          addRow={programFromRow}
          onDone={() => void qc.invalidateQueries({ queryKey: clientHooks.keys.all })}
        />
      )}
    </div>
  );
}

// ── 2. one year: amounts + a file per report type ───────────────────────────

function YearForm({
  client,
  types,
}: {
  client: ClientDetail;
  types: { id: string; code: string; label: string }[];
}) {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const years = fyOptions(client);
  const fin = client.csrFinancials ?? [];
  const docs = client.documents ?? [];
  const canMoney = can('client_financials.update');
  const canFiles = can('client_documents.upload');

  const amountsOf = (fy: string) => {
    const f = fin.find(x => x.fy === fy);
    return {
      budget: asText(f?.budgetRs),
      spent: asText(f?.spentRs),
      unspent: asText(f?.unspentRs),
    };
  };
  const [fy, setFy] = useState(lastClosedFy);
  const [amounts, setAmounts] = useState(() => amountsOf(lastClosedFy()));
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);

  const pickYear = (next: string) => {
    setFy(next);
    setAmounts(amountsOf(next));
    setFiles({});
  };

  const hasBrsr = docs.some(d => d.type.code === 'BRSR');
  const cols = REPORT_TYPES.filter(c => c !== 'BRSR' || client.isListed || hasBrsr)
    .map(code => types.find(t => t.code === code))
    .filter((t): t is { id: string; code: string; label: string } => !!t);

  const saved = amountsOf(fy);
  const moneyChanged =
    amounts.budget !== saved.budget ||
    amounts.spent !== saved.spent ||
    amounts.unspent !== saved.unspent;
  const dirty = moneyChanged || Object.keys(files).length > 0;

  const save = async () => {
    for (const [k, v] of Object.entries(amounts))
      if (v.trim() && rupees(v) === null) return toast.error(`${k} is not an amount in rupees`);
    const big = Object.values(files).find(f => f.size > MAX_MB * 1024 * 1024);
    if (big) return toast.error(`${big.name} is over ${MAX_MB} MB`);
    setBusy(true);
    const done: string[] = [];
    try {
      if (moneyChanged)
        await clientsApi.saveCsrFinancial(client.id, {
          fy,
          budgetRs: rupees(amounts.budget),
          spentRs: rupees(amounts.spent),
          unspentRs: rupees(amounts.unspent),
        });
      if (moneyChanged) done.push('amounts');
      for (const [typeId, file] of Object.entries(files)) {
        await clientsApi.uploadDocument(client.id, file, typeId, fy);
        done.push(types.find(t => t.id === typeId)?.label ?? 'file');
      }
      toast.success(`FY ${fy} saved — ${done.join(', ')}`);
      setFiles({});
    } catch (e) {
      toast.error(
        `${done.length ? `Saved ${done.join(', ')}; then: ` : ''}${toApiError(e).message}`
      );
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: clientHooks.keys.all });
    }
  };

  const money = (key: 'budget' | 'spent' | 'unspent', label: string) => (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Input
        value={amounts[key]}
        onChange={e => setAmounts(a => ({ ...a, [key]: e.target.value }))}
        inputMode="decimal"
        placeholder="₹"
        disabled={!canMoney}
        className="h-8 tabular"
      />
    </label>
  );

  return (
    <div className="space-y-3 rounded-xl border bg-surface/40 p-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Financial year
          <Select value={fy} onValueChange={pickYear}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {money('budget', 'Total CSR budget (₹)')}
        {money('spent', 'Total CSR spent (₹)')}
        {money('unspent', 'Total CSR unspent (₹)')}
      </div>

      {canFiles && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cols.map(t => {
            const onFile = docs.find(d => d.type.id === t.id && d.fy === fy);
            const picked = files[t.id];
            return (
              <div key={t.id} className="rounded-lg border bg-card px-3 py-2">
                <p className="text-xs font-medium">{t.label}</p>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {onFile
                    ? `On file: ${onFile.fileName ?? t.label}`
                    : 'Nothing on file for this year'}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
                    <Paperclip className="size-3" />
                    {picked ? 'Change file' : onFile ? 'Replace' : 'Choose file'}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setFiles(x => ({ ...x, [t.id]: f }));
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {picked && (
                    <span className="flex min-w-0 items-center gap-1 text-xs">
                      <span className="truncate font-medium">{picked.name}</span>
                      <button
                        type="button"
                        aria-label="Remove file"
                        onClick={() =>
                          setFiles(x =>
                            Object.fromEntries(Object.entries(x).filter(([k]) => k !== t.id))
                          )
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {client.isListed
            ? 'Listed company — BRSR applies.'
            : 'BRSR shows for listed companies (set “Listed” under Client information).'}{' '}
          A new file replaces the one on file for that year.
        </p>
        <Button size="sm" onClick={() => void save()} disabled={!dirty || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />} Save FY {fy}
        </Button>
      </div>
    </div>
  );
}

// ── 3. the CASPA summary table ──────────────────────────────────────────────

function SummaryTable({
  client,
  rows,
  onOpenDoc,
  onEdit,
  onRemove,
}: {
  client: ClientDetail;
  rows: ClientCsrProgram[];
  onOpenDoc: (d: ClientDocument) => void;
  onEdit?: (r: ClientCsrProgram) => void;
  onRemove?: (r: ClientCsrProgram) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.fy.localeCompare(a.fy) || a.name.localeCompare(b.name));
  const reportOf = (fy: string) =>
    client.documents?.find(d => d.fy === fy && d.type.code === 'CSR_REPORT') ??
    client.documents?.find(d => d.fy === fy && d.type.code === 'ANNUAL_REPORT');
  const budget = rows.reduce((n, r) => n + Number(r.budgetRs ?? 0), 0);
  const people = rows.reduce((n, r) => n + firstNumber(r.beneficiaries), 0);

  return (
    <div className="crm-box overflow-x-auto">
      <table className="crm-sheet">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>FY</th>
            <th>Programme</th>
            <th>Development sector</th>
            <th>SDG mapping</th>
            <th>Execution locations</th>
            <th className="text-right">Budget</th>
            <th className="text-right">Beneficiaries</th>
            <th>Implementor</th>
            <th>Report</th>
            {(onEdit || onRemove) && <th className="w-16" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const sector = r.sectors.map(s => s.sector.label).join(', ') || r.sectorText;
            const places =
              [
                ...new Set(r.locations.map(l => [l.district, l.state].filter(Boolean).join(', '))),
              ].join(' · ') || r.locationNote;
            const rep = reportOf(r.fy);
            return (
              <tr key={r.id}>
                <td className="text-muted-foreground tabular">{i + 1}</td>
                <td className="whitespace-nowrap">
                  <Pill tone="info" dot={false}>
                    {r.fy}
                  </Pill>
                </td>
                <td className="max-w-64 font-medium" title={r.name}>
                  <span className="line-clamp-2">{r.name}</span>
                </td>
                <td className="max-w-48" title={sector ?? ''}>
                  <span className="line-clamp-2">{sector || '—'}</span>
                </td>
                <td title={(r.sdgs ?? []).map(sdgLabel).join(', ')}>
                  {r.sdgs?.length ? (
                    <span className="flex flex-wrap gap-1">
                      {r.sdgs.map(n => (
                        <Pill key={n} tone="success" dot={false}>
                          SDG {n}
                        </Pill>
                      ))}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="max-w-56" title={places ?? ''}>
                  <span className="line-clamp-2">{places || '—'}</span>
                </td>
                <td className="text-right whitespace-nowrap tabular">
                  {r.budgetRs ? fmtInr(r.budgetRs) : '—'}
                </td>
                <td className="text-right tabular">{r.beneficiaries ?? '—'}</td>
                <td className="max-w-48" title={r.agency?.name ?? ''}>
                  <span className="line-clamp-2">
                    {r.agency?.name ?? (r.mode === 'DIRECT' ? 'Direct' : '—')}
                  </span>
                </td>
                <td>
                  {rep ? (
                    <button
                      type="button"
                      onClick={() => onOpenDoc(rep)}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Eye className="size-3.5" /> View
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                {(onEdit || onRemove) && (
                  <td className="px-1!">
                    <span className="flex justify-end">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Edit ${r.name}`}
                          onClick={() => onEdit(r)}
                        >
                          <Pencil />
                        </Button>
                      )}
                      {onRemove && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${r.name}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onRemove(r)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/60 font-semibold">
            <td colSpan={6} className="text-right">
              Total
            </td>
            <td className="text-right whitespace-nowrap tabular">{fmtInr(String(budget))}</td>
            <td className="text-right tabular">{people ? fmtNumber(people) : '—'}</td>
            <td colSpan={onEdit || onRemove ? 3 : 2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── 4. add programmes in rows ───────────────────────────────────────────────

interface Draft {
  key: number;
  fy: string;
  name: string;
  sector: string;
  sdgs: string;
  locations: string;
  budget: string;
  beneficiaries: string;
  implementor: string;
}

let nextKey = 1;
const blank = (fy: string): Draft => ({
  key: nextKey++,
  fy,
  name: '',
  sector: '',
  sdgs: '',
  locations: '',
  budget: '',
  beneficiaries: '',
  implementor: '',
});

function AddRows({
  client,
  addRow,
  onSaved,
}: {
  client: ClientDetail;
  addRow: (r: Record<string, string>) => Promise<unknown>;
  onSaved: () => void;
}) {
  const years = fyOptions(client);
  const [rows, setRows] = useState<Draft[]>(() => [blank(lastClosedFy())]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (key: number, patch: Partial<Draft>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const filled = rows.filter(r => r.name.trim());

  const save = async () => {
    setBusy(true);
    const errs: Record<number, string> = {};
    const kept: Draft[] = [];
    let ok = 0;
    for (const r of rows) {
      if (!r.name.trim()) {
        if (Object.values(r).some(v => typeof v === 'string' && v.trim() && v !== r.fy)) {
          errs[r.key] = 'Programme name is required';
          kept.push(r);
        }
        continue;
      }
      try {
        await addRow({
          fy: r.fy,
          name: r.name,
          sector: r.sector,
          sdgs: r.sdgs,
          locations: r.locations,
          budget: r.budget,
          beneficiaries: r.beneficiaries,
          implementor: r.implementor,
        });
        ok++;
      } catch (e) {
        errs[r.key] = toApiError(e).message;
        kept.push(r);
      }
    }
    setErrors(errs);
    setRows(kept.length ? kept : [blank(rows[rows.length - 1]?.fy ?? lastClosedFy())]);
    setBusy(false);
    if (ok) {
      toast.success(`${ok} programme${ok === 1 ? '' : 's'} added`);
      onSaved();
    }
  };

  const cell = (r: Draft, k: keyof Omit<Draft, 'key' | 'fy'>, placeholder: string, cls = '') => (
    <Input
      value={r[k]}
      onChange={e => set(r.key, { [k]: e.target.value })}
      placeholder={placeholder}
      className={`h-8 ${cls}`}
    />
  );

  return (
    <div className="space-y-2">
      {rows.map(r => {
        const sdgs = parseSdgs(r.sdgs);
        return (
          <div key={r.key} className="rounded-xl border bg-surface/40 p-2.5">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[140px_2fr_1.2fr_1fr_32px]">
              <Select value={r.fy} onValueChange={v => set(r.key, { fy: v })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cell(r, 'name', 'Programme name *')}
              {cell(r, 'sector', 'Development sector')}
              {cell(r, 'sdgs', 'SDGs e.g. 4, 8')}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove row"
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  setRows(rs => (rs.length > 1 ? rs.filter(x => x.key !== r.key) : [blank(r.fy)]))
                }
              >
                <X />
              </Button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_140px_140px_1.5fr_32px]">
              {cell(r, 'locations', 'Execution locations')}
              {cell(r, 'budget', 'Budget ₹', 'tabular')}
              {cell(r, 'beneficiaries', 'Beneficiaries')}
              {cell(r, 'implementor', 'Implementor')}
            </div>
            {(sdgs.length > 0 || errors[r.key]) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
                {sdgs.map(n => (
                  <Pill key={n} tone="success" dot={false}>
                    SDG {n} · {sdgLabel(n)}
                  </Pill>
                ))}
                {errors[r.key] && <span className="text-destructive">{errors[r.key]}</span>}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRows(rs => [...rs, blank(rs[rs.length - 1]?.fy ?? lastClosedFy())])}
        >
          <Plus /> Add another row
        </Button>
        <Button size="sm" onClick={() => void save()} disabled={busy || filled.length === 0}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />} Save
          {filled.length > 1 ? ` ${filled.length} programmes` : ''}
        </Button>
      </div>
    </div>
  );
}
