// File: SpocReport.tsx
// Path: src/features/spocs/SpocReport.tsx
//
// The SPOC page in view mode: a 3-section printed-style report — profile & contact, role & company,
// ownership & record. Edit (top right) turns the page back into forms.

'use client';

import Link from 'next/link';
import {
  ReportBadge,
  ReportCover,
  ReportDoc,
  ReportFigures,
  ReportKV,
  ReportPage,
  ReportSection,
  ReportTable,
  ReportText,
  ReportEmpty,
} from '@/components/record/Report';
import { useProjectLabels } from '@/features/marks/SalesMarks';
import { fmtDate, fmtNumber, fullName, titleCase } from '@/lib/format';
import type { SpocDetail } from '@/types/crm';

const yesNo = (v?: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : null);
const years = (v?: string | null) => (v ? `${fmtNumber(v)} yrs` : null);
const ext = (href: string | null | undefined, label: string) =>
  href ? (
    <a href={href} target="_blank" rel="noreferrer" className="text-[#1d4ed8] hover:underline">
      {label}
    </a>
  ) : null;

export function SpocReport({ spoc: s }: { spoc: SpocDetail }) {
  const projectLabels = useProjectLabels();
  const page = { total: 3, kicker: 'SPOC report', running: `${fullName(s)} · ${s.client.name}` };
  const place = [s.city, s.district, s.state].filter(Boolean).join(', ');
  const approval =
    s.approvalStatus === 'APPROVED' ? 'green' : s.approvalStatus === 'PENDING' ? 'amber' : 'slate';

  return (
    <ReportDoc>
      {/* ── 1. profile & contact */}
      <ReportPage n={1} title="Profile & contact" {...page}>
        <ReportCover
          title={fullName(s)}
          subtitle={
            <>
              {[s.designation, s.department].filter(Boolean).join(', ') ||
                'Designation not recorded'}
              {' at '}
              <Link
                href={`/clients/${s.client.id}`}
                className="font-medium text-[#1d4ed8] hover:underline"
              >
                {s.client.name}
              </Link>
            </>
          }
          badges={
            <>
              <ReportBadge tone={approval}>{titleCase(s.approvalStatus)}</ReportBadge>
              {!s.isActive && <ReportBadge>Inactive</ReportBadge>}
              {s.isPrimary && <ReportBadge tone="blue">Primary SPOC</ReportBadge>}
              {s.serviceLine && <ReportBadge>{s.serviceLine.name}</ReportBadge>}
              {s.businessUnit && <ReportBadge>{s.businessUnit.name}</ReportBadge>}
            </>
          }
          facts={[
            ['Email', s.email],
            ['Phone', s.phone],
            ['Location', place],
            ['Handler', s.handler && fullName(s.handler)],
          ]}
        />
        <ReportFigures
          items={[
            { label: 'Sales status', value: s.salesStatus?.label },
            { label: 'Email check', value: s.emailStatus ? titleCase(s.emailStatus) : null },
            {
              label: 'Data score',
              value: s.validationScore ?? null,
              note: s.validationBand ? titleCase(s.validationBand) : undefined,
            },
            { label: 'Call connected', value: yesNo(s.callConnected) },
          ]}
        />
        <ReportSection title="Contact details">
          <ReportKV
            rows={[
              ['Email', s.email],
              ['Email found via', s.emailSource?.label],
              ['Mobile', s.phone],
              ['Mobile 2', s.phone2],
              ['Mobile 3', s.phone3],
              ['LinkedIn', ext(s.linkedinUrl, 'LinkedIn profile')],
            ]}
          />
        </ReportSection>
        <ReportSection title="Location">
          <ReportKV
            rows={[
              ['Address', s.address],
              ['City', s.city],
              ['District', s.district],
              ['State', s.state],
              ['PIN code', s.pincode],
              [
                'Client office',
                s.location
                  ? [s.location.city, s.location.state].filter(Boolean).join(', ') || 'Linked'
                  : null,
              ],
            ]}
          />
        </ReportSection>
      </ReportPage>

      {/* ── 2. role & company */}
      <ReportPage n={2} title="Role & company" {...page}>
        <ReportSection title="Role">
          <ReportKV
            rows={[
              ['Designation', s.designation],
              ['Department', s.department],
              ['Seniority', s.seniority],
              ['Role category', s.roleCategory?.label],
              ['Decision authority', s.decisionAuthority?.label],
              ['Total experience', years(s.totalExpYears)],
              ['At this company', years(s.currentOrgExpYears)],
              ['Revenue band', s.revenueBand?.label],
            ]}
          />
        </ReportSection>
        <ReportSection title="Company">
          <ReportKV
            rows={[
              [
                'Client',
                <Link
                  key="c"
                  href={`/clients/${s.client.id}`}
                  className="text-[#1d4ed8] hover:underline"
                >
                  {s.client.name}
                </Link>,
              ],
              ['Organisation type', s.orgType?.label],
              ['ERP', s.erp],
              ['Business unit', s.businessUnit?.name],
              ['Service line', s.serviceLine?.name],
            ]}
          />
        </ReportSection>
        <ReportSection title="Sales">
          <ReportKV
            rows={[
              ['Sales status', s.salesStatus?.label],
              ['Call connected', yesNo(s.callConnected)],
              ['Key account of', s.keyAccountUser && fullName(s.keyAccountUser)],
              ['Projects', projectLabels(s.projectIds ?? []).join(', ')],
              ['Data flag', s.dataFlag ? titleCase(s.dataFlag) : null],
              ['Source', s.source?.label],
            ]}
          />
        </ReportSection>
        <ReportSection title="Also works with" note="the same person at other clients">
          <ReportTable
            rows={s.alsoWorksWith ?? []}
            rowKey={r => r.id}
            empty="Only at this client."
            columns={[
              {
                label: 'Client',
                value: r => (
                  <Link
                    href={`/clients/${r.client.id}`}
                    className="font-semibold text-[#1d4ed8] hover:underline"
                  >
                    {r.client.name}
                  </Link>
                ),
              },
              {
                label: 'Role there',
                value: r => (
                  <Link href={`/spocs/${r.id}`} className="hover:underline">
                    {r.designation ?? 'SPOC'}
                  </Link>
                ),
              },
              { label: 'Line', value: r => r.serviceLine?.name },
              { label: 'Active', value: r => (r.isActive ? 'Yes' : 'No') },
            ]}
          />
        </ReportSection>
        <ReportSection title="Description">
          {s.notes ? (
            <ReportText>{s.notes}</ReportText>
          ) : (
            <ReportEmpty>No description written.</ReportEmpty>
          )}
        </ReportSection>
      </ReportPage>

      {/* ── 3. ownership & record */}
      <ReportPage n={3} title="Ownership & record" {...page}>
        <ReportSection title="Ownership">
          <ReportKV
            rows={[
              ['Handler', s.handler && fullName(s.handler)],
              ['Added by', s.addedBy && `${fullName(s.addedBy)} · ${fmtDate(s.createdAt)}`],
              ['Approval', titleCase(s.approvalStatus)],
              [
                'Approved by',
                s.approvedBy && `${fullName(s.approvedBy)} · ${fmtDate(s.approvedAt)}`,
              ],
              ['Approval note', s.approvalNote],
            ]}
          />
        </ReportSection>
        <ReportSection
          title="Handover history"
          note={s.assignments?.length ? `${s.assignments.length} changes` : undefined}
        >
          <ReportTable
            rows={s.assignments ?? []}
            rowKey={r => r.id}
            empty="Never reassigned."
            columns={[
              { label: 'Handed to', value: r => <b>{fullName(r.assignedTo)}</b> },
              { label: 'By', value: r => fullName(r.assignedBy) },
              { label: 'From', value: r => fmtDate(r.assignedAt) },
              { label: 'Until', value: r => (r.endedAt ? fmtDate(r.endedAt) : 'Now') },
              { label: 'Reason', value: r => r.reason },
            ]}
          />
        </ReportSection>
        <ReportSection title="Record">
          <ReportKV
            rows={[
              ['Created', fmtDate(s.createdAt)],
              ['Last updated', fmtDate(s.updatedAt)],
              ['Email checked', s.validatedAt && fmtDate(s.validatedAt)],
              ['Needs review', s.reviewFlag ? (s.reviewReason ?? 'Yes') : null],
              ['Active', yesNo(s.isActive)],
            ]}
          />
        </ReportSection>
      </ReportPage>
    </ReportDoc>
  );
}
