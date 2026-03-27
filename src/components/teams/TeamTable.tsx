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

import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import TeamDialog from './TeamDialog';
import { useRouter } from 'next/navigation';
import { Team } from '@/lib/teams.api';

type TeamTableProps = {
  teams: Team[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refresh: () => void | Promise<any>; // React Query refetch
};

export default function TeamTable({ teams, refresh }: TeamTableProps) {
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const router = useRouter();
  const canEdit = usePermission('TEAM', 'canEdit');

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-300">
            <TableHead className="p-3">Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {teams?.length ? (
            teams.map(team => (
              <TableRow
                key={team.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/dashboard/teams/${team.id}`)}
              >
                <TableCell className="font-medium">{team.name}</TableCell>

                <TableCell>{team.category || '-'}</TableCell>

                <TableCell>
                  <span
                    className={`text-xs px-2 py-1 rounded-md ${
                      team.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {team.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>

                <TableCell>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => {
                        e.stopPropagation(); // ✅ IMPORTANT
                        setEditTeam(team);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                No teams found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <TeamDialog
        open={!!editTeam}
        setOpen={() => setEditTeam(null)}
        team={editTeam}
        refresh={refresh}
      />
    </div>
  );
}
