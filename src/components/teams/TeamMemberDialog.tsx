'use client';

import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { TeamMember, useTeamsApi } from '@/lib/teams.api';
import { useQuery } from '@tanstack/react-query';

type TeamMemberDialogProps = {
  teamId: string;
};

export default function TeamMemberDialog({ teamId }: TeamMemberDialogProps) {
  const { getMembers, removeMember } = useTeamsApi();
  const canEdit = usePermission('TEAM', 'canEdit');

  // ✅ React Query to fetch members
  const {
    data: members = [],
    isLoading,
    refetch,
  } = useQuery<TeamMember[]>({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const res = await getMembers(teamId);
      return res.data.data as TeamMember[];
    },
    enabled: !!teamId, // only fetch if teamId exists
  });

  // ✅ Remove member handler
  const handleRemove = async (userId: string) => {
    try {
      await removeMember(teamId, userId);
      refetch(); // automatically refresh after removal
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  // 🔄 Loading state
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading members...</div>;
  }

  // ❌ Empty state
  if (!members.length) {
    return <div className="text-sm text-muted-foreground">No members found</div>;
  }

  return (
    <div className="space-y-3">
      {members.map(m => (
        <div key={m.userId} className="flex items-center justify-between border rounded-md p-2">
          <div>
            <p className="text-sm font-medium">{m.user?.name || 'No Name'}</p>
            <p className="text-xs text-muted-foreground">{m.teamRole}</p>
          </div>

          {canEdit && (
            <Button size="sm" variant="destructive" onClick={() => handleRemove(m.userId)}>
              Remove
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
