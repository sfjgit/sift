'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';

import { RequirementAssignments } from '@/components/requirements/RequirementAssignments';
import { RequirementHeader } from '@/components/requirements/RequirementHeader';
import { RequirementMeta } from '@/components/requirements/RequirementMeta';
import { RequirementNotes } from '@/components/requirements/RequirementNotes';
import { RequirementOverview } from '@/components/requirements/RequirementOverview';
import { RequirementStatusHistory } from '@/components/requirements/RequirementStatusHistory';
import { useRequirementsApi } from '@/lib/requirements.api';

// ── Fetcher ───────────────────────────────────────────────────
// async function fetchRequirement(id: string) {
//   const requirementsApi = useRequirementsApi();
//   const res = await requirementsApi.getOne(id);
//   return res.data.data;
// }

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-[1fr_280px] gap-5">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-28" />
          <Skeleton className="h-24" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const requirementsApi = useRequirementsApi();

  // const { data, error, isLoading } = useSWR(id ? `requirement:${id}` : null, () =>
  //   fetchRequirement(id)
  // );
  const { data, error, isLoading } = useSWR(id ? `requirement:${id}` : null, async () => {
    const res = await requirementsApi.getOne(id);
    return res.data.data;
  });

  if (isLoading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-muted-foreground">
          {error ? 'Failed to load requirement.' : 'Requirement not found.'}
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
    <div className="flex flex-col gap-5 max-w-6xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="self-start flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors group"
      >
        <svg
          className="size-3.5 transition-transform group-hover:-translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Requirements
      </button>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <RequirementHeader
          id={id}
          reqCode={data.reqCode}
          title={data.title}
          status={data.status}
          priority={data.priority}
          jobType={data.jobType}
          remoteType={data.remoteType}
          filledOpenings={data.filledOpenings}
          totalOpenings={data.totalOpenings}
        />
      </div>

      {/* Body — two-column layout */}
      <div className="grid grid-cols-[1fr_280px] gap-5 items-start">
        {/* Main column */}
        <div className="flex flex-col gap-4">
          <RequirementOverview
            description={data.description}
            location={data.location}
            country={data.country}
            salaryMin={data.salaryMin}
            salaryMax={data.salaryMax}
            salaryType={data.salaryType}
            startDate={data.startDate}
            endDate={data.endDate}
            respondBy={data.respondBy}
            turnaroundDays={data.turnaroundDays}
          />

          <RequirementAssignments assignments={data.assignments ?? []} />

          <RequirementStatusHistory history={data.statusHistory ?? []} requirementId={id} />

          <RequirementNotes notes={data.notes ?? []} requirementId={id} />
        </div>

        {/* Sidebar */}
        <div className="sticky top-4">
          <RequirementMeta
            client={data.client}
            businessUnit={data.businessUnit}
            createdBy={data.createdBy}
            approvedBy={data.approvedBy}
            approvedAt={data.approvedAt}
            deliveryLead={data.deliveryLead}
            teamLead={data.teamLead}
            createdAt={data.createdAt}
            updatedAt={data.updatedAt}
          />
        </div>
      </div>
    </div>
  );
}
