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
    queryFn: () => getAll(),
    enabled: !!canView,
  });

  const teams = data?.data?.data ?? [];

  // ⏳ wait for permission
  if (canView === undefined) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Teams
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage teams and their members</p>
        </div>

        {canAdd && (
          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="bg-gray-200 hover:bg-gray-300"
          >
            <Plus className="w-4 h-4" />
            New Team
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content */}
      {canView ? (
        <>
          {isLoading && (
            <div className="border border-border rounded-lg overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0"
                >
                  <div className="h-3.5 w-36 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-14 bg-muted rounded-full animate-pulse ml-auto" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
              <p className="text-sm text-destructive">Failed to load teams. Please try again.</p>
            </div>
          )}

          {!isLoading && !isError && <TeamTable teams={teams} refresh={refetch} />}
        </>
      ) : (
        <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view teams.
          </p>
        </div>
      )}

      {/* Dialog */}
      <TeamDialog open={open} setOpen={setOpen} refresh={refetch} />
    </div>
  );
}
