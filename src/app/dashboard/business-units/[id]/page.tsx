'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';

import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { usePermission } from '@/hooks/usePermission';
import { BusinessUnitHeader } from '@/components/business-units/BusinessUnitHeader';
import { BusinessUnitOverview } from '@/components/business-units/BusinessUnitOverview';
import { BusinessUnitChildren } from '@/components/business-units/BusinessUnitChildren';
import { BusinessUnitTeams } from '@/components/business-units/BusinessUnitTeams';
import { BusinessUnitUsers } from '@/components/business-units/BusinessUnitUsers';

// ── Skeleton ──────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-28" />
      <Skeleton className="h-40" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────
export default function BusinessUnitDetailPage() {
  const api = useBusinessUnitsApi();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const canView = usePermission('business_units', 'canView');

  const { data, error, isLoading } = useSWR(id ? `business-unit:${id}` : null, async () => {
    const res = await api.getTree(id); // ✅ use correct API
    return res.data.data;
  });

  // 🔐 No permission
  if (canView === false) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">
          You don’t have access to view this business unit.
        </p>
      </div>
    );
  }

  if (isLoading || canView === undefined) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-muted-foreground">
          {error ? 'Failed to load business unit.' : 'Business unit not found.'}
        </p>
        <button
          onClick={() => router.back()}
          className="text-sm text-primary underline underline-offset-2"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="self-start flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors group"
      >
        ← Business Units
      </button>

      {/* Header */}
      <BusinessUnitHeader bu={data} />

      {/* Body */}
      <BusinessUnitOverview bu={data} />

      <BusinessUnitChildren childBUs={data.childBUs} />

      <BusinessUnitTeams teams={data.teams} />

      <BusinessUnitUsers users={data.users} />
    </div>
  );
}
