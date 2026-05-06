/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAxios } from '@/hooks/useAxios';
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from './validators';

type Mode = 'create' | 'edit';

interface ClientFormProps {
  mode: Mode;
  defaultValues?: Partial<CreateClientInput>;
  onSubmit: (data: CreateClientInput | UpdateClientInput) => void;
  isPending: boolean;
  onCancel: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function ClientForm({
  mode,
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: ClientFormProps) {
  const axios = useAxios();
  const schema = mode === 'create' ? createClientSchema : updateClientSchema;

  const form = useForm<CreateClientInput>({
    // @ts-expect-error err
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      vmsName: '',
      categoryId: '',
      industry: '',
      website: '',
      country: '',
      state: '',
      city: '',
      address: '',
      businessUnitId: '',

      parentClientId: '',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) form.reset({ ...form.getValues(), ...defaultValues });
  }, [JSON.stringify(defaultValues)]);

  // BU dropdown — backend returns { data: [...] }
  const { data: busRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['bus-dropdown'],
    queryFn: async () => (await axios.get('/business-units?limit=100')).data,
    staleTime: 60_000,
  });

  // Clients for parent picker
  const { data: clientsRes } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['clients-dropdown'],
    queryFn: async () => (await axios.get('/clients?limit=200&status=ACTIVE')).data,
    staleTime: 60_000,
  });

  const businessUnits = busRes?.data ?? [];
  const clients = clientsRes?.data ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Basic info */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Basic info</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Client name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...(field as any)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="vmsName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VMS name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Name in VMS system"
                      {...(field as any)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Technology"
                      {...(field as any)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...(field as any)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="businessUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BU" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={undefined}>None</SelectItem>
                      {businessUnits.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Location */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Location</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['country', 'state', 'city'] as const).map(f => (
              <FormField
                key={f}
                // @ts-expect-error err
                control={form.control}
                name={f}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{f}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`e.g. ${f === 'country' ? 'India' : f === 'state' ? 'Karnataka' : 'Bengaluru'}`}
                        {...(field as any)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              // @ts-expect-error err
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Full address"
                      {...(field as any)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Parent client */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Parent client (optional)</SectionLabel>
          <FormField
            // @ts-expect-error err
            control={form.control}
            name="parentClientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent client</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={undefined}>None</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create client'
                : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function detailToFormValues(client: any): Partial<CreateClientInput> {
  return {
    name: client.name,
    vmsName: client.vmsName ?? '',
    categoryId: client.categoryId ?? '',
    industry: client.industry ?? '',
    website: client.website ?? '',
    country: client.country ?? '',
    state: client.state ?? '',
    city: client.city ?? '',
    address: client.address ?? '',
    businessUnitId: client.businessUnit?.id ?? '',
    parentClientId: client.parentClient?.id ?? '',
  };
}
