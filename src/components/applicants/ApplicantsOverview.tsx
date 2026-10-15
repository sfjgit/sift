// File: ApplicantsOverview.tsx
// Path: src/components/applicants/ApplicantsOverview.tsx

'use client';

import { Briefcase, UserCheck, Users, UserX, type LucideIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { chartColor, chartTint, toStatusLabel } from '@/components/applicants/utils';
import type { ApplicantSummary } from '@/types/applicant';
import { Card } from '../ui/card';

// icon per assignment bucket — unknown keys fall back to Users
const BUCKET_ICONS: Record<string, LucideIcon> = {
  UNASSIGNED: UserX,
  ASSIGNED: UserCheck,
};

interface Props {
  summary?: ApplicantSummary;
  statusKeys: string[];
}

export function ApplicantsOverview({ summary, statusKeys }: Props) {
  if (!summary) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 w-full rounded-xl lg:col-span-3" />
          <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const total = summary.totalApplicants;
  const requirementsSeries = statusKeys.length + 2; // colour index after total + buckets

  const stats = [
    {
      label: 'Total applicants',
      value: total,
      hint: `Across ${summary.requirementsWithApplicants} requirement(s)`,
      icon: Users,
      series: 1,
    },
    ...statusKeys.map((k, i) => {
      const n = summary.counts[k] ?? 0;
      return {
        label: toStatusLabel(k),
        value: n,
        hint: total ? `${Math.round((n / total) * 100)}% of applicants` : 'No applicants yet',
        icon: BUCKET_ICONS[k] ?? Users,
        series: i + 2,
      };
    }),
    {
      label: 'Requirements',
      value: summary.totalRequirements,
      hint: `${summary.requirementsWithApplicants} with applicants`,
      icon: Briefcase,
      series: requirementsSeries,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label} className="gap-0 py-0">
            <div className="flex items-center gap-3 p-4">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                style={{ color: chartColor(s.series), backgroundColor: chartTint(s.series) }}
              >
                <s.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold leading-tight">{s.value.toLocaleString()}</p>
                <p className="truncate text-[11px] text-muted-foreground">{s.hint}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
