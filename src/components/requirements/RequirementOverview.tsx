'use client';

import { formatSalary, SectionCard, InfoRow, fmtDate } from './ui';

interface Props {
  description?: string | null;
  location?: string | null;
  country?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  respondBy?: string | null;
  turnaroundDays?: number | null;
}

export function RequirementOverview({
  description,
  location,
  country,
  salaryMin,
  salaryMax,
  salaryType,
  startDate,
  endDate,
  respondBy,
  turnaroundDays,
}: Props) {
  const salary = formatSalary(salaryMin, salaryMax, salaryType);
  const locationStr = [location, country].filter(Boolean).join(', ') || null;

  return (
    <SectionCard title="Overview">
      <div className="flex flex-col gap-2.5">
        {description && (
          <p className="text-[13px] text-foreground/80 leading-relaxed pb-2 border-b border-border/50">
            {description}
          </p>
        )}
        <InfoRow label="Location" value={locationStr} />
        <InfoRow label="Salary" value={salary} />
        <InfoRow label="Start Date" value={fmtDate(startDate)} />
        <InfoRow label="End Date" value={fmtDate(endDate)} />
        <InfoRow
          label="Respond By"
          value={fmtDate(respondBy, { hour: '2-digit', minute: '2-digit' })}
        />
        <InfoRow
          label="Turnaround"
          value={turnaroundDays != null ? `${turnaroundDays} days` : null}
        />
      </div>
    </SectionCard>
  );
}
