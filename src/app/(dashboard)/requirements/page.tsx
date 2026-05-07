/* eslint-disable @typescript-eslint/no-explicit-any */
// app/requirements/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAxios } from '@/hooks/useAxios';

import { RequirementStatCards } from '@/components/requirements/RequirementStatCards';
import { RequirementsToolbar } from '@/components/requirements/RequirementsToolbar';
import { RequirementsTable } from '@/components/requirements/RequirementsTable';
import { StatusChangeDialog } from '@/components/requirements/StatusChangeDialog';
import { DEFAULT_FILTERS, STATUS_OPTIONS } from '@/components/requirements/constants';
import { buildQueryString, countActiveFilters } from '@/components/requirements/utils';
import type {
  RequirementFilters,
  RequirementListItem,
  RequirementListResponse,
  RequirementStatsResponse,
  RequirementStatus,
} from '@/types/requirements.types';

export default function RequirementsPage() {
  const axios = useAxios();
  const router = useRouter();
  const qc = useQueryClient();

  // @ts-expect-error errr
  const [filters, setFilters] = useState<RequirementFilters>(DEFAULT_FILTERS);
  const [debouncedSearch] = useDebounce(filters.search, 400);
  const [statusDialog, setStatusDialog] = useState<{
    req: RequirementListItem;
    to: RequirementStatus;
  } | null>(null);

  function setFilter<K extends keyof RequirementFilters>(key: K, value: RequirementFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }

  const qs = useCallback(
    () => buildQueryString(filters, debouncedSearch),
    [filters, debouncedSearch]
  );

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: statsRes } = useQuery<RequirementStatsResponse>({
    queryKey: ['requirement-stats'],
    queryFn: async () => (await axios.get('/requirements/stats')).data,
    staleTime: 30_000,
  });

  const {
    data: listRes,
    isLoading,
    isFetching,
  } = useQuery<RequirementListResponse>({
    queryKey: ['requirements', qs()],
    queryFn: async () => (await axios.get(`/requirements?${qs()}`)).data,
    placeholderData: prev => prev,
  });

  const { data: clientsRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['clients-dropdown'],
    queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data,
    staleTime: 60_000,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
  });

  const requirements = listRes?.data ?? [];
  const meta = listRes?.meta;
  const permissions = listRes?.permissions;
  const stats = statsRes?.data;
  const clients = clientsRes?.data ?? [];
  const businessUnits = busRes?.data ?? [];

  // ── Status mutation ────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: async ({ id, toStatus }: { id: string; toStatus: RequirementStatus }) =>
      (await axios.patch(`/requirements/${id}/status`, { status: toStatus })).data,
    onSuccess: (_, { toStatus }) => {
      toast.success(`Moved to ${STATUS_OPTIONS.find(s => s.value === toStatus)?.label}`);
      qc.invalidateQueries({ queryKey: ['requirements'] });
      qc.invalidateQueries({ queryKey: ['requirement-stats'] });
      setStatusDialog(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update status'),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Requirements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} total` : '—'}
          </p>
        </div>
        {permissions?.canAdd && (
          <Button size="sm" onClick={() => router.push('/requirements/new')}>
            New requirement +
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && <RequirementStatCards stats={stats} />}

      <Separator />

      {/* Toolbar — search, filters, sort */}
      <RequirementsToolbar
        filters={filters}
        setFilter={setFilter}
        // @ts-expect-error errr
        onClear={() => setFilters(DEFAULT_FILTERS)}
        clients={clients}
        businessUnits={businessUnits}
      />

      {/* Table + pagination */}
      <RequirementsTable
        requirements={requirements}
        meta={meta}
        permissions={permissions}
        isLoading={isLoading}
        isFetching={isFetching}
        page={filters.page}
        onPageChange={p => setFilter('page', p)}
        // @ts-expect-error errr
        onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        hasActiveFilters={countActiveFilters(filters) > 0}
        onStatusChange={(req, to) => setStatusDialog({ req, to })}
      />

      {/* Status change confirmation */}
      <StatusChangeDialog
        dialog={statusDialog}
        isPending={statusMutation.isPending}
        onConfirm={(req, to) => statusMutation.mutate({ id: req.id, toStatus: to })}
        onClose={() => setStatusDialog(null)}
      />
    </div>
  );
}
