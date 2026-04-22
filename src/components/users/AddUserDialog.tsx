/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useRolesApi } from '@/lib/roles.api';
import { useBusinessUnitsApi } from '@/lib/business-units.api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useAuthApi } from '@/lib/auth.api';
import { toast } from 'sonner';

// ─── Schema ─────────────────────────────────────────

const formSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(1),
  roleId: z.string(),
  businessUnitId: z.string().optional(),
  reportingToId: z.string().optional(),
  phone: z.string().optional(),
  workingLocation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Component ─────────────────────────────────────

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const authApi = useAuthApi();

  const { mutate } = useMutation({
    mutationFn: (data: FormValues) => authApi.register(data),
    onSuccess: () => {
      toast.success('User created successfully');
      setOpen(false);
    },
  });

  const rolesApi = useRolesApi();
  const buApi = useBusinessUnitsApi();

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  const { data: businessUnits } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => buApi.getAll(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: FormValues) => {
    console.log(values);
    mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* BASIC INFO */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Basic Information</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input {...form.register('firstName')} />
              </div>

              <div>
                <Label>Last Name</Label>
                <Input {...form.register('lastName')} />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
            </div>

            <div>
              <Label>Password</Label>
              <Input type="password" {...form.register('passwordHash')} />
            </div>
          </div>

          <Separator />

          {/* ROLE & ORG */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Role & Organization</p>

            <div>
              <Label>Role</Label>
              <Select onValueChange={v => form.setValue('roleId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.data?.data?.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Business Unit</Label>
              <Select onValueChange={v => form.setValue('businessUnitId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select BU" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits?.data?.data?.map((bu: any) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* OPTIONAL */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Additional Info</p>

            <div>
              <Label>Phone</Label>
              <Input {...form.register('phone')} />
            </div>

            <div>
              <Label>Working Location</Label>
              <Input {...form.register('workingLocation')} />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
