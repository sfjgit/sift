'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { UserFilters } from '@/components/users/UserFilters';
import { UserTable } from '@/components/users/UserTable';
import type { UsersListParams, UsersListResponse, UserFormDataResponse } from '@/types/user.types';

const DEFAULT_PARAMS: UsersListParams = {
  page: 1,
  limit: 20,
};

export default function UsersPage() {
  const router = useRouter();
  const axios = useAxios();
  const permission = usePermission('users');

  const [params, setParams] = useState<UsersListParams>(DEFAULT_PARAMS);

  // ── Merge param changes, always reset to page 1 on filter change ──────────
  const handleParamChange = useCallback((changes: Partial<UsersListParams>) => {
    setParams(prev => ({ ...prev, ...changes }));
  }, []);

  const handleReset = useCallback(() => {
    setParams(DEFAULT_PARAMS);
  }, []);

  // ── Build query string ────────────────────────────────────────────────────
  function buildQs(p: UsersListParams): string {
    const q = new URLSearchParams();
    if (p.search) q.set('search', p.search);
    if (p.buId) q.set('buId', p.buId);
    if (p.roleId) q.set('roleId', p.roleId);
    if (p.isActive) q.set('isActive', p.isActive);
    if (p.teamId) q.set('teamId', p.teamId);
    if (p.teamRole) q.set('teamRole', p.teamRole);
    if (p.isClientHandler) q.set('isClientHandler', p.isClientHandler);
    if (p.isContactOwner) q.set('isContactOwner', p.isContactOwner);
    q.set('page', String(p.page ?? 1));
    q.set('limit', String(p.limit ?? 20));
    return q.toString();
  }

  // ── Users list query ──────────────────────────────────────────────────────
  const usersQuery = useQuery<UsersListResponse>({
    queryKey: ['users', params],
    queryFn: async () => {
      const res = await axios.get<UsersListResponse>(`/users?${buildQs(params)}`);
      return res.data;
    },
    placeholderData: prev => prev, // keep old data while fetching new page
  });

  // ── Form data query — roles, BUs, teams for filter dropdowns ─────────────
  const formDataQuery = useQuery<UserFormDataResponse>({
    queryKey: ['users-form-data'],
    queryFn: async () => {
      const res = await axios.get<UserFormDataResponse>('/users/form-data');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // rarely changes — cache 5 min
  });

  // ── Teams for filter dropdown — simple list ───────────────────────────────
  const teamsQuery = useQuery<{ success: boolean; data: { id: string; name: string }[] }>({
    queryKey: ['teams-simple'],
    queryFn: async () => {
      const res = await axios.get('/teams?fields=id,name&limit=200');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = usersQuery.isLoading;
  const isError = usersQuery.isError;
  const usersData = usersQuery.data;
  const formData = formDataQuery.data?.data;

  // Use permissions from API response (scoped) if available,
  // fall back to AuthContext permissions for initial render
  const effectivePermissions = usersData?.permissions ?? {
    canView: permission.canView,
    canAdd: permission.canAdd,
    canEdit: permission.canEdit,
    canDelete: permission.canDelete,
    scope: permission.scope,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none">Users</h1>
            {usersData && (
              <p className="mt-1 text-sm text-muted-foreground">
                {usersData.pagination.total} total
              </p>
            )}
          </div>
        </div>

        {/* Create button — only if canAdd */}
        {effectivePermissions.canAdd && (
          <Button size="sm" onClick={() => router.push('/users/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <UserFilters
        params={params}
        roles={formData?.roles ?? []}
        businessUnits={formData?.businessUnits ?? []}
        teams={teamsQuery.data?.data ?? []}
        onChange={handleParamChange}
        onReset={handleReset}
      />

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load users. Please try again.
        </div>
      )}

      {!isLoading && !isError && usersData && (
        <UserTable
          users={usersData.data}
          pagination={usersData.pagination}
          permissions={effectivePermissions}
          onPageChange={page => handleParamChange({ page })}
        />
      )}
    </div>
  );
}
