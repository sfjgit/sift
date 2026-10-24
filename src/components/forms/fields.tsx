// File: fields.tsx
// Path: src/components/forms/fields.tsx
//
// Thin RHF bindings so every form reads the same:
//   <TextField form={form} name="name" label="Client name" required />
//   <PickerField form={form} name="industryId" label="Industry" render={p => <LookupPicker type="INDUSTRY" {...p} />} />
// Server field errors (400 "Validation failed") map back onto inputs via applyServerErrors.

'use client';

import type { ReactNode } from 'react';
import { Controller, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyForm<T extends FieldValues> = UseFormReturn<T, any, any>;

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[13px] font-medium">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

interface BaseProps<T extends FieldValues> {
  form: AnyForm<T>;
  name: Path<T>;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
}

const errorOf = <T extends FieldValues>(form: AnyForm<T>, name: Path<T>) => {
  const err = name.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], form.formState.errors);
  return (err as { message?: string } | undefined)?.message;
};

export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  required,
  hint,
  className,
  ...input
}: BaseProps<T> & Omit<React.ComponentProps<'input'>, 'name' | 'form'>) {
  const error = errorOf(form, name);
  return (
    <Field label={label} htmlFor={name} required={required} hint={hint} error={error} className={className}>
      <Input id={name} aria-invalid={!!error || undefined} {...input} {...form.register(name)} />
    </Field>
  );
}

export function TextAreaField<T extends FieldValues>({
  form,
  name,
  label,
  required,
  hint,
  className,
  ...input
}: BaseProps<T> & Omit<React.ComponentProps<'textarea'>, 'name' | 'form'>) {
  const error = errorOf(form, name);
  return (
    <Field label={label} htmlFor={name} required={required} hint={hint} error={error} className={className}>
      <Textarea id={name} aria-invalid={!!error || undefined} {...input} {...form.register(name)} />
    </Field>
  );
}

export interface PickerRenderProps {
  value: string | null;
  onChange: (v: string | null) => void;
  invalid: boolean;
  id: string;
}

export function PickerField<T extends FieldValues>({
  form,
  name,
  label,
  required,
  hint,
  className,
  render,
}: BaseProps<T> & { render: (p: PickerRenderProps) => ReactNode }) {
  const error = errorOf(form, name);
  return (
    <Field label={label} htmlFor={name} required={required} hint={hint} error={error} className={className}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <>{render({ value: field.value ?? null, onChange: field.onChange, invalid: !!error, id: name })}</>
        )}
      />
    </Field>
  );
}

export function SwitchField<T extends FieldValues>({
  form,
  name,
  label,
  hint,
  className,
}: BaseProps<T>) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className={cn('flex items-center justify-between gap-4 rounded-lg border p-3', className)}>
          <span>
            <span className="block text-sm font-medium">{label}</span>
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
          </span>
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  );
}

/** Puts backend 400 field errors onto the matching inputs. Returns true if any matched. */
export function applyServerErrors<T extends FieldValues>(form: AnyForm<T>, err: unknown) {
  if (!(err instanceof ApiError) || !err.fieldErrors.length) return false;
  let matched = false;
  for (const fe of err.fieldErrors) {
    if (fe.field in form.getValues()) {
      form.setError(fe.field as Path<T>, { message: fe.message });
      matched = true;
    }
  }
  return matched;
}

/** "" → null for optional text so clearing an input clears the column */
export const blankToNull = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])) as T;
