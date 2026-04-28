'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TeamMembershipCompact } from '@/types/user.types';

interface Props {
  memberships: TeamMembershipCompact[];
}

const TEAM_ROLE_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  CO_LEAD: 'Co-Lead',
  MEMBER: 'Member',
};

export function UserTeamChips({ memberships }: Props) {
  if (!memberships.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  // Show max 2 chips inline, rest in tooltip
  const visible = memberships.slice(0, 2);
  const hidden = memberships.slice(2);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(m => (
        <TooltipProvider key={m.team.id} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="cursor-default text-xs font-normal">
                {m.team.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {TEAM_ROLE_LABEL[m.teamRole]} · {m.team.category ?? '—'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      {hidden.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="cursor-default text-xs font-normal text-muted-foreground"
              >
                +{hidden.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="space-y-1 text-xs">
              {hidden.map(m => (
                <div key={m.team.id}>
                  {m.team.name} · {TEAM_ROLE_LABEL[m.teamRole]}
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
