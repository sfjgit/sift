'use client';

import { SectionCard, Badge } from './ui';

interface Assignment {
  id: string;
  assignmentType: 'INDIVIDUAL' | 'TEAM';
  status: string;
  recruiterId?: string | null;
  teamId?: string | null;
  allocatedOpenings: number;
  filledOpenings: number;
  isAutoRouted: boolean;
  isSystemAssigned: boolean;
  assignedAt: string;
}

interface Props {
  assignments: Assignment[];
}

function AssignmentRow({ a }: { a: Assignment }) {
  const entity = a.assignmentType === 'TEAM' ? a.teamId : a.recruiterId;
  const entityLabel = a.assignmentType === 'TEAM' ? 'Team' : 'Recruiter';
  const fillPct = a.allocatedOpenings
    ? Math.round((a.filledOpenings / a.allocatedOpenings) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      {/* Type */}
      <div className="w-24 shrink-0">
        <Badge value={a.assignmentType} />
      </div>

      {/* Entity ID (truncated) */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-mono text-muted-foreground/70 truncate">
          {entityLabel}: {entity ?? '—'}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {a.isAutoRouted && (
            <span className="text-[10px] font-medium text-sky-500 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded">
              Auto-routed
            </span>
          )}
          {a.isSystemAssigned && (
            <span className="text-[10px] font-medium text-violet-500 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
              System
            </span>
          )}
        </div>
      </div>

      {/* Openings */}
      <div className="flex flex-col items-end gap-1 shrink-0 w-20">
        <span className="text-[12px] text-muted-foreground">
          {a.filledOpenings}/{a.allocatedOpenings}
        </span>
        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary/70" style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <Badge value={a.status} />
      </div>
    </div>
  );
}

export function RequirementAssignments({ assignments }: Props) {
  if (!assignments?.length) {
    return (
      <SectionCard title="Assignments">
        <p className="text-[13px] text-muted-foreground/50 py-2">No assignments yet.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`Assignments (${assignments.length})`}>
      <div className="flex flex-col">
        {/* Column headers */}
        <div className="flex items-center gap-3 pb-2 border-b border-border/60">
          <span className="w-24 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Type
          </span>
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Entity
          </span>
          <span className="w-20 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Filled
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Status
          </span>
        </div>
        {assignments.map(a => (
          <AssignmentRow key={a.id} a={a} />
        ))}
      </div>
    </SectionCard>
  );
}
