/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useBusinessUnitsApi } from '@/lib/business-units.api';
import useSWR from 'swr';
import { BusinessUnitRow } from './BusinessUnitRow';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-lg">
      <p className="text-sm font-medium text-foreground">No business units</p>
      <p className="text-xs text-muted-foreground mt-1">Create a business unit to get started.</p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 bg-card">
          <div className="h-3.5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse ml-auto" />
          <div className="h-5 w-14 bg-muted rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function BusinessUnitList() {
  const api = useBusinessUnitsApi();

  const { data, isLoading } = useSWR('business-units', async () => {
    const res = await api.getAll();
    return res.data?.data;
  });

  const list = data ?? [];

  if (isLoading) return <SkeletonRows />;
  if (!list.length) return <EmptyState />;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_160px_80px] px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Name
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Created
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
          Status
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {list.map((bu: any) => (
          <BusinessUnitRow key={bu.id} bu={bu} />
        ))}
      </div>
    </div>
  );
}
