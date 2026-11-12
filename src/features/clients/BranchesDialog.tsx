// File: BranchesDialog.tsx
// Path: src/features/clients/BranchesDialog.tsx
//
// A client's branch offices as a table. A branch is every active office except
// the head office (the primary one, or one typed "Head office") — same rule as
// the backend's branch count. Opened from the list's Branches column and the
// client page.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Spinner } from '@/components/common/states';
import { clientHooks } from '@/hooks/queries';
import type { ClientLocation } from '@/types/crm';
import { mapsUrl } from './LocationFields';

export const isBranch = (l: ClientLocation) => l.isActive && !l.isPrimary && l.type?.code !== 'HQ';

const HEAD = [
  '#',
  'Office',
  'Type',
  'Address',
  'City',
  'District',
  'State',
  'PIN',
  'Country',
  'Map',
  'SPOCs',
];

export function BranchesTable({ branches }: { branches: ClientLocation[] }) {
  if (!branches.length)
    return (
      <EmptyState
        compact
        icon={MapPin}
        title="No branch offices"
        description="Every office other than the head office counts as a branch. Add them in the Branch offices section of the client page."
      />
    );
  return (
    <div className="max-h-[65vh] overflow-auto rounded-md border">
      <table className="w-full border-separate border-spacing-0 text-[13.5px]">
        <thead className="sticky top-0 z-10">
          <tr>
            {HEAD.map(h => (
              <th
                key={h}
                className="h-9 border-r border-b bg-muted px-3 text-left text-[12px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase last:border-r-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {branches.map((b, i) => (
            <tr key={b.id} className="hover:bg-accent/40">
              <td className="h-9 border-r border-b px-3 text-muted-foreground tabular">{i + 1}</td>
              <td
                className="max-w-64 truncate border-r border-b px-3 font-medium"
                title={b.name ?? ''}
              >
                {b.name ?? b.city ?? '—'}
              </td>
              <td className="border-r border-b px-3 whitespace-nowrap">{b.type?.label ?? '—'}</td>
              <td className="max-w-72 truncate border-r border-b px-3" title={b.addressLine ?? ''}>
                {b.addressLine ?? '—'}
              </td>
              <td className="border-r border-b px-3 whitespace-nowrap">{b.city ?? '—'}</td>
              <td className="border-r border-b px-3 whitespace-nowrap">{b.district ?? '—'}</td>
              <td className="border-r border-b px-3 whitespace-nowrap">{b.state ?? '—'}</td>
              <td className="border-r border-b px-3 tabular">{b.pincode ?? '—'}</td>
              <td className="border-r border-b px-3 whitespace-nowrap">{b.country ?? '—'}</td>
              <td className="border-r border-b px-3 whitespace-nowrap">
                {b.latitude != null && b.longitude != null ? (
                  <a
                    href={mapsUrl(b.latitude, b.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                    title={`${b.latitude}, ${b.longitude}`}
                  >
                    Open map
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="border-b px-3 text-right tabular">{b._count.spocs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BranchesDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  // the list row has only the count — the offices come with the client detail
  const q = clientHooks.useDetail(open ? clientId : null);
  const branches = (q.data?.locations ?? []).filter(isBranch);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Branch offices — {clientName}</DialogTitle>
          <DialogDescription>
            Every active office other than the head office
            {q.data ? ` · ${branches.length}` : ''}
          </DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <BranchesTable branches={branches} />
        )}
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/clients/${clientId}?tab=branches`} onClick={() => onOpenChange(false)}>
              Manage in Branch offices
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** a branch count that opens the table — for the client list */
export function BranchesCount({
  clientId,
  clientName,
  count,
}: {
  clientId: string;
  clientName: string;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  if (!count) return <span className="text-muted-foreground">0</span>;
  return (
    <>
      <button
        type="button"
        data-no-row-click
        onClick={() => setOpen(true)}
        className="font-medium text-primary hover:underline"
        title="See the branch offices"
      >
        {count}
      </button>
      {open && (
        <BranchesDialog clientId={clientId} clientName={clientName} open onOpenChange={setOpen} />
      )}
    </>
  );
}
