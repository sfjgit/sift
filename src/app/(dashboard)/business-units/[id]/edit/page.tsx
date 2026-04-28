'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Check,
  Loader2,
  CircleDot,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAxios } from '@/hooks/useAxios';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import type { BUListResponse, BUDetailResponse, BUMutationResponse } from '@/types/bu.types';

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100).trim(),
  parentBUId: z.string().nullable(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function BUEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [parentOpen, setParentOpen] = useState(false);

  const { data: detail, isLoading: detailLoading } = useQuery<BUDetailResponse>({
    queryKey: ['business-unit', id],
    queryFn: async () => (await axios.get(`/business-units/${id}`)).data,
    enabled: !!id,
  });

  const { data: listData, isLoading: listLoading } = useQuery<BUListResponse>({
    queryKey: ['business-units-flat'],
    queryFn: async () => (await axios.get('/business-units')).data,
  });

  const allBUs = (listData?.flat ?? []).filter(b => b.id !== id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parentBUId: null, isActive: true },
  });

  useEffect(() => {
    if (detail?.data) {
      const bu = detail.data;
      reset({ name: bu.name, parentBUId: bu.parentBU?.id ?? null, isActive: bu.isActive });
    }
  }, [detail, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) =>
      (await axios.put<BUMutationResponse>(`/business-units/${id}`, values)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      queryClient.invalidateQueries({ queryKey: ['business-unit', id] });
      router.push(`/business-units/${id}`);
    },
  });

  const serverError = (mutation.error as any)?.response?.data?.message ?? null;
  const watchedParentId = watch('parentBUId');
  const selectedParent = allBUs.find(b => b.id === watchedParentId) ?? null;

  if (detailLoading) {
    return (
      <div className="mx-auto max-w-lg p-6 space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (!detail?.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Not found.{' '}
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none">Edit Business Unit</h1>
            <p className="text-xs text-muted-foreground mt-1">{detail.data.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="px-5 py-5 space-y-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Parent Business Unit</Label>
            <Controller
              name="parentBUId"
              control={control}
              render={({ field }) => (
                <Popover open={parentOpen} onOpenChange={setParentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-between font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {selectedParent ? (
                        <span className="flex items-center gap-2">
                          <CircleDot
                            className={cn(
                              'h-3 w-3',
                              selectedParent.isActive ? 'text-emerald-500' : 'text-red-400'
                            )}
                          />
                          {selectedParent.name}
                        </span>
                      ) : (
                        'No parent — root BU'
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search…" />
                      <CommandList>
                        <CommandEmpty>No results</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              field.onChange(null);
                              setParentOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === null ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="text-muted-foreground">No parent</span>
                          </CommandItem>
                          {listLoading ? (
                            <CommandItem disabled>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Loading…
                            </CommandItem>
                          ) : (
                            allBUs.map(bu => (
                              <CommandItem
                                key={bu.id}
                                value={bu.name}
                                onSelect={() => {
                                  field.onChange(bu.id);
                                  setParentOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4 shrink-0',
                                    field.value === bu.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <CircleDot
                                  className={cn(
                                    'mr-1.5 h-3 w-3 shrink-0',
                                    bu.isActive ? 'text-emerald-500' : 'text-red-400'
                                  )}
                                />
                                <span className="flex-1 truncate">{bu.name}</span>
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  {bu._count.users}u · {bu._count.teams}t
                                </span>
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium leading-none">Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Inactive BUs are hidden from assignment flows
              </p>
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !isDirty}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
