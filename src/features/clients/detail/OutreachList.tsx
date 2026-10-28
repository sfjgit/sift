// File: OutreachList.tsx
// Path: src/features/clients/detail/OutreachList.tsx
//
// Outreach packs (first mail + follow-ups) for a client or a SPOC, each with
// its review / sent / outcome tracking.

'use client';

import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/common/states';
import { OutreachPackCard } from '@/features/outreach/OutreachPackCard';
import { outreachApi } from '@/lib/api/endpoints';

export function OutreachList({ clientId, spocId }: { clientId?: string; spocId?: string }) {
  const q = useQuery({
    queryKey: ['outreach', clientId ?? '', spocId ?? ''],
    queryFn: () => outreachApi.list({ clientId, spocId, limit: 50 }),
  });

  if (q.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.data.length)
    return (
      <EmptyState
        icon={Mail}
        title="No outreach written yet"
        description="Run “Write outreach emails” for approved SPOCs. Drafts appear here to review, send from Outlook and track."
      />
    );

  return (
    <div className="space-y-3">
      {q.data.data.map(pack => (
        <OutreachPackCard key={pack.id} pack={pack} />
      ))}
    </div>
  );
}
