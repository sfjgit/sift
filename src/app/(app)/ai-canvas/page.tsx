// File: page.tsx
// Path: src/app/(app)/ai-canvas/page.tsx
//
// AI Canvas, full screen. The workspace itself (history, conversation, canvas)
// lives in features/ai/CanvasWorkspace — the side panel on other pages uses the
// same one, so a conversation continues wherever you are.

'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CanvasWorkspace } from '@/features/ai/CanvasWorkspace';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <CanvasWorkspace variant="page" />
    </Suspense>
  );
}
