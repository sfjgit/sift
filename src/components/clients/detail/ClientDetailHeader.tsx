// components/clients/detail/ClientDetailHeader.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClientDetail, ClientDetailPermissions, ClientStatus } from './types';

function statusVariant(s: ClientStatus): 'default' | 'secondary' | 'outline' {
  if (s === 'ACTIVE') return 'default';
  if (s === 'PENDING') return 'secondary';
  return 'outline';
}

function humanize(str: string) {
  return str
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

interface Props {
  client: ClientDetail;
  permissions?: ClientDetailPermissions;
  onStatusChange: (status: string) => void;
  isStatusPending: boolean;
}

export function ClientDetailHeader({
  client,
  permissions,
  onStatusChange,
  isStatusPending,
}: Props) {
  const router = useRouter();
  const activeSpocs = client.spocs.filter(s => s.isActive);

  return (
    <div className="shrink-0 border-b bg-background">
      <div className="px-6 pt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <button
          onClick={() => router.push('/clients')}
          className="hover:text-foreground transition-colors"
        >
          Clients
        </button>
        <span>/</span>
        <span>{client.name}</span>
      </div>

      <div className="px-6 pt-2 pb-3 flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariant(client.status)} className="text-xs">
              {humanize(client.status)}
            </Badge>
            {client.industry && (
              <span className="text-sm text-muted-foreground">{client.industry}</span>
            )}
            {client.businessUnit && (
              <span className="text-sm text-muted-foreground">· {client.businessUnit.name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {permissions?.canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isStatusPending}>
                  Change status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {client.status !== 'ACTIVE' && (
                  <DropdownMenuItem onClick={() => onStatusChange('ACTIVE')}>
                    Mark as Active
                  </DropdownMenuItem>
                )}
                {client.status !== 'PENDING' && (
                  <DropdownMenuItem onClick={() => onStatusChange('PENDING')}>
                    Mark as Pending
                  </DropdownMenuItem>
                )}
                {client.status !== 'INACTIVE' && (
                  <DropdownMenuItem onClick={() => onStatusChange('INACTIVE')}>
                    Mark as Inactive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {permissions?.canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/clients/${client.id}/edit`)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
        {[
          { label: 'Requirements', value: client._count.requirements },
          { label: 'Active SPOCs', value: activeSpocs.length },
          {
            label: 'Active reqs',
            value: client.requirements.filter(r => r.status === 'ACTIVE').length,
          },
        ]
          .filter(s => s.value > 0)
          .map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-4 py-2 rounded-md border bg-muted/30"
            >
              <span className="text-lg font-bold tabular-nums">{stat.value}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{stat.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
