// File: FaqFormDialog.tsx
// Path: src/features/help/FaqFormDialog.tsx
//
// Create / edit an FAQ (admin.manage_help). The answer supports the
// MarkdownLite subset, previewed live next to the editor.

'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MarkdownLite } from '@/components/common/MarkdownLite';
import { FormDialog, FormGrid } from '@/components/forms/FormDialog';
import { Field, SwitchField, TextAreaField, TextField, applyServerErrors } from '@/components/forms/fields';
import { faqsApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import type { Faq } from '@/types/org';

export const FAQ_MODULES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'clients', label: 'Clients' },
  { value: 'spocs', label: 'SPOCs' },
  { value: 'reports', label: 'Reports' },
  { value: 'admin', label: 'Admin' },
] as const;

const NONE = '__none';

const schema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(300),
  answer: z.string().trim().min(1, 'Answer is required').max(10000),
  category: z.string().trim().min(1, 'Category is required').max(100),
  module: z.string(),
  order: z
    .string()
    .trim()
    .refine(v => v === '' || /^\d+$/.test(v), 'Whole number, 0 or more')
    .transform(v => (v === '' ? 0 : Number(v))),
  isPublished: z.boolean(),
});

type Values = z.input<typeof schema>;

export function FaqFormDialog({
  open,
  onOpenChange,
  faq,
  categories,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  faq: Faq | null;
  categories: string[];
  defaultCategory?: string;
}) {
  const qc = useQueryClient();
  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { question: '', answer: '', category: '', module: NONE, order: '0', isPublished: true },
  });
  const answer = useWatch({ control: form.control, name: 'answer' });

  useEffect(() => {
    if (!open) return;
    form.reset({
      question: faq?.question ?? '',
      answer: faq?.answer ?? '',
      category: faq?.category ?? defaultCategory ?? '',
      module: faq?.module ?? NONE,
      order: String(faq?.order ?? 0),
      isPublished: faq?.isPublished ?? true,
    });
  }, [open, faq, defaultCategory, form]);

  const submit = form.handleSubmit(async v => {
    const body = { ...v, module: v.module === NONE ? null : v.module };
    try {
      if (faq) await faqsApi.update(faq.id, body);
      else await faqsApi.create(body);
      toast.success(faq ? 'FAQ updated' : body.isPublished ? 'FAQ published' : 'FAQ saved as draft');
      qc.invalidateQueries({ queryKey: ['faqs'] });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={faq ? 'Edit FAQ' : 'New FAQ'}
      description="Answers support **bold**, `code`, “- ” bullet lists and links."
      onSubmit={submit}
      submitLabel={faq ? 'Save' : 'Create FAQ'}
      busy={form.formState.isSubmitting}
    >
      <TextField form={form} name="question" label="Question" required autoFocus placeholder="How do I…?" />
      <div className="grid gap-3 lg:grid-cols-2">
        <TextAreaField form={form} name="answer" label="Answer" required rows={10} className="[&_textarea]:font-mono [&_textarea]:text-[13px]" />
        <Field label="Preview">
          <div className="min-h-[220px] overflow-y-auto rounded-lg border bg-surface px-3 py-2 text-[13.5px] leading-relaxed">
            {answer?.trim() ? (
              <MarkdownLite text={answer} />
            ) : (
              <span className="text-muted-foreground">The formatted answer appears here.</span>
            )}
          </div>
        </Field>
      </div>
      <FormGrid cols={3}>
        <TextField
          form={form}
          name="category"
          label="Category"
          required
          list="faq-categories"
          autoComplete="off"
          placeholder="e.g. Getting started"
        />
        <Field label="Page" htmlFor="faq-module" hint="Shows in that page’s help panel.">
          <Controller
            control={form.control}
            name="module"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="faq-module" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={NONE}>None (help center only)</SelectItem>
                  {FAQ_MODULES.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <TextField form={form} name="order" label="Order" inputMode="numeric" hint="Lower comes first." />
      </FormGrid>
      <datalist id="faq-categories">
        {categories.map(c => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <SwitchField form={form} name="isPublished" label="Published" hint="Drafts are only visible to help admins." />
    </FormDialog>
  );
}
