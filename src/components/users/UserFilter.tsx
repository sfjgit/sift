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
import { useBusinessUnitsApi } from '@/lib/business-units.api';

export type FilterValues = {
  name: string;
  businessUnitId: string;
  teamId: string;
  roleId: string;
};

interface UserFilterProps {
  onApply: (data: FilterValues) => void;
}

const EMPTY: FilterValues = { name: '', businessUnitId: '', teamId: '', roleId: '' };

export const UserFilter = ({ onApply }: UserFilterProps) => {
  const teamsApi = useTeamsApi();
  const rolesApi = useRolesApi();
  const buApi = useBusinessUnitsApi();

  const { data: businessUnits = [], isLoading: buLoading } = useQuery({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await buApi.getAll();
      return res?.data?.data ?? [];
    },
    staleTime: 1000 * 60 * 5, // ✅ 5 mins cache
    refetchOnWindowFocus: false, // ✅ IMPORTANT
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await teamsApi.getAll();
      return res.data?.data ?? [];
    },
  });

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles-filter'],
    queryFn: async () => {
      const res = await rolesApi.getAll();
      return res.data.data;
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

      {/* ── Business Unit filter ───────────────────── */}
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label className="text-xs text-muted-foreground font-medium">Business Unit</Label>
        <Controller
          name="businessUnitId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={val => field.onChange(val === 'all' ? '' : val)}
            >
              <SelectTrigger className="h-9 text-sm w-[180px]">
                <SelectValue placeholder="All BUs" />
              </SelectTrigger>
              <SelectContent key={businessUnits.length}>
                <SelectItem value="all">All BUs</SelectItem>

                {buLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading business units...
                  </SelectItem>
                ) : businessUnits.length > 0 ? (
                  businessUnits.map((bu: any) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>
                    No business units found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        />
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

                {isLoading ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Loading roles...</div>
                ) : roles?.length > 0 ? (
                  roles.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-xs text-muted-foreground">No roles found</div>
                )}
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
