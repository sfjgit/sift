// File: ClientHeader.tsx
// Path: src/features/clients/detail/ClientHeader.tsx

'use client';

import { useRouter } from 'next/navigation';
import { BadgeCheck, CalendarDays, ChevronDown, ContactRound, Globe, Linkedin, MapPin, MoreHorizontal, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompanyMark } from '@/components/common/CompanyMark';
import { CLIENT_STATUS, ClientStatusBadge, Pill } from '@/components/common/badges';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, fullName, hostOf, placeOf } from '@/lib/format';
import { useUi } from '@/stores/ui';
import type { ClientDetail, ClientStatus } from '@/types/crm';

export function ClientHeader({ client, onEdit }: { client: ClientDetail; onEdit: () => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const openSpocDialog = useUi(s => s.openSpocDialog);
  const primary = client.locations.find(l => l.isPrimary) ?? client.locations[0];

  const setStatus = useAction((status: ClientStatus) => clientsApi.setStatus(client.id, status), {
    success: (_, s) => `Client marked ${CLIENT_STATUS[s].label.toLowerCase()}`,
    invalidate: [clientHooks.keys.all, ['reports']],
  });
  const remove = useAction(() => clientsApi.remove(client.id), {
    success: 'Client deleted',
    invalidate: [clientHooks.keys.all],
    onSuccess: () => router.replace('/clients'),
  });

  return (
    <div className="rounded-xl border bg-card shadow-card" {...tourTarget('client-header')}>
      <div className="flex flex-wrap items-start gap-4 p-5">
        <CompanyMark name={client.name} size="xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold sm:text-2xl">{client.name}</h1>
            {client.shortName && <Pill dot={false}>{client.shortName}</Pill>}
            <ClientStatusBadge status={client.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
            {client.industry && <span>{client.industry.label}</span>}
            {client.category && <span>{client.category.label}</span>}
            {primary && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {placeOf(primary)}
              </span>
            )}
            {client.website && (
              <a href={client.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                <Globe className="size-3.5" /> {hostOf(client.website)}
              </a>
            )}
            {client.linkedinUrl && (
              <a href={client.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                <Linkedin className="size-3.5" /> LinkedIn
              </a>
            )}
            {client.cin && <span className="font-mono text-xs">CIN {client.cin}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('clients.approve') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={client.status === 'PENDING' ? 'default' : 'outline'} size="sm" {...tourTarget('client-status')}>
                  {client.status === 'PENDING' ? <BadgeCheck /> : null}
                  {client.status === 'PENDING' ? 'Approve' : 'Status'}
                  <ChevronDown className="opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                {(Object.keys(CLIENT_STATUS) as ClientStatus[])
                  .filter(s => s !== client.status)
                  .map(s => (
                    <DropdownMenuItem key={s} onSelect={() => setStatus.mutate(s)}>
                      <ClientStatusBadge status={s} />
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {can('spocs.create') && (
            <Button variant="outline" size="sm" onClick={() => openSpocDialog({ clientId: client.id, clientName: client.name })}>
              <UserPlus /> Add SPOC
            </Button>
          )}
          {can('clients.update') && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil /> Edit
            </Button>
          )}
          {can('clients.delete') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={async () => {
                    if (
                      await confirm({
                        title: `Delete ${client.name}?`,
                        description: 'It disappears from lists and reports. History is kept for audit.',
                        destructive: true,
                        confirmLabel: 'Delete client',
                      })
                    )
                      remove.mutate(undefined);
                  }}
                >
                  <Trash2 /> Delete client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 divide-x border-t text-[13px] sm:grid-cols-4">
        <Meta icon={ContactRound} label="Active SPOCs" value={String(client._count.spocs)} />
        <Meta icon={MapPin} label="Locations" value={String(client.locations.length)} />
        <Meta icon={CalendarDays} label="Added" value={`${fmtDate(client.createdAt)} · ${fullName(client.createdBy)}`} />
        <Meta
          icon={BadgeCheck}
          label="Approved"
          value={client.approvedAt ? `${fmtDate(client.approvedAt)} · ${fullName(client.approvedBy)}` : 'Not yet'}
        />
      </dl>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="min-w-0 px-5 py-3 max-sm:[&:nth-child(3)]:border-l-0 max-sm:[&:nth-child(n+3)]:border-t">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}
