'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { usePermission } from '@/hooks/usePermission';
import { useTeamsApi } from '@/lib/teams.api';

import TeamTable from '@/components/teams/TeamTable';
import TeamDialog from '@/components/teams/TeamDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function TeamsPage() {
  const [open, setOpen] = useState(false);

  const { getAll } = useTeamsApi();

  const canView = usePermission('TEAM', 'canView');
  const canAdd = usePermission('TEAM', 'canAdd');

  // ✅ React Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => getAll(), // ✅ FIX
    enabled: !!canView,
  });

  const teams = data?.data?.data ?? [];

  // ⏳ wait for permission
  if (canView === undefined) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage teams and members</p>
        </div>

        {/* ✅ Create Button */}
        {canAdd && (
          <Button onClick={() => setOpen(true)} className="text-sm text-black" variant="outline">
            <Plus className="w-4 h-4 text-black" />
            Create Team
          </Button>
        )}
      </div>

      {/* ✅ View Permission */}
      {canView ? (
        <>
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center h-32 border border-dashed rounded-xl">
              <p className="text-sm text-muted-foreground">Loading teams...</p>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex items-center justify-center h-32 border border-dashed rounded-xl">
              <p className="text-sm text-red-500">Failed to load teams. Try again.</p>
            </div>
          )}

          {/* Data */}
          {!isLoading && !isError && <TeamTable teams={teams} refresh={refetch} />}
        </>
      ) : (
        <div className="flex items-center justify-center h-32 border border-dashed rounded-xl">
          <p className="text-sm text-muted-foreground">You don’t have access to view teams.</p>
        </div>
      )}

      {/* Dialog */}
      <TeamDialog open={open} setOpen={setOpen} refresh={refetch} />
    </div>
  );
}
