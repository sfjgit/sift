// File: CsrTab.tsx
// Path: src/features/clients/detail/CsrTab.tsx
//
// CSR figures per financial year (only with clients.view_financials),
// programmes and filings. Figures/programmes are written by the pipeline.

'use client';

import { Download, ExternalLink, FileText, IndianRupee, Lock, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/common/Panel';
import { Pill } from '@/components/common/badges';
import { EmptyState } from '@/components/common/states';
import { ColumnChart, Legend } from '@/components/charts/Charts';
import { usePermissions } from '@/features/auth/usePermissions';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, fmtInr } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail } from '@/types/crm';

const FIN_SERIES = [
  { key: 'spent', label: 'Spent' },
  { key: 'unspent', label: 'Unspent' },
];

export function CsrTab({ client }: { client: ClientDetail }) {
  const { can } = usePermissions();
  const fin = client.financials ?? [];
  const programs = client.programs ?? [];
  const documents = client.documents ?? [];
  const chartData = [...fin]
    .sort((a, b) => a.fy.localeCompare(b.fy))
    .map(f => ({
      label: f.fy,
      spent: Number(f.spentRs ?? 0) / 1e7,
      unspent: Number(f.unspentRs ?? 0) / 1e7,
    }));

  const openDoc = async (docId: string) => {
    try {
      const { url } = await clientsApi.documentUrl(client.id, docId);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  return (
    <div className="space-y-4">
      {can('client_financials.read') ? (
        <Panel
          title="CSR spend"
          description="Accepted figures per financial year (₹ crore in the chart)"
          actions={fin.length > 0 && <Legend series={FIN_SERIES} />}
        >
          {fin.length === 0 ? (
            <EmptyState
              compact
              icon={IndianRupee}
              title="No CSR figures yet"
              description="They appear once the pipeline extracts them from filings."
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <ColumnChart data={chartData} series={FIN_SERIES} height={220} />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">FY</th>
                      <th className="py-2 text-right font-medium">Obligation</th>
                      <th className="py-2 text-right font-medium">Budget</th>
                      <th className="py-2 text-right font-medium">Spent</th>
                      <th className="py-2 text-right font-medium">Unspent</th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {fin.map(f => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="py-2">
                          <span className="flex items-center gap-1.5">
                            {f.fy}
                            {f.isLocked && (
                              <Lock
                                className="size-3 text-muted-foreground"
                                aria-label="Confirmed manually"
                              />
                            )}
                          </span>
                        </td>
                        <td className="py-2 text-right">{fmtInr(f.obligationRs)}</td>
                        <td className="py-2 text-right">{fmtInr(f.budgetRs)}</td>
                        <td className="py-2 text-right font-medium">{fmtInr(f.spentRs)}</td>
                        <td className="py-2 text-right">{fmtInr(f.unspentRs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <Lock className="size-4" /> CSR figures are hidden for your role.
        </div>
      )}

      {can('client_programs.read') && (
        <Panel
          title="CSR programmes"
          description={`${programs.length} programme${programs.length === 1 ? '' : 's'}`}
        >
          {programs.length === 0 ? (
            <EmptyState compact icon={Sprout} title="No programmes captured" />
          ) : (
            <ul className="divide-y">
              {programs.map(p => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Pill dot={false}>FY {p.fy}</Pill>
                      {p.sector && <Pill tone="success">{p.sector.label}</Pill>}
                      {p.implementor && <span>By {p.implementor}</span>}
                      {p.locations && <span>· {p.locations}</span>}
                    </p>
                    {p.beneficiaries && (
                      <p className="text-xs text-muted-foreground">
                        Beneficiaries: {p.beneficiaries}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular">{fmtInr(p.budgetRs)}</span>
                    {p.sourceUrl && (
                      <Button asChild variant="ghost" size="icon-xs" aria-label="Source">
                        <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {can('client_documents.read') && (
        <Panel title="Documents" description="Annual reports and CSR filings">
          {documents.length === 0 ? (
            <EmptyState compact icon={FileText} title="No documents yet" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {documents.map(d => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{d.fileName ?? d.type.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.type.label} · FY {d.fy} · {fmtDate(d.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Download"
                    onClick={() => void openDoc(d.id)}
                  >
                    <Download />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
