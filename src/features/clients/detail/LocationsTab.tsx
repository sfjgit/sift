// File: LocationsTab.tsx
// Path: src/features/clients/detail/LocationsTab.tsx
//
// Every address of a client. One is primary (the backend clears the others
// when you set a new one). Removing keeps SPOC links (soft delete).

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, MoreHorizontal, Pencil, Plus, Star, Trash2 } from 'lucide-react';
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
import {
  LocationFields,
  coordsPaired,
  locationSchema,
  mapsUrl,
  withCoords,
  type LocationValues,
} from '../LocationFields';
import { ClientMap } from './ClientMap';

const dialogSchema = locationSchema.superRefine(coordsPaired);

const toValues = (l?: ClientLocation | null, first = false): LocationValues => ({
  typeId: l?.type?.id ?? null,
  name: l?.name ?? '',
  addressLine: l?.addressLine ?? '',
  city: l?.city ?? '',
  district: l?.district ?? '',
  state: l?.state ?? '',
  country: l?.country ?? 'India',
  pincode: l?.pincode ?? '',
  latitude: l?.latitude != null ? String(Number(l.latitude)) : '',
  longitude: l?.longitude != null ? String(Number(l.longitude)) : '',
  isPrimary: l?.isPrimary ?? first,
  dmEvidence: l?.dmEvidence ?? '',
});

export function LocationsTab({ client }: { client: ClientDetail }) {
  const { can } = usePermissions();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<ClientLocation | 'new' | null>(null);
  const [showMap, setShowMap] = useState(false);
  const canAdd = can('client_locations.create');
  const canEdit = can('client_locations.update');
  const canRemove = can('client_locations.delete');
  const key = clientHooks.keys.detail(client.id);

  const setPrimary = useAction(
    (id: string) => clientsApi.updateLocation(client.id, id, { isPrimary: true }),
    {
      success: 'Head office updated',
      invalidate: [key],
    }
  );
  const remove = useAction((id: string) => clientsApi.removeLocation(client.id, id), {
    success: 'Office removed',
    invalidate: [key],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Head office, branches, plants and dev centres. SPOCs can be linked to the office they work
          from.
        </p>
        <div className="flex items-center gap-2">
          {client.locations.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowMap(v => !v)}>
              <MapPin /> {showMap ? 'Hide map' : 'Show map'}
            </Button>
          )}
          {canAdd && (
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus /> Add office
            </Button>
          )}
        </div>
      </div>

      {showMap && <ClientMap clientId={client.id} locations={client.locations.length} />}

      {client.locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No offices yet"
          description="Add the head office first — it becomes the primary address."
          action={
            canAdd && (
              <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
                <Plus /> Add office
              </Button>
            )
          }
        />
      ) : (
        <div className="crm-box overflow-x-auto">
          <table className="crm-sheet">
            <thead>
              <tr>
                <th>#</th>
                <th>Office</th>
                <th>Type</th>
                <th>Address</th>
                <th>City</th>
                <th>District</th>
                <th>State</th>
                <th>PIN</th>
                <th className="num">SPOCs</th>
                <th>Why decision-makers are here</th>
                {(canEdit || canRemove) && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {client.locations.map((l, i) => (
                <tr key={l.id}>
                  <td className="text-muted-foreground tabular">{i + 1}</td>
                  <td className="min-w-40 font-medium">
                    <span className="flex items-center gap-1.5">
                      {l.name || l.city || 'Unnamed office'}
                      {l.isPrimary && (
                        <Pill tone="primary" dot={false}>
                          <Star className="size-2.5 fill-current" /> Head office
                        </Pill>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{l.type?.label ?? '—'}</td>
                  <td className="max-w-72 min-w-48">
                    {l.addressLine ?? '—'}
                    {l.latitude != null && l.longitude != null && (
                      <a
                        href={mapsUrl(l.latitude, l.longitude)}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1.5 text-xs text-primary hover:underline"
                      >
                        map
                      </a>
                    )}
                  </td>
                  <td>{l.city ?? '—'}</td>
                  <td>{l.district ?? '—'}</td>
                  <td>{l.state ?? '—'}</td>
                  <td className="tabular">{l.pincode ?? '—'}</td>
                  <td className="num">{l._count.spocs}</td>
                  <td className="max-w-80 min-w-48 text-muted-foreground">{l.dmEvidence ?? '—'}</td>
                  {(canEdit || canRemove) && (
                    <td className="px-1!">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label="Office actions">
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
                              <Star /> Make head office
                            </DropdownMenuItem>
                          )}
                          {canEdit && canRemove && <DropdownMenuSeparator />}
                          {canRemove && (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={async () => {
                                if (
                                  await confirm({
                                    title: 'Remove this office?',
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
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
    resolver: zodResolver(dialogSchema),
    defaultValues: toValues(location, first),
  });

  useEffect(() => {
    if (open) form.reset(toValues(location, first));
  }, [open, location, first, form]);

  const submit = form.handleSubmit(async v => {
    const body = blankToNull(withCoords(v));
    try {
      if (location) await clientsApi.updateLocation(clientId, location.id, body);
      else await clientsApi.addLocation(clientId, body);
      toast.success(location ? 'Office updated' : 'Office added');
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
      title={location ? 'Edit office' : 'Add office'}
      onSubmit={submit}
      busy={form.formState.isSubmitting}
      submitLabel={location ? 'Save' : 'Add office'}
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
        label="Head office (primary address)"
        hint="Shown on the client list. Replaces the current primary."
      />
    </FormDialog>
  );
}
