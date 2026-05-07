/* eslint-disable @typescript-eslint/no-explicit-any */
// app/service-lines/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAxios } from '@/hooks/useAxios';

import { ServiceLineList } from '@/components/service-lines/ServiceLineList';
import { ServiceLineForm } from '@/components/service-lines/ServiceLineForm';
import { ToggleConfirmDialog } from '@/components/service-lines/ToggleConfirmDialog';
import type {
  ServiceLine,
  ServiceLineListResponse,
  ServiceLinePermissions,
} from '@/components/service-lines/types';

export default function ServiceLinesPage() {
  const axios = useAxios();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceLine | null>(null);
  const [toggling, setToggling] = useState<ServiceLine | null>(null);

  const qs = () => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (filterActive === 'active') p.isActive = 'true';
    if (filterActive === 'inactive') p.isActive = 'false';
    return new URLSearchParams(p).toString();
  };

  const { data, isLoading } = useQuery<ServiceLineListResponse>({
    queryKey: ['service-lines', search, filterActive],
    queryFn: async () => (await axios.get(`/service-lines?${qs()}`)).data,
    staleTime: 30_000,
  });

  const serviceLines = data?.data ?? [];

  // permissions — service-lines endpoint doesn't return permissions on list
  // so we derive from auth context or hardcode for admin pages
  // if your scope middleware attaches permissions you can add them to the response
  const permissions: ServiceLinePermissions = {
    canAdd: true,
    canEdit: true,
    canDelete: false, // no delete endpoint, just toggle
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['service-lines'] });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => (await axios.patch(`/service-lines/${id}/toggle`)).data,
    onSuccess: (_, id) => {
      const sl = serviceLines.find(s => s.id === id);
      toast.success(`Service line ${sl?.isActive ? 'deactivated' : 'activated'}`);
      setToggling(null);
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to toggle service line');
      setToggling(null);
    },
  });

  const activeCount = serviceLines.filter(s => s.isActive).length;
  const inactiveCount = serviceLines.filter(s => !s.isActive).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b bg-card shrink-0">
        <div>
          <h1 className="text-base font-bold">Service Lines</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {serviceLines.length} total · {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        {permissions.canAdd && (
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> New service line
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3.5 border-b bg-card shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search service lines..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors capitalize ${
                filterActive === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b bg-muted/30 shrink-0">
        <div className="w-8 shrink-0" />
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Name
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-16 text-center">
            Reqs
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-16 text-center">
            SPOCs
          </span>
        </div>
        <div className="w-16 hidden sm:block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Status
          </span>
        </div>
        <div className="w-7 shrink-0" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <ServiceLineList
          serviceLines={serviceLines}
          isLoading={isLoading}
          permissions={permissions}
          onEdit={sl => {
            setEditing(sl);
            setFormOpen(true);
          }}
          onToggle={sl => setToggling(sl)}
        />
      </div>

      {/* Form dialog */}
      <ServiceLineForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={invalidate}
        editing={editing}
      />

      {/* Toggle confirm */}
      <ToggleConfirmDialog
        serviceLine={toggling}
        isPending={toggleMutation.isPending}
        onConfirm={() => toggling && toggleMutation.mutate(toggling.id)}
        onClose={() => setToggling(null)}
      />
    </div>
  );
}
