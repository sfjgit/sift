'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useClients } from '@/lib/clients.api';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Props {
  clientId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

type FormValues = {
  firstName: string;
  lastName?: string;
  designation?: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  isPrimary: boolean;
};

export default function AddContactDialog({ clientId, trigger, onSuccess }: Props) {
  const clientsApi = useClients();

  // Only for dialog open/close (allowed)
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      designation: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      isPrimary: false,
    },
  });

  // ── Mutation ─────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      clientsApi.addContact(clientId, {
        firstName: data.firstName,
        lastName: data.lastName || undefined,
        designation: data.designation || undefined,
        email: data.email,
        phone: data.phone || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        isPrimary: data.isPrimary,
      }),

    onSuccess: () => {
      reset();
      setOpen(false);
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-[#0066CC] hover:bg-[#0052A3]">
            + Add Contact
          </Button>
        )}
      </DialogTrigger>

      {/* Dialog */}
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <div>
            <Label>First Name *</Label>
            <Input {...register('firstName', { required: true })} />
          </div>

          <div>
            <Label>Last Name</Label>
            <Input {...register('lastName')} />
          </div>

          <div>
            <Label>Email *</Label>
            <Input type="email" {...register('email', { required: true })} />
          </div>

          <div>
            <Label>Phone</Label>
            <Input {...register('phone')} />
          </div>

          <div>
            <Label>Designation</Label>
            <Input {...register('designation')} />
          </div>

          <div>
            <Label>LinkedIn URL</Label>
            <Input {...register('linkedinUrl')} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('isPrimary')} />
            <Label>Primary Contact</Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
