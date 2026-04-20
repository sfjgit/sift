'use client';

import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { useUsersApi } from '@/lib/users.api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';
import UserTable from '@/components/users/UserTable';

export default function UsersPage() {
  const { getAll } = useUsersApi();
  const canView = usePermission('USER', 'canView');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const res = await getAll({ page, limit });
      return res.data;
    },
    enabled: !!canView,
  });

  const users = data?.data ?? [];
  const pagination = data?.pagination;

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
            Users
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage users and their access</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content */}
      {canView ? (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
              <p className="text-sm text-destructive">Failed to load users. Please try again.</p>
            </div>
          ) : (
            <UserTable users={users} refresh={refetch} />
          )}

          {/* Pagination */}
          {pagination && pagination.totalPage > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of{' '}
                {pagination.total} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {pagination.totalPage}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === pagination.totalPage}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view users.
          </p>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0"
        >
          <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-44 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-5 w-14 bg-muted rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}
