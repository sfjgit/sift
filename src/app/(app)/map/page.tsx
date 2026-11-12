// File: page.tsx
// Path: src/app/(app)/map/page.tsx
//
// /map — every office (or SPOC) of the clients you can see, on a 3D map.

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe2, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/states';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { clientsApi } from '@/lib/api/endpoints';
import { MapExplorer } from '@/features/map/MapExplorer';

export default function OfficeMapPage() {
  const [search, setSearch] = useState('');
  const q = useQuery({
    queryKey: ['clients', 'map'],
    queryFn: () => clientsApi.map(),
    staleTime: 60_000,
  });

  return (
    <div className="flex h-[calc(100dvh-var(--topbar-h,3.5rem)-2rem)] flex-col gap-3">
      <PageHeader
        icon={<Globe2 className="size-5" />}
        title="Office map"
        description="Drag to move, right-drag to tilt and turn. Click a pin or a SPOC to open it."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Client, SPOC, city, state, industry…"
              className="h-8 w-72 pl-8"
            />
          </div>
        }
      />
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-card">
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <Skeleton className="size-full rounded-xl" />
        ) : (
          <MapExplorer data={q.data} search={search} />
        )}
      </div>
    </div>
  );
}
