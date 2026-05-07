/* eslint-disable @typescript-eslint/no-explicit-any */
// components/clients/detail/AddSpocDialog.tsx
'use client';

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
import { addSpocSchema, type AddSpocValues } from './schemas';
import { Label, FieldError } from './FormHelpers';

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onAdded: () => void;
}

export function AddSpocDialog({ open, onClose, clientId, onAdded }: Props) {
  const axios = useAxios();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddSpocValues>({
    // @ts-expect-error errr
    resolver: zodResolver(addSpocSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      handlerId: '',
      serviceLineId: '',
      businessUnitId: '',
      isPrimary: false,
      notes: '',
    },
  });

  const { data: usersRes } = useQuery<{
    data: { id: string; firstName: string; lastName: string; employeeId?: string }[];
  }>({
    queryKey: ['users-dropdown'],
    queryFn: async () => (await axios.get('/users?limit=200&isActive=true')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const { data: slRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['service-lines-dropdown'],
    queryFn: async () => (await axios.get('/service-lines?limit=100')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
    enabled: open,
  });

  const users = usersRes?.data ?? [];
  const serviceLines = slRes?.data ?? [];
  const businessUnits = busRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (data: AddSpocValues) =>
      (await axios.post(`/clients/${clientId}/spocs`, data)).data,
    onSuccess: () => {
      toast.success('SPOC added');
      reset();
      onAdded();
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to add SPOC'),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add SPOC</DialogTitle>
        </DialogHeader>

        <form
          // @ts-expect-error errr
          onSubmit={handleSubmit(d => mutation.mutate(d))}
          className="flex flex-col gap-4"
        >
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
                    <SelectValue placeholder="Who handles this SPOC" />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label required>Service line</Label>
              <Controller
                control={control}
                name="serviceLineId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceLines.map(sl => (
                        <SelectItem key={sl.id} value={sl.id}>
                          {sl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.serviceLineId?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Business unit</Label>
              <Controller
                control={control}
                name="businessUnitId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessUnits.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.businessUnitId?.message} />
            </div>
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
              {mutation.isPending ? 'Adding…' : 'Add SPOC'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
