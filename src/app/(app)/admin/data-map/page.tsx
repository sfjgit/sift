// File: page.tsx
// Path: src/app/(app)/admin/data-map/page.tsx
//
// Admin › Data map — the database as a picture, explained, with its history (super admins only).

'use client';

import { useQuery } from '@tanstack/react-query';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { DataMap } from '@/features/schema/DataMap';
import { schemaMapApi } from '@/lib/api/endpoints';
import { ErrorState } from '@/components/common/states';
import { Skeleton } from '@/components/ui/skeleton';

function DataMapPage() {
  const q = useQuery({
    queryKey: ['schema-map'],
    queryFn: () => schemaMapApi.get(),
    staleTime: 5 * 60_000,
  });
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold">Data map</h1>
        <p className="text-[13px] text-muted-foreground">
          How the CRM’s data is built: every table, what it is for, how they link — and every change
          since the start.
        </p>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-[70vh] w-full rounded-xl" />
      ) : q.error || !q.data ? (
        <ErrorState
          title="Couldn’t load the data map"
          error={q.error}
          onRetry={() => q.refetch()}
        />
      ) : (
        <DataMap map={q.data} />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission superAdmin>
      <DataMapPage />
    </RequirePermission>
  );
}
