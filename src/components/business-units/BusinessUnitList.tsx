/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useBusinessUnitsApi } from '@/lib/business-units.api';
import useSWR from 'swr';
import { BusinessUnitRow } from './BusinessUnitRow';

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-border">
      <p className="text-sm text-muted-foreground">No business units yet</p>
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!list.length) return <EmptyState />;

  return (
    <div className="space-y-2">
      {list.map((bu: any) => (
        <BusinessUnitRow key={bu.id} bu={bu} />
      ))}
    </div>
  );
}
