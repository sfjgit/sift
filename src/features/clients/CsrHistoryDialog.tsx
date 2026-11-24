// File: CsrHistoryDialog.tsx
// Path: src/features/clients/CsrHistoryDialog.tsx
//
// A client's CSR figures, every financial year — opened from the list's
// "CSR year" and "CSR spent" cells (they show the latest year only).

'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { IndianRupee } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Spinner } from '@/components/common/states';
import { ColumnChart, Legend } from '@/components/charts/Charts';
import { clientHooks } from '@/hooks/queries';
import { fmtInr } from '@/lib/format';
import { csrBand } from './detail/ClientInfo';

const SERIES = [
  { key: 'spent', label: 'Spent' },
  { key: 'unspent', label: 'Unspent' },
];

function Body({ clientId }: { clientId: string }) {
  const { data: client, isLoading, error, refetch } = clientHooks.useDetail(clientId);
  if (isLoading) return <Spinner className="my-10" />;
  if (error || !client) return <ErrorState error={error} onRetry={() => refetch()} />;
  const fin = [...(client.csrFinancials ?? [])].sort((a, b) => b.fy.localeCompare(a.fy));
  if (!fin.length)
    return (
      <EmptyState
        compact
        icon={IndianRupee}
        title="No CSR figures yet"
        description="The pipeline fills them from filings, or add a year on the client page."
      />
    );
  const programsIn = (fy: string) => (client.csrPrograms ?? []).filter(p => p.fy === fy).length;
  const chart = [...fin].reverse().map(f => ({
    label: f.fy,
    spent: Number(f.spentRs ?? 0) / 1e7,
    unspent: Number(f.unspentRs ?? 0) / 1e7,
  }));
  const money = (v: string | null) => (v ? fmtInr(v) : '—');

  return (
    <div className="space-y-4">
      {fin.length > 1 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>₹ crore by year</span>
            <Legend series={SERIES} />
          </div>
          <ColumnChart data={chart} series={SERIES} height={170} />
        </div>
      )}
      <div className="crm-box overflow-x-auto">
        <table className="crm-sheet">
          <thead>
            <tr>
              <th>FY</th>
              <th className="text-right">Obligation</th>
              <th className="text-right">Fund</th>
              <th className="text-right">Spent</th>
              <th className="text-right">Unspent</th>
              <th>Category</th>
              <th className="text-right">Programmes</th>
            </tr>
          </thead>
          <tbody>
            {fin.map((f, i) => (
              <tr key={f.id}>
                <td className="whitespace-nowrap tabular font-medium">
                  {f.fy}
                  {i === 0 && (
                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                      latest
                    </span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap tabular">{money(f.obligationRs)}</td>
                <td className="text-right whitespace-nowrap tabular">{money(f.budgetRs)}</td>
                <td className="text-right font-semibold whitespace-nowrap text-success tabular">
                  {money(f.spentRs)}
                </td>
                <td className="text-right whitespace-nowrap tabular">{money(f.unspentRs)}</td>
                <td className="whitespace-nowrap">{csrBand(f.spentRs) ?? '—'}</td>
                <td className="text-right tabular">{programsIn(f.fy) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link href={`/clients/${clientId}?tab=skilling`}>Open CSR skilling programmes</Link>
        </Button>
      </div>
    </div>
  );
}

/** a list cell that opens the client's CSR history */
export function CsrHistoryCell({
  clientId,
  clientName,
  children,
  align = 'left',
}: {
  clientId: string;
  clientName: string;
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title="See every year"
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={`w-full rounded px-1 -mx-1 hover:bg-primary/5 hover:underline ${align === 'right' ? 'text-right' : 'text-left'}`}
      >
        {children}
      </button>
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-3xl" onClick={e => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>CSR figures — {clientName}</DialogTitle>
              <DialogDescription>Every financial year on record, newest first.</DialogDescription>
            </DialogHeader>
            <Body clientId={clientId} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
