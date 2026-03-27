'use client';

import { TeamDetails } from '@/lib/teams.api';

type Props = {
  team: TeamDetails;
};

export default function TeamDetailsView({ team }: Props) {
  return (
    <div className="space-y-6">
      {/* Team Info */}
      <div>
        <h2 className="text-xl font-semibold">{team?.name}</h2>
        <p className="text-sm text-muted-foreground">{team?.description}</p>
      </div>

      {/* Members
      <div>
        <h3 className="font-medium mb-2">Members</h3>
        <div className="space-y-2">
          {team.members?.length ? (
            team.members.map(m => (
              <div key={m.userId} className="text-sm border p-2 rounded">
                {m.user?.firstName} {m.user?.lastName} — {m.teamRole}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No members found</p>
          )}
        </div>
      </div> */}

      {/* Client Assignments */}
      <div>
        <h3 className="font-medium mb-2">Client Assignments</h3>
        <div className="space-y-2">
          {team?.clientAssignments?.length ? (
            team.clientAssignments.map(c => (
              <div key={c.id} className="text-sm border p-2 rounded">
                {c.client?.name} (Assigned by {c.assignedBy?.firstName})
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No client assignments</p>
          )}
        </div>
      </div>

      {/* Requirement Assignments */}
      <div>
        <h3 className="font-medium mb-2">Requirements</h3>
        <div className="space-y-2">
          {team.requirementAssignments?.length ? (
            team.requirementAssignments.map(r => (
              <div key={r.id} className="text-sm border p-2 rounded">
                {r.requirement?.title} — {r.status}
                <div className="text-xs text-muted-foreground">
                  Filled: {r.filledOpenings} / {r.allocatedOpenings || 0}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No requirements assigned</p>
          )}
        </div>
      </div>
    </div>
  );
}
