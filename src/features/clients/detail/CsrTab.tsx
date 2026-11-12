// File: CsrTab.tsx
// Path: src/features/clients/detail/CsrTab.tsx
//
// "Financials & reports": CSR figures and company figures per financial year
// (client_financials.read; editable with client_financials.update), CSR
// programmes, and the reports / attachments. One row per FY — history is kept.

'use client';

import { useState } from 'react';
import { Download, ExternalLink, Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineEmpty, SubSection } from '@/components/common/SubSection';
import { Pill } from '@/components/common/badges';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { ColumnChart, Legend } from '@/components/charts/Charts';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtInr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { downloadRecords } from '@/components/data-table/exporter';
import type {
  ClientCorporateFinancial,
  ClientCsrFinancial,
  ClientCsrProgram,
  ClientDetail,
} from '@/types/crm';
import { CsrProgramDialog } from './CsrProgramDialog';
import { DocumentsPanel } from './DocumentsPanel';
import { CorporateFigureDialog, CsrFigureDialog } from './FinancialDialogs';

const FIN_SERIES = [
  { key: 'spent', label: 'Spent' },
  { key: 'unspent', label: 'Unspent' },
];

function RowActions({
  label,
  locked,
  onEdit,
  onRemove,
}: {
  label: string;
  locked: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <span className="flex items-center justify-end gap-0.5">
      {locked && (
        <Lock
          className="mr-1 size-3 text-muted-foreground"
          aria-label="Entered or confirmed by a person"
        />
      )}
      {onEdit && (
        <Button variant="ghost" size="icon-xs" aria-label={`Edit ${label}`} onClick={onEdit}>
          <Pencil />
        </Button>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Remove ${label}`}
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      )}
    </span>
  );
}

function FigureTable<T extends { id: string; fy: string; isLocked: boolean }>({
  rows,
  columns,
  onEdit,
  onRemove,
}: {
  rows: T[];
  columns: { label: string; value: (r: T) => string | null; strong?: boolean }[];
  onEdit?: (r: T) => void;
  onRemove?: (r: T) => void;
}) {
  return (
    <div className="crm-box overflow-x-auto">
      <table className="crm-sheet">
        <thead>
          <tr>
            <th>FY</th>
            {columns.map(c => (
              <th key={c.label} className="num">
                {c.label}
              </th>
            ))}
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="font-medium whitespace-nowrap">{r.fy}</td>
              {columns.map(c => (
                <td key={c.label} className={cn('num', c.strong && 'font-semibold')}>
                  {fmtInr(c.value(r))}
                </td>
              ))}
              <td className="px-1!">
                <RowActions
                  label={`FY ${r.fy}`}
                  locked={r.isLocked}
                  onEdit={onEdit && (() => onEdit(r))}
                  onRemove={onRemove && (() => onRemove(r))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const yesNo = (v: boolean | null, yes: string, no: string) => (v === null ? '—' : v ? yes : no);

/** one row per programme — the report's project table, one value per column */
function ProgramTable({
  rows,
  onEdit,
  onUnlock,
  onRemove,
}: {
  rows: ClientCsrProgram[];
  onEdit?: (r: ClientCsrProgram) => void;
  onUnlock?: (r: ClientCsrProgram) => void;
  onRemove?: (r: ClientCsrProgram) => void;
}) {
  const head = [
    'FY',
    'Programme',
    'Sectors',
    'States',
    'Districts',
    'Allocated',
    'Spent',
    'To unspent a/c',
    'Mode',
    'Agency',
    'CSR-1 no.',
    'Duration',
    'Local area',
    'Beneficiaries',
  ];
  const right = new Set(['Allocated', 'Spent', 'To unspent a/c']);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-[13.5px]">
        <thead>
          <tr>
            {head.map(h => (
              <th
                key={h}
                className={cn(
                  'h-9 border-r border-b bg-muted px-3 text-left text-[12px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase',
                  right.has(h) && 'text-right'
                )}
              >
                {h}
              </th>
            ))}
            <th className="h-9 w-24 border-b bg-muted" />
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map(r => {
            const states = [...new Set(r.locations.map(l => l.state))];
            const districts = r.locations.map(l => l.district).filter(Boolean);
            return (
              <tr key={r.id} className="hover:bg-accent/40">
                <td className="h-9 border-r border-b px-3 whitespace-nowrap">{r.fy}</td>
                <td className="max-w-72 truncate border-r border-b px-3 font-medium" title={r.name}>
                  {r.sourceUrl ? (
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary"
                    >
                      {r.name} <ExternalLink className="inline size-3 opacity-60" />
                    </a>
                  ) : (
                    r.name
                  )}
                </td>
                <td
                  className="max-w-64 truncate border-r border-b px-3"
                  title={r.sectors.map(s => s.sector.label).join(', ') || r.sectorText || ''}
                >
                  {r.sectors.length ? (
                    <span className="flex gap-1">
                      {r.sectors.map(s => (
                        <Pill key={s.sector.id} tone="success" dot={false}>
                          {s.sector.label.split(/[,&]/)[0]!.trim()}
                        </Pill>
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{r.sectorText ?? '—'}</span>
                  )}
                </td>
                <td
                  className="max-w-48 truncate border-r border-b px-3"
                  title={states.join(', ') || r.locationNote || ''}
                >
                  {states.join(', ') || (
                    <span className="text-muted-foreground">{r.locationNote ?? '—'}</span>
                  )}
                </td>
                <td
                  className="max-w-48 truncate border-r border-b px-3"
                  title={districts.join(', ')}
                >
                  {districts.join(', ') || '—'}
                </td>
                <td className="border-r border-b px-3 text-right whitespace-nowrap">
                  {fmtInr(r.budgetRs)}
                </td>
                <td className="border-r border-b px-3 text-right font-semibold whitespace-nowrap">
                  {fmtInr(r.spentRs)}
                </td>
                <td className="border-r border-b px-3 text-right whitespace-nowrap">
                  {fmtInr(r.unspentTransferredRs)}
                </td>
                <td className="border-r border-b px-3 whitespace-nowrap">
                  {r.mode === 'DIRECT' ? 'Direct' : r.mode === 'AGENCY' ? 'Agency' : '—'}
                </td>
                <td
                  className="max-w-56 truncate border-r border-b px-3"
                  title={r.agency?.name ?? ''}
                >
                  {r.agency?.name ?? '—'}
                </td>
                <td className="border-r border-b px-3 font-mono text-[12.5px] whitespace-nowrap">
                  {r.agency?.registrationNo ?? '—'}
                </td>
                <td className="border-r border-b px-3 whitespace-nowrap">
                  {r.duration ?? yesNo(r.isOngoing, 'Ongoing', 'One year')}
                </td>
                <td className="border-r border-b px-3 whitespace-nowrap">
                  {yesNo(r.isLocalArea, 'Yes', 'No')}
                </td>
                <td
                  className="max-w-48 truncate border-r border-b px-3"
                  title={r.beneficiaries ?? ''}
                >
                  {r.beneficiaries ?? '—'}
                </td>
                <td className="border-b px-2">
                  <span className="flex items-center justify-end gap-0.5">
                    {r.isLocked && onUnlock && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Locked by a person — hand back to the pipeline"
                        aria-label={`Unlock ${r.name}`}
                        onClick={() => onUnlock(r)}
                      >
                        <Unlock />
                      </Button>
                    )}
                    <RowActions
                      label={r.name}
                      locked={r.isLocked && !onUnlock}
                      onEdit={onEdit && (() => onEdit(r))}
                      onRemove={onRemove && (() => onRemove(r))}
                    />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="tabular">
          <tr className="bg-muted/60 font-semibold">
            <td colSpan={5} className="h-9 border-r px-3 text-right">
              Total
            </td>
            <td className="border-r px-3 text-right whitespace-nowrap">
              {fmtInr(sumOf(rows, r => r.budgetRs))}
            </td>
            <td className="border-r px-3 text-right whitespace-nowrap">
              {fmtInr(sumOf(rows, r => r.spentRs))}
            </td>
            <td className="border-r px-3 text-right whitespace-nowrap">
              {fmtInr(sumOf(rows, r => r.unspentTransferredRs))}
            </td>
            <td colSpan={7} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const sumOf = (rows: ClientCsrProgram[], get: (r: ClientCsrProgram) => string | null) =>
  String(rows.reduce((n, r) => n + Number(get(r) ?? 0), 0));

/** the programmes as an Excel sheet — same columns as on screen */
const exportPrograms = (clientName: string, rows: ClientCsrProgram[]) =>
  downloadRecords(
    rows.map(r => ({
      FY: r.fy,
      Programme: r.name,
      Sectors: r.sectors.map(s => s.sector.label).join(', ') || r.sectorText || '',
      States: [...new Set(r.locations.map(l => l.state))].join(', ') || r.locationNote || '',
      Districts: r.locations
        .map(l => l.district)
        .filter(Boolean)
        .join(', '),
      'Allocated (₹)': r.budgetRs ? Number(r.budgetRs) : '',
      'Spent (₹)': r.spentRs ? Number(r.spentRs) : '',
      'To unspent a/c (₹)': r.unspentTransferredRs ? Number(r.unspentTransferredRs) : '',
      Mode: r.mode === 'DIRECT' ? 'Direct' : r.mode === 'AGENCY' ? 'Agency' : '',
      Agency: r.agency?.name ?? '',
      'CSR-1 no.': r.agency?.registrationNo ?? '',
      Duration: r.duration ?? '',
      Beneficiaries: r.beneficiaries ?? '',
      Source: r.sourceUrl ?? '',
    })),
    `${clientName}-csr-programmes`.replace(/[^\w-]+/g, '-'),
    'xlsx'
  );

export function CsrTab({
  client,
  withDocuments = true,
}: {
  client: ClientDetail;
  /** the client page shows reports in their own section */
  withDocuments?: boolean;
}) {
  const { can } = usePermissions();
  const confirm = useConfirm();
  const canEdit = can('client_financials.update');
  const fin = client.csrFinancials ?? [];
  const corp = client.corporateFinancials ?? [];
  const programs = client.csrPrograms ?? [];
  const [programDialog, setProgramDialog] = useState<{ row: ClientCsrProgram | null } | null>(null);
  const [csrDialog, setCsrDialog] = useState<{ row: ClientCsrFinancial | null } | null>(null);
  const [corpDialog, setCorpDialog] = useState<{ row: ClientCorporateFinancial | null } | null>(
    null
  );

  const removeCsr = useAction(
    (r: ClientCsrFinancial) => clientsApi.removeCsrFinancial(client.id, r.id),
    {
      success: (_, r) => `FY ${r.fy} removed`,
      invalidate: [clientHooks.keys.all],
    }
  );
  const removeCorp = useAction(
    (r: ClientCorporateFinancial) => clientsApi.removeCorporateFinancial(client.id, r.id),
    { success: (_, r) => `FY ${r.fy} removed`, invalidate: [clientHooks.keys.all] }
  );
  const removeProgram = useAction(
    (r: ClientCsrProgram) => clientsApi.removeCsrProgram(client.id, r.id),
    { success: (_, r) => `“${r.name}” removed`, invalidate: [clientHooks.keys.all] }
  );
  const unlockProgram = useAction(
    (r: ClientCsrProgram) => clientsApi.updateCsrProgram(client.id, r.id, { isLocked: false }),
    {
      success: (_, r) => `“${r.name}” handed back to the pipeline`,
      invalidate: [clientHooks.keys.all],
    }
  );
  const ask = (fy: string) =>
    confirm({
      title: `Remove the figures for FY ${fy}?`,
      description: 'The year disappears from the client. The activity log keeps a record.',
      destructive: true,
      confirmLabel: 'Remove',
    });

  const chartData = [...fin]
    .sort((a, b) => a.fy.localeCompare(b.fy))
    .map(f => ({
      label: f.fy,
      spent: Number(f.spentRs ?? 0) / 1e7,
      unspent: Number(f.unspentRs ?? 0) / 1e7,
    }));

  return (
    <div className="space-y-6">
      {can('client_financials.read') ? (
        <>
          <SubSection
            title="CSR spend"
            description="Figures per financial year · chart in ₹ crore"
            actions={
              <>
                {fin.length > 0 && <Legend series={FIN_SERIES} />}
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setCsrDialog({ row: null })}>
                    <Plus /> Add year
                  </Button>
                )}
              </>
            }
          >
            {fin.length === 0 ? (
              <InlineEmpty>
                No CSR figures yet. The pipeline fills them from filings, or add a year by hand.
              </InlineEmpty>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
                <ColumnChart data={chartData} series={FIN_SERIES} height={220} />
                <FigureTable
                  rows={fin}
                  columns={[
                    { label: 'Obligation', value: r => r.obligationRs },
                    { label: 'Budget', value: r => r.budgetRs },
                    { label: 'Spent', value: r => r.spentRs, strong: true },
                    { label: 'Unspent', value: r => r.unspentRs },
                  ]}
                  onEdit={canEdit ? r => setCsrDialog({ row: r }) : undefined}
                  onRemove={
                    canEdit ? async r => void ((await ask(r.fy)) && removeCsr.mutate(r)) : undefined
                  }
                />
              </div>
            )}
          </SubSection>

          <SubSection
            title="Company financials"
            description="Revenue, profit and capital per financial year"
            actions={
              canEdit && (
                <Button size="sm" variant="outline" onClick={() => setCorpDialog({ row: null })}>
                  <Plus /> Add year
                </Button>
              )
            }
          >
            {corp.length === 0 ? (
              <InlineEmpty>
                No company figures yet. Add them from the annual report or MCA filing.
              </InlineEmpty>
            ) : (
              <FigureTable
                rows={corp}
                columns={[
                  { label: 'Revenue', value: r => r.revenueRs, strong: true },
                  { label: 'Net profit', value: r => r.netProfitRs },
                  { label: 'Net worth', value: r => r.netWorthRs },
                  { label: 'Paid-up capital', value: r => r.paidUpCapitalRs },
                  { label: 'Authorised capital', value: r => r.authorisedCapitalRs },
                ]}
                onEdit={canEdit ? r => setCorpDialog({ row: r }) : undefined}
                onRemove={
                  canEdit ? async r => void ((await ask(r.fy)) && removeCorp.mutate(r)) : undefined
                }
              />
            )}
          </SubSection>
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <Lock className="size-4" /> Financial figures are hidden for your role.
        </div>
      )}

      {withDocuments && <DocumentsPanel client={client} />}

      {can('client_programs.read') && (
        <SubSection
          title="CSR programmes"
          description={`${programs.length} programme${programs.length === 1 ? '' : 's'} · as in the annual CSR report · ₹`}
          actions={
            <>
              {programs.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void exportPrograms(client.name, programs)}
                >
                  <Download /> Export to Excel
                </Button>
              )}
              {can('client_programs.create') && (
                <Button size="sm" variant="outline" onClick={() => setProgramDialog({ row: null })}>
                  <Plus /> Add programme
                </Button>
              )}
            </>
          }
        >
          {programs.length === 0 ? (
            <InlineEmpty>
              No programmes captured. The pipeline reads them from CSR reports, or add one by hand.
            </InlineEmpty>
          ) : (
            <ProgramTable
              rows={programs}
              onEdit={can('client_programs.update') ? r => setProgramDialog({ row: r }) : undefined}
              onUnlock={can('client_programs.update') ? r => unlockProgram.mutate(r) : undefined}
              onRemove={
                can('client_programs.delete')
                  ? async r =>
                      void (
                        (await confirm({
                          title: `Remove “${r.name}” (FY ${r.fy})?`,
                          description: 'The activity log keeps a record.',
                          destructive: true,
                          confirmLabel: 'Remove',
                        })) && removeProgram.mutate(r)
                      )
                  : undefined
              }
            />
          )}
        </SubSection>
      )}

      {programDialog && (
        <CsrProgramDialog
          clientId={client.id}
          program={programDialog.row}
          open
          onOpenChange={o => !o && setProgramDialog(null)}
        />
      )}
      {csrDialog && (
        <CsrFigureDialog
          clientId={client.id}
          row={csrDialog.row}
          open
          onOpenChange={o => !o && setCsrDialog(null)}
        />
      )}
      {corpDialog && (
        <CorporateFigureDialog
          clientId={client.id}
          row={corpDialog.row}
          open
          onOpenChange={o => !o && setCorpDialog(null)}
        />
      )}
    </div>
  );
}
