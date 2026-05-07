// components/clients/detail/ClientDetailSidebar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ClientDetail } from './types';

function MetaRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-24">{label}</span>
      <span className="text-xs text-foreground text-right">{value}</span>
    </div>
  );
}

export function ClientDetailSidebar({ client }: { client: ClientDetail }) {
  const router = useRouter();

  return (
    <ScrollArea className="w-64 shrink-0 border-r">
      <div className="p-4 flex flex-col gap-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Details
          </span>
          <MetaRow label="VMS name" value={client.vmsName} />
          <MetaRow
            label="Website"
            value={
              client.website ? (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {client.website}
                </a>
              ) : undefined
            }
          />
          <MetaRow label="Country" value={client.country} />
          <MetaRow label="State" value={client.state} />
          <MetaRow label="City" value={client.city} />
          <MetaRow label="Address" value={client.address} />
        </div>

        {client.parentClient && (
          <>
            <Separator />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Parent
              </span>
              <button
                onClick={() => router.push(`/clients/${client.parentClient!.id}`)}
                className="text-xs text-primary hover:underline text-left"
              >
                {client.parentClient.name}
              </button>
            </div>
          </>
        )}

        {client.childClients.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Child clients ({client.childClients.length})
              </span>
              {client.childClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className="text-xs text-primary hover:underline text-left"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Record
          </span>
          <MetaRow
            label="Created by"
            value={`${client.createdBy.firstName} ${client.createdBy.lastName}`}
          />
          <MetaRow label="Created" value={format(new Date(client.createdAt), 'dd MMM yyyy')} />
          {client.approvedBy && (
            <MetaRow
              label="Approved by"
              value={`${client.approvedBy.firstName} ${client.approvedBy.lastName}`}
            />
          )}
          {client.approvedAt && (
            <MetaRow label="Approved" value={format(new Date(client.approvedAt), 'dd MMM yyyy')} />
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
