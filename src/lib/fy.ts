// File: fy.ts
// Path: src/lib/fy.ts
//
// Indian financial years run April → March and are written "2025-2026".

export const FY_PATTERN = /^\d{4}-\d{4}$/;

/** the financial year today falls in */
export const currentFy = () => {
  const d = new Date();
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${start + 1}`;
};

/** the year before "2025-2026" → "2024-2025" */
export const previousFy = (fy: string) => {
  const start = Number(fy.slice(0, 4)) - 1;
  return `${start}-${start + 1}`;
};

/** the last year that has ended — what filings and annual reports are for */
export const lastClosedFy = () => previousFy(currentFy());

const CRORE = 1e7;

/** ₹ (decimal string from the API) → crore text for an input, "" when empty */
export const toCroreText = (rs: string | null | undefined) =>
  rs === null || rs === undefined || rs === '' ? '' : String(Number(rs) / CRORE);

/** crore text from an input → ₹, null when blank */
export const fromCroreText = (v: string) => {
  const t = v.replace(/[,\s]/g, '');
  return t === '' ? null : Math.round(Number(t) * CRORE * 100) / 100;
};
