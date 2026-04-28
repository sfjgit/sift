/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Network, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAxios } from '@/hooks/useAxios';
import { cn } from '@/lib/utils';
import type {
  TeamDetailResponse,
  ArcsResponse,
  CreateTeamPayload,
  UpdateTeamPayload,
  NodeType,
  TeamCategory,
} from '@/types/team.types';
import type { BUListResponse } from '@/types/bu.types';

// ─────────────────────────────────────────────────────────────────────────────
// Schema — no parentTeamId. Links are created via edges after team creation.
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  nodeType: z.enum(['MANAGEMENT', 'GROUP', 'INDIVIDUAL']).default('GROUP'),
  category: z.enum(['DELIVERY', 'SALES', 'SUPPORT', 'MANAGEMENT']).optional().nullable(),
  businessUnitId: z.string().min(1).optional().nullable(),
  teamArcId: z.string().min(1, 'Arc is required'), // required — every team needs an arc
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const NODE_DESC: Record<string, string> = {
  MANAGEMENT: 'Oversight node — sits at the top, routes work down',
  GROUP: 'A squad or team with multiple members',
  INDIVIDUAL: 'Single-person node, e.g. a Delivery Manager',
};

// ─────────────────────────────────────────────────────────────────────────────
// TeamForm — create + edit
// ─────────────────────────────────────────────────────────────────────────────

export function TeamForm({ mode, teamId }: { mode: 'create' | 'edit'; teamId?: string }) {
  const router = useRouter();
  const axios = useAxios();
  const qc = useQueryClient();
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    // @ts-expect-error err
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      nodeType: 'GROUP',
      category: null,
      businessUnitId: null,
      teamArcId: '',
      isActive: true,
    },
  });

  const selectedBU = watch('businessUnitId');

  // ── Fetch existing team (edit) ────────────────────────────────────────────

  const { data: teamData, isLoading: loadingTeam } = useQuery<TeamDetailResponse>({
    queryKey: ['team', teamId],
    queryFn: async () => (await axios.get<TeamDetailResponse>(`/teams/${teamId}`)).data,
    enabled: isEdit && !!teamId,
  });

  useEffect(() => {
    if (!teamData?.data) return;
    const t = teamData.data;
    reset({
      name: t.name,
      description: t.description ?? '',
      nodeType: t.nodeType,
      category: t.category ?? null,
      businessUnitId: t.businessUnit?.id ?? null,
      teamArcId: t.teamArcId,
      isActive: t.isActive,
    });
  }, [teamData, reset]);

  // ── Reference data ────────────────────────────────────────────────────────

  const { data: busData } = useQuery<BUListResponse>({
    queryKey: ['business-units-flat'],
    queryFn: async () => (await axios.get<BUListResponse>('/business-units')).data,
  });

  // Filter arcs by selected BU
  const { data: arcsData } = useQuery<ArcsResponse>({
    queryKey: ['arcs', selectedBU],
    queryFn: async () => {
      const params = selectedBU ? `?buId=${selectedBU}` : '';
      return (await axios.get<ArcsResponse>(`/teams/arcs${params}`)).data;
    },
  });

  const busFlat = (busData as any)?.flat ?? (busData as any)?.data ?? [];
  const arcs = arcsData?.data ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: async (p: CreateTeamPayload) => (await axios.post('/teams', p)).data,
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['arc', res.data?.teamArcId] });
      router.push(`/teams/${res.data.id}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: async (p: UpdateTeamPayload) => (await axios.put(`/teams/${teamId}`, p)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team', teamId] });
      router.push(`/teams/${teamId}`);
    },
  });

  const mutation = isEdit ? updateMut : createMut;

  const onSubmit = (v: FormValues) => {
    if (isEdit) {
      updateMut.mutate({
        name: v.name,
        description: v.description || null,
        nodeType: v.nodeType as NodeType,
        category: (v.category as TeamCategory) || null,
        isActive: v.isActive,
        teamArcId: v.teamArcId,
      });
    } else {
      createMut.mutate({
        name: v.name,
        description: v.description || null,
        nodeType: v.nodeType as NodeType,
        category: (v.category as TeamCategory) || null,
        businessUnitId: v.businessUnitId || null,
        teamArcId: v.teamArcId,
      });
    }
  };

  if (isEdit && loadingTeam) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{isEdit ? 'Edit team' : 'Create team'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update details. To change links, use the edge manager on the detail page.'
              : 'Create the team. Link it to other teams using edges after creation.'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Team name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. Alpha Squad"
            {...register('name')}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="What does this team do?"
            rows={2}
            {...register('description')}
          />
        </div>

        {/* Node type + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Node type <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="nodeType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(errors.nodeType && 'border-destructive')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGEMENT">Management</SelectItem>
                    <SelectItem value="GROUP">Group / Squad</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual / DM</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {watch('nodeType') && (
              <p className="text-[11px] text-muted-foreground">{NODE_DESC[watch('nodeType')]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={v => field.onChange(v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="DELIVERY">Delivery</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="SUPPORT">Support</SelectItem>
                    <SelectItem value="MANAGEMENT">Management</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* BU + Arc — side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Business Unit</Label>
            <Controller
              name="businessUnitId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={v => field.onChange(v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select BU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {busFlat.map((bu: any) => (
                      <SelectItem key={bu.id} value={bu.id}>
                        {bu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Team arc <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="teamArcId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(errors.teamArcId && 'border-destructive')}>
                    <SelectValue placeholder="Select arc…" />
                  </SelectTrigger>
                  <SelectContent>
                    {arcs.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                        No arcs{selectedBU ? ' in this BU' : ''}. Create one first.
                      </div>
                    ) : (
                      arcs.map(arc => (
                        <SelectItem key={arc.id} value={arc.id}>
                          <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{arc.name}</span>
                            {arc.businessUnit && (
                              <span className="text-[10px] text-muted-foreground">
                                · {arc.businessUnit.name}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.teamArcId && (
              <p className="text-xs text-destructive">{errors.teamArcId.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Arc determines the chain of command this team belongs to.
            </p>
          </div>
        </div>

        {/* Note about linking */}
        <div className="rounded-lg bg-muted/50 border border-border/60 px-4 py-3 flex items-start gap-2.5">
          <Network className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isEdit
              ? 'To change which teams this team links to, use the edge controls on the detail page.'
              : 'After creating, open the team detail page to add edges (ASSIGNS_TO, REPORTS_TO, VISIBILITY) linking it to other teams.'}
          </p>
        </div>

        {/* Active toggle (edit only) */}
        {isEdit && (
          <div className="flex items-center justify-between py-3 border-t">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inactive teams are hidden from most views
              </p>
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        )}

        {/* Error */}
        {mutation.isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {(mutation.error as any)?.response?.data?.message ?? 'Something went wrong.'}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.back()} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            // @ts-expect-error err
            onClick={handleSubmit(onSubmit)}
            disabled={mutation.isPending || (isEdit && !isDirty)}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </div>
      </div>
    </div>
  );
}
