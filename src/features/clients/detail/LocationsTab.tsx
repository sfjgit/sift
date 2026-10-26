// File: LocationsTab.tsx
// Path: src/features/clients/detail/LocationsTab.tsx
//
// Every address of a client. One is primary (the backend clears the others
// when you set a new one). Removing keeps SPOC links (soft delete).

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building, MapPin, MoreHorizontal, Pencil, Plus, Star, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pill } from '@/components/common/badges';
import { EmptyState } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { FormDialog, FormSection } from '@/components/forms/FormDialog';
import {
  PickerField,
  SwitchField,
  TextAreaField,
  applyServerErrors,
  blankToNull,
} from '@/components/forms/fields';
import { LookupPicker } from '@/components/pickers/pickers';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import type { ClientDetail, ClientLocation } from '@/types/crm';
import { LocationFields, locationSchema, type LocationValues } from '../LocationFields';

const toValues = (l?: ClientLocation | null, first = false): LocationValues => ({
  typeId: l?.type?.id ?? null,
  name: l?.name ?? '',
  addressLine: l?.addressLine ?? '',
  city: l?.city ?? '',
  district: l?.district ?? '',
  state: l?.state ?? '',
  country: l?.country ?? 'India',
  pincode: l?.pincode ?? '',
  isPrimary: l?.isPrimary ?? first,
  dmEvidence: l?.dmEvidence ?? '',
});

export function LocationsTab({ client }: { client: ClientDetail }) {
  const { can } = usePermissions();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<ClientLocation | 'new' | null>(null);
  const canAdd = can('client_locations.create');
  const canEdit = can('client_locations.update');
  const canRemove = can('client_locations.delete');
  const key = clientHooks.keys.detail(client.id);

  const setPrimary = useAction(
    (id: string) => clientsApi.updateLocation(client.id, id, { isPrimary: true }),
    {
      success: 'Primary location updated',
      invalidate: [key],
    }
  );
  const remove = useAction((id: string) => clientsApi.removeLocation(client.id, id), {
    success: 'Location removed',
    invalidate: [key],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Head office, branches, plants and dev centres — SPOCs can be linked to the office they
          work from.
        </p>
        {canAdd && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Add location
          </Button>
        )}
      </div>

      {client.locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations yet"
          description="Add the head office first — it becomes the primary address."
          action={
            canAdd && (
              <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
                <Plus /> Add location
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {client.locations.map(l => (
            <article
              key={l.id}
              className={`relative rounded-xl border bg-card p-4 shadow-card ${l.isPrimary ? 'border-primary/40 ring-1 ring-primary/15' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{l.name || l.city || 'Unnamed location'}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {l.type && <Pill dot={false}>{l.type.label}</Pill>}
                      {l.isPrimary && (
                        <Pill tone="primary" dot={false}>
                          <Star className="size-2.5 fill-current" /> Primary
                        </Pill>
                      )}
                    </div>
                  </div>
                </div>
                {(canEdit || canRemove) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Location actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem onSelect={() => setEditing(l)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                      )}
                      {canEdit && !l.isPrimary && (
                        <DropdownMenuItem onSelect={() => setPrimary.mutate(l.id)}>
                          <Star /> Make primary
                        </DropdownMenuItem>
                      )}
                      {canEdit && canRemove && <DropdownMenuSeparator />}
                      {canRemove && (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={async () => {
                            if (
                              await confirm({
                                title: 'Remove this location?',
                                description: 'SPOCs linked to it keep the link for history.',
                                destructive: true,
                                confirmLabel: 'Remove',
                              })
                            )
                              remove.mutate(l.id);
                          }}
                        >
                          <Trash2 /> Remove
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <address className="mt-3 space-y-0.5 text-[13px] text-muted-foreground not-italic">
                {l.addressLine && <p className="text-foreground/90">{l.addressLine}</p>}
                <p>{[l.city, l.district, l.state, l.pincode].filter(Boolean).join(', ') || '—'}</p>
                {l.country && <p>{l.country}</p>}
              </address>
              {l.dmEvidence && (
                <p className="mt-3 rounded-lg bg-surface p-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Why decision-makers are here:{' '}
                  </span>
                  {l.dmEvidence}
                </p>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" /> {l._count.spocs} SPOC
                {l._count.spocs === 1 ? '' : 's'}
              </p>
            </article>
          ))}
        </div>
      )}

      <LocationDialog
        clientId={client.id}
        location={editing === 'new' ? null : editing}
        first={client.locations.length === 0}
        open={editing !== null}
        onOpenChange={o => !o && setEditing(null)}
      />
    </div>
  );
}

function LocationDialog({
  clientId,
  location,
  first,
  open,
  onOpenChange,
}: {
  clientId: string;
  location: ClientLocation | null;
  first: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const form = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: toValues(location, first),
  });

  useEffect(() => {
    if (open) form.reset(toValues(location, first));
  }, [open, location, first, form]);

  const submit = form.handleSubmit(async v => {
    const body = blankToNull(v);
    try {
      if (location) await clientsApi.updateLocation(clientId, location.id, body);
      else await clientsApi.addLocation(clientId, body);
      toast.success(location ? 'Location updated' : 'Location added');
      qc.invalidateQueries({ queryKey: clientHooks.keys.detail(clientId) });
      onOpenChange(false);
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error((e as ApiError).message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={location ? 'Edit location' : 'Add location'}
      onSubmit={submit}
      busy={form.formState.isSubmitting}
      submitLabel={location ? 'Save' : 'Add location'}
    >
      <PickerField
        form={form}
        name="typeId"
        label="Type"
        render={p => <LookupPicker type="LOCATION_TYPE" placeholder="HQ, branch, plant…" {...p} />}
      />
      <FormSection title="Address">
        <LocationFields form={form} />
      </FormSection>
      <TextAreaField
        form={form}
        name="dmEvidence"
        label="Decision-maker evidence"
        rows={2}
        hint="Why you believe decision-makers sit here (optional)."
      />
      <SwitchField
        form={form}
        name="isPrimary"
        label="Primary location"
        hint="Shown on the client list. Replaces the current primary."
      />
    </FormDialog>
  );
}
