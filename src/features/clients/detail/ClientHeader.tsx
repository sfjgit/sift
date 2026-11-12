// File: ClientHeader.tsx
// Path: src/features/clients/detail/ClientHeader.tsx
//
// The client page's header — CASPA-like and quiet: a star, the name, status and
// one line of context, Back; on the right Run all steps and the actions.

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  Globe,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CLIENT_STATUS, ClientStatusBadge, Pill } from '@/components/common/badges';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, hostOf, placeOf } from '@/lib/format';
import { useUi } from '@/stores/ui';
import { StepRunButtons } from './StepRunButtons';
import type { ClientDetail, ClientStatus } from '@/types/crm';

export function ClientHeader({
  client,
  onEdit,
  onRun,
}: {
  client: ClientDetail;
  onEdit: () => void;
  /** Run all steps was clicked */
  onRun: (stepKey: string) => void;
}) {
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
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3" {...tourTarget('client-header')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Star className="size-6 shrink-0 fill-primary text-primary" />
          <h1 className="text-[22px] font-bold tracking-tight text-primary">{client.name}</h1>
          <ClientStatusBadge status={client.status} />
          {client.shortName && <Pill dot={false}>{client.shortName}</Pill>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 text-[13px] text-muted-foreground">
          <span>
            {[client.industry?.label, client.category?.label, primary && placeOf(primary)]
              .filter(Boolean)
              .join('  ·  ') || 'No profile details yet'}
          </span>
          {client.website && (
            <a
              href={client.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="size-3.5" /> {hostOf(client.website)}
            </a>
          )}
          <span className="text-[12px]">Updated {fmtDate(client.updatedAt)}</span>
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3 ml-9 bg-card">
          <Link href="/clients">
            <ArrowLeft /> Back
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StepRunButtons clientId={client.id} keys={[]} withRunAll onRun={onRun} />
        {can('clients.approve') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={client.status === 'PENDING' ? 'default' : 'outline'}
                size="sm"
                className={client.status === 'PENDING' ? undefined : 'bg-card'}
                {...tourTarget('client-status')}
              >
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
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() => openSpocDialog({ clientId: client.id, clientName: client.name })}
          >
            <UserPlus /> Add SPOC
          </Button>
        )}
        {can('clients.update') && (
          <Button variant="outline" size="sm" className="bg-card" onClick={onEdit}>
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
                      description:
                        'It disappears from lists and reports. History is kept for audit.',
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
  );
}
