// File: LookupFormDialog.tsx
// Path: src/features/admin/LookupFormDialog.tsx
//
// Create / edit one pick-list value. Codes are UPPER_SNAKE (the backend
// uppercases too) and locked on system rows, which code paths depend on.

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog, FormGrid } from '@/components/forms/FormDialog';
import { TextField, applyServerErrors } from '@/components/forms/fields';
import { lookupKeys } from '@/hooks/queries';
import { lookupsApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import type { Lookup, LookupType } from '@/types/org';

const schema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(200),
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(100)
    .transform(v => v.toUpperCase().replace(/\s+/g, '_')),
  order: z
    .string()
    .trim()
    .refine(v => v === '' || /^-?\d+$/.test(v), 'Whole number')
    .transform(v => (v === '' ? null : Number(v))),
});

type Values = z.input<typeof schema>;

const toCode = (label: string) =>
  label
    .trim()
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

export function LookupFormDialog({
  type,
  typeLabel,
  row,
  open,
  onOpenChange,
  nextOrder,
}: {
  type: LookupType;
  typeLabel: string;
  row: Lookup | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** suggested order for a new value (end of the list) */
  nextOrder?: number;
}) {
  const qc = useQueryClient();
  const isEdit = !!row;
  const locked = !!row?.isSystem;
  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', code: '', order: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      label: row?.label ?? '',
      code: row?.code ?? '',
      order: row ? (row.order === null ? '' : String(row.order)) : nextOrder !== undefined ? String(nextOrder) : '',
    });
  }, [open, row, nextOrder, form]);

  // new values: derive the code from the label until the admin edits it
  useEffect(() => {
    if (isEdit) return;
    const sub = form.watch((v, { name }) => {
      if (name === 'label' && !form.getFieldState('code').isDirty) {
        form.setValue('code', toCode(v.label ?? ''), { shouldValidate: form.formState.isSubmitted });
      }
    });
    return () => sub.unsubscribe();
  }, [isEdit, form]);

  const submit = form.handleSubmit(async v => {
    try {
      if (row) {
        await lookupsApi.update(row.id, {
          label: v.label,
          order: v.order,
          ...(!locked && { code: v.code }),
        });
      } else {
        await lookupsApi.create({ type, label: v.label, code: v.code, order: v.order });
      }
      toast.success(`${v.label} ${row ? 'updated' : 'added'}`);
      qc.invalidateQueries({ queryKey: lookupKeys.all });
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
      title={isEdit ? `Edit value` : `New ${typeLabel.toLowerCase()} value`}
      description={isEdit ? `${typeLabel} pick-list` : 'Shows up in pickers and filters right away.'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Save' : 'Add value'}
      busy={form.formState.isSubmitting}
    >
      <TextField form={form} name="label" label="Label" required autoFocus placeholder="What people see" />
      <FormGrid>
        <TextField
          form={form}
          name="code"
          label="Code"
          required
          disabled={locked}
          className="[&_input]:font-mono [&_input]:uppercase"
          hint={locked ? 'System value — the code is fixed.' : 'Stable key used in imports and integrations.'}
        />
        <TextField form={form} name="order" label="Order" inputMode="numeric" hint="Lower comes first." />
      </FormGrid>
    </FormDialog>
  );
}
