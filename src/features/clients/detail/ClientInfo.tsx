// File: ClientInfo.tsx
// Path: src/features/clients/detail/ClientInfo.tsx
//
// "Client information" — every fact about the client as label/value rows
// (CASPA's ICP page). Click a value to edit it right there; there is no edit
// dialog for these. Address rows come from the head office (edit it under
// Branch offices); financial rows come from the CSR section.

'use client';

import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserAvatar } from '@/components/common/UserAvatar';
import { CLIENT_STATUS } from '@/components/common/badges';
import { EnumPicker, LookupPicker, MasterPicker } from '@/components/pickers/pickers';
import { FieldGrid, FieldRow, InlinePick, InlineText, Empty } from '@/components/record/InlineField';
import { AssignClientsDialog } from '@/features/clients/AssignClientsDialog';
import { ENTITY_TYPE } from '@/features/clients/columns';
import { usePermissions } from '@/features/auth/usePermissions';
import { ClientKeyStar, CsrEligibleToggle, ProjectTags } from '@/features/marks/SalesMarks';
import { WebsiteHistory } from '@/features/website/WebsiteHistory';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, fmtInr, fmtNumber, fullName, hostOf } from '@/lib/format';
import type { ClientDetail, ClientEntityType, ClientInput } from '@/types/crm';

function Heading({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mt-5 mb-1 flex items-baseline gap-2 first:mt-0">
      <h3 className="text-[11px] font-bold tracking-wider text-primary uppercase">{children}</h3>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

const Read = ({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) => (
  <FieldRow label={label} wide={wide}>
    <div className="py-1 break-words">
      {value === null || value === undefined || value === '' || value === false ? <Empty /> : value}
    </div>
  </FieldRow>
);

export function ClientInfo({ client }: { client: ClientDetail }) {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [assigning, setAssigning] = useState(false);
  const canEdit = can('clients.update');
  const primary = client.locations.find(l => l.isPrimary) ?? client.locations[0];
  const csr = client.csrFinancials?.[0];
  const corp = client.corporateFinancials?.[0];

  /** save one field; the page shows it at once */
  const save = async (body: Partial<ClientInput>) => {
    const res = await clientsApi.update(client.id, body);
    qc.setQueryData<ClientDetail>(clientHooks.keys.detail(client.id), old =>
      old ? { ...old, ...res, locations: old.locations } : old
    );
    qc.invalidateQueries({ queryKey: clientHooks.keys.all });
  };
  const text = (field: keyof ClientInput) => (v: string | null) => save({ [field]: v });
  const url = (field: 'website' | 'linkedinUrl') => (v: string | null) =>
    save({ [field]: v && !/^https?:\/\//i.test(v) ? `https://${v}` : v });
  const link = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
      {label}
    </a>
  );
  const stamp =
    client.projectSetBy && client.projectSetAt
      ? `${fullName(client.projectSetBy)} · ${fmtDate(client.projectSetAt)}`
      : undefined;

  return (
    <div className="pb-1">
      <Heading>Firmographics</Heading>
      <FieldGrid>
        <InlineText
          label="Client name"
          value={client.name}
          canEdit={canEdit}
          onSave={v => {
            if (!v) throw new Error('Client name is required');
            return save({ name: v });
          }}
        />
        <InlineText label="Short name" value={client.shortName} canEdit={canEdit} onSave={text('shortName')} />
        <InlinePick
          label="Industry"
          value={client.industry?.id}
          display={client.industry?.label}
          canEdit={canEdit}
          onSave={v => save({ industryId: v })}
          render={p => <LookupPicker type="INDUSTRY" {...p} />}
        />
        <InlinePick
          label="Client category"
          value={client.category?.id}
          display={client.category?.label}
          canEdit={canEdit}
          onSave={v => save({ categoryId: v })}
          render={p => <LookupPicker type="CLIENT_CATEGORY" {...p} />}
        />
        <InlineText
          label="CIN"
          value={client.cin}
          display={client.cin ? <span className="font-mono text-[13px]">{client.cin}</span> : undefined}
          canEdit={canEdit}
          onSave={text('cin')}
        />
        <InlinePick
          label="Organisation type"
          value={client.entityType}
          display={ENTITY_TYPE[client.entityType]}
          canEdit={canEdit}
          onSave={v => {
            if (!v) throw new Error('Pick a type');
            return save({ entityType: v as ClientEntityType });
          }}
          render={p => (
            <EnumPicker
              {...p}
              clearable={false}
              options={Object.entries(ENTITY_TYPE).map(([value, label]) => ({ value, label }))}
            />
          )}
        />
        <InlineText
          label="Employees"
          type="number"
          value={client.employeeCount}
          display={
            client.employeeCount !== null || client.employeeSize
              ? [
                  client.employeeCount !== null && `${fmtNumber(client.employeeCount)} people`,
                  client.employeeSize?.label,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : undefined
          }
          canEdit={canEdit}
          onSave={v => {
            const n = v === null ? null : Number(v);
            if (n !== null && (!Number.isInteger(n) || n < 0)) throw new Error('Enter a whole number');
            // the size band follows the count
            return save({ employeeCount: n, employeeSizeId: null });
          }}
        />
        <InlinePick
          label="Business unit"
          value={client.businessUnit?.id}
          display={client.businessUnit?.name}
          canEdit={canEdit}
          onSave={v => save({ businessUnitId: v })}
          render={p => <MasterPicker kind="business-units" {...p} />}
        />
        <InlineText
          label="Website"
          type="url"
          value={client.website}
          display={
            client.website ? (
              <span className="flex min-w-0 items-center gap-2">
                {link(client.website, hostOf(client.website) ?? client.website)}
                <WebsiteHistory clientId={client.id} />
              </span>
            ) : undefined
          }
          canEdit={canEdit}
          onSave={url('website')}
        />
        <InlineText
          label="LinkedIn"
          type="url"
          value={client.linkedinUrl}
          display={client.linkedinUrl ? link(client.linkedinUrl, 'Company page') : undefined}
          canEdit={canEdit}
          onSave={url('linkedinUrl')}
        />
        <Read
          label="Service lines"
          value={(client.serviceLines ?? []).map(s => s.serviceLine.name).join(' · ')}
        />
        <Read label="Status" value={CLIENT_STATUS[client.status].label} />
      </FieldGrid>

      <Heading hint="from the head office — change it under Branch offices">Head office</Heading>
      <FieldGrid>
        <Read label="State" value={primary?.state} />
        <Read label="District" value={primary?.district} />
        <Read label="City" value={primary?.city} />
        <Read label="Pincode" value={primary?.pincode} />
        <Read label="Address" value={primary?.addressLine} wide />
      </FieldGrid>

      <Heading>Sales marks</Heading>
      <FieldGrid>
        <FieldRow label="Key account">
          <div className="flex items-center gap-2 py-0.5">
            <ClientKeyStar client={client as never} />
            <span className="text-[13px] text-muted-foreground">
              {client.keyAccounts?.length
                ? client.keyAccounts.map(k => fullName(k.user)).join(', ')
                : 'Nobody yet'}
            </span>
          </div>
        </FieldRow>
        <FieldRow label="CSR eligible">
          <div className="py-0.5">
            <CsrEligibleToggle client={client as never} canEdit={canEdit} />
          </div>
        </FieldRow>
        <FieldRow label="Projects">
          <div className="py-0.5">
            <ProjectTags
              ids={client.projectIds ?? []}
              canEdit={canEdit}
              setBy={stamp}
              onSave={next => save({ projectIds: next })}
            />
          </div>
        </FieldRow>
      </FieldGrid>

      {client.csrFinancials !== undefined && (
        <>
          <Heading hint="from CSR figures & programmes">Financials</Heading>
          <FieldGrid>
            <Read
              label="CSR spent (latest)"
              value={
                client.csrSpentRs && (
                  <span>
                    <b className="text-success">{fmtInr(client.csrSpentRs)}</b>
                    {client.csrFy && <span className="ml-1.5 text-xs text-muted-foreground">FY {client.csrFy}</span>}
                  </span>
                )
              }
            />
            <Read label={`CSR obligation${csr ? ` (FY ${csr.fy})` : ''}`} value={csr?.obligationRs && fmtInr(csr.obligationRs)} />
            <Read label={`CSR budget${csr ? ` (FY ${csr.fy})` : ''}`} value={csr?.budgetRs && fmtInr(csr.budgetRs)} />
            <Read label={`CSR unspent${csr ? ` (FY ${csr.fy})` : ''}`} value={csr?.unspentRs && fmtInr(csr.unspentRs)} />
            <Read label={`Revenue${corp ? ` (FY ${corp.fy})` : ''}`} value={corp?.revenueRs && fmtInr(corp.revenueRs)} />
            <Read label="Net worth" value={corp?.netWorthRs && fmtInr(corp.netWorthRs)} />
            <Read label="Paid-up capital" value={corp?.paidUpCapitalRs && fmtInr(corp.paidUpCapitalRs)} />
            <Read label="Authorised capital" value={corp?.authorisedCapitalRs && fmtInr(corp.authorisedCapitalRs)} />
          </FieldGrid>
        </>
      )}

      <Heading>Ownership</Heading>
      <FieldGrid>
        <FieldRow label="Assigned to">
          <span className="flex flex-wrap items-center gap-2 py-1">
            {client.assignments.length ? (
              client.assignments.map(a => (
                <span key={a.user.id} className="inline-flex items-center gap-1">
                  <UserAvatar person={a.user} size="xs" />
                  {fullName(a.user)}
                </span>
              ))
            ) : (
              <Empty>Nobody yet</Empty>
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
        </FieldRow>
        <Read label="Added" value={`${fmtDate(client.createdAt)} · ${fullName(client.createdBy)}`} />
        <Read
          label="Approved"
          value={client.approvedAt ? `${fmtDate(client.approvedAt)} · ${fullName(client.approvedBy)}` : 'Not yet'}
        />
        <Read label="Last updated" value={fmtDate(client.updatedAt)} />
      </FieldGrid>

      {assigning && <AssignClientsDialog clients={[client]} open onOpenChange={setAssigning} />}
    </div>
  );
}
