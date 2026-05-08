/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import { UserFilters } from '@/components/users/UserFilters';
import { UserTable } from '@/components/users/UserTable';
import type {
  UsersListParams,
  UsersListResponse,
  UserFormDataResponse,
  UserListItem,
} from '@/types/user.types';

const DEFAULT_PARAMS: UsersListParams = {
  page: 1,
  limit: 25,
};

function buildQs(p: UsersListParams): string {
  const q = new URLSearchParams();
  if (p.search) q.set('search', p.search);
  if (p.buId) q.set('buId', p.buId);
  if (p.roleId) q.set('roleId', p.roleId);
  if (p.departmentId) q.set('departmentId', p.departmentId);
  if (p.reportingToId) q.set('reportingToId', p.reportingToId);
  if (p.isActive) q.set('isActive', p.isActive);
  if (p.teamId) q.set('teamId', p.teamId);
  if (p.teamRole) q.set('teamRole', p.teamRole);
  if (p.isClientHandler) q.set('isClientHandler', p.isClientHandler);
  if (p.sortBy) q.set('sortBy', p.sortBy);
  if (p.sortDir) q.set('sortDir', p.sortDir);
  q.set('page', String(p.page ?? 1));
  q.set('limit', String(p.limit ?? 25));
  return q.toString();
}

export default function UsersPage() {
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const permission = usePermission('users');

  const [params, setParams] = useState<UsersListParams>(DEFAULT_PARAMS);

  const handleParamChange = useCallback((changes: Partial<UsersListParams>) => {
    setParams(prev => ({ ...prev, ...changes, page: changes.page ?? 1 }));
  }, []);

  const handleReset = useCallback(() => setParams(DEFAULT_PARAMS), []);

  // ── Users list ────────────────────────────────────────────────────────────
  const usersQuery = useQuery<UsersListResponse>({
    queryKey: ['users', params],
    queryFn: async () => {
      const res = await axios.get<UsersListResponse>(`/users?${buildQs(params)}`);
      // normalise meta → pagination for table
      const d = res.data;
      return { ...d, pagination: d.pagination ?? d.meta };
    },
    placeholderData: prev => prev,
  });

  // ── Form data (roles, BUs) ────────────────────────────────────────────────
  const formDataQuery = useQuery<UserFormDataResponse>({
    queryKey: ['users-form-data'],
    queryFn: async () => {
      const res = await axios.get<UserFormDataResponse>('/users/form-data');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Teams simple list (team lead picker) ──────────────────────────────────
  // Teams in this schema = users who have teamMembers (are team leads)
  const teamLeadsQuery = useQuery<{
    success: boolean;
    data: { id: string; firstName: string; lastName: string }[];
  }>({
    queryKey: ['team-leads-simple'],
    queryFn: async () => {
      // fetch users who are team leads — reuse /users with teamRole=LEAD
      const res = await axios.get('/users?teamRole=LEAD&limit=100&fields=id,firstName,lastName');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Toggle active/inactive ────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async (user: UserListItem) => {
      await axios.patch(`/users/${user.id}/toggle`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const usersData = usersQuery.data;
  const formData = formDataQuery.data?.data;
  const teamLeads = (teamLeadsQuery.data?.data ?? []).map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
  }));

  const effectivePermissions = usersData?.permissions ?? {
    canView: permission.canView,
    canAdd: permission.canAdd,
    canEdit: permission.canEdit,
    canDelete: permission.canDelete,
    scope: permission.scope,
  };

  // normalise pagination — backend returns meta, table expects pagination
  const pagination = usersData ? (usersData.pagination ?? (usersData as any).meta) : null;

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
            {pagination && (
              <p className="mt-1 text-sm text-muted-foreground">{pagination.total} total</p>
            )}
          </div>
        </div>

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
        teams={teamLeads}
        onChange={handleParamChange}
        onReset={handleReset}
      />

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {usersQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {usersQuery.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load users. Please try again.
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && usersData && pagination && (
        <UserTable
          users={usersData.data}
          pagination={pagination}
          permissions={effectivePermissions}
          onPageChange={page => handleParamChange({ page })}
          onToggle={effectivePermissions.canEdit ? toggleMutation.mutate : undefined}
        />
      )}
    </div>
  );
}
