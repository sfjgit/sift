// File: DrillSheet.tsx
// Path: src/features/reports/DrillSheet.tsx
//
// "Show me the records behind this number" — the same DataTable the list
// pages use, pre-filtered, inside a side sheet.

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DataTable, useTableState } from '@/components/data-table';
import { clientColumns } from '@/features/clients/columns';
import { spocColumns } from '@/features/spocs/columns';
import { clientHooks, spocHooks } from '@/hooks/queries';
import type { ReportEntity } from '@/types/reports';

export interface DrillTarget {
  entity: ReportEntity;
  filters: Record<string, string>;
  title: string;
  href: string;
  dateNote: boolean;
}

function SpocDrill({ filters }: { filters: Record<string, string> }) {
  const table = useTableState('drill-spocs', Object.keys(filters), { syncUrl: false, filters, sort: { id: 'createdAt', desc: true } });
  const query = spocHooks.useList(table.params);
  const columns = useMemo(() => spocColumns(), []);
  return <DataTable id="drill-spocs" embedded savedViews={false} table={table} query={query} columns={columns} rowHref={s => `/spocs/${s.id}`} />;
}

function ClientDrill({ filters }: { filters: Record<string, string> }) {
  const table = useTableState('drill-clients', Object.keys(filters), { syncUrl: false, filters, sort: { id: 'createdAt', desc: true } });
  const query = clientHooks.useList(table.params);
  const columns = useMemo(() => clientColumns(), []);
  return <DataTable id="drill-clients" embedded savedViews={false} table={table} query={query} columns={columns} rowHref={c => `/clients/${c.id}`} />;
}

export function DrillSheet({ target, onClose }: { target: DrillTarget | null; onClose: () => void }) {
  return (
    <Sheet open={!!target} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-4xl data-[side=right]:sm:max-w-4xl">
        {target && (
          <>
            <SheetHeader className="border-b px-5 py-4 pr-12">
              <SheetTitle>{target.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                The records behind this number.
                {target.dateNote && <span>The created-date range isn’t applied to this list.</span>}
                <Button asChild variant="link" size="xs" className="h-auto p-0">
                  <Link href={target.href}>
                    Open as full list <ExternalLink />
                  </Link>
                </Button>
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-5">
              {target.entity === 'spocs' ? (
                <SpocDrill key={JSON.stringify(target.filters)} filters={target.filters} />
              ) : (
                <ClientDrill key={JSON.stringify(target.filters)} filters={target.filters} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
