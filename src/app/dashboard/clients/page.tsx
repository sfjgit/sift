'use client';

import { useState, useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermission';
import ClientsFilterBar from '@/components/clients/Clientsfilterbar';
import ClientsTable from '@/components/clients/Clientstable';
import ClientsToolbar from '@/components/clients/Clientstoolbar';
import { MODULES } from '@/constants/modules';
import { useClients } from '@/lib/clients.api';
import { useQuery } from '@tanstack/react-query';

export default function ClientsPage() {
  const { canView, canAdd, canEdit, canDelete, scope } = usePermissions(MODULES.CLIENTS);
  const clientsApi = useClients();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // ✅ Fetch once (NO filters here)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll({ page: 1, limit: 100 }),
  });

  const allClients = data?.data?.data ?? [];

  // ✅ UI Filtering
  const filteredClients = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return allClients.filter((client: any) => {
      const matchesSearch =
        !search ||
        client.name?.toLowerCase().includes(search.toLowerCase()) ||
        client.industry?.toLowerCase().includes(search.toLowerCase()) ||
        client.city?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allClients, search, statusFilter]);

  // ✅ Frontend Pagination
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredClients.slice(start, start + limit);
  }, [filteredClients, page, limit]);

  // ================= PERMISSION HANDLING =======================

  if (canView === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F0F4F8]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0066CC] border-t-transparent" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#F0F4F8]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700">Access Denied</p>
        <p className="text-xs text-gray-400">You don&apos;t have permission to view clients.</p>
      </div>
    );
  }

  return (
    // <div className="max-w-6xl mx-auto space-y-6">
    <div
      className="flex flex-col overflow-hidden max-w-8xl mx-auto space-y-6"
      style={{ height: 'calc(100vh - 64px)' }} // adjust if needed
    >
      <div>
        <h1
          className="text-2xl font-semibold text-foreground tracking-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          Clients
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organization&apos;s clients
        </p>
      </div>
      <div
        className="flex max-h-screen flex-col overflow-hidden bg-[#F0F4F8]"
        style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
      >
        {/* View tabs + action toolbar */}
        <ClientsToolbar canAdd={!!canAdd} />

        {/* Search + filter row */}
        <ClientsFilterBar
          search={search}
          onSearchChange={v => {
            setSearch(v);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusChange={v => {
            setStatus(v);
            setPage(1);
          }}
        />

        {/* Table card: flex-1 takes remaining height, overflow-hidden clips it,
          the inner div in ClientsTable handles actual scroll */}
        <div className="mx-3 mb-3 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <ClientsTable
            data={paginatedClients}
            isLoading={isLoading}
            isError={isError}
            canEdit={!!canEdit}
            canDelete={!!canDelete}
            scope={scope}
            pagination={{
              total: filteredClients.length,
              page,
              limit,
              totalPages: Math.ceil(filteredClients.length / limit),
            }}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={l => {
              setLimit(l);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
