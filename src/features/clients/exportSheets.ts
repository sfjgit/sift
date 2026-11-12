// File: exportSheets.ts
// Path: src/features/clients/exportSheets.ts
//
// Extra sheets for a clients export: whatever nested data sits behind the
// columns the user has shown — branch offices, CSR figures for every FY,
// reports, SPOCs — one sheet each, fetched in one call.

import { clientsApi } from '@/lib/api/endpoints';
import type { ExportSheet } from '@/components/data-table/exporter';
import type { ClientListItem } from '@/types/crm';

export type ExportPart = 'offices' | 'csr' | 'reports' | 'spocs';

type Row = { clientId: string; client: string };
export interface ExportDetails {
  offices: (Row & {
    type: string | null;
    name: string | null;
    addressLine: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    country: string | null;
    pincode: string | null;
    isPrimary: boolean;
  })[];
  csr: (Row & {
    fy: string;
    obligationRs: number | null;
    budgetRs: number | null;
    spentRs: number | null;
    unspentRs: number | null;
  })[];
  reports: (Row & { type: string | null; fy: string; fileName: string | null; sourceUrl: string | null })[];
  spocs: (Row & {
    firstName: string;
    lastName: string | null;
    designation: string | null;
    department: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    approvalStatus: string;
  })[];
}

/** which nested parts the shown columns call for */
const partsFor = (shown: string[]): ExportPart[] => {
  const has = (re: RegExp) => shown.some(id => re.test(id));
  const parts: ExportPart[] = [];
  if (has(/^(branches|state|district|city|address)/)) parts.push('offices');
  if (has(/^csr(Budget|Spent|Unspent|Obligation|Fy)|^figureYears$/)) parts.push('csr');
  if (has(/^doc_|^reports$/)) parts.push('reports');
  if (has(/^(spocs|approvedSpocs)$/)) parts.push('spocs');
  return parts;
};

const v = (x: unknown) => (x === null || x === undefined ? '' : (x as string | number));

export async function clientExportSheets(rows: ClientListItem[], shown: string[]): Promise<ExportSheet[]> {
  const parts = partsFor(shown);
  if (!parts.length || !rows.length) return [];
  const d = await clientsApi.exportDetails(
    rows.map(r => r.id),
    parts
  );
  const sheets: ExportSheet[] = [];
  if (parts.includes('offices'))
    sheets.push({
      name: 'Branch offices',
      rows: d.offices.map(o => ({
        Client: o.client,
        'Office type': v(o.type),
        'Head office': o.isPrimary ? 'Yes' : '',
        Name: v(o.name),
        Address: v(o.addressLine),
        City: v(o.city),
        District: v(o.district),
        State: v(o.state),
        Country: v(o.country),
        'PIN code': v(o.pincode),
      })),
    });
  if (parts.includes('csr'))
    sheets.push({
      name: 'CSR by FY',
      rows: d.csr.map(f => ({
        Client: f.client,
        FY: f.fy,
        'CSR obligation (₹)': v(f.obligationRs),
        'CSR budget (₹)': v(f.budgetRs),
        'CSR spent (₹)': v(f.spentRs),
        'CSR unspent (₹)': v(f.unspentRs),
      })),
    });
  if (parts.includes('reports'))
    sheets.push({
      name: 'Reports',
      rows: d.reports.map(r => ({
        Client: r.client,
        Report: v(r.type),
        FY: r.fy,
        File: v(r.fileName),
        'Found at': v(r.sourceUrl),
      })),
    });
  if (parts.includes('spocs'))
    sheets.push({
      name: 'SPOCs',
      rows: d.spocs.map(s => ({
        Client: s.client,
        Name: [s.firstName, s.lastName].filter(Boolean).join(' '),
        Designation: v(s.designation),
        Department: v(s.department),
        Email: v(s.email),
        Phone: v(s.phone),
        LinkedIn: v(s.linkedinUrl),
        Status: s.approvalStatus,
      })),
    });
  return sheets;
}
