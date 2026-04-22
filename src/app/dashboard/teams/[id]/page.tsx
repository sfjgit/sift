'use client';

import { useParams } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { useTeamsApi } from '@/lib/teams.api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import AddMemberDialog from '@/components/teams/AddMemberDialog';
import TeamMemberList from '@/components/teams/TeamMemberList';
import TeamDetails from '@/components/teams/TeamDetails';
import { Plus } from 'lucide-react';

export default function TeamDetailsPage() {
  const router = useRouter();
  const { id } = useParams();

  const { getMembers, getOne } = useTeamsApi();

  const [open, setOpen] = useState(false);

  const canView = usePermission('TEAM', 'canView');
  const canEdit = usePermission('TEAM', 'canEdit');

  const {
    data: members,
    refetch,
    isLoading: membersLoading,
  } = useQuery({
    queryKey: ['team-members', id],
    queryFn: async () => {
      const res = await getMembers(id as string);
      return res.data.data;
    },
    enabled: !!id && !!canView,
  });

  const { data: teamDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['team-details', id],
    queryFn: async () => {
      const res = await getOne(id as string);
      return res.data.data;
    },
    enabled: !!id && !!canView,
  });

  const buId = teamDetails?.businessUnitId;

  if (canView === undefined) return null;

  return (
    <div className="max-w-8xl mx-auto space-y-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="self-start flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors group"
      >
        <svg
          className="size-3.5 transition-transform group-hover:-translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Teams
      </button>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            {teamDetails?.name ?? 'Team Details'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {teamDetails?.description ?? 'Manage team members and assignments'}
          </p>
        </div>

        {canEdit && (
          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="bg-gray-200 hover:bg-gray-300 "
          >
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content */}
      {canView ? (
        <div className="space-y-6">
          {/* Members section */}
          {membersLoading ? (
            <MembersSkeleton />
          ) : (
            <TeamMemberList members={members || []} refresh={refetch} />
          )}

          {/* Team details section */}
          {detailsLoading ? (
            <DetailsSkeleton />
          ) : teamDetails ? (
            <TeamDetails team={teamDetails} />
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view this team.
          </p>
        </div>
      )}

      <AddMemberDialog
        open={open}
        setOpen={setOpen}
        teamId={id as string}
        refresh={refetch}
        buId={buId}
      />
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0"
        >
          <div className="h-3.5 w-36 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          <div className="h-7 w-16 bg-muted rounded animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-3.5 bg-muted rounded animate-pulse w-2/3" />
      ))}
    </div>
  );
}
