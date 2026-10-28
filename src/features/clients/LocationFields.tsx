// File: LocationFields.tsx
// Path: src/features/clients/LocationFields.tsx
//
// Address inputs shared by "new client → head office" and the location dialog.
// State / city suggest from the bundled India location list.

'use client';

import { useMemo } from 'react';
import { useWatch, type FieldValues, type Path } from 'react-hook-form';
import { z } from 'zod';
import { FormGrid } from '@/components/forms/FormDialog';
import { TextField, type AnyForm } from '@/components/forms/fields';
import { LOCATION_DATA } from '@/data/locationData';

export const locationSchema = z.object({
  typeId: z.string().nullable(),
  name: z.string().trim().max(200),
  addressLine: z.string().trim().max(500),
  city: z.string().trim().max(100),
  district: z.string().trim().max(100),
  state: z.string().trim().max(100),
  country: z.string().trim().max(100),
  pincode: z
    .string()
    .trim()
    .max(10)
    .refine(v => !v || /^[0-9A-Za-z -]{3,10}$/.test(v), 'Invalid PIN code'),
  isPrimary: z.boolean(),
  dmEvidence: z.string().trim().max(2000),
});

export type LocationValues = z.input<typeof locationSchema>;

export function LocationFields<T extends FieldValues>({
  form,
  prefix,
  compact = false,
}: {
  form: AnyForm<T>;
  prefix?: string;
  compact?: boolean;
}) {
  const p = (k: string) => (prefix ? `${prefix}.${k}` : k) as Path<T>;
  const country = (useWatch({ control: form.control, name: p('country') }) as string) || 'India';
  const state = useWatch({ control: form.control, name: p('state') }) as string;

  const states = useMemo(() => Object.keys(LOCATION_DATA[country] ?? {}), [country]);
  const cities = useMemo(() => LOCATION_DATA[country]?.[state] ?? [], [country, state]);
  const listId = prefix ?? 'loc';

  return (
    <div className="space-y-3">
      {!compact && (
        <TextField
          form={form}
          name={p('name')}
          label="Label"
          placeholder="e.g. NASSCOM IT Park office"
        />
      )}
      {!compact && (
        <TextField
          form={form}
          name={p('addressLine')}
          label="Address"
          placeholder="Building, street, area"
        />
      )}
      <FormGrid cols={3}>
        <TextField
          form={form}
          name={p('city')}
          label="City"
          list={`${listId}-cities`}
          autoComplete="off"
        />
        <TextField
          form={form}
          name={p('state')}
          label="State"
          list={`${listId}-states`}
          autoComplete="off"
        />
        <TextField
          form={form}
          name={p('country')}
          label="Country"
          list={`${listId}-countries`}
          autoComplete="off"
        />
      </FormGrid>
      {!compact && (
        <FormGrid>
          <TextField form={form} name={p('district')} label="District" />
          <TextField form={form} name={p('pincode')} label="PIN code" inputMode="numeric" />
        </FormGrid>
      )}
      <datalist id={`${listId}-states`}>
        {states.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id={`${listId}-cities`}>
        {cities.map(c => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id={`${listId}-countries`}>
        {Object.keys(LOCATION_DATA).map(c => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}
