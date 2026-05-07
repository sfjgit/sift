/* eslint-disable @typescript-eslint/no-explicit-any */
// components/service-lines/ServiceLineForm.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useAxios } from '@/hooks/useAxios';
import type { ServiceLine } from './types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  code: z.string().max(50).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: ServiceLine | null;
}

export function ServiceLineForm({ open, onClose, onSuccess, editing }: Props) {
  const axios = useAxios();
  const isEdit = !!editing;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '' },
  });

  useEffect(() => {
    if (editing) {
      reset({ name: editing.name, code: editing.code ?? '' });
    } else {
      reset({ name: '', code: '' });
    }
  }, [editing?.id, open]);

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (isEdit) {
        return (await axios.put(`/service-lines/${editing!.id}`, data)).data;
      }
      return (await axios.post('/service-lines', data)).data;
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Service line updated' : 'Service line created');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      // map conflict errors back to field
      if (msg.toLowerCase().includes('name')) {
        setError('name', { type: 'server', message: msg });
      } else if (msg.toLowerCase().includes('code')) {
        setError('code', { type: 'server', message: msg });
      } else {
        toast.error(msg);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit service line' : 'New service line'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label required>Name</Label>
            <Input placeholder="e.g. KaaS" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Code</Label>
            <Input placeholder="e.g. KAAS" {...register('code')} />
            <p className="text-xs text-muted-foreground">Optional short identifier</p>
            <FieldError message={errors.code?.message} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                  ? 'Save changes'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
