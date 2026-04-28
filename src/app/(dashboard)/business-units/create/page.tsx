/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// ─────────────────────────────────────────
// CREATE PAGE
// app/(dashboard)/business-units/create/page.tsx
// ─────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAxios } from '@/hooks/useAxios';
import { usePermission } from '@/hooks/usePermission';
import type {
  BUListResponse,
  BUDetailResponse,
  CreateBUPayload,
  UpdateBUPayload,
} from '@/types/bu.types';

// ── Shared form ───────────────────────────────────────────────────────────────

function BUForm({
  title,
  subtitle,
  defaultName = '',
  defaultParentId = '',
  defaultIsActive = true,
  showIsActive = false,
  isLoading = false,
  error = '',
  onSubmit,
  onCancel,
  parentOptions,
  excludeId,
}: {
  title: string;
  subtitle: string;
  defaultName?: string;
  defaultParentId?: string;
  defaultIsActive?: boolean;
  showIsActive?: boolean;
  isLoading?: boolean;
  error?: string;
  onSubmit: (data: { name: string; parentBUId: string | null; isActive?: boolean }) => void;
  onCancel: () => void;
  parentOptions: { id: string; name: string }[];
  excludeId?: string; // don't show self as parent option
}) {
  const [name, setName] = useState(defaultName);
  const [parentId, setParentId] = useState(defaultParentId);
  const [isActive, setIsActive] = useState(defaultIsActive);
  const [err, setErr] = useState('');

  function handleSubmit() {
    setErr('');
    if (!name.trim()) {
      setErr('Name is required');
      return;
    }
    onSubmit({
      name: name.trim(),
      parentBUId: parentId || null,
      ...(showIsActive ? { isActive } : {}),
    });
  }

  const filtered = parentOptions.filter(p => p.id !== excludeId);

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Engineering BU"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Parent Business Unit</Label>
            <Select
              value={parentId || 'none'}
              onValueChange={v => setParentId(v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent (root BU)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (root BU)</SelectItem>
                {filtered.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showIsActive && (
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          {(err || error) && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {err || error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── CREATE PAGE ───────────────────────────────────────────────────────────────

export function BUCreatePage() {
  const router = useRouter();
  const axios = useAxios();
  const permission = usePermission('business_units');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!permission.canAdd) router.replace('/business-units');
  }, [permission.canAdd, router]);

  const buQuery = useQuery<BUListResponse>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await axios.get<BUListResponse>('/business-units');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateBUPayload) => {
      const res = await axios.post('/business-units', payload);
      return res.data;
    },
    onSuccess: () => router.push('/business-units'),
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to create'),
  });

  const parentOptions = buQuery.data?.flat ?? [];

  return (
    <BUForm
      title="Create Business Unit"
      subtitle="Add a new BU to your organisation"
      parentOptions={parentOptions}
      isLoading={createMutation.isPending}
      error={error}
      onSubmit={data => createMutation.mutate(data as CreateBUPayload)}
      onCancel={() => router.back()}
    />
  );
}

// ── EDIT PAGE ─────────────────────────────────────────────────────────────────

export function BUEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const permission = usePermission('business_units');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!permission.canEdit) router.replace(`/business-units/${id}`);
  }, [permission.canEdit, id, router]);

  const buQuery = useQuery<BUDetailResponse>({
    queryKey: ['business-unit', id],
    queryFn: async () => {
      const res = await axios.get<BUDetailResponse>(`/business-units/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const allBUsQuery = useQuery<BUListResponse>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await axios.get<BUListResponse>('/business-units');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateBUPayload) => {
      const res = await axios.put(`/business-units/${id}`, payload);
      return res.data;
    },
    onSuccess: () => router.push(`/business-units/${id}`),
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to update'),
  });

  if (buQuery.isLoading) {
    return (
      <div className="mx-auto max-w-lg p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const bu = buQuery.data?.data;
  const parentOptions = allBUsQuery.data?.flat ?? [];

  return (
    <BUForm
      title="Edit Business Unit"
      subtitle={bu?.name ?? ''}
      defaultName={bu?.name ?? ''}
      defaultParentId={bu?.parentBU?.id ?? ''}
      defaultIsActive={bu?.isActive ?? true}
      showIsActive
      parentOptions={parentOptions}
      excludeId={id}
      isLoading={updateMutation.isPending}
      error={error}
      onSubmit={data => updateMutation.mutate(data as UpdateBUPayload)}
      onCancel={() => router.back()}
    />
  );
}

export default BUCreatePage;
