'use client';

import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { useUsersApi } from '@/lib/users.api';
import { useMemo, useState } from 'react';
import UserTable from '@/components/users/UserTable';
import { UserFilter, type FilterValues } from '@/components/users/UserFilter';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export default function UsersPage() {
  const { getAll } = useUsersApi();
  const canView = usePermission('USER', 'canView');

  const [filters, setFilters] = useState<FilterValues>({
    name: '',
    teamId: '',
    roleId: '',
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', page],
    queryFn: async () => {
      const res = await getAll({ page, limit });
      return res.data;
    },
    enabled: !!canView,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const users = data?.data ?? [];
  const pagination = data?.pagination;

  const filteredUsers = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return users.filter((user: any) => {
      const nameString = (
        user.name ||
        user.fullName ||
        `${user.firstName ?? ''} ${user.lastName ?? ''}`
      ).toLowerCase();

      const matchesName = !filters.name || nameString.includes(filters.name.toLowerCase());

      const matchesTeam =
        !filters.teamId || filters.teamId === 'all' || user.teamId === filters.teamId;

      const matchesRole =
        !filters.roleId || filters.roleId === 'all' || user.roleId === filters.roleId;

      return matchesName && matchesTeam && matchesRole;
    });
  }, [users, filters]);

  if (canView === undefined) return null;

  const TABLE_HEIGHT = 'calc(100vh - 282px)';

  return (
    <div className="max-w-8xl mx-auto flex flex-col" style={{ gap: 0 }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            Users
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage users and their access</p>
        </div>
      </div>

      <div className="border-t border-border mb-5" />

      {canView ? (
        <>
          {/* ── Filter ─────────────────────────────────────── */}
          <div className="mb-4">
            <UserFilter
              onApply={values => {
                setFilters(values);
                setPage(1);
              }}
            />
          </div>

          {/* ── Table — fills remaining height exactly ──────── */}
          <div
            className="border border-border rounded-lg overflow-auto flex-1"
            style={{ height: TABLE_HEIGHT, minHeight: '200px' }}
          >
            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">Failed to load users.</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <UserTable users={filteredUsers} refresh={refetch} />
            )}
          </div>

          {/* ── Pagination ──────────────────────────────────── */}
          {pagination && pagination.totalPage > 1 && (
            <div className="flex items-center justify-between pt-3">
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
                <span className="text-xs text-muted-foreground tabular-nums">
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
        </>
      ) : (
        <div
          className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg gap-2"
          style={{ height: TABLE_HEIGHT }}
        >
          <Users className="w-8 h-8 text-muted-foreground opacity-40" />
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
    <div className="w-full">
      <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border sticky top-0">
        {[24, 20, 16, 14, 10].map((w, i) => (
          <div key={i} className={`h-3 w-${w} bg-muted rounded animate-pulse`} />
        ))}
      </div>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
        >
          <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-44 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          <div className="h-5 w-14 bg-muted rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}
