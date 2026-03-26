'use client';

import { usePermission } from '@/hooks/usePermission';
import { BUTeam } from '@/lib/business-units.api';

export function BusinessUnitTeams({ teams }: { teams: BUTeam[] }) {
  const canView = usePermission('teams', 'canView');

  if (!canView || !teams?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-foreground mb-3">Teams</h2>

      <div className="space-y-2">
        {teams.map(team => (
          <div
            key={team.id}
            className="flex items-center justify-between px-3 py-2 rounded-md border border-border"
          >
            <div>
              <p className="text-sm font-medium">{team.name}</p>
              <p className="text-xs text-muted-foreground">{team.category ?? '—'}</p>
            </div>

            <span className="text-xs text-muted-foreground">
              {team.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
