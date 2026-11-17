// File: page.tsx
// Path: src/app/(app)/pipeline-runs/[id]/page.tsx
//
// /pipeline-runs/:id — what a run found: new rows, changed values (old → new),
// rows already there. A finished run's pop-up and notification open this page.

'use client';

import { use } from 'react';
import { RunResults } from '@/features/pipeline/RunResults';

export default function RunResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RunResults runId={id} />;
}
