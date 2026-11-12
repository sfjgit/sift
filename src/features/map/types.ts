// File: types.ts
// Path: src/features/map/types.ts
//
// The office map's data (GET /clients/map) and its pure model: what an office
// is coloured by, how tall it is, the legend. Shared by /map and the client page.

export type RGB = [number, number, number];

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  place: string | null;
  state: string | null;
  isPrimary: boolean;
  type: string;
  typeLabel: string;
  clientId: string;
  client: string;
  status: string;
  industry: string | null;
  csrSpentRs: number | null;
  employees: number | null;
  employeeSize: string | null;
  reports: number;
  spocsHere: number;
  clientSpocs: number;
}

export interface MapSpoc {
  id: string;
  name: string;
  designation: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  validationBand: string | null;
  clientId: string;
  client: string;
  officeId: string;
  atOwnOffice: boolean;
  lat: number;
  lng: number;
}

export interface ClientMapData {
  points: MapPoint[];
  spocs: MapSpoc[];
  withoutCoords: number;
  capped: boolean;
  canSpocs: boolean;
}

export type ColourBy = 'type' | 'industry' | 'spocs';
export type HeightBy = 'csrSpend' | 'spocs' | 'reports' | 'size' | 'same';

export const COLOUR_BY: { value: ColourBy; label: string }[] = [
  { value: 'type', label: 'Office type' },
  { value: 'industry', label: 'Industry' },
  { value: 'spocs', label: 'SPOC coverage' },
];

export const HEIGHT_BY: { value: HeightBy; label: string; hint: string }[] = [
  { value: 'csrSpend', label: 'CSR spend', hint: 'Taller = bigger CSR spend' },
  { value: 'spocs', label: 'SPOCs', hint: 'Taller = more SPOCs at the client' },
  { value: 'reports', label: 'CSR reports', hint: 'Taller = more reports saved' },
  { value: 'size', label: 'Company size', hint: 'Taller = more employees' },
  { value: 'same', label: 'Same height', hint: 'Every office the same' },
];

// office types — fixed colours so they mean the same everywhere
const TYPES: Record<string, { label: string; rgb: RGB }> = {
  HQ: { label: 'Head office', rgb: [139, 92, 246] },
  REGISTERED_OFFICE: { label: 'Registered office', rgb: [59, 130, 246] },
  BRANCH: { label: 'Branch', rgb: [20, 184, 166] },
  PLANT: { label: 'Plant / factory', rgb: [245, 158, 11] },
  DEV_CENTER: { label: 'Dev centre', rgb: [236, 72, 153] },
  OFFICE: { label: 'Other office', rgb: [100, 116, 139] },
};

// categorical palette for industries (distinct in light and dark)
const PALETTE: RGB[] = [
  [99, 102, 241],
  [20, 184, 166],
  [245, 158, 11],
  [236, 72, 153],
  [34, 197, 94],
  [14, 165, 233],
  [239, 68, 68],
  [168, 85, 247],
  [132, 204, 22],
];
const REST: RGB = [148, 163, 184];

export const SPOC_COLOURS: Record<string, { label: string; rgb: RGB }> = {
  APPROVED: { label: 'Approved', rgb: [34, 197, 94] },
  PENDING: { label: 'Waiting for approval', rgb: [245, 158, 11] },
  REJECTED: { label: 'Rejected', rgb: [239, 68, 68] },
};

export interface LegendItem {
  key: string;
  label: string;
  rgb: RGB;
  count: number;
}

const firstNumber = (s: string) => Number(/[\d.]+/.exec(s)?.[0] ?? Infinity);

/** the legend for this colouring, biggest groups first */
export const buildLegend = (points: MapPoint[], by: ColourBy): LegendItem[] => {
  const counts = new Map<string, number>();
  const raw = (p: MapPoint) =>
    by === 'type'
      ? p.type
      : by === 'industry'
        ? (p.industry ?? '')
        : p.clientSpocs
          ? 'has'
          : 'none';
  for (const p of points) counts.set(raw(p), (counts.get(raw(p)) ?? 0) + 1);

  if (by === 'type') {
    return Object.entries(TYPES)
      .map(([key, t]) => ({ key, label: t.label, rgb: t.rgb, count: counts.get(key) ?? 0 }))
      .filter(i => i.count);
  }
  if (by === 'spocs') {
    return [
      { key: 'has', label: 'Has SPOCs', rgb: [34, 197, 94] as RGB, count: counts.get('has') ?? 0 },
      {
        key: 'none',
        label: 'No SPOCs yet',
        rgb: [239, 68, 68] as RGB,
        count: counts.get('none') ?? 0,
      },
    ].filter(i => i.count);
  }
  const named = [...counts].filter(([k]) => k);
  const blank = counts.get('') ?? 0;
  // industry: the biggest ones get a colour, the rest share one
  const top = named.sort((a, b) => b[1] - a[1]);
  const items = top
    .slice(0, PALETTE.length)
    .map(([key, count], i) => ({ key, label: key, count, rgb: PALETTE[i]! }));
  const others = top.slice(PALETTE.length).reduce((n, [, c]) => n + c, 0) + blank;
  return others
    ? [...items, { key: '*', label: 'Other / not set', rgb: REST, count: others }]
    : items;
};

/** which legend item an office belongs to */
export const categoryOf = (
  p: MapPoint,
  by: ColourBy,
  legend: LegendItem[]
): LegendItem | undefined => {
  const key =
    by === 'type'
      ? p.type
      : by === 'industry'
        ? (p.industry ?? '')
        : p.clientSpocs
          ? 'has'
          : 'none';
  return legend.find(i => i.key === key) ?? legend.find(i => i.key === '*');
};

const sizeOf = (p: MapPoint): number | null => {
  if (p.employees !== null) return p.employees;
  const n = firstNumber(p.employeeSize ?? '');
  return Number.isFinite(n) ? n : null;
};

/** the number behind the height (null = nothing known → shortest) */
export const heightValue = (p: MapPoint, by: HeightBy): number | null =>
  by === 'csrSpend'
    ? p.csrSpentRs
    : by === 'spocs'
      ? p.clientSpocs
      : by === 'reports'
        ? p.reports
        : by === 'size'
          ? sizeOf(p)
          : 1;

/** which height choices have any data to show */
export const heightsWithData = (points: MapPoint[]) =>
  HEIGHT_BY.filter(h => h.value === 'same' || points.some(p => (heightValue(p, h.value) ?? 0) > 0));
