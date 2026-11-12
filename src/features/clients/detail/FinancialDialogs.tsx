// File: FinancialDialogs.tsx
// Path: src/features/clients/detail/FinancialDialogs.tsx
//
// Add / correct one financial year of figures. Amounts are typed in ₹ crore
// (how people read them) and stored in ₹. Saved figures are locked: the
// pipeline never overwrites what a person entered.

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog, FormGrid } from '@/components/forms/FormDialog';
import { TextAreaField, TextField, applyServerErrors } from '@/components/forms/fields';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { FY_PATTERN, fromCroreText, lastClosedFy, toCroreText } from '@/lib/fy';
import type { ApiError } from '@/lib/api/client';
import type { ClientCorporateFinancial, ClientCsrFinancial } from '@/types/crm';

export const fySchema = z.string().trim().regex(FY_PATTERN, 'Use the form 2025-2026');
const fy = fySchema;
export const crore = (allowNegative = false) =>
  z
    .string()
    .trim()
    .refine(
      v => !v || (allowNegative ? /^-?[\d,]*\.?\d*$/ : /^[\d,]*\.?\d*$/).test(v),
      allowNegative ? 'A number in crore (a loss is negative)' : 'A number in crore'
    );

// ── CSR ──────────────────────────────────────────────────────────────────────

const csrSchema = z.object({
  fy,
  obligation: crore(),
  budget: crore(),
  spent: crore(),
  unspent: crore(),
  evidence: z.string().trim().max(2000),
});
type CsrValues = z.infer<typeof csrSchema>;

const csrDefaults = (row?: ClientCsrFinancial | null): CsrValues => ({
  fy: row?.fy ?? lastClosedFy(),
  obligation: toCroreText(row?.obligationRs),
  budget: toCroreText(row?.budgetRs),
  spent: toCroreText(row?.spentRs),
  unspent: toCroreText(row?.unspentRs),
  evidence: row?.evidence ?? '',
});

export function CsrFigureDialog({
  clientId,
  row,
  open,
  onOpenChange,
}: {
  clientId: string;
  /** null = a new year */
  row: ClientCsrFinancial | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const form = useForm<CsrValues>({
    resolver: zodResolver(csrSchema),
    defaultValues: csrDefaults(row),
  });
  useEffect(() => {
    if (open) form.reset(csrDefaults(row));
  }, [open, row, form]);

  const submit = form.handleSubmit(async v => {
    try {
      await clientsApi.saveCsrFinancial(clientId, {
        fy: v.fy,
        obligationRs: fromCroreText(v.obligation),
        budgetRs: fromCroreText(v.budget),
        spentRs: fromCroreText(v.spent),
        unspentRs: fromCroreText(v.unspent),
        evidence: v.evidence || null,
      });
      toast.success(`CSR figures for FY ${v.fy} saved`);
      qc.invalidateQueries({ queryKey: clientHooks.keys.all });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `CSR figures — FY ${row.fy}` : 'Add a year of CSR figures'}
      description="Amounts in ₹ crore. Saved figures are locked — the pipeline won’t overwrite them."
      onSubmit={submit}
      busy={form.formState.isSubmitting}
    >
      <TextField
        form={form}
        name="fy"
        label="Financial year"
        required
        placeholder="2025-2026"
        readOnly={!!row}
      />
      <FormGrid>
        <TextField
          form={form}
          name="obligation"
          label="Obligation (2%)"
          placeholder="e.g. 12.5"
          inputMode="decimal"
        />
        <TextField form={form} name="budget" label="Budget" inputMode="decimal" />
        <TextField form={form} name="spent" label="Spent" inputMode="decimal" />
        <TextField form={form} name="unspent" label="Unspent" inputMode="decimal" />
      </FormGrid>
      <TextAreaField
        form={form}
        name="evidence"
        label="Source / note"
        placeholder="Where the figures come from — report page, MCA filing…"
        rows={2}
      />
    </FormDialog>
  );
}

// ── company figures ──────────────────────────────────────────────────────────

const corpSchema = z.object({
  fy,
  revenue: crore(),
  netProfit: crore(true),
  paidUpCapital: crore(),
  authorisedCapital: crore(),
  netWorth: crore(true),
  source: z.string().trim().max(500),
});
type CorpValues = z.infer<typeof corpSchema>;

const corpDefaults = (row?: ClientCorporateFinancial | null): CorpValues => ({
  fy: row?.fy ?? lastClosedFy(),
  revenue: toCroreText(row?.revenueRs),
  netProfit: toCroreText(row?.netProfitRs),
  paidUpCapital: toCroreText(row?.paidUpCapitalRs),
  authorisedCapital: toCroreText(row?.authorisedCapitalRs),
  netWorth: toCroreText(row?.netWorthRs),
  source: row?.source ?? '',
});

export function CorporateFigureDialog({
  clientId,
  row,
  open,
  onOpenChange,
}: {
  clientId: string;
  row: ClientCorporateFinancial | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const form = useForm<CorpValues>({
    resolver: zodResolver(corpSchema),
    defaultValues: corpDefaults(row),
  });
  useEffect(() => {
    if (open) form.reset(corpDefaults(row));
  }, [open, row, form]);

  const submit = form.handleSubmit(async v => {
    try {
      await clientsApi.saveCorporateFinancial(clientId, {
        fy: v.fy,
        revenueRs: fromCroreText(v.revenue),
        netProfitRs: fromCroreText(v.netProfit),
        paidUpCapitalRs: fromCroreText(v.paidUpCapital),
        authorisedCapitalRs: fromCroreText(v.authorisedCapital),
        netWorthRs: fromCroreText(v.netWorth),
        source: v.source || null,
      });
      toast.success(`Company figures for FY ${v.fy} saved`);
      qc.invalidateQueries({ queryKey: clientHooks.keys.all });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Company figures — FY ${row.fy}` : 'Add a year of company figures'}
      description="Amounts in ₹ crore, from the annual report or MCA filing."
      onSubmit={submit}
      busy={form.formState.isSubmitting}
    >
      <TextField
        form={form}
        name="fy"
        label="Financial year"
        required
        placeholder="2025-2026"
        readOnly={!!row}
      />
      <FormGrid>
        <TextField form={form} name="revenue" label="Revenue" inputMode="decimal" />
        <TextField
          form={form}
          name="netProfit"
          label="Net profit"
          inputMode="decimal"
          hint="Negative for a loss"
        />
        <TextField form={form} name="paidUpCapital" label="Paid-up capital" inputMode="decimal" />
        <TextField
          form={form}
          name="authorisedCapital"
          label="Authorised capital"
          inputMode="decimal"
        />
        <TextField form={form} name="netWorth" label="Net worth" inputMode="decimal" />
      </FormGrid>
      <TextField
        form={form}
        name="source"
        label="Source"
        placeholder="Annual report 2024-25, MCA…"
      />
    </FormDialog>
  );
}
