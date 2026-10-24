// File: page.tsx
// Path: src/app/(app)/admin/users/page.tsx

'use client';

import { useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, useTableState } from '@/components/data-table';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { userColumns, userFilterKeys, userFilters } from '@/features/admin/userColumns';
import { UserActionsMenu, useUserActions } from '@/features/admin/userActions';
import { userHooks, useRoles } from '@/hooks/queries';
import { usersApi } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/resource';
import type { UserListItem } from '@/types/org';

function UsersPage() {
  const table = useTableState('users', userFilterKeys, { sort: { id: 'firstName', desc: false } });
  const query = userHooks.useList(table.params);
  const roles = useRoles();
  const actions = useUserActions();

  const filters = useMemo(() => userFilters(roles.data), [roles.data]);
  const rowActions = useCallback(
    (u: UserListItem) => <UserActionsMenu user={u} actions={actions} />,
    [actions]
  );
  const columns = useMemo(() => userColumns(rowActions), [rowActions]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Everyone with access to the CRM — their role, team and reporting line."
        actions={
          actions.canManage && (
            <Button onClick={actions.openCreate}>
              <Plus /> New user
            </Button>
          )
        }
      />

      <DataTable
        id="users"
        table={table}
        query={query}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search name, email, employee ID or phone…"
        rowHref={u => `/admin/users/${u.id}`}
        fetchAll={p => fetchAllPages(usersApi.list, p)}
        exportName="users"
        empty={{
          title: 'No users yet',
          description: 'Invite your team — each person gets an email to set their password.',
          action: actions.canManage && (
            <Button size="sm" onClick={actions.openCreate}>
              <Plus /> New user
            </Button>
          ),
        }}
      />

      {actions.dialogs}
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="users.read">
      <UsersPage />
    </RequirePermission>
  );
}
