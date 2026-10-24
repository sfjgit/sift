// File: page.tsx
// Path: src/app/(app)/admin/auth-logs/page.tsx
//
// Sign-in history for security reviews. Newest first; the backend has no
// free-text search or column sort here, so filters do the narrowing.

'use client';

import { useMemo } from 'react';
import { History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, useTableState } from '@/components/data-table';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { authLogColumns, authLogFilterKeys, authLogFilters } from '@/features/admin/authLogColumns';
import { authLogsApi } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/resource';
import type { ListParams } from '@/types/api';

// yyyy-mm-dd → the start / end of that day in the viewer's timezone ("to" is inclusive)
const dayBound = (v: ListParams[string], end: boolean) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString()
    : v;

const toApiParams = (p: ListParams): ListParams => {
  const out: ListParams = { ...p, startDate: dayBound(p.startDate, false), endDate: dayBound(p.endDate, true) };
  delete out.search; // not supported by /auth-logs
  delete out.sortBy;
  return out;
};

function AuthLogsPage() {
  const table = useTableState('auth_logs', authLogFilterKeys);
  const params = useMemo(() => toApiParams(table.params), [table.params]);
  const query = useQuery({
    queryKey: ['auth-logs', params],
    queryFn: () => authLogsApi.list(params),
    placeholderData: prev => prev,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Login history"
        description="Every sign-in, sign-out, failed attempt and password change — newest first."
      />
      <DataTable
        id="auth_logs"
        table={table}
        query={query}
        columns={authLogColumns}
        filters={authLogFilters}
        searchable={false}
        fetchAll={p => fetchAllPages(authLogsApi.list, toApiParams(p))}
        exportName="login-history"
        empty={{
          title: 'No sign-in activity yet',
          description: 'Events appear here as soon as people start signing in.',
        }}
      />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <History className="size-3.5" /> Times are shown in your browser’s timezone.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <RequirePermission perm="admin.view_auth_logs">
      <AuthLogsPage />
    </RequirePermission>
  );
}
