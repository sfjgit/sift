'use client';

import { useParams } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { useTeamsApi } from '@/lib/teams.api';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import AddMemberDialog from '@/components/teams/AddMemberDialog';
import TeamMemberList from '@/components/teams/TeamMemberList';

export default function TeamDetailsPage() {
  const { id } = useParams();

  const { getMembers } = useTeamsApi();

  const [open, setOpen] = useState(false);

  const canView = usePermission('TEAM', 'canView');
  const canEdit = usePermission('TEAM', 'canEdit');

  const {
    data: members,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['team-members', id],
    queryFn: async () => {
      const res = await getMembers(id as string);
      return res.data.data;
    },
    enabled: !!id && !!canView,
  });

  if (canView === undefined) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team members and roles</p>
        </div>

        {canEdit && <Button onClick={() => setOpen(true)}>Add Members</Button>}
      </div>

      {/* Content */}
      {canView ? (
        isLoading ? (
          <div className="text-sm text-muted-foreground">Loading members...</div>
        ) : (
          <TeamMemberList members={members || []} refresh={refetch} />
        )
      ) : (
        <div className="flex items-center justify-center h-32 border border-dashed rounded-xl">
          <p className="text-sm text-muted-foreground">
            You don’t have access to view team members.
          </p>
        </div>
      )}

      {/* Add Members Dialog */}
      <AddMemberDialog open={open} setOpen={setOpen} teamId={id as string} refresh={refetch} />
    </div>
  );
}
