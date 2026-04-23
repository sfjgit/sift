'use client';

import { useAuth } from '@/context/AuthContext';
import AssignRequirementDialog from './AssignRequirementDialog';
import { Badge } from './ui';

interface Props {
  id: string;
  reqCode: string;
  title: string;
  status: string;
  priority: string;
  jobType: string;
  remoteType: string;
  filledOpenings: number;
  totalOpenings: number;
}

export function RequirementHeader({
  id,
  reqCode,
  title,
  status,
  priority,
  jobType,
  remoteType,
  filledOpenings,
  totalOpenings,
}: Props) {
  return (
    // <div className="flex items-start justify-between gap-4 flex-wrap">
    //   {/* Left */}
    //   <div className="flex flex-col gap-1.5">
    //     <div className="flex items-center gap-2">
    //       <span className="text-[11px] font-mono font-medium text-muted-foreground/60 tracking-wide">
    //         {reqCode}
    //       </span>
    //       <Badge value={status} />
    //       <Badge value={priority} />
    //     </div>
    //     <h1 className="text-[20px] font-semibold text-foreground leading-tight">{title}</h1>
    //     <div className="flex items-center gap-2 flex-wrap">
    //       <Badge value={jobType} />
    //       <Badge value={remoteType} />
    //     </div>
    //   </div>

    //   {/* Right — openings pill */}
    //   <div className="flex flex-col items-end gap-1 shrink-0">
    //     <span className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-semibold">
    //       Openings
    //     </span>
    //     <div className="flex items-baseline gap-1">
    //       <span className="text-2xl font-bold text-foreground">{filledOpenings}</span>
    //       <span className="text-sm text-muted-foreground">/ {totalOpenings} filled</span>
    //     </div>
    //     {/* Progress bar */}
    //     <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden">
    //       <div
    //         className="h-full rounded-full bg-primary transition-all"
    //         style={{ width: `${totalOpenings ? (filledOpenings / totalOpenings) * 100 : 0}%` }}
    //       />
    //     </div>
    //   </div>
    // </div>
    <div className="flex items-start justify-between gap-4 flex-wrap">
      {/* Left */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground/60">{reqCode}</span>
          <Badge value={status} />
          <Badge value={priority} />
        </div>

        <h1 className="text-[20px] font-semibold">{title}</h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge value={jobType} />
          <Badge value={remoteType} />
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-3 shrink-0">
        {/* Assign Button */}
        <AssignRequirementDialog requirementId={id} />

        {/* Openings */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
            Openings
          </span>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{filledOpenings}</span>
            <span className="text-sm text-muted-foreground">/ {totalOpenings} filled</span>
          </div>

          <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{
                width: `${totalOpenings ? (filledOpenings / totalOpenings) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
