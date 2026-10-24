// File: RoleFormDialog.tsx
// Path: src/features/admin/RoleFormDialog.tsx
//
// Name + description for a role. Permissions are edited on the role page,
// so a new role is created empty and the admin lands on its grid.

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog } from '@/components/forms/FormDialog';
import { TextAreaField, TextField, applyServerErrors } from '@/components/forms/fields';
import { roleHooks } from '@/hooks/queries';
import { rolesApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import type { Role } from '@/types/org';

const schema = z.object({
  name: z.string().trim().min(1, 'Role name is required').max(100),
  description: z.string().trim().max(500),
});

type Values = z.input<typeof schema>;

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** edit when set */
  role?: Pick<Role, 'id' | 'name' | 'description'> | null;
  onCreated?: (role: { id: string; name: string }) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!role;
  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (open) form.reset({ name: role?.name ?? '', description: role?.description ?? '' });
  }, [open, role, form]);

  const submit = form.handleSubmit(async v => {
    const body = { name: v.name, description: v.description || null };
    try {
      if (role) {
        await rolesApi.update(role.id, body);
        toast.success('Role updated');
      } else {
        const created = await rolesApi.create({ ...body, grants: [] });
        toast.success(`“${created.name}” created`, { description: 'Now choose what it can do.' });
        onCreated?.(created);
      }
      qc.invalidateQueries({ queryKey: roleHooks.keys.all });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={isEdit ? 'Edit role' : 'New role'}
      description={
        isEdit ? undefined : 'Start with a name — you’ll pick its permissions on the next screen.'
      }
      onSubmit={submit}
      submitLabel={isEdit ? 'Save' : 'Create role'}
      busy={form.formState.isSubmitting}
    >
      <TextField form={form} name="name" label="Name" required autoFocus placeholder="e.g. Regional manager" />
      <TextAreaField
        form={form}
        name="description"
        label="Description"
        rows={3}
        placeholder="Who gets this role and why"
      />
    </FormDialog>
  );
}
