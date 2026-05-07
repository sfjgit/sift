/* eslint-disable @typescript-eslint/no-explicit-any */
// components/clients/detail/EditSpocDialog.tsx
'use client';

import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAxios } from '@/hooks/useAxios';
import { editSpocSchema, type EditSpocValues } from './schemas';
import { Label, FieldError } from './FormHelpers';
import type { ClientSpoc } from './types';

interface Props {
  spoc: ClientSpoc | null;
  clientId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditSpocDialog({ spoc, clientId, onClose, onUpdated }: Props) {
  const axios = useAxios();
  const open = !!spoc;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditSpocValues>({
    resolver: zodResolver(editSpocSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      handlerId: '',
      isPrimary: false,
      notes: '',
    },
  });

  // hydrate form when spoc changes
  useEffect(() => {
    if (spoc) {
      reset({
        firstName: spoc.firstName,
        lastName: spoc.lastName,
        email: spoc.email ?? '',
        phone: spoc.phone ?? '',
        designation: spoc.designation ?? '',
        department: spoc.department ?? '',
        handlerId: spoc.handler.id,
        isPrimary: spoc.isPrimary,
        notes: spoc.notes ?? '',
      });
    }
  }, [spoc?.id]);

  const { data: usersRes } = useQuery<{
    data: { id: string; firstName: string; lastName: string; employeeId?: string }[];
  }>({
    queryKey: ['users-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const users = usersRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (data: EditSpocValues) =>
      (await axios.patch(`/clients/${clientId}/spocs/${spoc!.id}`, data)).data,
    onSuccess: () => {
      toast.success('SPOC updated');
      onUpdated();
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update SPOC'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit SPOC</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label required>First name</Label>
              <Input placeholder="John" {...register('firstName')} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Last name</Label>
              <Input placeholder="Doe" {...register('lastName')} />
              <FieldError message={errors.lastName?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="john@client.com" {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input placeholder="+91 9999999999" {...register('phone')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Designation</Label>
              <Input placeholder="HR Manager" {...register('designation')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Input placeholder="HR" {...register('department')} />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label required>Handler (our side)</Label>
            <Controller
              control={control}
              name="handlerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select handler" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                        {u.employeeId ? ` · ${u.employeeId}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.handlerId?.message} />
          </div>

          {/* note: service line + BU are not editable after creation — they're part of the unique key */}
          <div className="rounded-md bg-muted/40 border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Service line and business unit cannot be changed after creation. Remove and re-add the
              SPOC to change them.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Input placeholder="Optional notes" {...register('notes')} />
          </div>

          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors self-start ${
                  field.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground'
                }`}
              >
                {field.value ? '★ Primary SPOC' : 'Set as primary'}
              </button>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
