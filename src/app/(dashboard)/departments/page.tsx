/* eslint-disable @typescript-eslint/no-explicit-any */
// app/departments/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAxios } from '@/hooks/useAxios';

import { DepartmentList } from '@/components/departments/DepartmentList';
import { DepartmentForm } from '@/components/departments/DepartmentForm';
import { ToggleConfirmDialog } from '@/components/departments/ToggleConfirmDialog';
import type { Department } from '@/components/departments/types';

export default function DepartmentsPage() {
  const axios = useAxios();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [toggling, setToggling] = useState<Department | null>(null);

  const qs = () => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (filterActive === 'active') p.isActive = 'true';
    if (filterActive === 'inactive') p.isActive = 'false';
    return new URLSearchParams(p).toString();
  };

  const { data, isLoading } = useQuery<{ data: Department[] }>({
    queryKey: ['departments', search, filterActive],
    queryFn: async () => (await axios.get(`/departments?${qs()}`)).data,
    staleTime: 30_000,
  });

  const departments = data?.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => (await axios.patch(`/departments/${id}/toggle`)).data,
    onSuccess: () => {
      toast.success('Department updated');
      setToggling(null);
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed');
      setToggling(null);
    },
  });

  const active = departments.filter(d => d.isActive).length;
  const inactive = departments.filter(d => !d.isActive).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b bg-card shrink-0">
        <div>
          <h1 className="text-base font-bold">Departments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {departments.length} total · {active} active · {inactive} inactive
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> New department
        </Button>
      </div>

      <div className="flex items-center gap-2 px-6 py-3.5 border-b bg-card shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search departments..."
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

      <div className="flex items-center gap-4 px-5 py-2.5 border-b bg-muted/30 shrink-0">
        <div className="w-8 shrink-0" />
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Name
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground hidden sm:block w-16">
          Users
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground hidden sm:block w-14">
          Status
        </span>
        <div className="w-7 shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <DepartmentList
          departments={departments}
          isLoading={isLoading}
          canEdit={true}
          onEdit={d => {
            setEditing(d);
            setFormOpen(true);
          }}
          onToggle={d => setToggling(d)}
        />
      </div>

      <DepartmentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={invalidate}
        editing={editing}
      />

      <ToggleConfirmDialog
        department={toggling}
        isPending={toggleMutation.isPending}
        onConfirm={() => toggling && toggleMutation.mutate(toggling.id)}
        onClose={() => setToggling(null)}
      />
    </div>
  );
}
