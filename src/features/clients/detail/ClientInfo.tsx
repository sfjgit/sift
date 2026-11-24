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
import {
  FieldGrid,
  FieldRow,
  InlineBool,
  InlinePick,
  InlineText,
  Empty,
} from '@/components/record/InlineField';
import { AssignClientsDialog } from '@/features/clients/AssignClientsDialog';
import { ENTITY_TYPE } from '@/features/clients/columns';
import { usePermissions } from '@/features/auth/usePermissions';
import { ClientKeyStar, CsrEligibleToggle, ProjectTags } from '@/features/marks/SalesMarks';
import { WebsiteHistory } from '@/features/website/WebsiteHistory';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDate, fmtInr, fmtNumber, fullName, hostOf } from '@/lib/format';
import type {
  ClientDetail,
  ClientEntityType,
  ClientInput,
  ClientOwnership,
  GovtLevel,
} from '@/types/crm';

function Heading({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mt-5 mb-1 flex items-baseline gap-2 first:mt-0">
      <h3 className="text-[11px] font-bold tracking-wider text-primary uppercase">{children}</h3>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

// CASPA "CSR spent category" — a band from the latest CSR spend (₹ crore)
const CSR_BANDS: [number, string][] = [
  [50, '0 Cr – 50 Cr'],
  [100, '50 Cr – 100 Cr'],
  [200, '100 Cr – 200 Cr'],
  [500, '200 Cr – 500 Cr'],
  [1000, '500 Cr – 1000 Cr'],
  [Infinity, '> 1000 Cr'],
];
export const csrBand = (spentRs: string | null | undefined) => {
  if (!spentRs) return null;
  const cr = Number(spentRs) / 1e7;
  return CSR_BANDS.find(([max]) => cr < max)?.[1] ?? null;
};

/** "1,20,000 students" → 120000; text with no number → 0 */
const firstNumber = (s: string | null) => {
  const m = s?.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

// fields the list row (what PATCH returns) doesn't carry — merged from the request
const ICP_KEYS = [
  'foundationName',
  'foundationWebsite',
  'isListed',
  'subCategory',
  'linkedinEmployees',
  'marketCapRs',
] as const;

const Read = ({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) => (
  <FieldRow label={label} wide={wide}>
    <div className="py-1 break-words">
      {value === null || value === undefined || value === '' || value === false ? <Empty /> : value}
    </div>
  </FieldRow>
);

export const OWNERSHIP: Record<ClientOwnership, string> = {
  PRIVATE: 'Private',
  CENTRAL_GOVT: 'Central government',
  STATE_GOVT: 'State government',
};
const OWNERSHIP_OPTIONS = (Object.keys(OWNERSHIP) as ClientOwnership[]).map(v => ({
  value: v,
  label: OWNERSHIP[v],
}));
export const GOVT_LEVEL: Record<GovtLevel, string> = {
  CENTRAL: 'Central',
  STATE: 'State',
  DISTRICT: 'District',
  LOCAL: 'Local body',
};
const LEVEL_OPTIONS = (Object.keys(GOVT_LEVEL) as GovtLevel[]).map(v => ({
  value: v,
  label: GOVT_LEVEL[v],
}));
export const PRIORITY: Record<'H' | 'M' | 'L', string> = { H: 'High', M: 'Medium', L: 'Low' };
const PRIORITY_OPTIONS = (['H', 'M', 'L'] as const).map(v => ({ value: v, label: PRIORITY[v] }));

/** the government add-on (B2G bodies) — tier, type, ministry, procurement */
function GovtFields({
  client,
  canEdit,
  save,
}: {
  client: ClientDetail;
  canEdit: boolean;
  save: (body: Partial<ClientInput>) => Promise<void>;
}) {
  const g = client.govt;
  const govt = (field: keyof NonNullable<ClientInput['govt']>) => (v: string | null) =>
    save({ govt: { [field]: v } });
  const text = (
    label: string,
    field: keyof NonNullable<ClientInput['govt']>,
    value?: string | null
  ) => <InlineText label={label} value={value} canEdit={canEdit} onSave={govt(field)} />;
  return (
    <>
      <Heading hint="government body">Government</Heading>
      <FieldGrid>
        <InlinePick
          label="Tier"
          value={g?.level ?? null}
          display={g?.level ? GOVT_LEVEL[g.level] : undefined}
          canEdit={canEdit}
          onSave={govt('level')}
          render={p => <EnumPicker options={LEVEL_OPTIONS} {...p} />}
        />
        <InlinePick
          label="Body type"
          value={g?.orgType?.id ?? null}
          display={g?.orgType?.label}
          canEdit={canEdit}
          onSave={govt('orgTypeId')}
          render={p => <LookupPicker type="GOVT_ORG_TYPE" {...p} />}
        />
        {g?.parent ? (
          <Read
            label="Parent body"
            value={
              <a href={`/clients/${g.parent.id}`} className="text-primary hover:underline">
                {g.parent.name}
              </a>
            }
          />
        ) : null}
        {text('Ministry', 'ministryName', g?.ministryName)}
        {text('Department', 'departmentName', g?.departmentName)}
        {text('State skill body', 'stateSkillBody', g?.stateSkillBody)}
        {text('Sector', 'sector', g?.sector)}
        {text('Scheme type', 'schemeType', g?.schemeType)}
        {text('Estimated budget', 'estimatedBudget', g?.estimatedBudget)}
        {text('Tender portal', 'tenderPortal', g?.tenderPortal)}
        {text('Tender authority', 'tenderAuthority', g?.tenderAuthority)}
        <InlinePick
          work
          label="Priority"
          value={g?.priority ?? null}
          display={g?.priority ? PRIORITY[g.priority] : undefined}
          canEdit={canEdit}
          onSave={govt('priority')}
          render={p => <EnumPicker options={PRIORITY_OPTIONS} {...p} />}
        />
        {text('Digital maturity', 'digitalMaturity', g?.digitalMaturity)}
      </FieldGrid>
    </>
  );
}

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
    const icp = Object.fromEntries(
      ICP_KEYS.filter(k => k in body).map(k => [
        k,
        k === 'marketCapRs' && body[k] != null ? String(body[k]) : body[k],
      ])
    );
    qc.setQueryData<ClientDetail>(clientHooks.keys.detail(client.id), old =>
      old ? { ...old, ...icp, ...res, locations: old.locations } : old
    );
    qc.invalidateQueries({ queryKey: clientHooks.keys.all });
  };
  const text = (field: keyof ClientInput) => (v: string | null) => save({ [field]: v });
  const url = (field: 'website' | 'linkedinUrl' | 'foundationWebsite') => (v: string | null) =>
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
      <Heading>Organisation</Heading>
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
        <InlineText
          label="Short name"
          value={client.shortName}
          canEdit={canEdit}
          onSave={text('shortName')}
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
        <InlineText
          label="Office email"
          type="email"
          value={client.email}
          canEdit={canEdit}
          onSave={text('email')}
        />
        <InlineText
          label="Office phone"
          type="tel"
          value={client.phone}
          canEdit={canEdit}
          onSave={text('phone')}
        />
        {/* automatic: the service lines of the client's active SPOCs */}
        <Read
          label="Service lines"
          value={
            (client.serviceLines ?? []).map(s => s.serviceLine.name).join(' · ') || (
              <span className="text-muted-foreground">None yet — follows the SPOCs added</span>
            )
          }
        />
        <Read label="Status" value={CLIENT_STATUS[client.status].label} />
      </FieldGrid>

      {/* company facts — only for companies (a ministry has no CIN, industry or head count) */}
      {(client.entityType === 'COMPANY' || client.hasCompany) && (
        <>
          <Heading hint="registration (MCA), industry, size, group">Company details</Heading>
          <FieldGrid>
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
              label="Sub category"
              value={client.subCategory}
              canEdit={canEdit}
              onSave={text('subCategory')}
            />
            <InlineText
              label="CIN"
              value={client.cin}
              display={
                client.cin ? <span className="font-mono text-[13px]">{client.cin}</span> : undefined
              }
              canEdit={canEdit}
              onSave={text('cin')}
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
                if (n !== null && (!Number.isInteger(n) || n < 0))
                  throw new Error('Enter a whole number');
                // the size band follows the count
                return save({ employeeCount: n, employeeSizeId: null });
              }}
            />
            <InlineText
              label="LinkedIn employees"
              type="number"
              value={client.linkedinEmployees}
              display={
                client.linkedinEmployees != null ? fmtNumber(client.linkedinEmployees) : undefined
              }
              canEdit={canEdit}
              onSave={v => {
                const n = v === null ? null : Number(v);
                if (n !== null && (!Number.isInteger(n) || n < 0))
                  throw new Error('Enter a whole number');
                return save({ linkedinEmployees: n });
              }}
            />
            <InlineBool
              label="Listed"
              value={client.isListed}
              canEdit={canEdit}
              onSave={v => save({ isListed: v })}
              yes="Listed"
              no="Not listed"
            />
            <InlineText
              label="Company group"
              value={client.groupName}
              placeholder="e.g. Adani Group"
              canEdit={canEdit}
              onSave={text('groupName')}
            />
            <InlinePick
              label="Ownership"
              value={client.registration?.ownership ?? null}
              display={
                client.registration?.ownership
                  ? OWNERSHIP[client.registration.ownership]
                  : undefined
              }
              canEdit={canEdit}
              onSave={v => save({ ownership: (v as ClientOwnership | null) ?? null })}
              render={p => <EnumPicker options={OWNERSHIP_OPTIONS} {...p} />}
            />
            <InlineText
              label="Company class"
              value={client.registration?.companyClass}
              placeholder="e.g. Company limited by shares"
              canEdit={canEdit}
              onSave={text('companyClass')}
            />
            <InlineText
              label="Incorporated (year)"
              type="number"
              value={client.registration?.yearOfIncorporation}
              canEdit={canEdit}
              onSave={v => save({ yearOfIncorporation: v ? Number(v) : null })}
            />
          </FieldGrid>
        </>
      )}

      <Heading hint="the client's part in CSR">CSR profile</Heading>
      <FieldGrid>
        <InlinePick
          label="CSR role"
          value={client.csr?.csrRole?.id ?? null}
          display={client.csr?.csrRole?.label}
          canEdit={canEdit}
          onSave={v => save({ csrRoleId: v })}
          render={p => <LookupPicker type="CSR_ROLE" {...p} />}
        />
        <InlineText
          label="Foundation name"
          value={client.foundationName}
          canEdit={canEdit}
          onSave={text('foundationName')}
        />
        <InlineText
          label="Foundation website"
          type="url"
          value={client.foundationWebsite}
          display={
            client.foundationWebsite
              ? link(
                  client.foundationWebsite,
                  hostOf(client.foundationWebsite) ?? client.foundationWebsite
                )
              : undefined
          }
          canEdit={canEdit}
          onSave={url('foundationWebsite')}
        />
      </FieldGrid>

      {(client.govt ||
        client.entityType === 'GOVERNMENT' ||
        client.businessUnit?.name === 'B2G') && (
        <GovtFields client={client} canEdit={canEdit} save={save} />
      )}

      <Heading hint="from the head office — change it under Branch offices">Head office</Heading>
      <FieldGrid>
        <Read label="State" value={primary?.state} />
        <Read label="District" value={primary?.district} />
        <Read label="City" value={primary?.city} />
        <Read label="Pincode" value={primary?.pincode} />
        <Read label="Country" value={primary?.country} />
        <Read
          label="GPS"
          value={
            primary?.latitude && primary.longitude ? (
              <a
                href={`https://www.google.com/maps?q=${primary.latitude},${primary.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[13px] text-primary hover:underline"
              >
                {Number(primary.latitude).toFixed(5)}, {Number(primary.longitude).toFixed(5)}
              </a>
            ) : undefined
          }
        />
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
                    {client.csrFy && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        FY {client.csrFy}
                      </span>
                    )}
                  </span>
                )
              }
            />
            <Read label="CSR spent category" value={csrBand(client.csrSpentRs)} />
            {client.csrPrograms && (
              <Read
                label="Beneficiaries (all programmes)"
                value={
                  client.csrPrograms.some(p => p.beneficiaries)
                    ? fmtNumber(
                        client.csrPrograms.reduce((n, p) => n + firstNumber(p.beneficiaries), 0)
                      )
                    : undefined
                }
              />
            )}
            <Read
              label={`CSR obligation${csr ? ` (FY ${csr.fy})` : ''}`}
              value={csr?.obligationRs && fmtInr(csr.obligationRs)}
            />
            <Read
              label={`CSR fund${csr ? ` (FY ${csr.fy})` : ''}`}
              value={csr?.budgetRs && fmtInr(csr.budgetRs)}
            />
            <Read
              label={`CSR unspent${csr ? ` (FY ${csr.fy})` : ''}`}
              value={csr?.unspentRs && fmtInr(csr.unspentRs)}
            />
            <Read
              label={`Revenue${corp ? ` (FY ${corp.fy})` : ''}`}
              value={corp?.revenueRs && fmtInr(corp.revenueRs)}
            />
            <Read label="Net worth" value={corp?.netWorthRs && fmtInr(corp.netWorthRs)} />
            <InlineText
              label="Market cap (₹)"
              type="number"
              value={client.marketCapRs}
              display={client.marketCapRs ? fmtInr(client.marketCapRs) : undefined}
              canEdit={canEdit}
              onSave={v => {
                const n = v === null ? null : Number(v);
                if (n !== null && (!Number.isFinite(n) || n < 0))
                  throw new Error('Enter an amount in rupees');
                return save({ marketCapRs: n });
              }}
            />
            <Read
              label="Paid-up capital"
              value={corp?.paidUpCapitalRs && fmtInr(corp.paidUpCapitalRs)}
            />
            <Read
              label="Authorised capital"
              value={corp?.authorisedCapitalRs && fmtInr(corp.authorisedCapitalRs)}
            />
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
        <Read
          label="Added"
          value={`${fmtDate(client.createdAt)} · ${fullName(client.createdBy)}`}
        />
        <Read
          label="Approved"
          value={
            client.approvedAt
              ? `${fmtDate(client.approvedAt)} · ${fullName(client.approvedBy)}`
              : 'Not yet'
          }
        />
        <Read label="Last updated" value={fmtDate(client.updatedAt)} />
      </FieldGrid>

      {assigning && <AssignClientsDialog clients={[client]} open onOpenChange={setAssigning} />}
    </div>
  );
}
