'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUsersApi } from '@/lib/users.api';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';

import { useState } from 'react';
import DeactivateUserDialog from '@/components/users/Deactivateuserdialog';
import EditUserDialog from '@/components/users/Edituserdialog';
import UserInfoCard from '@/components/users/Userinfocard';

export default function UserDetailPage() {
  const { id } = useParams();
  const { getOne } = useUsersApi();

  const canView = usePermission('USER', 'canView');
  const canEdit = usePermission('USER', 'canEdit');

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await getOne(id as string);
      return res.data.data;
    },
    // enabled: !!id && !!canView,
  });

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
            {isLoading
              ? 'Loading...'
              : user
                ? [user.firstName, user.lastName].filter(Boolean).join(' ')
                : 'User Details'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user?.role?.name ?? 'View and manage user profile'}
          </p>
        </div>

        {canEdit && user && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            {user.isActive && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                onClick={() => setDeactivateOpen(true)}
              >
                Deactivate
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content */}
      {canView ? (
        isLoading ? (
          <UserDetailSkeleton />
        ) : user ? (
          <UserInfoCard user={user} />
        ) : (
          <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">User not found.</p>
          </div>
        )
      ) : (
        <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view this user.
          </p>
        </div>
      )}

      {/* Dialogs */}
      {user && (
        <>
          <EditUserDialog open={editOpen} setOpen={setEditOpen} user={user} refresh={refetch} />
          <DeactivateUserDialog
            open={deactivateOpen}
            setOpen={setDeactivateOpen}
            userId={user.id}
            userName={[user.firstName, user.lastName].filter(Boolean).join(' ')}
            refresh={refetch}
          />
        </>
      )}
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-36 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
