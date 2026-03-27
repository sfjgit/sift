'use client';

import { fmtDate, InfoRow, PersonChip, SectionCard } from './ui';

interface Client {
  id: string;
  name: string;
  vmsName?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
}

interface Person {
  id: string;
  firstName: string;
  lastName?: string;
}

interface BusinessUnit {
  id: string;
  name: string;
}

interface Props {
  client: Client;
  businessUnit?: BusinessUnit | null;
  createdBy?: Person | null;
  approvedBy?: Person | null;
  approvedAt?: string | null;
  deliveryLead?: Person | null;
  teamLead?: Person | null;
  createdAt: string;
  updatedAt: string;
}

function fullName(p?: Person | null) {
  if (!p) return null;
  return [p.firstName, p.lastName].filter(Boolean).join(' ');
}

export function RequirementMeta({
  client,
  businessUnit,
  createdBy,
  approvedBy,
  approvedAt,
  deliveryLead,
  teamLead,
  createdAt,
  updatedAt,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Client */}
      <SectionCard title="Client">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[14px] font-semibold text-foreground">{client.name}</p>
              {client.vmsName && client.vmsName !== client.name && (
                <p className="text-[12px] text-muted-foreground">{client.vmsName}</p>
              )}
            </div>
          </div>
          {client.industry && <InfoRow label="Industry" value={client.industry} />}
          {(client.city || client.country) && (
            <InfoRow
              label="Location"
              value={[client.city, client.country].filter(Boolean).join(', ')}
            />
          )}
          {businessUnit && <InfoRow label="Business Unit" value={businessUnit.name} />}
        </div>
      </SectionCard>

      {/* People */}
      <SectionCard title="Team">
        <div className="flex flex-col gap-2.5">
          {fullName(createdBy) && (
            <InfoRow label="Created By" value={<PersonChip name={fullName(createdBy)!} />} />
          )}
          {fullName(approvedBy) && (
            <InfoRow
              label="Approved By"
              value={
                <span className="flex flex-col gap-0.5">
                  <PersonChip name={fullName(approvedBy)!} />
                  {approvedAt && (
                    <span className="text-[11px] text-muted-foreground/50 pl-0.5">
                      {fmtDate(approvedAt)}
                    </span>
                  )}
                </span>
              }
            />
          )}
          {fullName(deliveryLead) && (
            <InfoRow label="Delivery Lead" value={<PersonChip name={fullName(deliveryLead)!} />} />
          )}
          {fullName(teamLead) && (
            <InfoRow label="Team Lead" value={<PersonChip name={fullName(teamLead)!} />} />
          )}
        </div>
      </SectionCard>

      {/* Timestamps */}
      <SectionCard title="Timestamps">
        <div className="flex flex-col gap-2">
          <InfoRow label="Created" value={fmtDate(createdAt)} />
          <InfoRow label="Updated" value={fmtDate(updatedAt)} />
        </div>
      </SectionCard>
    </div>
  );
}
