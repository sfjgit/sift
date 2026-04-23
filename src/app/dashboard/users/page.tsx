/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { useUsersApi } from '@/lib/users.api';
import { useMemo, useState } from 'react';

import { UserFilter, type FilterValues } from '@/components/users/UserFilter';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { CreateUserDialog } from '@/components/users/AddUserDialog';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { useTeamsApi } from '@/lib/teams.api';

export default function UsersPage() {
  const { getAll } = useUsersApi();
  const canView = usePermission('USER', 'canView');
  const canAdd = usePermission('USER', 'canAdd');

  const [filters, setFilters] = useState<FilterValues>({
    name: '',
    businessUnitId: '',
    teamId: '',
    roleId: '',
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  const { getAll: getTeams } = useTeamsApi();
  const { getAll: getBUs } = useBusinessUnitsApi();

  const { data: teamData } = useQuery({
    queryKey: ['teams-all'],
    queryFn: () => getTeams(),
  });

  const { data: buData } = useQuery({
    queryKey: ['bus-all'],
    queryFn: () => getBUs(),
  });

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {};
    const teams = teamData?.data?.data ?? [];

    teams.forEach((t: any) => {
      map[t.id] = t.name;
    });

    return map;
  }, [teamData]);

  const buMap = useMemo(() => {
    const map: Record<string, string> = {};
    const bus = buData?.data?.data ?? [];

    bus.forEach((b: any) => {
      map[b.id] = b.name;
    });

    return map;
  }, [buData]);

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
    return users.filter((user: any) => {
      const nameString = (
        user.name ||
        user.fullName ||
        `${user.firstName ?? ''} ${user.lastName ?? ''}`
      ).toLowerCase();

      const matchesName = !filters.name || nameString.includes(filters.name.toLowerCase());

      const matchesTeam =
        !filters.teamId ||
        filters.teamId === 'all' ||
        user.teamMemberships?.some((tm: any) => tm.teamId === filters.teamId);

      const matchesRole =
        !filters.roleId || filters.roleId === 'all' || user.role?.id === filters.roleId;

      return matchesName && matchesTeam && matchesRole;
    });
  }, [users, filters]);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSet = new Set(selectedRows);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    if (selectedRows.size === filteredUsers.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredUsers.map((u: any) => u.id)));
    }
  };

  const allChecked = filteredUsers.length > 0 && selectedRows.size === filteredUsers.length;

  // const colTemplate = '40px 50px 1.5fr 1.5fr 1.2fr 1fr 1fr 120px';
  const colTemplate = '1fr 1fr 1fr 1fr 120px 100px';

  if (canView === undefined) return null;

  const TABLE_HEIGHT = 'calc(100vh - 282px)';

  return (
    <div className="max-w-8xl mx-auto flex flex-col" style={{ gap: 0 }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex justify-between mb-5">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            Users
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage users and their access</p>
        </div>
        <div>{canAdd && <CreateUserDialog />}</div>
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
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  height: '100%',
                }}
              >
                {/* HEADER */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: colTemplate,
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '0 12px',
                  }}
                >
                  {/* <div style={{ padding: '10px 0' }}>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </div>

                  <div style={{ padding: '10px 0', fontSize: 11 }}>#</div> */}

                  {['Name', 'Email', 'Business Unit', 'Team', 'Role', 'Status'].map(label => (
                    <div
                      key={label}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#94a3b8',
                        padding: '10px 8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* BODY */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map((user: any, idx: number) => {
                      const checked = selectedRows.has(user.id);

                      const name =
                        user.name ||
                        user.fullName ||
                        `${user.firstName ?? ''} ${user.lastName ?? ''}`;

                      return (
                        <div
                          key={user.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: colTemplate,
                            padding: '0 12px',
                            borderBottom: '1px solid #f1f5f9',
                            background: checked ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                            cursor: 'pointer',
                          }}
                        >
                          {/* Checkbox */}
                          {/* <div style={{ padding: '12px 0' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(user.id)}
                            />
                          </div> */}

                          {/* Index */}
                          {/* <div style={{ padding: '12px 0' }}>
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                background: '#eff6ff',
                                color: '#3b82f6',
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 4,
                              }}
                            >
                              {(page - 1) * limit + idx + 1}
                            </span>
                          </div> */}

                          {/* Name */}
                          <div style={{ padding: '12px 8px', fontSize: 13, fontWeight: 500 }}>
                            {name}
                          </div>

                          {/* Email */}
                          <div style={{ padding: '12px 8px', fontSize: 13 }}>
                            {user.email ?? '—'}
                          </div>
                          {/* Business Unit */}
                          <div style={{ padding: '12px 8px', fontSize: 13 }}>
                            {user.businessUnitId ? (buMap[user.businessUnitId] ?? '—') : '—'}
                          </div>

                          {/* Team */}
                          <div style={{ padding: '12px 8px', fontSize: 13 }}>
                            {user.teamMemberships?.length > 0
                              ? (teamMap[user.teamMemberships[0].teamId] ?? '—')
                              : '—'}
                          </div>

                          {/* Role */}
                          <div style={{ padding: '12px 8px', fontSize: 13 }}>
                            {user.role?.name ?? '—'}
                          </div>

                          {/* Status */}
                          <div style={{ padding: '12px 8px' }}>
                            <span
                              style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                borderRadius: 999,
                                background: user.isActive ? '#dcfce7' : '#fee2e2',
                                color: user.isActive ? '#16a34a' : '#dc2626',
                              }}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
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
