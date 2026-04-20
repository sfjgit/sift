'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Button } from '@/components/ui/button';
import { TeamMember, useTeamsApi } from '@/lib/teams.api';
import { usePermission } from '@/hooks/usePermission';

interface TeamMemberListProps {
  members: TeamMember[];
  refresh: () => void;
}

export default function TeamMemberList({ members, refresh }: TeamMemberListProps) {
  const { removeMember } = useTeamsApi();
  const canEdit = usePermission('TEAM', 'canEdit');

  const handleRemove = async (userId: string, teamId: string) => {
    await removeMember(teamId, userId);
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Members</h2>
        <span className="text-xs text-muted-foreground">{members.length} total</span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Team Role
              </TableHead>
              {canEdit && (
                <TableHead className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {members.length ? (
              members.map((m: TeamMember) => (
                <TableRow
                  key={m.userId}
                  className="hover:bg-muted/30 transition-colors duration-100"
                >
                  <TableCell className="px-4 py-3.5 text-sm font-medium text-foreground">
                    {[m.user?.firstName, m.user?.middleName, m.user?.lastName]
                      .filter(Boolean)
                      .join(' ')}
                  </TableCell>

                  <TableCell className="px-4 py-3.5">
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      {m.teamRole}
                    </span>
                  </TableCell>

                  {canEdit && (
                    <TableCell className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                        onClick={() => handleRemove(m.userId, m.teamId)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 3 : 2}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No members added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
