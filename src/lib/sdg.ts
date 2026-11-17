// File: sdg.ts
// Path: src/lib/sdg.ts
//
// The 17 UN Sustainable Development Goals — CSR programmes map to them
// (CASPA "SDG Mapping").

export const SDGS: { n: number; short: string; label: string }[] = [
  { n: 1, short: 'No poverty', label: 'No poverty' },
  { n: 2, short: 'Zero hunger', label: 'Zero hunger' },
  { n: 3, short: 'Health', label: 'Good health and well-being' },
  { n: 4, short: 'Education', label: 'Quality education' },
  { n: 5, short: 'Gender', label: 'Gender equality' },
  { n: 6, short: 'Water', label: 'Clean water and sanitation' },
  { n: 7, short: 'Energy', label: 'Affordable and clean energy' },
  { n: 8, short: 'Work & growth', label: 'Decent work and economic growth' },
  { n: 9, short: 'Industry', label: 'Industry, innovation and infrastructure' },
  { n: 10, short: 'Inequality', label: 'Reduced inequalities' },
  { n: 11, short: 'Cities', label: 'Sustainable cities and communities' },
  { n: 12, short: 'Consumption', label: 'Responsible consumption and production' },
  { n: 13, short: 'Climate', label: 'Climate action' },
  { n: 14, short: 'Life below water', label: 'Life below water' },
  { n: 15, short: 'Life on land', label: 'Life on land' },
  { n: 16, short: 'Peace & justice', label: 'Peace, justice and strong institutions' },
  { n: 17, short: 'Partnerships', label: 'Partnerships for the goals' },
];

export const sdgLabel = (n: number) => SDGS.find(s => s.n === n)?.label ?? `SDG ${n}`;

/** "SDG 4 Quality education, SDG 8 …" → [4, 8]; numbers 1–17 found in text */
export const parseSdgs = (text: string) =>
  [...new Set((text.match(/\d+/g) ?? []).map(Number).filter(n => n >= 1 && n <= 17))].sort(
    (a, b) => a - b
  );
