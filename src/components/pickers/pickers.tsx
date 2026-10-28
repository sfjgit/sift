// File: pickers.tsx
// Path: src/components/pickers/pickers.tsx
//
// Domain pickers on top of Combobox — used by forms and table filters alike.

'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api/endpoints';
import { Combobox, type ComboboxProps } from './Combobox';
import { MultiCombobox, type MultiComboboxProps } from './MultiCombobox';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useLookups, useMasters, useRoles, useUserOptions } from '@/hooks/queries';
import { fullName } from '@/lib/format';
import type { MasterKind } from '@/lib/api/endpoints';
import type { LookupType, UserOption } from '@/types/org';

type PickerProps = Omit<ComboboxProps, 'options'>;

export function LookupPicker({ type, ...props }: PickerProps & { type: LookupType }) {
  const { data = [], isLoading } = useLookups(type);
  const options = useMemo(() => data.map(l => ({ value: l.id, label: l.label })), [data]);
  return <Combobox options={options} loading={isLoading && !data.length} {...props} />;
}

export function MasterPicker({ kind, ...props }: PickerProps & { kind: MasterKind }) {
  const { data = [], isLoading } = useMasters(kind);
  const options = useMemo(
    () =>
      data
        .filter(m => m.isActive || m.id === props.value)
        .map(m => ({ value: m.id, label: m.name, hint: m.code ?? undefined })),
    [data, props.value]
  );
  return <Combobox options={options} loading={isLoading && !data.length} {...props} />;
}

export function RolePicker(props: PickerProps) {
  const { data = [], isLoading } = useRoles();
  const options = useMemo(
    () => data.map(r => ({ value: r.id, label: r.name, hint: r.description ?? undefined })),
    [data]
  );
  return <Combobox options={options} loading={isLoading && !data.length} {...props} />;
}

const toUserOption = (u: UserOption) => ({
  value: u.id,
  label: fullName(u),
  hint: [u.designation?.name, u.email].filter(Boolean).join(' · '),
  icon: <UserAvatar person={u} size="xs" />,
});

/** Async user search. `purpose="assign"` limits to users the caller may assign to. */
export function UserPicker({
  purpose = 'filter',
  onChange,
  selectedLabel,
  ...props
}: PickerProps & { purpose?: 'assign' | 'client_assign' | 'filter' }) {
  const [search, setSearch] = useState('');
  const [debounced] = useDebounce(search, 250);
  const [picked, setPicked] = useState<string | undefined>(selectedLabel);
  const { data = [], isFetching } = useUserOptions(debounced, purpose);
  const options = useMemo(() => data.map(toUserOption), [data]);

  return (
    <Combobox
      options={options}
      onSearch={setSearch}
      loading={isFetching && !options.length}
      selectedLabel={picked ?? selectedLabel ?? 'Selected user'}
      searchPlaceholder="Search people…"
      emptyText={debounced ? 'No one matches' : 'Type to search'}
      onChange={(v, o) => {
        setPicked(o?.label);
        onChange(v, o);
      }}
      {...props}
    />
  );
}

/** Async client search (scoped by the backend). */
export function ClientPicker({ onChange, selectedLabel, ...props }: PickerProps) {
  const [search, setSearch] = useState('');
  const [debounced] = useDebounce(search, 250);
  const [picked, setPicked] = useState<string | undefined>(selectedLabel);
  const { data, isFetching } = useQuery({
    queryKey: ['client-options', debounced],
    queryFn: () =>
      clientsApi.list({
        search: debounced || undefined,
        limit: 20,
        sortBy: 'name',
        sortDir: 'asc',
      }),
    staleTime: 60_000,
  });
  const options = useMemo(
    () =>
      (data?.data ?? []).map(c => ({
        value: c.id,
        label: c.name,
        hint: [c.locations[0]?.city, c.status === 'PENDING' ? 'Pending' : null]
          .filter(Boolean)
          .join(' · '),
      })),
    [data]
  );
  return (
    <Combobox
      options={options}
      onSearch={setSearch}
      loading={isFetching && !options.length}
      selectedLabel={picked ?? selectedLabel ?? 'Selected client'}
      searchPlaceholder="Search clients…"
      onChange={(v, o) => {
        setPicked(o?.label);
        onChange(v, o);
      }}
      {...props}
    />
  );
}

export function EnumPicker<T extends string>({
  options,
  ...props
}: PickerProps & { options: { value: T; label: string }[] }) {
  return <Combobox options={options} {...props} />;
}

/** Multi-select over a lookup pick-list. */
export function LookupMultiPicker({
  type,
  value,
  ...props
}: Omit<MultiComboboxProps, 'options'> & { type: LookupType }) {
  const { data = [], isLoading } = useLookups(type);
  const options = useMemo(() => data.map(l => ({ value: l.id, label: l.label })), [data]);
  return (
    <MultiCombobox options={options} value={value} loading={isLoading && !data.length} {...props} />
  );
}

/**
 * Multi-select with async people search. `labels` = names of already-picked
 * ids (they may not be in the current search results); onChange returns both.
 */
export function UserMultiPicker({
  purpose = 'filter',
  value,
  labels,
  onChange,
  ...props
}: Omit<MultiComboboxProps, 'options' | 'onChange'> & {
  purpose?: 'assign' | 'client_assign' | 'filter';
  labels?: Record<string, string>;
  onChange: (ids: string[], labels: Record<string, string>) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced] = useDebounce(search, 250);
  const [known, setKnown] = useState<Record<string, string>>(labels ?? {});
  const { data = [], isFetching } = useUserOptions(debounced, purpose);
  const options = useMemo(() => {
    const found = data.map(toUserOption);
    const seen = new Set(found.map(o => o.value));
    const picked = value
      .filter(v => !seen.has(v))
      .map(v => ({ value: v, label: known[v] ?? labels?.[v] ?? 'Selected person' }));
    return [...picked, ...found];
  }, [data, value, known, labels]);

  return (
    <MultiCombobox
      {...props}
      value={value}
      options={options}
      onSearch={setSearch}
      searchPlaceholder="Search people…"
      emptyText={debounced ? 'No one matches' : 'Type to search'}
      loading={isFetching && !data.length}
      onChange={ids => {
        const next = { ...known };
        for (const o of options) if (ids.includes(o.value)) next[o.value] = o.label;
        setKnown(next);
        onChange(ids, Object.fromEntries(ids.map(i => [i, next[i] ?? 'Selected person'])));
      }}
    />
  );
}
