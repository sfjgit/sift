// File: ResetPasswordDialog.tsx
// Path: src/features/admin/ResetPasswordDialog.tsx
//
// Admin sets a new password for someone else. The backend ends all of that
// user's sessions, so say so before they click.

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FormDialog } from '@/components/forms/FormDialog';
import { TextField, applyServerErrors } from '@/components/forms/fields';
import { usersApi } from '@/lib/api/endpoints';
import { fullName } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';

const schema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine(v => v.newPassword === v.confirm, { message: 'Passwords don’t match', path: ['confirm'] });

type Values = z.input<typeof schema>;

export function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: { id: string; firstName: string; lastName: string | null } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirm: '' },
  });

  useEffect(() => {
    if (user) form.reset({ newPassword: '', confirm: '' });
  }, [user, form]);

  const submit = form.handleSubmit(async v => {
    if (!user) return;
    try {
      await usersApi.resetPassword(user.id, v.newPassword);
      toast.success(`Password reset for ${fullName(user)}`, {
        description: 'They’ve been signed out everywhere and must use the new password.',
      });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={!!user}
      onOpenChange={onOpenChange}
      size="sm"
      title={`Reset password${user ? ` for ${fullName(user)}` : ''}`}
      description="They’ll be signed out of every device. Share the new password with them securely."
      onSubmit={submit}
      submitLabel="Reset password"
      busy={form.formState.isSubmitting}
    >
      <TextField form={form} name="newPassword" label="New password" type="password" autoComplete="new-password" required autoFocus />
      <TextField form={form} name="confirm" label="Confirm password" type="password" autoComplete="new-password" required />
    </FormDialog>
  );
}
