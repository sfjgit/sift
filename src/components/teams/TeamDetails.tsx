'use client';

import { TeamDetails } from '@/lib/teams.api';

type Props = {
  team: TeamDetails;
};

export default function TeamDetailsView({ team }: Props) {
  // ✅ Guard: team may be undefined while loading
  if (!team) return null;

  const clientAssignments = team.clientAssignments ?? [];
  const requirementAssignments = team.requirementAssignments ?? [];

  return (
    <div className="space-y-5">
      {/* Client Assignments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Client Assignments</h2>
          <span className="text-xs text-muted-foreground">{clientAssignments.length} total</span>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {clientAssignments.length ? (
            <div className="divide-y divide-border">
              {clientAssignments.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3.5">
                  <p className="text-sm font-medium text-foreground">{c.client?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned by {c.assignedBy?.firstName}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-16">
              <p className="text-sm text-muted-foreground">No client assignments</p>
            </div>
          )}
        </div>
      </div>

      {/* Requirement Assignments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Requirements</h2>
          <span className="text-xs text-muted-foreground">
            {requirementAssignments.length} total
          </span>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          {requirementAssignments.length ? (
            <div className="divide-y divide-border">
              {requirementAssignments.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.requirement?.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Filled: {r.filledOpenings} / {r.allocatedOpenings ?? 0}
                    </p>
                  </div>
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-16">
              <p className="text-sm text-muted-foreground">No requirements assigned</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
