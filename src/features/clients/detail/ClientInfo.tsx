// File: ClientInfo.tsx
// Path: src/features/clients/detail/ClientInfo.tsx
//
// "Client information" — every fact about the client as an even grid of
// labelled fields (CASPA's ICP page, cleaner), grouped under small coloured
// tags: Firmographics, Financials, Ownership. Read-only here; Edit opens the
// client form.

'use client';

import { useState } from 'react';
import { Building2, IndianRupee, Pencil, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { AssignClientsDialog } from '@/features/clients/AssignClientsDialog';
import { ENTITY_TYPE } from '@/features/clients/columns';
import { CLIENT_STATUS } from '@/components/common/badges';
import { usePermissions } from '@/features/auth/usePermissions';
import { WebsiteHistory } from '@/features/website/WebsiteHistory';
import { fmtDate, fmtInr, fmtNumber, fullName, hostOf } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ClientDetail } from '@/types/crm';

type Field = { label: string; value: React.ReactNode; wide?: boolean };

const TAG = {
  green:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900',
  violet:
    'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900',
};

function Group({
  tag,
  tone,
  icon: Icon,
  fields,
}: {
  tag: string;
  tone: keyof typeof TAG;
  icon: typeof Building2;
  fields: Field[];
}) {
  return (
    <div className="space-y-3">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-bold tracking-wider uppercase ring-1',
          TAG[tone]
        )}
      >
        <Icon className="size-3.5" /> {tag}
      </span>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(f => (
          <div key={f.label} className={cn('min-w-0', f.wide && 'sm:col-span-2')}>
            <div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {f.label}
            </div>
            <div className="flex min-h-9 items-center rounded-md border bg-surface/60 px-3 py-1.5 text-[14px] break-words">
              {f.value === null || f.value === undefined || f.value === '' ? (
                <span className="text-muted-foreground/60">—</span>
              ) : (
                f.value
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientInfo({ client, onEdit }: { client: ClientDetail; onEdit: () => void }) {
  const { can } = usePermissions();
  const [assigning, setAssigning] = useState(false);
  const primary = client.locations.find(l => l.isPrimary) ?? client.locations[0];
  const csr = client.csrFinancials?.[0];
  const corp = client.corporateFinancials?.[0];
  const link = (href: string, text: string) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="truncate text-primary hover:underline"
    >
      {text}
    </a>
  );

  const firmographics: Field[] = [
    { label: 'Client name', value: client.name, wide: true },
    { label: 'State', value: primary?.state },
    { label: 'District', value: primary?.district },
    { label: 'Industry', value: client.industry?.label },
    { label: 'Client category', value: client.category?.label },
    {
      label: 'CIN',
      value: client.cin && <span className="font-mono text-[13px]">{client.cin}</span>,
    },
    {
      label: 'Employee size',
      value:
        [
          client.employeeSize?.label,
          client.employeeCount !== null && `${fmtNumber(client.employeeCount)} people`,
        ]
          .filter(Boolean)
          .join(' · ') || null,
    },
    {
      label: 'Head office address',
      value: primary && [primary.addressLine, primary.city].filter(Boolean).join(', '),
      wide: true,
    },
    { label: 'Pincode', value: primary?.pincode },
    { label: 'Country', value: primary?.country },
    {
      label: 'Website',
      value: client.website && (
        <span className="flex min-w-0 items-center gap-2">
          {link(client.website, hostOf(client.website) ?? client.website)}
          <WebsiteHistory clientId={client.id} />
        </span>
      ),
    },
    { label: 'LinkedIn', value: client.linkedinUrl && link(client.linkedinUrl, 'Company page') },
    { label: 'Organisation type', value: ENTITY_TYPE[client.entityType] },
    { label: 'Short name', value: client.shortName },
  ];

  const financials: Field[] = [
    {
      label: 'CSR spent (latest)',
      value: client.csrSpentRs && (
        <span>
          <b className="text-success">{fmtInr(client.csrSpentRs)}</b>
          {client.csrFy && (
            <span className="ml-1.5 text-xs text-muted-foreground">FY {client.csrFy}</span>
          )}
        </span>
      ),
    },
    {
      label: `CSR obligation${csr ? ` (FY ${csr.fy})` : ''}`,
      value: csr?.obligationRs && fmtInr(csr.obligationRs),
    },
    {
      label: `CSR budget${csr ? ` (FY ${csr.fy})` : ''}`,
      value: csr?.budgetRs && fmtInr(csr.budgetRs),
    },
    {
      label: `CSR unspent${csr ? ` (FY ${csr.fy})` : ''}`,
      value: csr?.unspentRs && fmtInr(csr.unspentRs),
    },
    {
      label: `Revenue${corp ? ` (FY ${corp.fy})` : ''}`,
      value: corp?.revenueRs && fmtInr(corp.revenueRs),
    },
    { label: 'Net worth', value: corp?.netWorthRs && fmtInr(corp.netWorthRs) },
    { label: 'Paid-up capital', value: corp?.paidUpCapitalRs && fmtInr(corp.paidUpCapitalRs) },
    {
      label: 'Authorised capital',
      value: corp?.authorisedCapitalRs && fmtInr(corp.authorisedCapitalRs),
    },
  ];

  const ownership: Field[] = [
    { label: 'Status', value: CLIENT_STATUS[client.status].label },
    {
      label: 'Business unit · service lines',
      value:
        [client.businessUnit?.name, ...(client.serviceLines ?? []).map(s => s.serviceLine.name)]
          .filter(Boolean)
          .join(' · ') || null,
    },
    {
      label: 'Assigned to',
      value: (
        <span className="flex flex-wrap items-center gap-2">
          {client.assignments.length ? (
            client.assignments.map(a => (
              <span key={a.user.id} className="inline-flex items-center gap-1">
                <UserAvatar person={a.user} size="xs" />
                {fullName(a.user)}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">Nobody yet</span>
          )}
          {can('clients.assign') && (
            <button
              type="button"
              onClick={() => setAssigning(true)}
              className="text-[12.5px] font-medium text-primary hover:underline"
            >
              {client.assignments.length ? 'Change' : 'Assign'}
            </button>
          )}
        </span>
      ),
    },
    { label: 'Added', value: `${fmtDate(client.createdAt)} · ${fullName(client.createdBy)}` },
    {
      label: 'Approved',
      value: client.approvedAt
        ? `${fmtDate(client.approvedAt)} · ${fullName(client.approvedBy)}`
        : 'Not yet',
    },
    { label: 'Last updated', value: fmtDate(client.updatedAt) },
  ];

  return (
    <div className="space-y-6">
      <Group tag="Firmographics" tone="green" icon={Building2} fields={firmographics} />
      {client.csrFinancials !== undefined && (
        <Group tag="Financials" tone="violet" icon={IndianRupee} fields={financials} />
      )}
      <Group tag="Ownership" tone="blue" icon={UserCog} fields={ownership} />
      {can('clients.update') && (
        <div className="flex justify-end">
          <Button onClick={onEdit}>
            <Pencil /> Edit client information
          </Button>
        </div>
      )}
      {assigning && <AssignClientsDialog clients={[client]} open onOpenChange={setAssigning} />}
    </div>
  );
}
