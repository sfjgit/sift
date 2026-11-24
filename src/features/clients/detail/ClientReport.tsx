// File: ClientReport.tsx
// Path: src/features/clients/detail/ClientReport.tsx
//
// The client page in view mode: a 5-section printed-style report of everything the CRM holds —
// profile, CSR & financials, CSR programmes, offices & technology, people & documents.
// Edit (top right) turns the page back into forms.

'use client';

import Link from 'next/link';
import { usePermissions } from '@/features/auth/usePermissions';
import { CLIENT_STATUS } from '@/components/common/badges';
import {
  ReportBadge,
  ReportCover,
  ReportDoc,
  ReportEmpty,
  ReportFigures,
  ReportKV,
  ReportPage,
  ReportSection,
  ReportTable,
  ReportText,
} from '@/components/record/Report';
import { ENTITY_TYPE } from '@/features/clients/columns';
import { GOVT_LEVEL, OWNERSHIP, PRIORITY } from '@/features/clients/detail/ClientInfo';
import { spocHooks } from '@/hooks/queries';
import { fmtDate, fmtInr, fmtNumber, fullName, hostOf } from '@/lib/format';
import type { ClientDetail, Spoc } from '@/types/crm';

const cr = (v?: string | number | null) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v) / 1e7;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n < 10 ? 2 : 1 })} Cr`;
};
const sum = (xs: (string | null | undefined)[]) => {
  const ns = xs.filter(x => x !== null && x !== undefined && x !== '').map(Number);
  return ns.length ? ns.reduce((a, b) => a + b, 0) : null;
};
const link = (href: string | null | undefined, label?: string | null) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[#1d4ed8] underline-offset-2 hover:underline"
    >
      {label ?? hostOf(href) ?? href}
    </a>
  ) : null;
const yesNo = (v?: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : null);

export function ClientReport({ client: c }: { client: ClientDetail }) {
  const { can } = usePermissions();
  const spocs = spocHooks.useList(
    { clientId: c.id, limit: 100, page: 1, sortBy: 'firstName', sortDir: 'asc' },
    { enabled: can('spocs.read') }
  );
  const people = (spocs.data?.data ?? []) as Spoc[];
  const peopleTotal = spocs.data?.meta?.total ?? people.length;

  const primary = c.locations.find(l => l.isPrimary) ?? c.locations[0];
  const csr = c.csrFinancials ?? [];
  const corp = c.corporateFinancials ?? [];
  const programs = c.csrPrograms ?? [];
  const docs = c.documents ?? [];
  const latestCsr = csr[0];
  const latestCorp = corp[0];
  const assigned = c.assignments; // the active ones
  const branches = c.locations.filter(l => l.isActive !== false);
  const status = CLIENT_STATUS[c.status];

  const total = 5;
  const page = { total, kicker: 'Client report', running: c.name };

  return (
    <ReportDoc>
      {/* ── 1. profile */}
      <ReportPage n={1} title={c.govt ? 'Body profile' : 'Company profile'} {...page}>
        <ReportCover
          title={c.name}
          subtitle={[c.shortName, c.industry?.label].filter(Boolean).join(' · ') || undefined}
          badges={
            <>
              <ReportBadge
                tone={c.status === 'ACTIVE' ? 'green' : c.status === 'PENDING' ? 'amber' : 'slate'}
              >
                {status.label}
              </ReportBadge>
              <ReportBadge tone="blue">{ENTITY_TYPE[c.entityType]}</ReportBadge>
              {c.businessUnit && <ReportBadge>{c.businessUnit.name}</ReportBadge>}
              {(c.serviceLines ?? []).map(s => (
                <ReportBadge key={s.serviceLine.id}>{s.serviceLine.name}</ReportBadge>
              ))}
              {c.isListed && <ReportBadge>Listed</ReportBadge>}
            </>
          }
          facts={[
            ['CIN', c.cin && <span className="font-mono">{c.cin}</span>],
            ['Website', link(c.website)],
            [
              'Head office',
              [primary?.city ?? primary?.district, primary?.state].filter(Boolean).join(', '),
            ],
            ['In CRM since', fmtDate(c.createdAt)],
          ]}
        />
        <ReportFigures
          items={[
            {
              label: 'CSR spent',
              value: cr(c.csrSpentRs),
              note: c.csrFy ? `FY ${c.csrFy}` : undefined,
            },
            {
              label: 'Employees',
              value: c.employeeCount ? fmtNumber(c.employeeCount) : c.employeeSize?.label,
            },
            { label: 'Offices', value: branches.length || null },
            { label: 'SPOCs', value: can('spocs.read') ? peopleTotal || null : null },
          ]}
        />
        <ReportSection title="Identity & classification">
          <ReportKV
            rows={[
              ['Legal name', c.name],
              ['Short name', c.shortName],
              ['Organisation type', ENTITY_TYPE[c.entityType]],
              ['Company group', c.groupName],
              ['CIN', c.cin && <span className="font-mono">{c.cin}</span>],
              ['Ownership', c.registration?.ownership && OWNERSHIP[c.registration.ownership]],
              ['Incorporated', c.registration?.yearOfIncorporation],
              ['Company class', c.registration?.companyClass],
              ['Industry', c.industry?.label],
              ['Category', c.category?.label],
              ['Sub category', c.subCategory],
              ['Employee size', c.employeeSize?.label],
              ['Employees', c.employeeCount && fmtNumber(c.employeeCount)],
              ['LinkedIn employees', c.linkedinEmployees && fmtNumber(c.linkedinEmployees)],
              ['Listed', yesNo(c.isListed)],
              ['Market cap', cr(c.marketCapRs)],
            ]}
          />
        </ReportSection>
        <ReportSection title="Online presence">
          <ReportKV
            rows={[
              ['Website', link(c.website)],
              ['LinkedIn', link(c.linkedinUrl, 'LinkedIn page')],
              [
                'Office email',
                c.email && (
                  <a href={`mailto:${c.email}`} className="text-[#1d4ed8] hover:underline">
                    {c.email}
                  </a>
                ),
              ],
              ['Office phone', c.phone],
              ['Foundation', c.foundationName],
              ['Foundation website', link(c.foundationWebsite)],
            ]}
          />
        </ReportSection>
        {c.govt && (
          <ReportSection title="Government body">
            <ReportKV
              rows={[
                ['Tier', c.govt.level && GOVT_LEVEL[c.govt.level]],
                ['Body type', c.govt.orgType?.label],
                [
                  'Parent body',
                  c.govt.parent && (
                    <Link
                      href={`/clients/${c.govt.parent.id}`}
                      className="text-[#1d4ed8] hover:underline"
                    >
                      {c.govt.parent.name}
                    </Link>
                  ),
                ],
                ['Ministry', c.govt.ministryName],
                ['Department', c.govt.departmentName],
                ['State skill body', c.govt.stateSkillBody],
                ['Sector', c.govt.sector],
                ['Scheme type', c.govt.schemeType],
                ['Estimated budget', c.govt.estimatedBudget],
                ['Tender portal', c.govt.tenderPortal],
                ['Tender authority', c.govt.tenderAuthority],
                ['Priority', c.govt.priority && PRIORITY[c.govt.priority]],
                ['Digital maturity', c.govt.digitalMaturity],
              ]}
            />
          </ReportSection>
        )}
        <ReportSection title="Head office">
          <ReportKV
            rows={[
              ['Address', primary?.addressLine],
              ['City', primary?.city],
              ['District', primary?.district],
              ['State', primary?.state],
              ['PIN code', primary?.pincode],
              ['Country', primary?.country],
            ]}
          />
        </ReportSection>
        <ReportSection title="Ownership">
          <ReportKV
            rows={[
              ['Business unit', c.businessUnit?.name],
              ['Service lines', (c.serviceLines ?? []).map(s => s.serviceLine.name).join(', ')],
              ['Assigned to', assigned.map(a => fullName(a.user)).join(', ')],
              ['Key account of', (c.keyAccounts ?? []).map(k => fullName(k.user)).join(', ')],
              ['CSR eligible', yesNo(c.csrEligible)],
              ['CSR role', c.csr?.csrRole?.label],
              ['Status', status.label],
              [
                'Added',
                c.createdBy
                  ? `${fullName(c.createdBy)} · ${fmtDate(c.createdAt)}`
                  : fmtDate(c.createdAt),
              ],
              [
                'Approved',
                c.approvedBy ? `${fullName(c.approvedBy)} · ${fmtDate(c.approvedAt)}` : null,
              ],
              ['Last updated', fmtDate(c.updatedAt)],
            ]}
          />
        </ReportSection>
      </ReportPage>

      {/* ── 2. CSR & financials */}
      <ReportPage n={2} title="CSR & financials" {...page}>
        {c.csrFinancials === undefined ? (
          <ReportEmpty>Financial figures are not visible for your role.</ReportEmpty>
        ) : (
          <>
            <ReportFigures
              items={[
                {
                  label: 'CSR obligation',
                  value: cr(latestCsr?.obligationRs),
                  note: latestCsr && `FY ${latestCsr.fy}`,
                },
                {
                  label: 'CSR fund',
                  value: cr(latestCsr?.budgetRs),
                  note: latestCsr && `FY ${latestCsr.fy}`,
                },
                {
                  label: 'CSR spent',
                  value: cr(latestCsr?.spentRs),
                  note: latestCsr && `FY ${latestCsr.fy}`,
                },
                {
                  label: 'Revenue',
                  value: cr(latestCorp?.revenueRs),
                  note: latestCorp && `FY ${latestCorp.fy}`,
                },
              ]}
            />
            <ReportSection title="CSR by financial year" note="₹, as filed">
              <ReportTable
                rows={csr}
                rowKey={r => r.id}
                empty="No CSR figures recorded."
                columns={[
                  { label: 'FY', value: r => <b>{r.fy}</b> },
                  {
                    label: 'Obligation (2%)',
                    value: r => r.obligationRs && fmtInr(r.obligationRs),
                    align: 'right',
                  },
                  {
                    label: 'CSR fund',
                    value: r => r.budgetRs && fmtInr(r.budgetRs),
                    align: 'right',
                  },
                  { label: 'Spent', value: r => r.spentRs && fmtInr(r.spentRs), align: 'right' },
                  {
                    label: 'Unspent',
                    value: r => r.unspentRs && fmtInr(r.unspentRs),
                    align: 'right',
                  },
                ]}
              />
            </ReportSection>
            <ReportSection title="Company financials by financial year" note="₹">
              <ReportTable
                rows={corp}
                rowKey={r => r.id}
                empty="No company financials recorded."
                columns={[
                  { label: 'FY', value: r => <b>{r.fy}</b> },
                  {
                    label: 'Revenue',
                    value: r => r.revenueRs && fmtInr(r.revenueRs),
                    align: 'right',
                  },
                  {
                    label: 'Net profit',
                    value: r => r.netProfitRs && fmtInr(r.netProfitRs),
                    align: 'right',
                  },
                  {
                    label: 'Net worth',
                    value: r => r.netWorthRs && fmtInr(r.netWorthRs),
                    align: 'right',
                  },
                  {
                    label: 'Paid-up capital',
                    value: r => r.paidUpCapitalRs && fmtInr(r.paidUpCapitalRs),
                    align: 'right',
                  },
                  {
                    label: 'Authorised capital',
                    value: r => r.authorisedCapitalRs && fmtInr(r.authorisedCapitalRs),
                    align: 'right',
                  },
                ]}
              />
            </ReportSection>
          </>
        )}
      </ReportPage>

      {/* ── 3. programmes */}
      <ReportPage n={3} title="CSR programmes" {...page}>
        {c.csrPrograms === undefined ? (
          <ReportEmpty>CSR programmes are not visible for your role.</ReportEmpty>
        ) : (
          <>
            <ReportText>
              {programs.length
                ? `${programs.length} programme${programs.length === 1 ? '' : 's'} from the annual CSR reports${
                    sum(programs.map(p => p.spentRs)) !== null
                      ? `, ${cr(sum(programs.map(p => p.spentRs)))} spent in total`
                      : ''
                  }.`
                : 'No programmes recorded yet.'}
            </ReportText>
            <ReportSection title="Programmes" note="newest year first">
              <ReportTable
                rows={programs}
                rowKey={r => r.id}
                columns={[
                  { label: 'FY', value: r => r.fy },
                  {
                    label: 'Programme',
                    grow: true,
                    value: r => (
                      <>
                        <b>{r.name}</b>
                        {(r.sectors.length > 0 || r.sectorText) && (
                          <span className="block text-[11.5px] text-[#627d98]">
                            {r.sectors.map(s => s.sector.label).join(', ') || r.sectorText}
                          </span>
                        )}
                      </>
                    ),
                  },
                  {
                    label: 'Where',
                    value: r =>
                      [
                        ...new Set(
                          r.locations.map(l => (l.district ? `${l.district}, ${l.state}` : l.state))
                        ),
                      ].join('; ') || r.locationNote,
                  },
                  {
                    label: 'Agency',
                    value: r =>
                      r.agency?.name ?? (r.mode ? r.mode.toLowerCase().replace(/_/g, ' ') : null),
                  },
                  { label: 'Budget', value: r => r.budgetRs && fmtInr(r.budgetRs), align: 'right' },
                  { label: 'Spent', value: r => r.spentRs && fmtInr(r.spentRs), align: 'right' },
                ]}
              />
            </ReportSection>
          </>
        )}
      </ReportPage>

      {/* ── 4. offices & technology */}
      <ReportPage n={4} title="Offices & technology" {...page}>
        <ReportSection title="Offices" note={`${branches.length} on file`}>
          <ReportTable
            rows={[...branches].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))}
            rowKey={r => r.id}
            empty="No offices recorded."
            columns={[
              {
                label: 'Type',
                value: r => (r.isPrimary ? <b>Head office</b> : (r.type?.label ?? 'Office')),
              },
              { label: 'Address', grow: true, value: r => r.addressLine ?? r.name },
              { label: 'City / district', value: r => r.city ?? r.district },
              { label: 'State', value: r => r.state },
              { label: 'PIN', value: r => r.pincode },
            ]}
          />
        </ReportSection>
        <ReportSection title="Technology in use">
          <ReportTable
            rows={c.technologies}
            rowKey={r => r.id}
            empty="No technology recorded."
            columns={[
              { label: 'Area', value: r => <b>{r.category.label}</b> },
              {
                label: 'What they use',
                grow: true,
                value: r => <span className="whitespace-pre-line">{r.details}</span>,
              },
              { label: 'Updated', value: r => fmtDate(r.updatedAt) },
            ]}
          />
        </ReportSection>
      </ReportPage>

      {/* ── 5. people & documents */}
      <ReportPage n={5} title="People & documents" {...page}>
        {can('spocs.read') && (
          <ReportSection
            title="SPOCs"
            note={
              peopleTotal > people.length
                ? `first ${people.length} of ${peopleTotal}`
                : `${peopleTotal} on file`
            }
          >
            <ReportTable
              rows={people}
              rowKey={r => r.id}
              empty={spocs.isLoading ? 'Loading…' : 'No SPOCs recorded.'}
              columns={[
                {
                  label: 'Name',
                  value: r => (
                    <Link
                      href={`/spocs/${r.id}`}
                      className="font-semibold text-[#1d4ed8] hover:underline print:text-inherit"
                    >
                      {fullName(r)}
                    </Link>
                  ),
                },
                { label: 'Designation', value: r => r.designation },
                { label: 'Line', value: r => r.serviceLine?.name },
                { label: 'Email', value: r => r.email },
                { label: 'Phone', value: r => r.phone },
                { label: 'Status', value: r => r.salesStatus?.label },
                { label: 'Handler', value: r => r.handler && fullName(r.handler) },
              ]}
            />
          </ReportSection>
        )}
        {c.documents !== undefined && (
          <ReportSection title="Reports & documents">
            <ReportTable
              rows={docs}
              rowKey={r => r.id}
              empty="No documents on file."
              columns={[
                { label: 'Document', value: r => <b>{r.type?.label ?? 'Document'}</b> },
                { label: 'FY', value: r => r.fy },
                {
                  label: 'File',
                  grow: true,
                  value: r => link(r.sourceUrl, r.fileName) ?? r.fileName,
                },
                { label: 'Added', value: r => fmtDate(r.createdAt) },
              ]}
            />
          </ReportSection>
        )}
        <ReportSection
          title="Latest notes"
          note={c.notes.length > 5 ? `5 of ${c.notes.length}` : undefined}
        >
          {c.notes.length ? (
            <div className="space-y-3">
              {c.notes.slice(0, 5).map(n => (
                <div key={n.id} className="border-l-2 border-[#bcccdc] pl-3">
                  <p className="text-[11.5px] text-[#829ab1]">
                    {fullName(n.author)} · {fmtDate(n.createdAt)}
                    {n.spoc ? ` · about ${fullName(n.spoc)}` : ''}
                  </p>
                  <ReportText>{n.content}</ReportText>
                </div>
              ))}
            </div>
          ) : (
            <ReportEmpty>No notes yet.</ReportEmpty>
          )}
        </ReportSection>
      </ReportPage>
    </ReportDoc>
  );
}
