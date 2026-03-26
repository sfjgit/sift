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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {members.length ? (
            members.map((m: TeamMember) => (
              <TableRow key={m.userId}>
                <TableCell>{m.user?.name}</TableCell>
                <TableCell>{m.teamRole}</TableCell>

                <TableCell className="text-right">
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemove(m.userId, m.teamId)}
                    >
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                No members found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
