// File: page.tsx
// Path: src/app/(app)/org/page.tsx
//
// Org chart: the reporting tree — drag, zoom, fold teams, search, click a
// person for their numbers. The same view is a tab on Admin → Org structure.

'use client';

import { OrgView } from '@/features/org/OrgView';

export default function OrgPage() {
  return <OrgView />;
}
