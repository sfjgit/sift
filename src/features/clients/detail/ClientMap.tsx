// File: ClientMap.tsx
// Path: src/features/clients/detail/ClientMap.tsx
//
// One client's offices and its SPOCs on the map (Locations tab).

'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { clientsApi } from '@/lib/api/endpoints';
import { MapExplorer } from '@/features/map/MapExplorer';

export function ClientMap({ clientId, locations }: { clientId: string; locations: number }) {
  const q = useQuery({
    queryKey: ['clients', 'map', clientId, locations],
    queryFn: () => clientsApi.map(clientId),
    enabled: locations > 0,
  });
  if (!locations) return null;
  if (q.data && !q.data.points.length) {
    return (
      <p className="flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <MapPin className="size-3.5" /> None of this client’s offices has a map position yet — add
        latitude and longitude to see them on the map.
      </p>
    );
  }
  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border bg-card shadow-card">
      {q.data ? (
        <MapExplorer data={q.data} fit compact />
      ) : (
        <Skeleton className="size-full rounded-xl" />
      )}
    </div>
  );
}
