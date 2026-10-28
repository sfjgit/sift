// File: LocationFields.tsx
// Path: src/features/clients/LocationFields.tsx
//
// Address inputs shared by "new client → head office" and the location dialog.
// Country → state → city dropdowns from the backend geo list (/geo/*). A new
// country clears a state that isn't in it; a new state clears the city. City
// can also keep a typed name the list doesn't have. Values stay plain names;
// the backend normalises them on save ("BANGALORE." → "Bengaluru").

'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useWatch, type FieldValues, type Path } from 'react-hook-form';
import { z } from 'zod';
import { FormGrid } from '@/components/forms/FormDialog';
import { Field, TextField, type AnyForm } from '@/components/forms/fields';
import { Combobox } from '@/components/pickers/Combobox';
import { useGeoCities, useGeoCountries, useGeoStates } from '@/hooks/geo';

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
  const country = (useWatch({ control: form.control, name: p('country') }) as string) || '';
  const state = (useWatch({ control: form.control, name: p('state') }) as string) || '';
  const city = (useWatch({ control: form.control, name: p('city') }) as string) || '';
  const set = (k: string, v: string) =>
    form.setValue(p(k), v as never, { shouldDirty: true, shouldValidate: true });

  const [citySearch, setCitySearch] = useState('');
  const [q] = useDebounce(citySearch, 200);
  const countries = useGeoCountries();
  const states = useGeoStates(country ? [country] : undefined);
  const cities = useGeoCities({
    countries: country ? [country] : undefined,
    states: state ? [state] : undefined,
    q,
    limit: 200,
  });

  const countryOpts = useMemo(
    () => (countries.data ?? []).map(c => ({ value: c.name, label: c.name, hint: c.code })),
    [countries.data]
  );
  const stateOpts = useMemo(
    () => (states.data ?? []).map(s => ({ value: s.name, label: s.name })),
    [states.data]
  );
  const cityOpts = useMemo(() => {
    const list = (cities.data ?? []).map(c => ({
      value: c.name,
      label: c.name,
      hint: state ? undefined : c.state,
    }));
    const typed = citySearch.trim();
    // keep a name the list doesn't have ("Bangalore South"), and the saved one
    if (typed && !list.some(o => o.value.toLowerCase() === typed.toLowerCase()))
      list.unshift({ value: typed, label: `Use “${typed}”`, hint: 'not in the list' });
    if (city && !list.some(o => o.value === city))
      list.unshift({ value: city, label: city, hint: undefined });
    return list;
  }, [cities.data, citySearch, city, state]);

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
        <Field label="Country">
          <Combobox
            value={country || null}
            options={countryOpts}
            loading={countries.isLoading}
            placeholder="Select country"
            searchPlaceholder="Search countries…"
            clearable
            onChange={v => {
              if ((v ?? '') === country) return;
              set('country', v ?? '');
              // the old state / city belong to the old country
              set('state', '');
              set('city', '');
            }}
          />
        </Field>
        <Field label="State">
          <Combobox
            value={state || null}
            options={stateOpts}
            loading={states.isLoading}
            placeholder={stateOpts.length || states.isLoading ? 'Select state' : 'No states listed'}
            searchPlaceholder="Search states…"
            selectedLabel={state || undefined}
            clearable
            onChange={v => {
              if ((v ?? '') === state) return;
              set('state', v ?? '');
              set('city', '');
              // the lists show India when no country is picked
              if (v && !country)
                set('country', states.data?.find(s => s.name === v)?.country ?? 'India');
            }}
          />
        </Field>
        <Field label="City">
          <Combobox
            value={city || null}
            options={cityOpts}
            loading={cities.isFetching && !cities.data}
            onSearch={setCitySearch}
            placeholder="Select or type city"
            searchPlaceholder={state ? `Cities in ${state}…` : 'Search cities…'}
            emptyText="Type the city name to use it"
            selectedLabel={city || undefined}
            clearable
            onChange={(v, o) => {
              set('city', v ?? '');
              // picked a city without a state: take the city's state too
              if (v && !state && o?.hint && o.hint !== 'not in the list') {
                set('state', o.hint);
                if (!country)
                  set('country', cities.data?.find(c => c.name === v)?.country ?? 'India');
              }
              setCitySearch('');
            }}
          />
        </Field>
      </FormGrid>
      {!compact && (
        <FormGrid>
          <TextField form={form} name={p('district')} label="District" />
          <TextField form={form} name={p('pincode')} label="PIN code" inputMode="numeric" />
        </FormGrid>
      )}
    </div>
  );
}
