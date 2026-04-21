'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRolesApi } from '@/lib/roles.api';
import { useTeamsApi } from '@/lib/teams.api';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export type FilterValues = {
  name: string;
  teamId: string;
  roleId: string;
};

interface UserFilterProps {
  onApply: (data: FilterValues) => void;
}

const EMPTY: FilterValues = { name: '', teamId: '', roleId: '' };

export const UserFilter = ({ onApply }: UserFilterProps) => {
  const teamsApi = useTeamsApi();
  const rolesApi = useRolesApi();

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await teamsApi.getAll();
      return res.data?.data ?? [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await rolesApi.getAll();
      return res.data?.data ?? [];
    },
  });

  const { register, handleSubmit, control, reset, watch } = useForm<FilterValues>({
    defaultValues: EMPTY,
  });

  const values = watch();
  const isDirty = values.name !== '' || values.teamId !== '' || values.roleId !== '';

  const handleReset = () => {
    reset(EMPTY);
    onApply(EMPTY);
  };

  return (
    <form onSubmit={handleSubmit(onApply)} className="flex flex-wrap items-end gap-3">
      {/* ── Search by name ───────────────────────── */}
      <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
        <Label className="text-xs text-muted-foreground font-medium">Name</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name..."
            className="pl-8 h-9 text-sm"
            {...register('name')}
          />
        </div>
      </div>

      {/* ── Team filter ──────────────────────────── */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label className="text-xs text-muted-foreground font-medium">Team</Label>
        <Controller
          name="teamId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-9 text-sm w-[160px]">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams?.map((team: any) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── Role filter ──────────────────────────── */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label className="text-xs text-muted-foreground font-medium">Role</Label>
        <Controller
          name="roleId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-9 text-sm w-[160px]">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles?.map((role: any) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── Actions ──────────────────────────────── */}
      <div className="flex items-end gap-2 pb-0">
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleReset}
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
        <Button type="submit" size="sm" className="h-9 px-4 gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Apply
        </Button>
      </div>
    </form>
  );
};
